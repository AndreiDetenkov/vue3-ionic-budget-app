import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalStorage,
  DEFAULT_CATEGORIES,
  importTransactionsCsv,
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

function createFakeIndexedDb(): {
  factory: IDBFactory;
  stores: Map<string, Map<string, unknown>>;
} {
  const stores = new Map<string, Map<string, unknown>>();
  let currentVersion = 0;

  const factory = {
    open(_name: string, version?: number) {
      const targetVersion = version ?? 1;
      const req: Record<string, unknown> = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      const db = {
        objectStoreNames: {
          contains: (storeName: string) => stores.has(storeName),
        },
        createObjectStore: (storeName: string) => {
          if (!stores.has(storeName)) {
            stores.set(storeName, new Map());
          }
          return {};
        },
        transaction: (storeName: string) => {
          const tx: Record<string, unknown> = {
            error: null,
            oncomplete: null,
            onerror: null,
            onabort: null,
            objectStore: (name: string) => {
              const map = stores.get(name);
              if (!map) {
                throw new Error(`Missing object store: ${name}`);
              }
              return {
                get: (key: string) => {
                  const getReq: Record<string, unknown> = {
                    result: undefined,
                    error: null,
                    onsuccess: null,
                    onerror: null,
                  };
                  queueMicrotask(() => {
                    const val = map.get(key);
                    getReq.result = val === undefined ? undefined : structuredClone(val);
                    (getReq.onsuccess as (() => void) | null)?.();
                    (tx.oncomplete as (() => void) | null)?.();
                  });
                  return getReq;
                },
                put: (value: unknown, key: string) => {
                  map.set(key, structuredClone(value));
                  queueMicrotask(() => {
                    (tx.oncomplete as (() => void) | null)?.();
                  });
                  return {};
                },
                delete: (key: string) => {
                  map.delete(key);
                  queueMicrotask(() => {
                    (tx.oncomplete as (() => void) | null)?.();
                  });
                  return {};
                },
              };
            },
          };
          if (!stores.has(storeName)) {
            throw new Error(`Missing object store: ${storeName}`);
          }
          return tx;
        },
        close: () => {},
      };

      req.result = db;
      queueMicrotask(() => {
        if (targetVersion > currentVersion) {
          currentVersion = targetVersion;
          (req.onupgradeneeded as (() => void) | null)?.();
        }
        (req.onsuccess as (() => void) | null)?.();
      });

      return req as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;

  return { factory, stores };
}

describe('firebaseSync engine', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    const fetchCategoriesSpy = vi.spyOn(remote.adapter, 'fetchCategoriesSince');
    const fetchTransactionsSpy = vi.spyOn(remote.adapter, 'fetchTransactionsSince');
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

    // Initial push to empty Firestore sets lastPulledAt immediately to avoid a redundant full pull on Sync 2
    expect(syncService.getCursors().lastPulledAt).toBe(now);
    expect(syncService.getCursors().lastPushedAt).toBe(now);
    const savedCursors = JSON.parse(window.localStorage.getItem(cursorKey) || '{}');
    expect(savedCursors.lastPushedAt).toBe(now);
    expect(savedCursors.lastPulledAt).toBe(now);

    // Second sync uses delta cursor directly and performs zero pulls and zero writes
    fetchCategoriesSpy.mockClear();
    fetchTransactionsSpy.mockClear();
    upsertSpy.mockClear();
    const secondSummary = await syncService.syncNow();
    expect(fetchCategoriesSpy).toHaveBeenCalledWith(now);
    expect(fetchTransactionsSpy).toHaveBeenCalledWith(now);
    expect(secondSummary).toEqual({
      pulledCategories: 0,
      pulledTransactions: 0,
      pushedCategories: 0,
      pushedTransactions: 0,
    });
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(syncService.getCursors().lastPulledAt).toBe(now);
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
    await vi.waitFor(() => expect(releaseFetch).toBeTypeOf('function'));
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

  it('pulls out-of-order offline peer writes created before another device lastPulledAt', async () => {
    const sharedRemote = createInMemoryRemoteAdapter();
    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;

    // Seed remote with an initial anchor at 09:50 so Device A gets a non-null pull cursor
    await sharedRemote.adapter.upsertBatch(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: '1970-01-01T00:00:00.000Z', deletedAt: null })),
      [
        {
          id: 'tx-anchor',
          name: 'Anchor',
          value: 10,
          createdAt: '2026-11-18T09:50:00.000Z',
          updatedAt: '2026-11-18T09:50:00.000Z',
          deletedAt: null,
          categoryId: foodId,
        },
      ],
    );

    const deviceA = createLocalStorage({ storageKey: 'offline-peer-a' });
    const deviceB = createLocalStorage({ storageKey: 'offline-peer-b' });
    const syncA = createFirebaseSyncService({
      local: deviceA,
      remote: sharedRemote.adapter,
      cursorKey: 'cursor-peer-a',
    });
    const syncB = createFirebaseSyncService({
      local: deviceB,
      remote: sharedRemote.adapter,
      cursorKey: 'cursor-peer-b',
    });

    // Device B creates an offline transaction stamped 10:00 before syncing
    await deviceB.replaceSnapshot({
      version: 1,
      updatedAt: '2026-11-18T10:00:00.000Z',
      categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: '1970-01-01T00:00:00.000Z', deletedAt: null })),
      transactions: [
        {
          id: 'tx-offline-b',
          name: 'Offline B Coffee',
          value: 300,
          createdAt: '2026-11-18T10:00:00.000Z',
          updatedAt: '2026-11-18T10:00:00.000Z',
          deletedAt: null,
          categoryId: foodId,
        },
      ],
    });

    // Meanwhile Device C pushed a remote item at 10:05 and Device A pulls it (Device A's lastPulledAt = 10:05)
    await sharedRemote.adapter.upsertBatch(
      [],
      [
        {
          id: 'tx-c',
          name: 'Remote C',
          value: 500,
          createdAt: '2026-11-18T10:05:00.000Z',
          updatedAt: '2026-11-18T10:05:00.000Z',
          deletedAt: null,
          categoryId: foodId,
        },
      ],
    );
    await syncA.syncNow();
    expect(syncA.getCursors().lastPulledAt).toBe('2026-11-18T10:05:00.000Z');

    // Device B comes online and syncs: its 10:00 tx is bumped > 10:05 while preserving 10:00 createdAt
    await syncB.syncNow();

    // Device A's subsequent delta sync must pull Offline B Coffee
    const pullOnA = await syncA.syncNow();
    expect(pullOnA.pulledTransactions).toBeGreaterThanOrEqual(1);
    const txsOnA = await deviceA.getTransactionsByRange({
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-12-01T00:00:00.000Z',
    });
    const offlineBOnA = txsOnA.find((t) => t.id === 'tx-offline-b');
    expect(offlineBOnA).toBeDefined();
    expect(offlineBOnA?.name).toBe('Offline B Coffee');
    expect(offlineBOnA?.createdAt).toBe('2026-11-18T10:00:00.000Z');
  });

  it('pushes historical 2023 CSV imports even after a 2026 sync while preserving 2023 createdAt', async () => {
    const sharedRemote = createInMemoryRemoteAdapter();
    const local = createLocalStorage({ storageKey: 'historical-csv-sync-test' });
    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;
    const syncService = createFirebaseSyncService({
      local,
      remote: sharedRemote.adapter,
      cursorKey: 'historical-csv-cursor',
    });

    await local.createTransaction({ name: 'Recent 2026 Expense', value: 120, categoryId: foodId });
    await syncService.syncNow();
    expect(sharedRemote.transactions.size).toBe(1);

    const csv = [
      'id,created_at,name,value,category_id',
      `tx-csv-2023,2023-08-28 21:22:59.872722+06,Old Taxi,320,${foodId}`,
    ].join('\n');
    await importTransactionsCsv(local, csv);

    const secondSync = await syncService.syncNow();
    expect(secondSync.pushedTransactions).toBe(1);
    expect(sharedRemote.transactions.get('tx-csv-2023')).toMatchObject({
      id: 'tx-csv-2023',
      name: 'Old Taxi',
      value: 320,
      createdAt: '2023-08-28T15:22:59.872Z',
    });
  });

  it('preserves completed batch cursors when a later batch fails and retries only remaining items', async () => {
    const remoteState = createInMemoryRemoteAdapter();
    let failSecondBatch = true;
    let batchCall = 0;

    const flakyRemote: FirebaseRemoteAdapter = {
      fetchCategoriesSince: (s) => remoteState.adapter.fetchCategoriesSince(s),
      fetchTransactionsSince: (s) => remoteState.adapter.fetchTransactionsSince(s),
      async upsertBatch(cats, txs) {
        batchCall += 1;
        if (failSecondBatch && batchCall === 2) {
          throw new Error('Transient network failure on batch 2');
        }
        return remoteState.adapter.upsertBatch(cats, txs);
      },
    };

    const local = createLocalStorage({ storageKey: 'partial-batch-recovery-test' });
    const now = '2026-11-18T10:00:00.000Z';
    const txs: StoredTransaction[] = Array.from({ length: 600 }, (_, i) => ({
      id: `tx-${i + 1}`,
      name: `Item ${i + 1}`,
      value: 100,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      categoryId: DEFAULT_CATEGORIES[0].id,
    }));
    await local.replaceSnapshot({
      version: 1,
      updatedAt: now,
      categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: '1970-01-01T00:00:00.000Z', deletedAt: null })),
      transactions: txs,
    });

    const syncService = createFirebaseSyncService({
      local,
      remote: flakyRemote,
      cursorKey: 'partial-batch-cursor',
    });

    await expect(syncService.syncNow()).rejects.toThrow('Transient network failure on batch 2');
    // Batch 1 (450 items: 14 cats + 436 txs) succeeded before failure, but lastPulledAt stays null until full push completes
    expect(remoteState.transactions.size).toBe(436);
    expect(syncService.getCursors().lastPulledAt).toBeNull();

    failSecondBatch = false;
    const retrySummary = await syncService.syncNow();
    expect(retrySummary.pushedCategories).toBe(0);
    expect(retrySummary.pushedTransactions).toBe(164);
    expect(remoteState.transactions.size).toBe(600);
    expect(syncService.getCursors().lastPulledAt).toBe(now);
  });

  it('schedules a trailing background sync when mutations occur while sync is already in flight', async () => {
    const remoteState = createInMemoryRemoteAdapter();
    let releaseFirstSync!: () => void;
    let fetchCount = 0;

    const controlledRemote: FirebaseRemoteAdapter = {
      fetchCategoriesSince: (since) => {
        fetchCount += 1;
        if (fetchCount === 1) {
          return new Promise<StoredCategory[]>((resolve) => {
            releaseFirstSync = () => resolve([]);
          });
        }
        return remoteState.adapter.fetchCategoriesSince(since);
      },
      fetchTransactionsSince: (since) => remoteState.adapter.fetchTransactionsSince(since),
      upsertBatch: (cats, txs) => remoteState.adapter.upsertBatch(cats, txs),
    };

    const rawLocal = createLocalStorage({ storageKey: 'trailing-bg-sync-test' });
    const syncService = createFirebaseSyncService({
      local: rawLocal,
      remote: controlledRemote,
      cursorKey: 'trailing-bg-cursor',
    });
    const syncedStorage = createSyncedLocalStorage(rawLocal, syncService, () => true);
    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;

    // Start first background sync via createTransaction
    await syncedStorage.createTransaction({ name: 'First Tx', value: 100, categoryId: foodId });
    await vi.waitFor(() => expect(syncService.isSyncInFlight()).toBe(true));

    // Perform update & delete while first sync is still awaiting remote fetch
    const list = await syncedStorage.getTransactionsByRange({
      from: '2000-01-01T00:00:00.000Z',
      to: '2100-01-01T00:00:00.000Z',
    });
    await syncedStorage.updateTransaction({
      id: list[0].id,
      name: 'Updated During Sync',
      value: 200,
      categoryId: foodId,
    });
    await syncedStorage.removeTransaction(list[0].id);

    releaseFirstSync();
    await vi.waitFor(() => expect(fetchCount).toBe(2));
    await vi.waitFor(() => expect(remoteState.transactions.get(list[0].id)?.deletedAt).toBeTruthy());
  });

  it('stores full cursors in IndexedDB without writing to localStorage, migrates legacy cursors, and clears IDB on resetCursors()', async () => {
    const fakeIdb = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', fakeIdb.factory);

    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;
    const legacyTs = '2026-11-18T09:00:00.000Z';
    const newTs = '2026-11-18T10:00:00.000Z';
    const cursorKey = 'idb-sync-cursor-test';

    const local = createLocalStorage({ storageKey: 'idb-sync-local-test' });
    await local.replaceSnapshot({
      version: 1,
      updatedAt: newTs,
      categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: legacyTs, deletedAt: null })),
      transactions: [
        {
          id: 'tx-legacy',
          name: 'Legacy Coffee',
          value: 200,
          createdAt: legacyTs,
          updatedAt: legacyTs,
          deletedAt: null,
          categoryId: foodId,
        },
        {
          id: 'tx-new',
          name: 'New Lunch',
          value: 450,
          createdAt: newTs,
          updatedAt: newTs,
          deletedAt: null,
          categoryId: foodId,
        },
      ],
    });

    const remote = createInMemoryRemoteAdapter();
    await remote.adapter.upsertBatch(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: legacyTs, deletedAt: null })),
      [
        {
          id: 'tx-legacy',
          name: 'Legacy Coffee',
          value: 200,
          createdAt: legacyTs,
          updatedAt: legacyTs,
          deletedAt: null,
          categoryId: foodId,
        },
      ],
    );

    // Seed legacy localStorage cursor prior to IndexedDB migration
    const syncedCategoryMap = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, legacyTs]));
    window.localStorage.setItem(
      cursorKey,
      JSON.stringify({
        lastPulledAt: legacyTs,
        lastPushedAt: legacyTs,
        syncedCategories: syncedCategoryMap,
        syncedTransactions: { 'tx-legacy': legacyTs },
      }),
    );

    const fetchTxSpy = vi.spyOn(remote.adapter, 'fetchTransactionsSince');
    const upsertSpy = vi.spyOn(remote.adapter, 'upsertBatch');

    const service1 = createFirebaseSyncService({ local, remote: remote.adapter, cursorKey });
    const summary1 = await service1.syncNow();

    expect(fetchTxSpy).toHaveBeenCalledWith(legacyTs);
    expect(summary1).toEqual({
      pulledCategories: 0,
      pulledTransactions: 0,
      pushedCategories: 0,
      pushedTransactions: 1,
    });
    // Cursor migrated to IndexedDB and legacy localStorage copy removed
    expect(window.localStorage.getItem(cursorKey)).toBeNull();
    const storedIdbCursor = fakeIdb.stores.get('sync_cursors')?.get(cursorKey) as
      | { lastPulledAt: string | null; lastPushedAt: string | null; syncedTransactions: Record<string, string> }
      | undefined;
    expect(storedIdbCursor?.lastPulledAt).toBe(legacyTs);
    expect(storedIdbCursor?.lastPushedAt).toBe(newTs);
    expect(storedIdbCursor?.syncedTransactions['tx-new']).toBe(newTs);

    // Fresh service instance reads migrated cursor from IndexedDB, advances lastPulledAt to newTs, and does not echo-push
    fetchTxSpy.mockClear();
    upsertSpy.mockClear();
    const service2 = createFirebaseSyncService({ local, remote: remote.adapter, cursorKey });
    const summary2 = await service2.syncNow();
    expect(fetchTxSpy).toHaveBeenCalledWith(legacyTs);
    expect(summary2).toEqual({
      pulledCategories: 0,
      pulledTransactions: 1,
      pushedCategories: 0,
      pushedTransactions: 0,
    });
    expect(upsertSpy).not.toHaveBeenCalled();

    // Subsequent sync queries from newTs with zero pulls and zero pushes
    fetchTxSpy.mockClear();
    const summary3 = await service2.syncNow();
    expect(fetchTxSpy).toHaveBeenCalledWith(newTs);
    expect(summary3).toEqual({
      pulledCategories: 0,
      pulledTransactions: 0,
      pushedCategories: 0,
      pushedTransactions: 0,
    });

    // resetCursors clears IDB and an immediate syncNow on a fresh instance waits for deletion before reading
    service2.resetCursors();
    fetchTxSpy.mockClear();
    const service3 = createFirebaseSyncService({ local, remote: remote.adapter, cursorKey });
    await service3.syncNow();
    expect(fetchTxSpy).toHaveBeenCalledWith(null);
  });

  it('falls back to compact localStorage cursors on QuotaExceededError without losing lastPulledAt or re-pushing synced items', async () => {
    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;
    const now = '2026-11-18T10:00:00.000Z';
    const cursorKey = 'quota-fallback-cursor';

    const local = createLocalStorage({ storageKey: 'quota-fallback-local' });
    const txs: StoredTransaction[] = Array.from({ length: 50 }, (_, index) => ({
      id: `tx-quota-${index + 1}`,
      name: `Quota Item ${index + 1}`,
      value: 100 + index,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      categoryId: foodId,
    }));
    await local.replaceSnapshot({
      version: 1,
      updatedAt: now,
      categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: now, deletedAt: null })),
      transactions: txs,
    });

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === cursorKey && value.length > 256) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

    const remote = createInMemoryRemoteAdapter();
    const fetchTxSpy = vi.spyOn(remote.adapter, 'fetchTransactionsSince');
    const upsertSpy = vi.spyOn(remote.adapter, 'upsertBatch');

    const service1 = createFirebaseSyncService({ local, remote: remote.adapter, cursorKey });
    const firstSummary = await service1.syncNow();
    expect(firstSummary.pushedTransactions).toBe(50);

    const persistedRaw = window.localStorage.getItem(cursorKey);
    expect(persistedRaw).not.toBeNull();
    const parsedCompact = JSON.parse(persistedRaw!);
    expect(parsedCompact).toEqual({
      lastPulledAt: now,
      lastPushedAt: now,
    });

    // Fresh service instance reads compact cursor, queries with lastPulledAt, and does not re-push existing 50 txs
    fetchTxSpy.mockClear();
    upsertSpy.mockClear();
    const service2 = createFirebaseSyncService({ local, remote: remote.adapter, cursorKey });
    const secondSummary = await service2.syncNow();
    expect(fetchTxSpy).toHaveBeenCalledWith(now);
    expect(secondSummary).toEqual({
      pulledCategories: 0,
      pulledTransactions: 0,
      pushedCategories: 0,
      pushedTransactions: 0,
    });
    expect(upsertSpy).not.toHaveBeenCalled();

    // A newly created transaction newer than watermark is pushed alone
    await local.createTransaction({ name: 'After Quota Tx', value: 750, categoryId: foodId });
    const thirdSummary = await service2.syncNow();
    expect(thirdSummary.pushedCategories).toBe(0);
    expect(thirdSummary.pushedTransactions).toBe(1);
  });

  it('does not overwrite cleared cursors when resetCursors() is called during an in-flight syncNow()', async () => {
    const fakeIdb = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', fakeIdb.factory);

    const foodId = DEFAULT_CATEGORIES.find((c) => c.title === 'Food')!.id;
    const remoteTs = '2026-11-18T10:00:00.000Z';
    const cursorKey = 'inflight-reset-cursor';

    let releaseFirstFetch!: () => void;
    let fetchCalls = 0;
    const fetchCategoriesSpy = vi.fn<FirebaseRemoteAdapter['fetchCategoriesSince']>(() => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        return new Promise<StoredCategory[]>((resolve) => {
          releaseFirstFetch = () =>
            resolve([
              {
                id: foodId,
                title: 'Food',
                icon: 'food',
                updatedAt: remoteTs,
                deletedAt: null,
              },
            ]);
        });
      }
      return Promise.resolve([]);
    });

    const remote: FirebaseRemoteAdapter = {
      fetchCategoriesSince: fetchCategoriesSpy,
      fetchTransactionsSince: vi.fn().mockResolvedValue([]),
      upsertBatch: vi.fn().mockResolvedValue(undefined),
    };

    const local = createLocalStorage({ storageKey: 'inflight-reset-local' });
    const service = createFirebaseSyncService({ local, remote, cursorKey });

    const syncPromise = service.syncNow();
    await vi.waitFor(() => expect(releaseFirstFetch).toBeTypeOf('function'));

    // Reset cursors while syncNow() is awaiting remote fetch
    service.resetCursors();

    releaseFirstFetch();
    await syncPromise;

    expect(service.getCursors().lastPulledAt).toBeNull();
    expect(fakeIdb.stores.get('sync_cursors')?.get(cursorKey)).toBeUndefined();

    // Next sync starts from null cursor instead of stale pre-reset timestamp
    await service.syncNow();
    expect(fetchCategoriesSpy).toHaveBeenLastCalledWith(null);
  });
});
