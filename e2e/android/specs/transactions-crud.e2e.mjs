import assert from 'node:assert/strict';
import { CATEGORY_ID_FOOD, buildSeedSnapshot } from '../lib/fixtures.mjs';

export const name = 'Full Transaction CRUD, AllTransactionsModal, pull-to-refresh';

export async function run(ctx) {
  const { device } = ctx;
  const deviceClock = device.getDeviceDate();
  const seedTs = deviceClock.date.toISOString();
  const olderDate = new Date(deviceClock.date);
  if (olderDate.getUTCDate() > 2) {
    olderDate.setUTCDate(olderDate.getUTCDate() - 2);
  }
  const olderTs = olderDate.toISOString();

  const cdp = await ctx.seedSnapshot(
    buildSeedSnapshot(
      [
        {
          id: 'e2e-tx-seed-persist',
          name: 'E2E Persist',
          value: 1000,
          createdAt: seedTs,
          updatedAt: seedTs,
          deletedAt: null,
          categoryId: CATEGORY_ID_FOOD,
        },
        {
          id: 'e2e-tx-seed-older',
          name: 'E2E Older',
          value: 500,
          createdAt: olderTs,
          updatedAt: olderTs,
          deletedAt: null,
          categoryId: CATEGORY_ID_FOOD,
        },
      ],
      deviceClock.date,
    ),
  );

  await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Persist');
  await cdp.waitForText('[data-testid="transactions-total-amount"]', '1 500');

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
  assert.equal(afterInvalidStorage.snapshot.transactions.length, 2);

  // Create Transaction
  await cdp.fillIonInput('[data-testid="add-amount-input"]', '1200');
  await cdp.click('[data-testid="category-card-food"]');
  await cdp.fillIonInput('[data-testid="add-name-input"]', 'E2E Coffee');
  await cdp.click('[data-testid="add-submit-btn"]');

  await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Coffee');
  await cdp.waitForText('[data-testid="transactions-total-amount"]', '2 700');

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
  await cdp.waitForModalOpen('Update transaction');

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
  await cdp.waitForModalsClosed();

  await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Dinner');
  await cdp.waitForText('[data-testid="transaction-slide-item"] .category', 'Transportation');
  await cdp.waitForText('[data-testid="transactions-total-amount"]', '4 000');

  // AllTransactionsModal: verify older transaction + swipe Edit & Remove inside modal
  await cdp.click('[data-testid="view-all-transactions-btn"]');
  await cdp.waitForModalOpen('Transaction List');
  await cdp.waitForText('[data-testid="all-transactions-modal"].show-modal .title', 'E2E Dinner');
  await cdp.waitForText('[data-testid="all-transactions-modal"].show-modal .title', 'E2E Persist');
  await cdp.waitForText('[data-testid="all-transactions-modal"].show-modal .title', 'E2E Older');

  // Swipe left-to-right -> Edit older transaction inside AllTransactionsModal
  const modalEditBox = await cdp.getScreenBounds(
    '[data-testid="all-transactions-modal"].show-modal [data-testid="transaction-slide-item"]',
    'E2E Older',
  );
  device.swipe(
    modalEditBox.left + Math.round(modalEditBox.width * 0.15),
    modalEditBox.cy,
    modalEditBox.left + Math.round(modalEditBox.width * 0.78),
    modalEditBox.cy,
    300,
  );
  await cdp.click(
    '[data-testid="all-transactions-modal"].show-modal [data-testid="transaction-slide-item"].item-sliding-active-options-start [data-testid="transaction-edit-option"]',
  );
  await cdp.waitForModalOpen('Update transaction');

  await cdp.fillIonInput('[data-testid="update-name-input"]', 'E2E Older Edited');
  await cdp.fillIonInput('[data-testid="update-amount-input"]', '800');
  await cdp.clearToasts();
  await cdp.click('[data-testid="update-submit-btn"]');
  await cdp.waitForToast({ text: 'Successfully updated!', color: 'success' });
  await cdp.waitFor(
    `document.querySelectorAll("ion-modal.show-modal").length === 1 && Boolean(document.querySelector('[data-testid="all-transactions-modal"].show-modal'))`,
    { timeoutMs: 10000, label: 'UpdateItemModal closes while AllTransactionsModal stays open' },
  );
  await cdp.waitForText('[data-testid="all-transactions-modal"].show-modal .title', 'E2E Older Edited');

  // Swipe right-to-left -> Remove older transaction inside AllTransactionsModal
  const modalDeleteBox = await cdp.getScreenBounds(
    '[data-testid="all-transactions-modal"].show-modal [data-testid="transaction-slide-item"]',
    'E2E Older Edited',
  );
  device.swipe(
    modalDeleteBox.right - Math.round(modalDeleteBox.width * 0.15),
    modalDeleteBox.cy,
    modalDeleteBox.left + Math.round(modalDeleteBox.width * 0.15),
    modalDeleteBox.cy,
    300,
  );
  await cdp.click(
    '[data-testid="all-transactions-modal"].show-modal [data-testid="transaction-slide-item"].item-sliding-active-options-end [data-testid="transaction-remove-option"]',
  );
  await cdp.waitForText('ion-alert', /E2E Older Edited will be removed/);
  await cdp.clickText('ion-alert button', 'Remove');
  await cdp.waitFor(
    `!Array.from(document.querySelectorAll('[data-testid="all-transactions-modal"].show-modal [data-testid="transaction-slide-item"] .title')).some((el) => (el.textContent ?? '').trim() === 'E2E Older Edited')`,
    { label: 'E2E Older Edited removal from AllTransactionsModal' },
  );
  await cdp.waitFor(`Boolean(document.querySelector('[data-testid="all-transactions-modal"].show-modal'))`, {
    label: 'AllTransactionsModal remains open after removal',
  });

  const afterModalDeleteStorage = await cdp.readStorageState();
  const deletedOlderRecord = afterModalDeleteStorage.snapshot.transactions.find((t) => t.id === 'e2e-tx-seed-older');
  assert.ok(deletedOlderRecord, 'Removed older transaction should still exist in IndexedDB snapshot');
  assert.ok(deletedOlderRecord.deletedAt, 'Removed older transaction should have non-null deletedAt tombstone');

  await cdp.click('[data-testid="close-all-transactions-btn"]');
  await cdp.waitForModalsClosed();
  await cdp.waitForText('[data-testid="transactions-total-amount"]', '3 500');

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
}
