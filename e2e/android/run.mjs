import assert from 'node:assert/strict';
import {
  CATEGORY_ID_FOOD,
  INVALID_BACKUP_CONTENT,
  INVALID_BACKUP_FILE,
  OVERSIZED_BACKUP_FILE,
  VALID_BACKUP_FILE,
  E2E_DEFAULT_CATEGORIES,
  buildValidBackupFixture,
} from './fixtures.mjs';
import { connectWebViewCdp, createAndroidDevice, poll } from './driver.mjs';
import { auditLogcat, computeExpectedReports, formatAmount } from './helpers.mjs';

const args = new Set(process.argv.slice(2));
const skipBuild = args.has('--skip-build');
const skipInstall = args.has('--skip-install');

const STEPS = [];

async function runStep(name, fn) {
  const start = Date.now();
  process.stdout.write(`▶ ${name}... `);
  try {
    await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`PASS (${duration}s)`);
    STEPS.push({ name, ok: true, duration });
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`FAIL (${duration}s)`);
    throw err;
  }
}

async function waitForModalOpen(cdp, titleText) {
  await cdp.waitForText('ion-modal.show-modal ion-title', titleText, { timeoutMs: 10000 });
}

async function waitForModalsClosed(cdp) {
  await cdp.waitFor('document.querySelectorAll("ion-modal.show-modal").length === 0', {
    timeoutMs: 10000,
    label: 'all modals to close',
  });
}

async function waitForBackupIdle(cdp) {
  await cdp.waitFor(
    `(() => {
      const btn = document.querySelector('[data-testid="close-backup-btn"]');
      return Boolean(btn && !btn.disabled && !btn.hasAttribute('disabled'));
    })()`,
    { label: 'BackupModal actions idle' },
  );
}

