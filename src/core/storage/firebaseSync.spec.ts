import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalStorage,
  DEFAULT_CATEGORIES,
  type LocalBudgetStorage,
  type StoredCategory,
  type StoredTransaction,
} from '@/core/storage';
import {
  createFirebaseSyncService,
  createSyncedLocalStorage,
  MAX_FIRESTORE_BATCH_SIZE,
  type FirebaseRemoteAdapter,
} from './firebaseSync';

function createInMemoryRemoteAdapter(): {
  adapter: FirebaseRemoteAdapter;
  categories: Map<string, StoredCategory>;
  transactions: Map<string, StoredTransaction>;
  batchSizes: number[];
} {
  const categories = new Map<string, StoredCategory>();
  const transactions = new Map<string, StoredTransaction>();
  const batchSizes: number[] = [];

  const adapter: FirebaseRemoteAdapter = {
    async fetchCategoriesSince(sinceIso) {
      const all = Array.from(categories.values());
      if (!sinceIso) {
        return all;
      }
      const sinceMs = Date.parse(sinceIso);
      return all.filter((item) => Date.parse(item.updatedAt) > sinceMs);
    },

    async fetchTransactionsSince(sinceIso) {
      const all = Array.from(transactions.values());
      if (!sinceIso) {
        return all;
      }
      const sinceMs = Date.parse(sinceIso);
      return all.filter((item) => Date.parse(item.updatedAt) > sinceMs);
    },

    async upsertBatch(catChunk, txChunk) {
      batchSizes.push(catChunk.length + txChunk.length);
      for (const cat of catChunk) {
        categories.set(cat.id, { ...cat });
      }
      for (const tx of txChunk) {
        transactions.set(tx.id, { ...tx });
      }
    },
  };

  return { adapter, categories, transactions, batchSizes };
}

