import assert from 'node:assert/strict';
import { poll } from '../lib/driver.mjs';
import {
  CATEGORY_ID_FOOD,
  CATEGORY_ID_TRANSPORTATION,
  INVALID_BACKUP_CONTENT,
  INVALID_BACKUP_FILE,
  OVERSIZED_BACKUP_FILE,
  VALID_BACKUP_FILE,
  buildSeedSnapshot,
  buildValidBackupFixture,
} from '../lib/fixtures.mjs';

export const name = 'BackupModal: Export JSON + Share cancel, Import valid/LWW, invalid, >50 MB';

async function waitForBackupIdle(cdp) {
  await cdp.waitFor(
    `(() => {
      const btn = document.querySelector('[data-testid="close-backup-btn"]');
      return Boolean(btn && !btn.disabled && !btn.hasAttribute('disabled'));
    })()`,
    { label: 'BackupModal actions idle' },
  );
}

export async function run(ctx) {
  const { device } = ctx;
  const deviceClock = device.getDeviceDate();
  const seedTs = deviceClock.date.toISOString();

  const persistTx = {
    id: 'e2e-tx-seed-persist',
    name: 'E2E Persist',
    value: 1000,
    createdAt: seedTs,
    updatedAt: seedTs,
    deletedAt: null,
    categoryId: CATEGORY_ID_FOOD,
  };
  const deletedDinnerTx = {
    id: 'e2e-tx-seed-deleted',
    name: 'E2E Dinner',
    value: 2500,
    createdAt: seedTs,
    updatedAt: seedTs,
    deletedAt: seedTs,
    categoryId: CATEGORY_ID_TRANSPORTATION,
  };

  const cdp = await ctx.seedSnapshot(buildSeedSnapshot([persistTx, deletedDinnerTx], deviceClock.date));

  const validFixture = buildValidBackupFixture({
    now: deviceClock.date,
    tzOffsetMinutes: deviceClock.tzOffsetMinutes,
    existingTxToOverwrite: persistTx,
    existingTxToKeepOlder: deletedDinnerTx,
  });

  try {
    device.pushDownloadFile(JSON.stringify(validFixture, null, 2), VALID_BACKUP_FILE);
    device.pushDownloadFile(INVALID_BACKUP_CONTENT, INVALID_BACKUP_FILE);
    device.createOversizedDownloadFile(OVERSIZED_BACKUP_FILE, 51);

    await cdp.click('[data-testid="open-backup-btn"]');
    await cdp.waitForModalOpen('Backup & Sync');

    // Export JSON -> cache/budget-backup-YYYY-MM-DD.json -> ChooserActivity -> Back -> no toast
    await cdp.clearToasts();
    await cdp.click('[data-testid="export-backup-btn"]');
    await device.waitForWindow(/ChooserActivity|ResolverActivity/i, 15000);

    const expectedCacheFilename = `budget-backup-${deviceClock.ymd}.json`;
    const exportedJsonRaw = await poll(() => device.readAppCacheFile(expectedCacheFilename), {
      timeoutMs: 5000,
      intervalMs: 200,
      label: `cache/${expectedCacheFilename}`,
    });
    const exportedPayload = JSON.parse(exportedJsonRaw);
    assert.equal(exportedPayload.version, 1);
    assert.ok(exportedPayload.transactions.some((t) => t.id === persistTx.id));
    assert.ok(exportedPayload.transactions.some((t) => t.id === deletedDinnerTx.id && t.deletedAt));

    device.keyEvent('KEYCODE_BACK');
    await device.waitForWindow(/com\.budget\.app/, 15000);
    await waitForBackupIdle(cdp);
    await cdp.assertNoToast(1500);

    // Import valid JSON via DocumentsUI + LWW verification
    await cdp.clearToasts();
    await cdp.click('[data-testid="import-backup-btn"]');
    await device.selectFileInDocumentsUi(VALID_BACKUP_FILE);
    await cdp.waitForToast({ text: /^Imported \d+ transactions$/, color: 'success' });
    await waitForBackupIdle(cdp);

    const afterValidImport = await cdp.readStorageState();
    const updatedPersist = afterValidImport.snapshot.transactions.find((t) => t.id === persistTx.id);
    const stillDeletedDinner = afterValidImport.snapshot.transactions.find((t) => t.id === deletedDinnerTx.id);
    assert.equal(updatedPersist?.name, 'E2E Persist LWW Updated');
    assert.equal(updatedPersist?.value, 1800);
    assert.equal(updatedPersist?.categoryId, CATEGORY_ID_FOOD);
    assert.ok(stillDeletedDinner?.deletedAt, 'Older incoming transaction must not resurrect newer local tombstone');
    assert.ok(afterValidImport.snapshot.transactions.some((t) => t.name === 'E2E Imported Today' && !t.deletedAt));
    assert.ok(afterValidImport.snapshot.transactions.some((t) => t.name === 'E2E Last Month Rent' && !t.deletedAt));
    assert.ok(afterValidImport.snapshot.transactions.some((t) => t.name === 'E2E Last Year Flight' && !t.deletedAt));

    const activeCountBeforeErrors = afterValidImport.snapshot.transactions.filter((t) => !t.deletedAt).length;

    // Negative: invalid JSON
    await cdp.clearToasts();
    await cdp.click('[data-testid="import-backup-btn"]');
    await device.selectFileInDocumentsUi(INVALID_BACKUP_FILE);
    await cdp.waitForToast({ text: /Invalid backup JSON/, color: 'danger' });
    await waitForBackupIdle(cdp);

    const afterInvalidImport = await cdp.readStorageState();
    assert.equal(afterInvalidImport.snapshot.transactions.filter((t) => !t.deletedAt).length, activeCountBeforeErrors);

    // Negative: > 50 MB file
    await cdp.clearToasts();
    await cdp.click('[data-testid="import-backup-btn"]');
    await device.selectFileInDocumentsUi(OVERSIZED_BACKUP_FILE);
    await cdp.waitForToast({ text: /File is too large to import \(max 50 MB\)/, color: 'danger' });

    const afterOversizedImport = await cdp.readStorageState();
    assert.equal(
      afterOversizedImport.snapshot.transactions.filter((t) => !t.deletedAt).length,
      activeCountBeforeErrors,
    );

    await waitForBackupIdle(cdp);
    await cdp.click('[data-testid="close-backup-btn"]');
    await cdp.waitForModalsClosed();
  } finally {
    device.cleanupDownloads([VALID_BACKUP_FILE, INVALID_BACKUP_FILE, OVERSIZED_BACKUP_FILE]);
  }
}
