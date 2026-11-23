import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { cssPointToScreen, findUiNode, isNodeEffectivelyEnabled, parseUiHierarchy } from './helpers.mjs';

export const PACKAGE_ID = 'com.budget.app';
export const ACTIVITY = 'com.budget.app/.MainActivity';
export const DEFAULT_AVD = process.env.ANDROID_AVD || 'Pixel_9';
const UI_DUMP_REMOTE_PATH = '/sdcard/e2e_window_dump.xml';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function poll(fn, { timeoutMs = 10000, intervalMs = 150, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) {
        return value;
      }
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }
  const reason = lastError instanceof Error ? `: ${lastError.message}` : '';
  const resolvedLabel = typeof label === 'function' ? label() : label;
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${resolvedLabel}${reason}`);
}

function getAndroidSdkCandidates() {
  return [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'Library/Android/sdk'),
    path.join(os.homedir(), 'Android/Sdk'),
  ].filter(Boolean);
}

function resolveSdkTool(binaryName, subdir) {
  for (const sdkRoot of getAndroidSdkCandidates()) {
    const candidate = path.join(sdkRoot, subdir, binaryName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  try {
    return execFileSync('which', [binaryName], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(`Could not locate Android SDK tool "${binaryName}". Set ANDROID_HOME or install Android SDK.`);
  }
}

function resolveJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    path.join(os.homedir(), 'Applications/Android Studio.app/Contents/jbr/Contents/Home'),
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
    '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  ].filter(Boolean);

  const jvmDir = '/Library/Java/JavaVirtualMachines';
  if (fs.existsSync(jvmDir)) {
    for (const entry of fs.readdirSync(jvmDir)) {
      candidates.push(path.join(jvmDir, entry, 'Contents/Home'));
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'bin/java'))) {
      return candidate;
    }
  }

  throw new Error('Could not locate a Java runtime (JAVA_HOME) for Gradle.');
}

function runSync(bin, args, opts = {}) {
  try {
    return execFileSync(bin, args, {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
  } catch (err) {
    const stdout = err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '').trim() : '';
    const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '').trim() : '';
    const detail = [stderr, stdout].filter(Boolean).join('\n');
    throw new Error(`Command failed: ${bin} ${args.join(' ')}${detail ? `\n${detail}` : ''}`);
  }
}

function findFreeTcpPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close((closeErr) => {
        if (closeErr) reject(closeErr);
        else resolve(port);
      });
    });
  });
}

function parseOnlineDevices(adbDevicesOutput) {
  return adbDevicesOutput
    .split(/\r?\n/)
    .map((line) => /^(\S+)\s+device$/.exec(line.trim()))
    .filter(Boolean)
    .map((match) => match[1]);
}

function parseAndroidDate(rawDateOutput) {
  const trimmed = rawDateOutput.trim();
  const tzMatch = /([+-])(\d{2})(\d{2})$/.exec(trimmed);
  const tzOffsetMinutes = tzMatch ? (tzMatch[1] === '-' ? -1 : 1) * (Number(tzMatch[2]) * 60 + Number(tzMatch[3])) : 0;
  const normalized = trimmed.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Failed to parse Android device date: "${trimmed}"`);
  }
  return {
    date: parsed,
    ymd: trimmed.slice(0, 10),
    tzOffsetMinutes,
  };
}

const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+$/;
const SAFE_RELATIVE_PATH_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
const SAFE_KEYEVENT_RE = /^(?:KEYCODE_[A-Z0-9_]+|\d+)$/;

function assertSafeFilename(filename) {
  if (typeof filename !== 'string' || !SAFE_FILENAME_RE.test(filename) || filename === '.' || filename === '..') {
    throw new Error(`Unsafe filename: "${filename}"`);
  }
  return filename;
}