async function main() {
  const device = createAndroidDevice();
  const allJsExceptions = [];
  const allFirestoreRequests = [];
  let cdp = null;
  let cleanedUp = false;

  const trackAndDisconnectCdp = () => {
    if (!cdp) return;
    allJsExceptions.push(...cdp.jsExceptions);
    allFirestoreRequests.push(...cdp.firestoreRequests);
    cdp.disconnect();
    cdp = null;
  };

  const cleanupAll = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    trackAndDisconnectCdp();
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
    await runStep('0. Prepare emulator, APK, logcat, and fixtures', async () => {
      const serial = await device.ensureEmulatorReady();
      device.buildAndInstallApk({ skipBuild, skipInstall });
      device.clearLogcat();
      device.clearAppData();
      device.pushDownloadFile(INVALID_BACKUP_CONTENT, INVALID_BACKUP_FILE);
      device.createOversizedDownloadFile(OVERSIZED_BACKUP_FILE, 51);
      process.stdout.write(`[${serial}] `);
    });

    await runStep('1. Cold start, IndexedDB v2, empty localStorage, restart persistence', async () => {
      device.startApp();
      cdp = await connectWebViewCdp(device);

      await cdp.waitForText('[data-testid="transactions-empty"]', 'Oops!...No Transactions at this moment');

      await cdp.click('[data-testid="tab-add"]');
      await cdp.waitForText('[data-testid="category-card-food"] .card-title', 'Food');
      const renderedCategories = await cdp.eval(`
        Array.from(document.querySelectorAll('.card-title')).map((el) => (el.textContent ?? '').trim()).sort()
      `);
      assert.deepEqual(renderedCategories, E2E_DEFAULT_CATEGORIES.map((c) => c.title).sort());

      const storage = await cdp.readStorageState();
      assert.equal(storage.dbVersion, 2, 'Expected budget-app-db version 2');
      assert.deepEqual(storage.storeNames, ['snapshots', 'sync_cursors']);
      assert.equal(storage.snapshot?.categories.length, 14);
      assert.equal(storage.snapshot?.transactions.length, 0);
      assert.equal(storage.localStorageKeys.length, 0, 'Expected zero localStorage keys');

      await cdp.fillIonInput('[data-testid="add-amount-input"]', '1000');
      await cdp.click('[data-testid="category-card-food"]');
      await cdp.fillIonInput('[data-testid="add-name-input"]', 'E2E Persist');
      await cdp.click('[data-testid="add-submit-btn"]');

      await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Persist');
      await cdp.waitForText('[data-testid="transactions-total-amount"]', '1 000');

      trackAndDisconnectCdp();
      device.stopApp();
      device.startApp();
      cdp = await connectWebViewCdp(device);

      await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Persist');
      await cdp.waitForText('[data-testid="transactions-total-amount"]', '1 000');
    });

    await runStep('2. Full Transaction CRUD, AllTransactionsModal, pull-to-refresh', async () => {
      // Validation on Add tab
      await cdp.click('[data-testid="tab-add"]');
      await cdp.waitForText('ion-title', 'New transaction');

      await cdp.clearToasts();
      await cdp.click('[data-testid="add-submit-btn"]');
      await cdp.waitForToast({ text: 'There are fields that are not filled in!', color: 'danger' });

      await cdp.clearToasts();
      await cdp.fillIonInput('[data-testid="add-amount-input"]', '500');
      await cdp.click('[data-testid="add-submit-btn"]');
      await cdp.waitForToast({ text: 'There are fields that are not filled in!', color: 'danger' });

      const afterInvalidStorage = await cdp.readStorageState();
      assert.equal(afterInvalidStorage.snapshot.transactions.length, 1);

      // Create Transaction
      await cdp.fillIonInput('[data-testid="add-amount-input"]', '1200');
      await cdp.click('[data-testid="category-card-food"]');
      await cdp.fillIonInput('[data-testid="add-name-input"]', 'E2E Coffee');
      await cdp.click('[data-testid="add-submit-btn"]');

      await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Coffee');
      await cdp.waitForText('[data-testid="transactions-total-amount"]', '2 200');

      // Swipe left-to-right -> Edit -> UpdateItemModal
      const editBox = await cdp.getScreenBounds('[data-testid="transaction-slide-item"]', 'E2E Coffee');
      device.swipe(
        editBox.left + Math.round(editBox.width * 0.15),
        editBox.cy,
        editBox.left + Math.round(editBox.width * 0.78),
        editBox.cy,
        300,
      );
      await cdp.click(
        '[data-testid="transaction-slide-item"].item-sliding-active-options-start [data-testid="transaction-edit-option"]',
      );
      await waitForModalOpen(cdp, 'Update transaction');

      // Verify validation disables submit on invalid amount
      await cdp.fillIonInput('[data-testid="update-amount-input"]', '0');
      await cdp.waitFor(
        `(() => {
          const btn = document.querySelector('[data-testid="update-submit-btn"]');
          return Boolean(btn && (btn.disabled || btn.hasAttribute('disabled')));
        })()`,
        { label: 'Update button disabled on zero amount' },
      );

      // Update name, amount, and category
      await cdp.fillIonInput('[data-testid="update-name-input"]', 'E2E Dinner');
      await cdp.fillIonInput('[data-testid="update-amount-input"]', '2500');
      await cdp.click('[data-testid="update-category-select"]');
      await cdp.clickText('ion-action-sheet button.action-sheet-button', 'Transportation');
      await cdp.waitFor('!document.querySelector("ion-action-sheet")', { label: 'action sheet to close' });

      await cdp.clearToasts();
      await cdp.click('[data-testid="update-submit-btn"]');
      await cdp.waitForToast({ text: 'Successfully updated!', color: 'success' });
      await waitForModalsClosed(cdp);

      await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Dinner');
      await cdp.waitForText('[data-testid="transaction-slide-item"] .category', 'Transportation');
      await cdp.waitForText('[data-testid="transactions-total-amount"]', '3 500');

      // AllTransactionsModal
      await cdp.click('[data-testid="view-all-transactions-btn"]');
      await waitForModalOpen(cdp, 'Transaction List');
      await cdp.waitForText('[data-testid="all-transactions-modal"].show-modal .title', 'E2E Dinner');
      await cdp.waitForText('[data-testid="all-transactions-modal"].show-modal .title', 'E2E Persist');
      await cdp.click('[data-testid="close-all-transactions-btn"]');
      await waitForModalsClosed(cdp);

      // Pull-to-refresh (BaseRefresher)
      await cdp.eval(`(async () => {
        window.__e2eRefreshed = false;
        const content = document.querySelector('[data-testid="transactions-content"]');
        await content?.scrollToTop?.(0);
        const refresher = document.querySelector('[data-testid="transactions-content"] ion-refresher');
        if (!refresher) throw new Error('Active ion-refresher not found');
        refresher.addEventListener('ionRefresh', () => { window.__e2eRefreshed = true; }, { once: true });
        return true;
      })()`);
      const contentBox = await cdp.getScreenBounds('[data-testid="transactions-content"]');
      device.swipe(
        contentBox.cx,
        Math.round(contentBox.top + contentBox.height * 0.3),
        contentBox.cx,
        Math.round(contentBox.top + contentBox.height * 0.85),
        500,
      );
      await cdp.waitFor('window.__e2eRefreshed === true', {
        timeoutMs: 10000,
        label: 'BaseRefresher ionRefresh event',
      });
      await cdp.waitFor(
        `(() => {
          const r = document.querySelector('[data-testid="transactions-content"] ion-refresher');
          return Boolean(r && !r.classList.contains('refresher-refreshing') && !r.classList.contains('refresher-completing'));
        })()`,
        { timeoutMs: 10000, label: 'BaseRefresher completion' },
      );
      await cdp.waitForText('[data-testid="transactions-total-amount"]', '3 500');

      // Swipe right-to-left -> Remove -> Confirm -> Tombstone in IDB
      const deleteBox = await cdp.getScreenBounds('[data-testid="transaction-slide-item"]', 'E2E Dinner');
      device.swipe(
        deleteBox.right - Math.round(deleteBox.width * 0.15),
        deleteBox.cy,
        deleteBox.left + Math.round(deleteBox.width * 0.15),
        deleteBox.cy,
        300,
      );
      await cdp.click(
        '[data-testid="transaction-slide-item"].item-sliding-active-options-end [data-testid="transaction-remove-option"]',
      );
      await cdp.waitForText('ion-alert', /E2E Dinner will be removed/);
      await cdp.clickText('ion-alert button', 'Remove');

      await cdp.waitFor(
        `!Array.from(document.querySelectorAll('[data-testid="transaction-slide-item"] .title')).some((el) => (el.textContent ?? '').trim() === 'E2E Dinner')`,
        { label: 'E2E Dinner removal from list' },
      );
      await cdp.waitForText('[data-testid="transactions-total-amount"]', '1 000');

      const afterDeleteStorage = await cdp.readStorageState();
      const deletedRecord = afterDeleteStorage.snapshot.transactions.find((t) => t.name === 'E2E Dinner');
      assert.ok(deletedRecord, 'Deleted transaction should still exist in IndexedDB snapshot');
      assert.ok(deletedRecord.deletedAt, 'Deleted transaction should have non-null deletedAt tombstone');
    });

    await runStep('3. BackupModal: Export JSON + Share cancel, Import valid/LWW, invalid, >50 MB', async () => {
      const preBackupStorage = await cdp.readStorageState();
      const persistTx = preBackupStorage.snapshot.transactions.find((t) => t.name === 'E2E Persist' && !t.deletedAt);
      const deletedDinnerTx = preBackupStorage.snapshot.transactions.find(
        (t) => t.name === 'E2E Dinner' && t.deletedAt,
      );
      assert.ok(persistTx && deletedDinnerTx);

      const deviceClock = device.getDeviceDate();
      const validFixture = buildValidBackupFixture({
        now: deviceClock.date,
        tzOffsetMinutes: deviceClock.tzOffsetMinutes,
        existingTxToOverwrite: persistTx,
        existingTxToKeepOlder: deletedDinnerTx,
      });
      device.pushDownloadFile(JSON.stringify(validFixture, null, 2), VALID_BACKUP_FILE);

      await cdp.click('[data-testid="open-backup-btn"]');
      await waitForModalOpen(cdp, 'Backup & Sync');

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
      assert.equal(
        afterInvalidImport.snapshot.transactions.filter((t) => !t.deletedAt).length,
        activeCountBeforeErrors,
      );

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
      await waitForModalsClosed(cdp);
    });

    await runStep('4. Category Report & Date Range filters + accordion drill-down', async () => {
      const storage = await cdp.readStorageState();
      const deviceClock = device.getDeviceDate();
      const expected = computeExpectedReports(
        storage.snapshot.transactions,
        deviceClock.date,
        storage.snapshot.categories,
        deviceClock.tzOffsetMinutes,
      );

      await cdp.click('[data-testid="tab-reports"]');
      await cdp.waitForText('ion-title', 'Reports');

      const filters = [
        { label: 'Current month', key: 'currentMonth' },
        { label: 'Last month', key: 'lastMonth' },
        { label: 'Current year', key: 'currentYear' },
        { label: 'Last year', key: 'lastYear' },
      ];

      for (const filter of filters) {
        const expectedPeriod = expected[filter.key];
        await cdp.click(`[data-testid="report-filter-${filter.key}"]`);

        await cdp.waitFor(
          `(() => {
            const page = document.querySelector('ion-tabs ion-router-outlet > .ion-page:not(.ion-page-hidden)');
            if (!page || page.querySelector('ion-progress-bar')) return false;
            const amt = page.querySelector('[data-testid="reports-total-amount"]');
            return amt && (amt.textContent ?? '').trim() === ${JSON.stringify(expectedPeriod.totalAmount)};
          })()`,
          { timeoutMs: 10000, label: `Reports total for ${filter.label} === ${expectedPeriod.totalAmount}` },
        );

        const renderedGroups = await cdp.eval(`
          Array.from(document.querySelectorAll('ion-tabs ion-router-outlet > .ion-page:not(.ion-page-hidden) ion-accordion')).map((acc) => ({
            name: (acc.querySelector('ion-item[slot="header"] .title')?.textContent ?? '').trim(),
            amount: (acc.querySelector('ion-item[slot="header"] .amount')?.textContent ?? '').replace(/\\s+/g, ' ').trim(),
          }))
        `);
        assert.deepEqual(
          renderedGroups,
          expectedPeriod.reports.map((r) => ({ name: r.name, amount: `${r.formattedValue} KGS` })),
          `Mismatch in category breakdown for ${filter.label}`,
        );

        if (expectedPeriod.reports.length > 0) {
          const firstReport = expectedPeriod.reports[0];
          const escapedId = `report-accordion-${firstReport.name.toLowerCase()}`.replace(/(["\\])/g, '\\$1');
          const accordionSel = `[data-testid="${escapedId}"]`;
          const isExpanded = await cdp.eval(
            `Boolean(document.querySelector(${JSON.stringify(accordionSel)})?.classList.contains('accordion-expanded'))`,
          );
          if (!isExpanded) {
            await cdp.click(`${accordionSel} ion-item[slot="header"]`);
          }
          await cdp.waitFor(
            `Boolean(document.querySelector(${JSON.stringify(`${accordionSel}.accordion-expanded div[slot="content"]`)}))`,
            { label: `accordion expansion for ${filter.label}` },
          );
          const renderedItems = await cdp.eval(`
            Array.from(document.querySelectorAll(${JSON.stringify(`${accordionSel} div[slot="content"] ion-item`)})).map((item) => ({
              name: (item.querySelector('.title')?.textContent ?? '').trim(),
              amount: (item.querySelector('.amount')?.textContent ?? '').trim(),
            }))
          `);
          for (const tx of firstReport.transactions) {
            assert.ok(
              renderedItems.some((item) => item.name === tx.name && item.amount === formatAmount(tx.value)),
              `Expected expanded report for "${filter.label}" to include "${tx.name}" (${formatAmount(tx.value)})`,
            );
          }
        }
      }
    });

    await runStep('5. Logcat, JS exception, zero-prod-Firestore, and storage audit', async () => {
      const finalStorage = await cdp.readStorageState();
      assert.equal(finalStorage.localStorageKeys.length, 0, 'localStorage must remain empty after full session');

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

      trackAndDisconnectCdp();

      assert.deepEqual(allJsExceptions, [], `Unexpected JS exceptions: ${allJsExceptions.join('; ')}`);
      assert.deepEqual(
        allFirestoreRequests,
        [],
        `Unexpected requests to prod Firebase: ${allFirestoreRequests.join(', ')}`,
      );

      const logcatReport = auditLogcat(device.dumpLogcat());
      assert.deepEqual(
        logcatReport.fatalCrashes,
        [],
        `Fatal crashes in logcat:\n${logcatReport.fatalCrashes.join('\n')}`,
      );
      assert.deepEqual(
        logcatReport.fileProviderErrors,
        [],
        `FileProvider errors in logcat:\n${logcatReport.fileProviderErrors.join('\n')}`,
      );
      assert.deepEqual(logcatReport.jsErrors, [], `JS errors in logcat:\n${logcatReport.jsErrors.join('\n')}`);
    });

    console.log(`\nALL ${STEPS.length} ANDROID E2E SCENARIOS PASSED.`);
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    cleanupAll();
  }
}

main().catch((err) => {
  console.error('\nANDROID E2E FAILED:', err);
  process.exitCode = 1;
});