describe('firebaseSync engine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('pushes all local categories and 1000+ transactions in batches of <= 450 and skips unchanged items on repeat sync', async () => {
    const local = createLocalStorage({ storageKey: 'sync-batch-test' });
    const now = '2026-11-18T10:00:00.000Z';
    const categories: StoredCategory[] = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      updatedAt: now,
      deletedAt: null,
    }));
    const transactions: StoredTransaction[] = Array.from({ length: 1000 }, (_, index) => ({
      id: `tx-${index + 1}`,
      name: `Expense ${index + 1}`,
      value: 100 + index,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      categoryId: DEFAULT_CATEGORIES[0].id,
    }));

    await local.replaceSnapshot({
      version: 1,
      updatedAt: now,
      categories,
      transactions,
    });

    const remote = createInMemoryRemoteAdapter();
    const upsertSpy = vi.spyOn(remote.adapter, 'upsertBatch');
    const cursorKey = 'sync-cursor-batch-test';
    const syncService = createFirebaseSyncService({
      local,
      remote: remote.adapter,
      cursorKey,
    });

    const summary = await syncService.syncNow();

    expect(summary).toEqual({
      pulledCategories: 0,
      pulledTransactions: 0,
      pushedCategories: 14,
      pushedTransactions: 1000,
    });
    expect(remote.categories.size).toBe(14);
    expect(remote.transactions.size).toBe(1000);
    // 14 + 1000 = 1014 items -> 450 + 450 + 114 = 3 batches
    expect(remote.batchSizes).toEqual([450, 450, 114]);
    expect(remote.batchSizes.every((size) => size <= MAX_FIRESTORE_BATCH_SIZE)).toBe(true);

    const savedCursors = JSON.parse(window.localStorage.getItem(cursorKey) || '{}');
    expect(savedCursors.lastPushedAt).toBe(now);

    // Repeat sync with no changes triggers zero writes
    upsertSpy.mockClear();
    const secondSummary = await syncService.syncNow();
    expect(secondSummary).toEqual({
      pulledCategories: 0,
      pulledTransactions: 0,
      pushedCategories: 0,
      pushedTransactions: 0,
    });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('converges creations, updates (LWW), and soft-deletes across two independent device storages without echo-writing', async () => {
    const sharedRemote = createInMemoryRemoteAdapter();
    const fetchTxSpy = vi.spyOn(sharedRemote.adapter, 'fetchTransactionsSince');
    const upsertSpy = vi.spyOn(sharedRemote.adapter, 'upsertBatch');

    const deviceA = createLocalStorage({ storageKey: 'device-a-storage' });
    const deviceB = createLocalStorage({ storageKey: 'device-b-storage' });

    const syncA = createFirebaseSyncService({
      local: deviceA,
      remote: sharedRemote.adapter,
      cursorKey: 'device-a-cursor',
    });
    const syncB = createFirebaseSyncService({
      local: deviceB,
      remote: sharedRemote.adapter,
      cursorKey: 'device-b-cursor',
    });

    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;

    // Step 1: Device A creates a transaction and syncs
    await deviceA.createTransaction({ name: 'Family Groceries', value: 2500, categoryId: foodId });
    await syncA.syncNow();
    expect(sharedRemote.transactions.size).toBe(1);

    // Step 2: Device B syncs and receives Device A's transaction without echoing it back
    upsertSpy.mockClear();
    const bPullSummary = await syncB.syncNow();
    expect(bPullSummary.pulledTransactions).toBe(1);
    expect(bPullSummary.pushedTransactions).toBe(0);

    const deviceBTxs = await deviceB.getTransactionsByRange({
      from: '2000-01-01T00:00:00.000Z',
      to: '2100-01-01T00:00:00.000Z',
    });
    expect(deviceBTxs).toHaveLength(1);
    const syncedTxId = deviceBTxs[0].id;

    // Step 3: Device B updates it 5ms later, Device A deletes it 10ms later -> A's delete has newer updatedAt (LWW)
    await new Promise((r) => setTimeout(r, 5));
    await deviceB.updateTransaction({
      id: syncedTxId,
      name: 'Edited On B',
      value: 2600,
      categoryId: foodId,
    });
    await syncB.syncNow();

    await new Promise((r) => setTimeout(r, 10));
    await deviceA.removeTransaction(syncedTxId);
    await syncA.syncNow();

    // Device B syncs again using delta cursor and gets the tombstone
    fetchTxSpy.mockClear();
    await syncB.syncNow();
    expect(fetchTxSpy).toHaveBeenCalledWith(expect.any(String));

    const finalB = await deviceB.getTransactionsByRange({
      from: '2000-01-01T00:00:00.000Z',
      to: '2100-01-01T00:00:00.000Z',
    });
    expect(finalB).toEqual([]);
  });

  it('keeps local mutations succeeding when offline and flushes pending changes on next syncNow()', async () => {
    let isOnline = false;
    const remoteState = createInMemoryRemoteAdapter();
    const flakyRemote: FirebaseRemoteAdapter = {
      fetchCategoriesSince: (since) =>
        isOnline ? remoteState.adapter.fetchCategoriesSince(since) : Promise.reject(new Error('Offline')),
      fetchTransactionsSince: (since) =>
        isOnline ? remoteState.adapter.fetchTransactionsSince(since) : Promise.reject(new Error('Offline')),
      upsertBatch: (cats, txs) =>
        isOnline ? remoteState.adapter.upsertBatch(cats, txs) : Promise.reject(new Error('Offline')),
    };

    const rawLocal = createLocalStorage({ storageKey: 'synced-offline-test' });
    const syncService = createFirebaseSyncService({
      local: rawLocal,
      remote: flakyRemote,
      cursorKey: 'synced-offline-cursor',
    });
    const syncedStorage: LocalBudgetStorage = createSyncedLocalStorage(rawLocal, syncService, () => true);

    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;

    // Mutation succeeds locally even though background sync throws Offline
    await expect(
      syncedStorage.createTransaction({ name: 'Offline Lunch', value: 450, categoryId: foodId }),
    ).resolves.toBeUndefined();

    // Wait a tick for background sync attempt to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(remoteState.transactions.size).toBe(0);

    // Come online and run manual syncNow() -> offline transaction is pushed
    isOnline = true;
    const summary = await syncService.syncNow();
    expect(summary.pushedTransactions).toBe(1);
    expect(remoteState.transactions.size).toBe(1);
  });

  it('deduplicates concurrent syncNow() calls into a single in-flight execution and supports resetCursors()', async () => {
    const remoteState = createInMemoryRemoteAdapter();
    let releaseFetch!: () => void;
    const slowRemote: FirebaseRemoteAdapter = {
      fetchCategoriesSince: () =>
        new Promise((resolve) => {
          releaseFetch = () => resolve([]);
        }),
      fetchTransactionsSince: vi.fn().mockResolvedValue([]),
      upsertBatch: vi.fn().mockResolvedValue(undefined),
    };

    const local = createLocalStorage({ storageKey: 'single-flight-sync-test' });
    const cursorKey = 'single-flight-cursor';
    const syncService = createFirebaseSyncService({
      local,
      remote: slowRemote,
      cursorKey,
    });

    const p1 = syncService.syncNow();
    const p2 = syncService.syncNow();

    expect(p1).toBe(p2);
    releaseFetch();
    await Promise.all([p1, p2]);
    expect(slowRemote.fetchTransactionsSince).toHaveBeenCalledTimes(1);

    // Also test resetCursors clears persisted cursor state
    const fastSync = createFirebaseSyncService({
      local,
      remote: remoteState.adapter,
      cursorKey,
    });
    await fastSync.syncNow();
    expect(window.localStorage.getItem(cursorKey)).not.toBeNull();

    fastSync.resetCursors();
    expect(window.localStorage.getItem(cursorKey)).toBeNull();
  });
});
