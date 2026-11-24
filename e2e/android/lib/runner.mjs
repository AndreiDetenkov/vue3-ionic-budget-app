import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { INVALID_BACKUP_FILE, OVERSIZED_BACKUP_FILE, VALID_BACKUP_FILE } from './fixtures.mjs';
import { connectWebViewCdp, createAndroidDevice, poll } from './driver.mjs';
import { auditLogcat } from './helpers.mjs';

const THIS_FILE = fileURLToPath(import.meta.url);
const DEFAULT_SPECS_DIR = path.resolve(path.dirname(THIS_FILE), '../specs');
const ALLOWED_FLAGS = new Set(['--skip-build', '--skip-install']);

export function parseCliArgs(argv = []) {
  const flags = new Set();
  const filters = [];
  for (const arg of argv) {
    if (arg === '--') continue;
    if (arg.startsWith('--')) {
      if (!ALLOWED_FLAGS.has(arg)) {
        throw new Error(`Unknown CLI flag "${arg}". Supported flags: ${Array.from(ALLOWED_FLAGS).join(', ')}`);
      }
      flags.add(arg);
    } else {
      filters.push(arg);
    }
  }
  return {
    skipBuild: flags.has('--skip-build'),
    skipInstall: flags.has('--skip-install'),
    filters,
  };
}

export async function discoverSpecs(specsDir = DEFAULT_SPECS_DIR, filters = []) {
  const files = fs
    .readdirSync(specsDir)
    .filter((file) => file.endsWith('.e2e.mjs'))
    .sort();
  if (files.length === 0) {
    throw new Error(`No Android E2E specs (*.e2e.mjs) found in ${specsDir}`);
  }

  const specs = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(specsDir, file)).href);
    if (typeof mod.name !== 'string' || typeof mod.run !== 'function') {
      throw new Error(`Invalid E2E spec "${file}": expected exported "name" (string) and "run" (function).`);
    }
    specs.push({ file, name: mod.name, run: mod.run });
  }

  if (filters.length === 0) {
    return specs;
  }

  const needles = filters.map((f) => f.toLowerCase());
  const matched = specs.filter((spec) =>
    needles.some((needle) => spec.file.toLowerCase().includes(needle) || spec.name.toLowerCase().includes(needle)),
  );
  if (matched.length === 0) {
    const available = specs.map((s) => s.file).join(', ');
    throw new Error(`No Android E2E specs matched filter(s): ${filters.join(', ')}. Available: ${available}`);
  }
  return matched;
}

async function runStep(name, fn) {
  const start = Date.now();
  process.stdout.write(`▶ ${name}... `);
  try {
    await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`PASS (${duration}s)`);
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`FAIL (${duration}s)`);
    throw err;
  }
}

async function auditSpecRuntime({ device, cdp, disconnectCdp, jsExceptions, firestoreRequests }) {
  const finalStorage = await cdp.readStorageState();
  assert.equal(finalStorage.localStorageKeys.length, 0, 'localStorage must remain empty after spec');

  const earlyFirebaseResources = await cdp.eval(`
    performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((url) =>
        /firestore\\.googleapis\\.com|firebaseio\\.com|identitytoolkit\\.googleapis\\.com|securetoken\\.googleapis\\.com/i.test(
          url,
        ),
      )
  `);
  assert.deepEqual(
    earlyFirebaseResources,
    [],
    `Unexpected early Firebase resource requests: ${earlyFirebaseResources.join(', ')}`,
  );

  disconnectCdp();

  assert.deepEqual(jsExceptions, [], `Unexpected JS exceptions: ${jsExceptions.join('; ')}`);
  assert.deepEqual(firestoreRequests, [], `Unexpected requests to prod Firebase: ${firestoreRequests.join(', ')}`);

  const logcatReport = auditLogcat(device.dumpLogcat());
  assert.deepEqual(logcatReport.fatalCrashes, [], `Fatal crashes in logcat:\n${logcatReport.fatalCrashes.join('\n')}`);
  assert.deepEqual(
    logcatReport.fileProviderErrors,
    [],
    `FileProvider errors in logcat:\n${logcatReport.fileProviderErrors.join('\n')}`,
  );
  assert.deepEqual(logcatReport.jsErrors, [], `JS errors in logcat:\n${logcatReport.jsErrors.join('\n')}`);
}

export async function main(argv = process.argv.slice(2)) {
  const { skipBuild, skipInstall, filters } = parseCliArgs(argv);

  const specs = await discoverSpecs(DEFAULT_SPECS_DIR, filters);
  const device = createAndroidDevice();
  let currentCdp = null;
  let cleanedUp = false;

  const disconnectActiveCdp = () => {
    if (!currentCdp) return;
    currentCdp.disconnect();
    currentCdp = null;
  };

  const cleanupAll = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    disconnectActiveCdp();
    try {
      device.cleanupDownloads([VALID_BACKUP_FILE, INVALID_BACKUP_FILE, OVERSIZED_BACKUP_FILE]);
      device.clearAppData();
    } catch {
      // Ignore cleanup errors if emulator wasn't ready or target guard refused
    }
  };

  const onSignal = (signal) => {
    cleanupAll();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    await runStep('Prepare emulator and APK', async () => {
      const serial = await device.ensureEmulatorReady();
      device.buildAndInstallApk({ skipBuild, skipInstall });
      process.stdout.write(`[${serial}] `);
    });

    for (const spec of specs) {
      await runStep(spec.name, async () => {
        const jsExceptions = [];
        const firestoreRequests = [];

        const disconnectCdp = () => {
          if (!currentCdp) return;
          jsExceptions.push(...currentCdp.jsExceptions);
          firestoreRequests.push(...currentCdp.firestoreRequests);
          currentCdp.disconnect();
          currentCdp = null;
        };

        const connectCdp = async () => {
          disconnectCdp();
          currentCdp = await connectWebViewCdp(device);
          return currentCdp;
        };

        const restartApp = async () => {
          disconnectCdp();
          device.stopApp();
          device.startApp();
          return connectCdp();
        };

        const ctx = {
          device,
          get cdp() {
            if (!currentCdp) {
              throw new Error('CDP session is not connected.');
            }
            return currentCdp;
          },
          restartApp,
          async seedSnapshot(snapshot) {
            // Wait for app startup ensureSnapshot() to settle so it cannot overwrite the seeded fixture.
            await poll(async () => Boolean((await ctx.cdp.readStorageState()).snapshot), {
              timeoutMs: 10000,
              intervalMs: 100,
              label: 'initial IndexedDB snapshot before seeding',
            });
            await ctx.cdp.writeSnapshot(snapshot);
            return restartApp();
          },
        };

        device.clearLogcat();
        device.clearAppData();
        device.startApp();

        try {
          await connectCdp();
          await spec.run(ctx);
          await auditSpecRuntime({
            device,
            cdp: ctx.cdp,
            disconnectCdp,
            jsExceptions,
            firestoreRequests,
          });
        } finally {
          disconnectCdp();
          try {
            device.stopApp();
          } catch {
            // Best-effort per-spec teardown
          }
        }
      });
    }

    console.log(`\nALL ${specs.length} ANDROID E2E SCENARIOS PASSED.`);
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    cleanupAll();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((err) => {
    console.error('\nANDROID E2E FAILED:', err);
    process.exitCode = 1;
  });
}
