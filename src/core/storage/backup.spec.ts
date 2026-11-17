import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInMemoryStorage,
  createLocalStorage,
  type BudgetStorage,
  type Category,
  type LocalStorageSnapshot,
} from '@/core/storage';
import {
  createAutoMigratingLocalStorage,
  exportBackupJson,
  importBackupJson,
  mergeSnapshots,
  migrateFromSupabase,
  parseBackupSnapshot,
  serializeBackupSnapshot,
} from './backup';

describe('backup and snapshot merge utilities', () => {
  const foodCategory = {
    id: 'cat-food',
    title: 'Food',
    icon: 'food',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deletedAt: null,
  };

  const clothesCategory = {
    id: 'cat-clothes',
    title: 'Clothes',
    icon: 'clothes',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deletedAt: null,
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('mergeSnapshots', () => {
    it('unions distinct records and resolves conflicts using Last-Write-Wins by updatedAt (incoming wins on tie)', () => {
      const local: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-10T10:00:00.000Z',
        categories: [
          foodCategory,
          {
            ...clothesCategory,
            title: 'Clothes Local Newer',
            updatedAt: '2026-10-05T12:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'tx-local-only',
            name: 'Coffee',
            value: 120,
            createdAt: '2026-10-02T09:00:00.000Z',
            updatedAt: '2026-10-02T09:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
          {
            id: 'tx-local-newer',
            name: 'Lunch Updated Locally',
            value: 500,
            createdAt: '2026-10-03T12:00:00.000Z',
            updatedAt: '2026-10-08T15:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
          {
            id: 'tx-tie',
            name: 'Tie Local',
            value: 200,
            createdAt: '2026-10-04T12:00:00.000Z',
            updatedAt: '2026-10-04T12:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      };

      const incoming: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-11T10:00:00.000Z',
        categories: [
          {
            ...foodCategory,
            title: 'Food & Drinks',
            updatedAt: '2026-10-06T08:00:00.000Z',
          },
          {
            ...clothesCategory,
            title: 'Clothes Older',
            updatedAt: '2026-10-04T12:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'tx-incoming-only',
            name: 'Jacket',
            value: 3000,
            createdAt: '2026-10-05T10:00:00.000Z',
            updatedAt: '2026-10-05T10:00:00.000Z',
            deletedAt: null,
            categoryId: clothesCategory.id,
          },
          {
            id: 'tx-local-newer',
            name: 'Lunch Stale Incoming',
            value: 450,
            createdAt: '2026-10-03T12:00:00.000Z',
            updatedAt: '2026-10-07T15:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
          {
            id: 'tx-tie',
            name: 'Tie Incoming',
            value: 250,
            createdAt: '2026-10-04T12:00:00.000Z',
            updatedAt: '2026-10-04T12:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      };

      const merged = mergeSnapshots(local, incoming);

      expect(merged.version).toBe(1);
      expect(Date.parse(merged.updatedAt)).toBeGreaterThanOrEqual(Date.parse('2026-10-11T10:00:00.000Z'));

      expect(merged.categories).toHaveLength(2);
      expect(merged.categories.find((c) => c.id === 'cat-food')?.title).toBe('Food & Drinks');
      expect(merged.categories.find((c) => c.id === 'cat-clothes')?.title).toBe('Clothes Local Newer');

      expect(merged.transactions).toHaveLength(4);
      expect(merged.transactions.find((t) => t.id === 'tx-local-only')?.name).toBe('Coffee');
      expect(merged.transactions.find((t) => t.id === 'tx-incoming-only')?.name).toBe('Jacket');
      expect(merged.transactions.find((t) => t.id === 'tx-local-newer')?.name).toBe('Lunch Updated Locally');
      expect(merged.transactions.find((t) => t.id === 'tx-tie')?.name).toBe('Tie Incoming');
    });

    it('preserves soft-delete tombstones when newer and restores active records when active updatedAt is newer', () => {
      const local: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-10T10:00:00.000Z',
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-deleted-newer',
            name: 'Should Stay Deleted',
            value: 100,
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-02T10:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
          {
            id: 'tx-restored-newer',
            name: 'Was Deleted Earlier',
            value: 200,
            createdAt: '2026-10-01T11:00:00.000Z',
            updatedAt: '2026-10-03T11:00:00.000Z',
            deletedAt: '2026-10-03T11:00:00.000Z',
            categoryId: foodCategory.id,
          },
        ],
      };

      const incoming: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-12T10:00:00.000Z',
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-deleted-newer',
            name: 'Should Stay Deleted',
            value: 100,
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-05T10:00:00.000Z',
            deletedAt: '2026-10-05T10:00:00.000Z',
            categoryId: foodCategory.id,
          },
          {
            id: 'tx-restored-newer',
            name: 'Restored Actively',
            value: 250,
            createdAt: '2026-10-01T11:00:00.000Z',
            updatedAt: '2026-10-06T11:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      };

      const merged = mergeSnapshots(local, incoming);
      const deletedTx = merged.transactions.find((t) => t.id === 'tx-deleted-newer');
      const restoredTx = merged.transactions.find((t) => t.id === 'tx-restored-newer');

      expect(deletedTx?.deletedAt).toBe('2026-10-05T10:00:00.000Z');
      expect(restoredTx?.deletedAt).toBeNull();
      expect(restoredTx?.name).toBe('Restored Actively');
    });

    it('keeps a valid local record when incoming updatedAt is unparseable', () => {
      const local: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-10T10:00:00.000Z',
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-valid-local',
            name: 'Valid Local Name',
            value: 300,
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-05T10:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      };

      const incoming: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-12T10:00:00.000Z',
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-valid-local',
            name: 'Corrupt Incoming Timestamp',
            value: 999,
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: 'not-a-date',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      };

      const merged = mergeSnapshots(local, incoming);
      expect(merged.transactions[0].name).toBe('Valid Local Name');
      expect(merged.transactions[0].value).toBe(300);
    });
  });

  describe('serializeBackupSnapshot and parseBackupSnapshot', () => {
    it('round-trips a valid version 1 snapshot', () => {
      const snapshot: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-15T12:00:00.000Z',
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-1',
            name: 'Dinner',
            value: 850,
            createdAt: '2026-10-14T19:00:00.000Z',
            updatedAt: '2026-10-14T19:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      };

      const json = serializeBackupSnapshot(snapshot);
      expect(json).toContain('\n');
      expect(parseBackupSnapshot(json)).toEqual(snapshot);
    });

    it('throws descriptive errors for malformed JSON, unsupported version, and invalid records', () => {
      expect(() => parseBackupSnapshot('not-json')).toThrow('Invalid backup JSON');
      expect(() => parseBackupSnapshot('null')).toThrow('Invalid backup JSON');

      expect(() =>
        parseBackupSnapshot(
          JSON.stringify({
            version: 2,
            updatedAt: '2026-10-15T12:00:00.000Z',
            categories: [],
            transactions: [],
          }),
        ),
      ).toThrow('Unsupported backup version');

      expect(() =>
        parseBackupSnapshot(
          JSON.stringify({
            version: 1,
            updatedAt: '2026-10-15T12:00:00.000Z',
            categories: [{ id: '', title: 'Food', icon: 'food', updatedAt: '2026-10-15T12:00:00.000Z' }],
            transactions: [],
          }),
        ),
      ).toThrow('Invalid backup category');

      expect(() =>
        parseBackupSnapshot(
          JSON.stringify({
            version: 1,
            updatedAt: '2026-10-15T12:00:00.000Z',
            categories: [foodCategory],
            transactions: [
              {
                id: 'tx-1',
                name: 'Dinner',
                value: 'invalid',
                createdAt: '2026-10-14T19:00:00.000Z',
                updatedAt: '2026-10-14T19:00:00.000Z',
                categoryId: foodCategory.id,
              },
            ],
          }),
        ),
      ).toThrow('Invalid backup transaction');

      expect(() =>
        parseBackupSnapshot(
          JSON.stringify({
            version: 1,
            updatedAt: 'not-a-date',
            categories: [],
            transactions: [],
          }),
        ),
      ).toThrow('Invalid backup JSON');

      expect(() =>
        parseBackupSnapshot(
          JSON.stringify({
            version: 1,
            updatedAt: '2026-10-15T12:00:00.000Z',
            categories: [
              {
                id: 'cat-1',
                title: 'Food',
                icon: 'food',
                updatedAt: '2026-10-15T12:00:00.000Z',
                deletedAt: 'false',
              },
            ],
            transactions: [],
          }),
        ),
      ).toThrow('Invalid backup category');

      expect(() =>
        parseBackupSnapshot(
          JSON.stringify({
            version: 1,
            updatedAt: '2026-10-15T12:00:00.000Z',
            categories: [foodCategory],
            transactions: [
              {
                id: 'tx-1',
                name: 'Dinner',
                value: 100,
                createdAt: 'not-a-date',
                updatedAt: '2026-10-14T19:00:00.000Z',
                categoryId: foodCategory.id,
              },
            ],
          }),
        ),
      ).toThrow('Invalid backup transaction');

      expect(() =>
        parseBackupSnapshot(
          JSON.stringify({
            version: 1,
            updatedAt: '2026-10-15T12:00:00.000Z',
            categories: [foodCategory],
            transactions: [
              {
                id: 'tx-1',
                name: 'Dinner',
                value: 100,
                createdAt: '2026-10-14T19:00:00.000Z',
                updatedAt: '2026-10-14T19:00:00.000Z',
                deletedAt: '',
                categoryId: foodCategory.id,
              },
            ],
          }),
        ),
      ).toThrow('Invalid backup transaction');
    });
  });

  describe('exportBackupJson and importBackupJson', () => {
    it('exports current snapshot and imports/merges incoming JSON without dropping newer local transactions', async () => {
      const storage = createLocalStorage({
        storageKey: 'backup-export-import-test',
        categories: [foodCategory, clothesCategory],
      });

      await storage.createTransaction({
        name: 'Local Breakfast',
        value: 300,
        categoryId: foodCategory.id,
      });

      const exported = await exportBackupJson(storage);
      const parsedExport = parseBackupSnapshot(exported);
      expect(parsedExport.transactions).toHaveLength(1);

      const incomingJson = serializeBackupSnapshot({
        version: 1,
        updatedAt: '2026-10-20T12:00:00.000Z',
        categories: [foodCategory, clothesCategory],
        transactions: [
          {
            id: 'tx-backup-1',
            name: 'Imported Sneakers',
            value: 4500,
            createdAt: '2026-10-19T12:00:00.000Z',
            updatedAt: '2026-10-19T12:00:00.000Z',
            deletedAt: null,
            categoryId: clothesCategory.id,
          },
          {
            id: 'tx-backup-deleted',
            name: 'Removed Item',
            value: 100,
            createdAt: '2026-10-18T12:00:00.000Z',
            updatedAt: '2026-10-18T13:00:00.000Z',
            deletedAt: '2026-10-18T13:00:00.000Z',
            categoryId: foodCategory.id,
          },
        ],
      });

      const counts = await importBackupJson(storage, incomingJson);
      expect(counts).toEqual({
        categoriesCount: 2,
        transactionsCount: 2,
      });

      const transactions = await storage.getTransactionsByRange({
        from: '2000-01-01T00:00:00.000Z',
        to: '2100-01-01T00:00:00.000Z',
      });
      expect(transactions.map((t) => t.name)).toContain('Local Breakfast');
      expect(transactions.map((t) => t.name)).toContain('Imported Sneakers');
      expect(transactions.map((t) => t.name)).not.toContain('Removed Item');
    });
  });

  describe('migrateFromSupabase', () => {
    it('fetches categories and multi-year transactions in yearly chunks, deduplicates by id, and merges without overwriting newer local edits', async () => {
      const remoteStorage = createInMemoryStorage({
        categories: [
          { id: foodCategory.id, title: 'Food', icon: 'food' },
          { id: clothesCategory.id, title: 'Clothes', icon: 'clothes' },
        ],
        transactions: [
          {
            id: 'tx-2022',
            name: 'Old Train Ticket',
            value: 500,
            createdAt: '2022-05-10T10:00:00.000Z',
            categoryId: foodCategory.id,
            category: { id: foodCategory.id, title: 'Food', icon: 'food' },
          },
          {
            id: 'tx-2025',
            name: 'Winter Coat',
            value: 12000,
            createdAt: '2025-11-15T14:00:00.000Z',
            categoryId: clothesCategory.id,
            category: { id: clothesCategory.id, title: 'Clothes', icon: 'clothes' },
          },
          {
            id: 'tx-edited-locally',
            name: 'Remote Original Name',
            value: 100,
            createdAt: '2024-03-01T10:00:00.000Z',
            categoryId: foodCategory.id,
            category: { id: foodCategory.id, title: 'Food', icon: 'food' },
          },
        ],
      });

      const getTransactionsSpy = vi.spyOn(remoteStorage, 'getTransactionsByRange');

      const localStorageTarget = createLocalStorage({
        storageKey: 'migrate-supabase-test',
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
      });

      await localStorageTarget.replaceSnapshot({
        version: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-edited-locally',
            name: 'Local Updated Name',
            value: 199,
            createdAt: '2024-03-01T10:00:00.000Z',
            updatedAt: '2026-06-01T10:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      });

      const result = await migrateFromSupabase(localStorageTarget, remoteStorage, {
        startYear: 2022,
        endYear: 2026,
      });

      expect(result).toEqual({
        categoriesCount: 2,
        transactionsCount: 3,
      });
      expect(getTransactionsSpy).toHaveBeenCalledTimes(5);
      expect(getTransactionsSpy).toHaveBeenCalledWith({
        from: '2022-01-01T00:00:00.000Z',
        to: '2022-12-31T23:59:59.999Z',
      });

      const migrated = await localStorageTarget.getTransactionsByRange({
        from: '2020-01-01T00:00:00.000Z',
        to: '2027-01-01T00:00:00.000Z',
      });
      expect(migrated).toHaveLength(3);
      expect(migrated.find((t) => t.id === 'tx-2022')?.value).toBe(500);
      expect(migrated.find((t) => t.id === 'tx-2025')?.name).toBe('Winter Coat');
      expect(migrated.find((t) => t.id === 'tx-edited-locally')?.name).toBe('Local Updated Name');
    });

    it('deduplicates transactions when the same transaction id is returned across multiple yearly chunks', async () => {
      const duplicateTx = {
        id: 'tx-overlap',
        name: 'Year Boundary Coffee',
        value: 420,
        createdAt: '2024-12-31T23:59:59.999Z',
        categoryId: foodCategory.id,
        category: { id: foodCategory.id, title: 'Food', icon: 'food' },
      };

      const overlappingRemote: BudgetStorage = {
        getCategories: vi.fn().mockResolvedValue([{ id: foodCategory.id, title: 'Food', icon: 'food' }]),
        getTransactionsByRange: vi.fn().mockResolvedValue([duplicateTx]),
        createTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        removeTransaction: vi.fn(),
      };

      const target = createLocalStorage({
        storageKey: 'migrate-dedupe-test',
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
      });

      const result = await migrateFromSupabase(target, overlappingRemote, {
        startYear: 2024,
        endYear: 2025,
      });

      expect(result).toEqual({
        categoriesCount: 1,
        transactionsCount: 1,
      });

      const snapshot = await target.getSnapshot();
      expect(snapshot.transactions).toHaveLength(1);
      expect(snapshot.transactions[0].id).toBe('tx-overlap');
    });
  });

  describe('createAutoMigratingLocalStorage', () => {
    it('runs one-time auto-migration when local transactions are empty and Supabase env vars are configured', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');

      const remoteStorage = createInMemoryStorage({
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
        transactions: [
          {
            id: 'tx-remote-1',
            name: 'Remote Coffee',
            value: 350,
            createdAt: '2026-10-10T10:00:00.000Z',
            categoryId: foodCategory.id,
            category: { id: foodCategory.id, title: 'Food', icon: 'food' },
          },
        ],
      });
      const getCategoriesSpy = vi.spyOn(remoteStorage, 'getCategories');

      const storage = createAutoMigratingLocalStorage({
        storageKey: 'auto-migrate-test',
        migrationFlagKey: 'auto-migrate-flag-test',
        remoteStorage,
        startYear: 2026,
        endYear: 2026,
      });

      const firstLoad = await storage.getTransactionsByRange({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
      });

      expect(firstLoad).toHaveLength(1);
      expect(firstLoad[0].name).toBe('Remote Coffee');
      expect(window.localStorage.getItem('auto-migrate-flag-test')).toBe('true');
      expect(getCategoriesSpy).toHaveBeenCalledTimes(1);

      // Second read does not re-trigger remote migration
      await storage.getCategories();
      expect(getCategoriesSpy).toHaveBeenCalledTimes(1);
    });

    it('skips auto-migration when Supabase env vars are missing or local transactions already exist', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

      const remoteStorage = createInMemoryStorage({
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
        transactions: [],
      });
      const getCategoriesSpy = vi.spyOn(remoteStorage, 'getCategories');

      const storageNoEnv = createAutoMigratingLocalStorage({
        storageKey: 'auto-migrate-no-env',
        migrationFlagKey: 'auto-migrate-flag-no-env',
        remoteStorage,
        startYear: 2026,
        endYear: 2026,
      });

      await storageNoEnv.getCategories();
      expect(getCategoriesSpy).not.toHaveBeenCalled();

      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');

      const storageWithData = createAutoMigratingLocalStorage({
        storageKey: 'auto-migrate-has-data',
        migrationFlagKey: 'auto-migrate-flag-has-data',
        remoteStorage,
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
        transactions: [
          {
            id: 'tx-local-existing',
            name: 'Existing Local',
            value: 100,
            createdAt: '2026-10-12T10:00:00.000Z',
            categoryId: foodCategory.id,
            category: { id: foodCategory.id, title: 'Food', icon: 'food' },
          },
        ],
        startYear: 2026,
        endYear: 2026,
      });

      const localRows = await storageWithData.getTransactionsByRange({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
      });
      expect(localRows).toHaveLength(1);
      expect(getCategoriesSpy).not.toHaveBeenCalled();
    });

    it('continues operating offline without throwing when auto-migration fails due to network error', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');

      const failingRemote: BudgetStorage = {
        getCategories: vi.fn().mockRejectedValue(new Error('Network offline')),
        getTransactionsByRange: vi.fn().mockRejectedValue(new Error('Network offline')),
        createTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        removeTransaction: vi.fn(),
      };

      const storage = createAutoMigratingLocalStorage({
        storageKey: 'auto-migrate-offline',
        migrationFlagKey: 'auto-migrate-flag-offline',
        remoteStorage: failingRemote,
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
      });

      const categories = await storage.getCategories();
      expect(categories).toHaveLength(1);
      expect(window.localStorage.getItem('auto-migrate-flag-offline')).toBeNull();
    });

    it('waits for in-flight auto-migration inside replaceSnapshot so explicit restore is not overwritten', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');

      let resolveRemoteCategories!: (categories: Category[]) => void;
      const deferredRemote: BudgetStorage = {
        getCategories: vi.fn(
          () =>
            new Promise<Category[]>((resolve) => {
              resolveRemoteCategories = resolve;
            }),
        ),
        getTransactionsByRange: vi.fn().mockResolvedValue([
          {
            id: 'tx-stale-remote',
            name: 'Stale Remote Item',
            value: 100,
            createdAt: '2026-10-01T10:00:00.000Z',
            categoryId: foodCategory.id,
            category: { id: foodCategory.id, title: 'Food', icon: 'food' },
          },
        ]),
        createTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        removeTransaction: vi.fn(),
      };

      const storage = createAutoMigratingLocalStorage({
        storageKey: 'auto-migrate-concurrent-replace',
        migrationFlagKey: 'auto-migrate-flag-concurrent-replace',
        remoteStorage: deferredRemote,
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
        startYear: 2026,
        endYear: 2026,
      });

      // Start initial read (triggers auto-migration and waits on remote getCategories)
      const initialReadPromise = storage.getCategories();
      await vi.waitFor(() => {
        expect(deferredRemote.getCategories).toHaveBeenCalledTimes(1);
      });

      // Call replaceSnapshot while auto-migration is still in flight
      const explicitSnapshot: LocalStorageSnapshot = {
        version: 1,
        updatedAt: '2026-10-20T12:00:00.000Z',
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-explicit-restore',
            name: 'Explicitly Restored',
            value: 999,
            createdAt: '2026-10-15T10:00:00.000Z',
            updatedAt: '2026-10-15T10:00:00.000Z',
            deletedAt: null,
            categoryId: foodCategory.id,
          },
        ],
      };
      const replacePromise = storage.replaceSnapshot(explicitSnapshot);

      // Finish remote auto-migration
      resolveRemoteCategories([{ id: foodCategory.id, title: 'Food', icon: 'food' }]);

      await Promise.all([initialReadPromise, replacePromise]);

      const finalSnapshot = await storage.getSnapshot();
      expect(finalSnapshot.transactions.map((t) => t.id)).toEqual(['tx-explicit-restore']);
    });
  });
});
