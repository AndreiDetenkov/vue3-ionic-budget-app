import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInMemoryStorage, createLocalStorage, DEFAULT_CATEGORIES, type Category } from '@/core/storage';

const food: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const clothes: Category = { id: 'cat-clothes', title: 'Clothes', icon: 'clothes' };

describe('BudgetStorage adapters', () => {
  describe('createInMemoryStorage', () => {
    it('sorts Categories alphabetically by title ascending and filters Transactions inclusively by Date Range sorted by createdAt descending', async () => {
      const storage = createInMemoryStorage({
        categories: [food, clothes],
        transactions: [
          {
            id: 'tx-start',
            name: 'Boundary Start',
            value: 100,
            createdAt: '2026-10-01T00:00:00.000Z',
            categoryId: food.id,
            category: food,
          },
          {
            id: 'tx-end',
            name: 'Boundary End',
            value: 200,
            createdAt: '2026-10-31T23:59:59.999Z',
            categoryId: clothes.id,
            category: clothes,
          },
          {
            id: 'tx-before',
            name: 'Before Range',
            value: 50,
            createdAt: '2026-09-30T23:59:59.999Z',
            categoryId: food.id,
            category: food,
          },
        ],
      });

      const categories = await storage.getCategories();
      expect(categories.map((c) => c.title)).toEqual(['Clothes', 'Food']);

      const result = await storage.getTransactionsByRange({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
      });

      expect(result.map((t) => t.id)).toEqual(['tx-end', 'tx-start']);
    });

    it('generates non-colliding id and createdAt, updates valid Transactions, enforces Category referential integrity, and is idempotent on removeTransaction', async () => {
      const storage = createInMemoryStorage({
        categories: [food, clothes],
        transactions: [
          {
            id: 'tx-2',
            name: 'Pre-seeded tx-2',
            value: 10,
            createdAt: '2026-10-01T00:00:00.000Z',
            categoryId: food.id,
            category: food,
          },
        ],
      });

      await expect(
        storage.createTransaction({
          name: 'Invalid Category Tx',
          value: 40,
          categoryId: 'non-existent-category',
        }),
      ).rejects.toThrow('Category not found: non-existent-category');

      await storage.createTransaction({
        name: 'Valid Tx',
        value: 40,
        categoryId: food.id,
      });

      const allAfterCreate = await storage.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      expect(allAfterCreate).toHaveLength(2);
      const createdTx = allAfterCreate.find((t) => t.name === 'Valid Tx')!;
      expect(createdTx.id).not.toBe('tx-2');
      expect(Number.isNaN(Date.parse(createdTx.createdAt))).toBe(false);

      await storage.updateTransaction({
        id: createdTx.id,
        name: 'Updated Valid Tx',
        value: 95,
        categoryId: clothes.id,
      });

      const allAfterUpdate = await storage.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      const updatedTx = allAfterUpdate.find((t) => t.id === createdTx.id)!;
      expect(updatedTx).toMatchObject({
        id: createdTx.id,
        name: 'Updated Valid Tx',
        value: 95,
        categoryId: clothes.id,
        category: clothes,
      });

      await expect(
        storage.updateTransaction({
          id: createdTx.id,
          name: 'Updated with bad category',
          value: 80,
          categoryId: 'non-existent-category',
        }),
      ).rejects.toThrow('Category not found: non-existent-category');

      await expect(
        storage.updateTransaction({
          id: 'non-existent-id',
          name: 'Missing id',
          value: 80,
          categoryId: food.id,
        }),
      ).rejects.toThrow('Transaction not found: non-existent-id');

      // Idempotent removal of unknown and known IDs
      await expect(storage.removeTransaction('non-existent-id')).resolves.toBeUndefined();
      await expect(storage.removeTransaction(createdTx.id)).resolves.toBeUndefined();
      await expect(storage.removeTransaction('tx-2')).resolves.toBeUndefined();

      const afterRemove = await storage.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      expect(afterRemove).toEqual([]);
    });
  });

  describe('createLocalStorage', () => {
    const testKey = 'budget-local-storage-test';

    function createFakeIndexedDb(
      options: {
        failWrites?: boolean;
        initialVersion?: number;
        initialStores?: Record<string, Map<string, unknown>>;
      } = {},
    ) {
      const stores = new Map<string, Map<string, unknown>>(
        Object.entries(options.initialStores ?? {}).map(([name, entries]) => [name, new Map(entries)]),
      );
      let currentVersion = options.initialVersion ?? 0;

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
                      queueMicrotask(() => {
                        if (options.failWrites) {
                          tx.error = new DOMException('IDB write failed', 'AbortError');
                          (tx.onerror as (() => void) | null)?.();
                          return;
                        }
                        map.set(key, structuredClone(value));
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

    beforeEach(() => {
      window.localStorage.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('seeds DEFAULT_CATEGORIES with original Supabase UUIDs and English titles when storage is empty', async () => {
      const storage = createLocalStorage({ storageKey: testKey });
      const categories = await storage.getCategories();

      expect(categories).toHaveLength(14);
      expect(categories).toEqual([...DEFAULT_CATEGORIES].sort((a, b) => a.title.localeCompare(b.title)));
      expect(categories.find((c) => c.title === 'Food')).toEqual({
        id: '3c3d9f8c-af23-49ed-946c-0d72a2191008',
        title: 'Food',
        icon: 'food',
      });
    });

    it('creates transactions with UUID, persists across instances, updates updatedAt, and soft-deletes via deletedAt in snapshot', async () => {
      const firstInstance = createLocalStorage({
        storageKey: testKey,
        categories: [food, clothes],
      });

      await expect(
        firstInstance.createTransaction({
          name: 'Invalid Category Tx',
          value: 25,
          categoryId: 'missing-category',
        }),
      ).rejects.toThrow('Category not found: missing-category');

      await firstInstance.createTransaction({
        name: 'Groceries',
        value: 150,
        categoryId: food.id,
      });

      const secondInstance = createLocalStorage({ storageKey: testKey });
      const listed = await secondInstance.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });

      expect(listed).toHaveLength(1);
      const created = listed[0];
      expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(created.name).toBe('Groceries');
      expect(created.value).toBe(150);
      expect(created.category).toEqual(food);

      const snapshotBeforeUpdate = await secondInstance.getSnapshot();
      const storedBeforeUpdate = snapshotBeforeUpdate.transactions.find((t) => t.id === created.id)!;
      expect(storedBeforeUpdate.deletedAt).toBeNull();

      await secondInstance.updateTransaction({
        id: created.id,
        name: 'Jacket',
        value: 320,
        categoryId: clothes.id,
      });

      const afterUpdate = await secondInstance.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      expect(afterUpdate[0]).toMatchObject({
        id: created.id,
        name: 'Jacket',
        value: 320,
        categoryId: clothes.id,
        category: clothes,
      });

      const snapshotAfterUpdate = await secondInstance.getSnapshot();
      const storedAfterUpdate = snapshotAfterUpdate.transactions.find((t) => t.id === created.id)!;
      expect(Date.parse(storedAfterUpdate.updatedAt)).toBeGreaterThanOrEqual(Date.parse(storedBeforeUpdate.updatedAt));

      // Soft-delete hides transaction from getTransactionsByRange and blocks updates, but keeps tombstone in snapshot
      await secondInstance.removeTransaction(created.id);
      await expect(secondInstance.removeTransaction(created.id)).resolves.toBeUndefined();
      await expect(secondInstance.removeTransaction('non-existent')).resolves.toBeUndefined();

      const afterRemove = await secondInstance.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      expect(afterRemove).toEqual([]);

      await expect(
        secondInstance.updateTransaction({
          id: created.id,
          name: 'Should Fail',
          value: 10,
          categoryId: food.id,
        }),
      ).rejects.toThrow(`Transaction not found: ${created.id}`);

      const snapshotAfterRemove = await secondInstance.getSnapshot();
      const tombstone = snapshotAfterRemove.transactions.find((t) => t.id === created.id)!;
      expect(tombstone.deletedAt).toBeTruthy();
    });

    it('replaces snapshot via replaceSnapshot and filters out soft-deleted categories and transactions', async () => {
      const storage = createLocalStorage({ storageKey: testKey });

      await storage.replaceSnapshot({
        version: 1,
        updatedAt: '2026-10-15T12:00:00.000Z',
        categories: [
          { ...food, updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null },
          { ...clothes, updatedAt: '2026-10-02T00:00:00.000Z', deletedAt: '2026-10-03T00:00:00.000Z' },
        ],
        transactions: [
          {
            id: 'tx-active',
            name: 'Lunch',
            value: 45,
            createdAt: '2026-10-10T10:00:00.000Z',
            updatedAt: '2026-10-10T10:00:00.000Z',
            deletedAt: null,
            categoryId: food.id,
          },
          {
            id: 'tx-deleted',
            name: 'Deleted Dinner',
            value: 90,
            createdAt: '2026-10-11T10:00:00.000Z',
            updatedAt: '2026-10-12T10:00:00.000Z',
            deletedAt: '2026-10-12T10:00:00.000Z',
            categoryId: food.id,
          },
        ],
      });

      const categories = await storage.getCategories();
      expect(categories).toEqual([food]);

      const transactions = await storage.getTransactionsByRange({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
      });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].id).toBe('tx-active');
    });

    it('stores snapshots in IndexedDB without duplicating to localStorage and migrates legacy localStorage snapshots', async () => {
      const fakeIdb = createFakeIndexedDb();
      vi.stubGlobal('indexedDB', fakeIdb.factory);

      const legacyKey = 'budget-idb-migration-test';
      window.localStorage.setItem(
        legacyKey,
        JSON.stringify({
          version: 1,
          updatedAt: '2026-10-15T12:00:00.000Z',
          categories: [{ ...food, updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null }],
          transactions: [
            {
              id: 'tx-legacy-1',
              name: 'Legacy Coffee',
              value: 150,
              createdAt: '2026-10-10T10:00:00.000Z',
              updatedAt: '2026-10-10T10:00:00.000Z',
              deletedAt: null,
              categoryId: food.id,
            },
          ],
        }),
      );

      const storage1 = createLocalStorage({ storageKey: legacyKey });
      await storage1.createTransaction({ name: 'Fresh IDB Tx', value: 250, categoryId: food.id });

      // Legacy localStorage copy is removed and not rewritten on IndexedDB success
      expect(window.localStorage.getItem(legacyKey)).toBeNull();
      const storedIdbSnapshot = fakeIdb.stores.get('snapshots')?.get(legacyKey) as
        { transactions: Array<{ name: string }> } | undefined;
      expect(storedIdbSnapshot?.transactions.map((t) => t.name)).toEqual(['Legacy Coffee', 'Fresh IDB Tx']);

      // Fresh instance reads migrated + newly created data directly from IndexedDB
      const storage2 = createLocalStorage({ storageKey: legacyKey });
      const loaded = await storage2.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      expect(loaded.map((t) => t.name)).toEqual(['Fresh IDB Tx', 'Legacy Coffee']);
      expect(window.localStorage.getItem(legacyKey)).toBeNull();
    });

    it('falls back to window.localStorage when IndexedDB writes fail', async () => {
      const fakeIdb = createFakeIndexedDb({ failWrites: true });
      vi.stubGlobal('indexedDB', fakeIdb.factory);

      const fallbackKey = 'budget-idb-fail-fallback';
      const storage1 = createLocalStorage({ storageKey: fallbackKey, categories: [food] });
      await storage1.createTransaction({ name: 'Fallback Tx', value: 420, categoryId: food.id });

      expect(window.localStorage.getItem(fallbackKey)).not.toBeNull();
      const storage2 = createLocalStorage({ storageKey: fallbackKey });
      const loaded = await storage2.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      expect(loaded.map((t) => t.name)).toEqual(['Fallback Tx']);
    });

    it('upgrades an existing v1 IndexedDB to v2 while preserving snapshots and creating sync_cursors', async () => {
      const upgradeKey = 'budget-v1-upgrade-test';
      const fakeIdb = createFakeIndexedDb({
        initialVersion: 1,
        initialStores: {
          snapshots: new Map([
            [
              upgradeKey,
              {
                version: 1,
                updatedAt: '2026-10-15T12:00:00.000Z',
                categories: [{ ...food, updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null }],
                transactions: [
                  {
                    id: 'tx-v1-1',
                    name: 'Existing V1 Tx',
                    value: 190,
                    createdAt: '2026-10-10T10:00:00.000Z',
                    updatedAt: '2026-10-10T10:00:00.000Z',
                    deletedAt: null,
                    categoryId: food.id,
                  },
                ],
              },
            ],
          ]),
        },
      });
      vi.stubGlobal('indexedDB', fakeIdb.factory);

      const storage = createLocalStorage({ storageKey: upgradeKey });
      const loaded = await storage.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });

      expect(loaded.map((t) => t.name)).toEqual(['Existing V1 Tx']);
      expect(fakeIdb.stores.has('snapshots')).toBe(true);
      expect(fakeIdb.stores.has('sync_cursors')).toBe(true);
    });
  });
});