function assertSafeRelativeCachePath(relativePath) {
  if (
    typeof relativePath !== 'string' ||
    !SAFE_RELATIVE_PATH_RE.test(relativePath) ||
    relativePath.split('/').some((seg) => seg === '.' || seg === '..')
  ) {
    throw new Error(`Unsafe relative cache path: "${relativePath}"`);
  }
  return relativePath;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

export function createAndroidDevice({ avd = DEFAULT_AVD, repoRoot = process.cwd() } = {}) {
  const adbBin = resolveSdkTool('adb', 'platform-tools');
  const emulatorBin = resolveSdkTool('emulator', 'emulator');
  const apkPath = path.join(repoRoot, 'android/app/build/outputs/apk/debug/app-debug.apk');
  let serial = process.env.ANDROID_SERIAL || '';

  function adb(args, opts = {}) {
    const finalArgs = serial ? ['-s', serial, ...args] : args;
    return runSync(adbBin, finalArgs, opts);
  }

  function assertSafeMutationTarget() {
    if (!serial) {
      throw new Error('No target Android device serial selected.');
    }
    if (!serial.startsWith('emulator-') && process.env.ANDROID_E2E_ALLOW_DEVICE !== '1') {
      throw new Error(
        `Refusing destructive operation on non-emulator device "${serial}". Set ANDROID_E2E_ALLOW_DEVICE=1 to override.`,
      );
    }
  }

  async function ensureEmulatorReady() {
    const existing = parseOnlineDevices(runSync(adbBin, ['devices']));
    if (serial) {
      if (!existing.includes(serial)) {
        throw new Error(
          `Specified ANDROID_SERIAL "${serial}" is not online. Connected devices: ${existing.join(', ') || '(none)'}`,
        );
      }
      assertSafeMutationTarget();
    } else {
      const emuSerial = existing.find((id) => id.startsWith('emulator-'));
      if (emuSerial) {
        serial = emuSerial;
      } else {
        const avds = runSync(emulatorBin, ['-list-avds'])
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        if (!avds.includes(avd)) {
          throw new Error(`AVD "${avd}" not found. Available AVDs: ${avds.join(', ') || '(none)'}`);
        }
        let earlyExitMessage = '';
        const child = spawn(emulatorBin, ['-avd', avd, '-no-snapshot-load'], {
          detached: true,
          stdio: 'ignore',
        });
        child.once('exit', (code, signal) => {
          earlyExitMessage = `Emulator process exited early (code=${code}, signal=${signal})`;
        });
        child.unref();

        serial = await poll(
          () => {
            if (earlyExitMessage) {
              throw new Error(earlyExitMessage);
            }
            const devices = parseOnlineDevices(runSync(adbBin, ['devices']));
            return devices.find((id) => id.startsWith('emulator-')) ?? null;
          },
          { timeoutMs: 120000, intervalMs: 1000, label: `emulator "${avd}" to appear in adb devices` },
        );
      }
    }

    await poll(
      () => {
        const bootCompleted = adb(['shell', 'getprop', 'sys.boot_completed']).trim();
        const bootAnim = adb(['shell', 'getprop', 'init.svc.bootanim']).trim();
        return bootCompleted === '1' && bootAnim === 'stopped';
      },
      { timeoutMs: 180000, intervalMs: 1000, label: `Android emulator "${serial}" boot completion` },
    );

    try {
      adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
      adb(['shell', 'wm', 'dismiss-keyguard']);
    } catch {
      // Best-effort unlock on older/newer emulator images
    }

    return serial;
  }

  function buildAndInstallApk({ skipBuild = false, skipInstall = false } = {}) {
    if (!skipBuild) {
      const javaHome = resolveJavaHome();
      runSync('pnpm', ['build'], { cwd: repoRoot, stdio: 'inherit' });
      runSync('pnpm', ['sync'], { cwd: repoRoot, stdio: 'inherit' });
      runSync(path.join(repoRoot, 'android/gradlew'), ['assembleDebug'], {
        cwd: path.join(repoRoot, 'android'),
        env: { ...process.env, JAVA_HOME: javaHome },
        stdio: 'inherit',
      });
    }

    if (!skipInstall) {
      assertSafeMutationTarget();
      if (!fs.existsSync(apkPath)) {
        throw new Error(`Debug APK not found at ${apkPath}`);
      }
      try {
        adb(['install', '-r', apkPath]);
      } catch (err) {
        if (err instanceof Error && err.message.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
          adb(['uninstall', PACKAGE_ID]);
          adb(['install', apkPath]);
        } else {
          throw err;
        }
      }
    }
  }

  function scanMediaFile(remotePath) {
    const quotedRemotePath = shellQuote(remotePath);
    try {
      const out = adb([
        'shell',
        'content',
        'call',
        '--uri',
        'content://media',
        '--method',
        'scan_file',
        '--arg',
        quotedRemotePath,
      ]);
      if (out.includes('Bundle')) {
        return;
      }
    } catch {
      // Fall back to media scanner broadcast below
    }
    try {
      adb([
        'shell',
        'am',
        'broadcast',
        '-a',
        'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
        '-d',
        shellQuote(`file://${remotePath}`),
      ]);
    } catch {
      // Ignore if media scanner broadcast is restricted
    }
  }

  function pushDownloadFile(content, filename) {
    assertSafeMutationTarget();
    const safeName = assertSafeFilename(filename);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-e2e-'));
    const localFile = path.join(tmpDir, safeName);
    const remotePath = `/storage/emulated/0/Download/${safeName}`;
    try {
      fs.writeFileSync(localFile, content, 'utf8');
      adb(['push', localFile, remotePath]);
      scanMediaFile(remotePath);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  function createOversizedDownloadFile(filename, sizeMb = 51) {
    assertSafeMutationTarget();
    const safeName = assertSafeFilename(filename);
    if (!Number.isInteger(sizeMb) || sizeMb <= 0) {
      throw new Error(`Invalid sizeMb "${sizeMb}": expected a positive integer.`);
    }
    const remotePath = `/storage/emulated/0/Download/${safeName}`;
    adb(['shell', 'dd', 'if=/dev/zero', shellQuote(`of=${remotePath}`), 'bs=1048576', `count=${sizeMb}`]);
    scanMediaFile(remotePath);
  }

  function cleanupDownloads(filenames) {
    if (!serial || (!serial.startsWith('emulator-') && process.env.ANDROID_E2E_ALLOW_DEVICE !== '1')) {
      return;
    }
    for (const filename of filenames) {
      const safeName = assertSafeFilename(filename);
      const remotePath = `/storage/emulated/0/Download/${safeName}`;
      try {
        adb(['shell', 'rm', '-f', shellQuote(remotePath)]);
        scanMediaFile(remotePath);
      } catch {
        // Best-effort cleanup
      }
    }
    try {
      adb(['shell', 'rm', '-f', shellQuote(UI_DUMP_REMOTE_PATH)]);
    } catch {
      // Best-effort cleanup
    }
  }

  function getFocusedWindow() {
    const output = adb(['shell', 'dumpsys', 'window']);
    const focusMatch = /mCurrentFocus=([^\r\n]+)/.exec(output);
    const appMatch = /mFocusedApp=([^\r\n]+)/.exec(output);
    const current = focusMatch?.[1]?.trim() ?? '';
    if (current && current !== 'null') {
      return current;
    }
    return appMatch?.[1]?.trim() ?? '';
  }

  async function waitForWindow(regex, timeoutMs = 15000) {
    let lastWindow = '';
    return poll(
      () => {
        lastWindow = getFocusedWindow();
        return regex.test(lastWindow) ? lastWindow : null;
      },
      { timeoutMs, intervalMs: 200, label: () => `window matching ${regex} (last seen: "${lastWindow}")` },
    );
  }

  async function dumpUiNodes() {
    let lastErr = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        adb(['shell', 'uiautomator', 'dump', UI_DUMP_REMOTE_PATH]);
        const xml = adb(['exec-out', 'cat', UI_DUMP_REMOTE_PATH]);
        return parseUiHierarchy(xml);
      } catch (err) {
        lastErr = err;
        await sleep(250);
      }
    }
    throw lastErr ?? new Error('Failed to dump UI hierarchy');
  }

  function tap(x, y) {
    adb(['shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))]);
  }

  function swipe(x1, y1, x2, y2, durationMs = 300) {
    adb([
      'shell',
      'input',
      'swipe',
      String(Math.round(x1)),
      String(Math.round(y1)),
      String(Math.round(x2)),
      String(Math.round(y2)),
      String(Math.round(durationMs)),
    ]);
  }

  function keyEvent(code) {
    const keyCode = String(code);
    if (!SAFE_KEYEVENT_RE.test(keyCode)) {
      throw new Error(`Invalid keyevent code: "${code}"`);
    }
    adb(['shell', 'input', 'keyevent', keyCode]);
  }

  async function selectFileInDocumentsUi(filename, timeoutMs = 20000) {
    const safeName = assertSafeFilename(filename);
    await waitForWindow(/documentsui/i, timeoutMs);

    let tappedDownloads = false;
    let openedRootsDrawer = false;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const nodes = await dumpUiNodes();
      const hasVisibleBounds = (n) => n.bounds && n.bounds.height > 0;
      const fileNode =
        findUiNode(nodes, (n) => n.text === safeName && hasVisibleBounds(n)) ??
        findUiNode(nodes, (n) => n.contentDesc.includes(safeName) && hasVisibleBounds(n));

      if (fileNode) {
        if (!isNodeEffectivelyEnabled(nodes, fileNode)) {
          throw new Error(`Expected "${filename}" to be enabled (selectable) in DocumentsUI, but it is greyed out.`);
        }
        tap(fileNode.bounds.cx, fileNode.bounds.cy);
        await waitForWindow(new RegExp(PACKAGE_ID.replace(/\./g, '\\.')), 15000);
        return;
      }

      if (!tappedDownloads) {
        const downloadsNode = findUiNode(
          nodes,
          (n) =>
            (n.text === 'Downloads' || n.contentDesc === 'Downloads') &&
            n.bounds &&
            n.bounds.width > 0 &&
            n.bounds.height > 0,
        );
        if (downloadsNode) {
          tap(downloadsNode.bounds.cx, downloadsNode.bounds.cy);
          tappedDownloads = true;
          await sleep(400);
          continue;
        }
      }

      if (!openedRootsDrawer) {
        const drawerNode = findUiNode(
          nodes,
          (n) =>
            (n.contentDesc === 'Show roots' || n.contentDesc === 'Open navigation drawer') &&
            n.bounds &&
            n.bounds.width > 0,
        );
        if (drawerNode) {
          tap(drawerNode.bounds.cx, drawerNode.bounds.cy);
          openedRootsDrawer = true;
          await sleep(400);
          continue;
        }
      }

      await sleep(300);
    }

    throw new Error(`Timed out looking for "${filename}" in DocumentsUI.`);
  }

  return {
    adb,
    ensureEmulatorReady,
    buildAndInstallApk,
    clearAppData: () => {
      assertSafeMutationTarget();
      return adb(['shell', 'pm', 'clear', PACKAGE_ID]);
    },
    startApp: () => adb(['shell', 'am', 'start', '-W', '-n', ACTIVITY]),
    stopApp: () => adb(['shell', 'am', 'force-stop', PACKAGE_ID]),
    getDeviceDate: () => parseAndroidDate(adb(['shell', 'date', '+%Y-%m-%dT%H:%M:%S%z'])),
    pushDownloadFile,
    createOversizedDownloadFile,
    cleanupDownloads,
    readAppCacheFile: (relativePath) => {
      const safeRel = assertSafeRelativeCachePath(relativePath);
      return adb(['shell', 'run-as', PACKAGE_ID, 'cat', shellQuote(`cache/${safeRel}`)]);
    },
    clearLogcat: () => adb(['logcat', '-c']),
    dumpLogcat: () => adb(['logcat', '-d', '-v', 'threadtime']),
    getFocusedWindow,
    waitForWindow,
    dumpUiNodes,
    tap,
    swipe,
    keyEvent,
    selectFileInDocumentsUi,
  };
}

export async function connectWebViewCdp(device, { timeoutMs = 25000 } = {}) {
  const pid = await poll(
    () => {
      const out = device.adb(['shell', 'pidof', PACKAGE_ID]).trim();
      return out ? out.split(/\s+/)[0] : null;
    },
    { timeoutMs, intervalMs: 250, label: `${PACKAGE_ID} PID` },
  );

  const socketName = `webview_devtools_remote_${pid}`;
  await poll(
    () => {
      try {
        const out = device.adb(['shell', 'grep', '-a', socketName, '/proc/net/unix']);
        return out.includes(socketName);
      } catch {
        return false;
      }
    },
    { timeoutMs, intervalMs: 250, label: `WebView DevTools socket (${socketName})` },
  );

  const port = await findFreeTcpPort();
  device.adb(['forward', `tcp:${port}`, `localabstract:${socketName}`]);

  let ws = null;
  let nextId = 1;
  const pending = new Map();
  const jsExceptions = [];
  const firestoreRequests = [];

  function disconnect() {
    try {
      ws?.close();
    } catch {
      // Ignore close errors
    }
    try {
      device.adb(['forward', '--remove', `tcp:${port}`]);
    } catch {
      // Ignore port teardown errors
    }
  }

  try {
    const target = await poll(
      async () => {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        if (!res.ok) return null;
        const pages = await res.json();
        return (
          pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl && String(p.url).includes('localhost')) ?? null
        );
      },
      { timeoutMs, intervalMs: 250, label: 'WebView CDP localhost page target' },
    );

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const onOpen = () => {
        cleanupListeners();
        resolve();
      };
      const onError = (err) => {
        cleanupListeners();
        reject(err instanceof Error ? err : new Error('WebSocket connection error'));
      };
      const onClose = () => {
        cleanupListeners();
        reject(new Error('WebSocket closed before handshake completed'));
      };
      const cleanupListeners = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        ws.removeEventListener('close', onClose);
      };
      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
      ws.addEventListener('close', onClose);
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (typeof msg.id === 'number') {
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          if (msg.error) {
            entry.reject(new Error(`CDP ${entry.method}: ${msg.error.message}`));
          } else {
            entry.resolve(msg.result);
          }
        }
        return;
      }

      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params?.exceptionDetails;
        const desc = details?.exception?.description || details?.text || 'Unknown JS exception';
        jsExceptions.push(desc);
      } else if (msg.method === 'Network.requestWillBeSent') {
        const url = String(msg.params?.request?.url ?? '');
        if (
          /firestore\.googleapis\.com|firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/i.test(
            url,
          )
        ) {
          firestoreRequests.push(url);
        }
      }
    });

    ws.addEventListener('close', () => {
      for (const [, entry] of pending) {
        entry.reject(new Error('WebView CDP socket closed'));
      }
      pending.clear();
    });

    function send(method, params = {}) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error(`CDP ${method}: WebSocket is not open`));
      }
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evalExpr(expression, { userGesture = false } = {}) {
      const result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture,
      });
      if (result.exceptionDetails) {
        const desc =
          result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Evaluation error';
        throw new Error(`WebView evaluation failed: ${desc}`);
      }
      return result.result?.value;
    }

    await send('Runtime.enable');
    await send('Network.enable');

    await poll(
      () =>
        evalExpr(
          'Boolean(document.body && document.readyState === "complete" && window.location.href.includes("localhost") && document.querySelector("ion-app"))',
        ),
      {
        timeoutMs,
        intervalMs: 150,
        label: 'WebView localhost app ready',
      },
    );

    const toastExtractFn = `
      const extractToast = (el) => ({
        message: String(el.message || el.getAttribute('message') || el.shadowRoot?.querySelector('.toast-message')?.textContent || '').trim(),
        color: String(el.color || el.getAttribute('color') || '').trim(),
      });
    `;

    async function installToastObserver() {
      await evalExpr(`(() => {
        ${toastExtractFn}
        if (!Array.isArray(window.__e2eToasts)) window.__e2eToasts = [];
        if (window.__e2eToastObserverInstalled) return true;
        window.__e2eToastObserverInstalled = true;
        const seen = new WeakSet();
        const record = (el) => {
          if (!el || seen.has(el)) return;
          seen.add(el);
          setTimeout(() => {
            window.__e2eToasts.push({ ...extractToast(el), ts: Date.now() });
          }, 60);
        };
        document.querySelectorAll('ion-toast').forEach(record);
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) {
                if (node.tagName === 'ION-TOAST') {
                  record(node);
                }
                node.querySelectorAll?.('ion-toast').forEach(record);
              }
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return true;
      })()`);
    }

    await installToastObserver();

    const visibilityHelper = `
      const isVisible = (el) => {
        if (!el || el.closest('.ion-page-hidden')) return false;
        const modal = el.closest('ion-modal');
        if (modal && !modal.classList.contains('show-modal')) return false;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity) === 0) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
    `;

    async function waitFor(expr, opts = {}) {
      const { userGesture = false, ...pollOpts } = opts;
      return poll(() => evalExpr(expr, { userGesture }), pollOpts);
    }

    async function click(selector, opts = {}) {
      const sel = JSON.stringify(selector);
      await waitFor(
        `(() => {
          ${visibilityHelper}
          const el = Array.from(document.querySelectorAll(${sel})).find(isVisible);
          if (!el) return false;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          el.click();
          return true;
        })()`,
        { userGesture: true, label: `click(${selector})`, ...opts },
      );
    }

    function buildTextMatcherExpr(expectedText) {
      return expectedText instanceof RegExp
        ? `new RegExp(${JSON.stringify(expectedText.source)}, ${JSON.stringify(expectedText.flags)}).test(txt)`
        : `txt === ${JSON.stringify(expectedText)}`;
    }

    async function clickText(selector, expectedText, opts = {}) {
      const sel = JSON.stringify(selector);
      const matcher = buildTextMatcherExpr(expectedText);

      await waitFor(
        `(() => {
          ${visibilityHelper}
          const el = Array.from(document.querySelectorAll(${sel})).find((node) => {
            if (!isVisible(node)) return false;
            const txt = (node.textContent ?? '').trim();
            return ${matcher};
          });
          if (!el) return false;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          el.click();
          return true;
        })()`,
        { userGesture: true, label: `clickText(${selector}, ${expectedText})`, ...opts },
      );
    }

    async function waitForText(selector, expectedText, opts = {}) {
      const sel = JSON.stringify(selector);
      const matcher = buildTextMatcherExpr(expectedText);

      return waitFor(
        `(() => {
          ${visibilityHelper}
          const el = Array.from(document.querySelectorAll(${sel})).find((node) => {
            if (!isVisible(node)) return false;
            const txt = (node.textContent ?? '').trim();
            return ${matcher};
          });
          return el ? (el.textContent ?? '').trim() : null;
        })()`,
        { label: `waitForText(${selector}, ${expectedText})`, ...opts },
      );
    }

    async function fillIonInput(selector, value, opts = {}) {
      const sel = JSON.stringify(selector);
      const val = JSON.stringify(String(value));
      await waitFor(
        `(async () => {
          ${visibilityHelper}
          const ionInput = Array.from(document.querySelectorAll(${sel})).find(isVisible);
          if (!ionInput || typeof ionInput.getInputElement !== 'function') return false;
          const native = await ionInput.getInputElement();
          if (!native) return false;
          ionInput.scrollIntoView({ block: 'center', inline: 'center' });
          native.focus();
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(native, ${val});
          native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          await new Promise((r) => setTimeout(r, 20));
          if (String(ionInput.value ?? '') !== ${val}) {
            ionInput.value = ${val};
            ionInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: ${val} }, bubbles: true }));
            ionInput.dispatchEvent(new CustomEvent('ionChange', { detail: { value: ${val} }, bubbles: true }));
          }
          native.dispatchEvent(new Event('change', { bubbles: true }));
          return String(ionInput.value ?? '') === ${val};
        })()`,
        { label: `fillIonInput(${selector}, ${value})`, ...opts },
      );
    }

    async function getScreenBounds(selector, matcherText = null) {
      const sel = JSON.stringify(selector);
      const textCheck =
        matcherText === null ? 'true' : `(node.textContent ?? '').includes(${JSON.stringify(String(matcherText))})`;

      const cssData = await waitFor(
        `(async () => {
          ${visibilityHelper}
          const el = Array.from(document.querySelectorAll(${sel})).find((node) => isVisible(node) && ${textCheck});
          if (!el) return null;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const rect = el.getBoundingClientRect();
          return {
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
            viewport: { width: window.innerWidth, height: window.innerHeight },
          };
        })()`,
        { label: `getScreenBounds(${selector})` },
      );

      const nodes = await device.dumpUiNodes();
      const webViews = nodes.filter(
        (n) => n.className === 'android.webkit.WebView' && n.bounds && n.bounds.width > 0 && n.bounds.height > 0,
      );
      if (webViews.length === 0) {
        throw new Error('Could not find android.webkit.WebView bounds in UI hierarchy');
      }
      webViews.sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height);
      return cssPointToScreen(cssData.rect, cssData.viewport, webViews[0].bounds);
    }

    async function clearToasts() {
      await evalExpr('(() => { window.__e2eToasts = []; return true; })()');
    }

    async function waitForToast({ text, color, timeoutMs = 8000 } = {}) {
      const isRegex = text instanceof RegExp;
      const matcher = text
        ? isRegex
          ? `new RegExp(${JSON.stringify(text.source)}, ${JSON.stringify(text.flags)}).test(t.message)`
          : `t.message.includes(${JSON.stringify(String(text))})`
        : 'Boolean(t.message)';
      const colorCheck = color ? `&& t.color === ${JSON.stringify(color)}` : '';

      return waitFor(
        `(() => {
          ${toastExtractFn}
          const captured = Array.isArray(window.__e2eToasts) ? window.__e2eToasts : [];
          const live = Array.from(document.querySelectorAll('ion-toast')).map(extractToast);
          const all = [...captured, ...live];
          return all.find((t) => (${matcher}) ${colorCheck}) ?? null;
        })()`,
        { timeoutMs, intervalMs: 100, label: `toast(${text ?? 'any'})` },
      );
    }

    async function assertNoToast(waitMs = 1500) {
      await sleep(waitMs);
      const toasts = await evalExpr(`(() => {
        ${toastExtractFn}
        const captured = Array.isArray(window.__e2eToasts) ? window.__e2eToasts : [];
        const live = Array.from(document.querySelectorAll('ion-toast')).map(extractToast);
        return [...captured, ...live].filter((t) => t.message.length > 0);
      })()`);
      if (Array.isArray(toasts) && toasts.length > 0) {
        throw new Error(`Expected no toast notifications, but observed: ${JSON.stringify(toasts)}`);
      }
    }

    async function readStorageState() {
      return evalExpr(`(async () => {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open('budget-app-db');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error || new Error('Failed to open budget-app-db'));
        });
        try {
          const storeNames = Array.from(db.objectStoreNames).sort();
          const readKey = (storeName, key) => {
            if (!db.objectStoreNames.contains(storeName)) return Promise.resolve(null);
            return new Promise((resolve, reject) => {
              const tx = db.transaction(storeName, 'readonly');
              const req = tx.objectStore(storeName).get(key);
              req.onsuccess = () => resolve(req.result ?? null);
              req.onerror = () => reject(req.error);
            });
          };
          const [snapshot, syncCursor] = await Promise.all([
            readKey('snapshots', 'budget-app-local-snapshot-v1'),
            readKey('sync_cursors', 'budget-app-firebase-sync-cursor-v1'),
          ]);
          return {
            dbVersion: db.version,
            storeNames,
            snapshot,
            syncCursor,
            localStorageKeys: Object.keys(window.localStorage),
          };
        } finally {
          db.close();
        }
      })()`);
    }

    return {
      jsExceptions,
      firestoreRequests,
      eval: evalExpr,
      waitFor,
      click,
      clickText,
      waitForText,
      fillIonInput,
      getScreenBounds,
      clearToasts,
      waitForToast,
      assertNoToast,
      readStorageState,
      disconnect,
    };
  } catch (err) {
    disconnect();
    throw err;
  }
}
