import assert from 'node:assert/strict';
import { E2E_DEFAULT_CATEGORIES } from '../lib/fixtures.mjs';

export const name = 'Cold start, IndexedDB v2, empty localStorage, restart persistence';

export async function run(ctx) {
  let { cdp } = ctx;

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

  cdp = await ctx.restartApp();

  await cdp.waitForText('[data-testid="transaction-slide-item"] .title', 'E2E Persist');
  await cdp.waitForText('[data-testid="transactions-total-amount"]', '1 000');
}
