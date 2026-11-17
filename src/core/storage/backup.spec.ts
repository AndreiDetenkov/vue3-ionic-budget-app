import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStorage, type LocalStorageSnapshot } from '@/core/storage';
import {
  createDevAutoSeedingLocalStorage,
  exportBackupJson,
  importBackupJson,
  importTransactionsCsv,
  mergeSnapshots,
  parseBackupSnapshot,
  parseTransactionsCsv,
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

  describe('parseTransactionsCsv and importTransactionsCsv', () => {
    it('parses Supabase transactions CSV rows, normalizes Postgres timestamps to ISO with T, and resolves DEFAULT_CATEGORIES', async () => {
      const csv = [
        '\uFEFFid,created_at,name,value,category_id',
        '0011b1aa-9c5e-479f-b9aa-39711036c177,2025-06-21 20:59:14.881024+06,Dentist,1600,5cb289ab-2f7b-43bf-be3e-a4b577688333',
        '0028ee73-64e9-4326-87f4-3989fc6e48d0,2023-08-28 21:22:59.872722+06,Taxi,320,2fe6596b-6292-4d8c-826d-5f4d3d99f543',
      ].join('\n');

      const parsed = parseTransactionsCsv(csv);
      expect(parsed).toEqual([
        {
          id: '0011b1aa-9c5e-479f-b9aa-39711036c177',
          name: 'Dentist',
          value: 1600,
          createdAt: '2025-06-21T14:59:14.881Z',
          updatedAt: '2025-06-21T14:59:14.881Z',
          deletedAt: null,
          categoryId: '5cb289ab-2f7b-43bf-be3e-a4b577688333',
        },
        {
          id: '0028ee73-64e9-4326-87f4-3989fc6e48d0',
          name: 'Taxi',
          value: 320,
          createdAt: '2023-08-28T15:22:59.872Z',
          updatedAt: '2023-08-28T15:22:59.872Z',
          deletedAt: null,
          categoryId: '2fe6596b-6292-4d8c-826d-5f4d3d99f543',
        },
      ]);

      const storage = createLocalStorage({ storageKey: 'csv-import-defaults-test' });
      const result = await importTransactionsCsv(storage, csv);
      expect(result).toEqual({
        categoriesCount: 14,
        transactionsCount: 2,
      });

      const imported = await storage.getTransactionsByRange({
        from: '2023-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      });
      expect(imported).toHaveLength(2);
      expect(imported[0].category.title).toBe('Healthcare');
      expect(imported[1].category.title).toBe('Transportation');
    });

    it('handles RFC 4180 quoted fields with commas/escaped quotes and preserves newer local edits on merge', async () => {
      const storage = createLocalStorage({ storageKey: 'csv-merge-test' });
      await storage.replaceSnapshot({
        version: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
        categories: [
          {
            id: '3c3d9f8c-af23-49ed-946c-0d72a2191008',
            title: 'Food',
            icon: 'food',
            updatedAt: '2026-01-01T00:00:00.000Z',
            deletedAt: null,
          },
        ],
        transactions: [
          {
            id: 'tx-newer-local',
            name: 'Locally Edited Bakery',
            value: 450,
            createdAt: '2025-05-01T10:00:00.000Z',
            updatedAt: '2026-05-01T10:00:00.000Z',
            deletedAt: null,
            categoryId: '3c3d9f8c-af23-49ed-946c-0d72a2191008',
          },
        ],
      });

      const csv = [
        'id,created_at,name,value,category_id',
        'tx-quoted,2025-06-01 12:00:00+06,"Coffee, ""Espresso"" & croissant",390,3c3d9f8c-af23-49ed-946c-0d72a2191008',
        'tx-newer-local,2025-05-01 10:00:00+00,Old CSV Name,200,3c3d9f8c-af23-49ed-946c-0d72a2191008',
        'tx-empty-name,2025-05-02 10:00:00+00,,120,3c3d9f8c-af23-49ed-946c-0d72a2191008',
      ].join('\r\n');

      await importTransactionsCsv(storage, csv);

      const transactions = await storage.getTransactionsByRange({
        from: '2025-01-01T00:00:00.000Z',
        to: '2026-12-31T23:59:59.999Z',
      });
      expect(transactions.find((t) => t.id === 'tx-quoted')?.name).toBe('Coffee, "Espresso" & croissant');
      expect(transactions.find((t) => t.id === 'tx-newer-local')?.name).toBe('Locally Edited Bakery');
      expect(transactions.find((t) => t.id === 'tx-empty-name')?.name).toBe('Transaction');
    });

    it('rejects invalid CSV headers, wrong column counts, invalid numbers, and invalid timestamps', () => {
      expect(() => parseTransactionsCsv('')).toThrow(
        'Invalid CSV header: expected id,created_at,name,value,category_id',
      );
      expect(() => parseTransactionsCsv('id,name,value')).toThrow(
        'Invalid CSV header: expected id,created_at,name,value,category_id',
      );
      expect(() => parseTransactionsCsv('id,created_at,name,value,category_id\nonly-two,cols')).toThrow(
        'Invalid CSV row at line 2',
      );
      expect(() =>
        parseTransactionsCsv('id,created_at,name,value,category_id\ntx-1,2025-06-21 10:00:00+06,Food,not-num,cat-1'),
      ).toThrow('Invalid CSV row at line 2');
      expect(() =>
        parseTransactionsCsv('id,created_at,name,value,category_id\ntx-1,not-a-date,Food,100,cat-1'),
      ).toThrow('Invalid CSV row at line 2');
      expect(() =>
        parseTransactionsCsv('id,created_at,name,value,category_id\ntx-1,2025-06-21 10:00:00+06,"Unclosed,100,cat-1'),
      ).toThrow('Invalid CSV row at line 2');
    });
  });

  describe('createDevAutoSeedingLocalStorage', () => {
    const sampleCsv = [
      'id,created_at,name,value,category_id',
      '0011b1aa-9c5e-479f-b9aa-39711036c177,2025-06-21 20:59:14.881024+06,Dentist,1600,5cb289ab-2f7b-43bf-be3e-a4b577688333',
      '0028ee73-64e9-4326-87f4-3989fc6e48d0,2023-08-28 21:22:59.872722+06,Taxi,320,2fe6596b-6292-4d8c-826d-5f4d3d99f543',
    ].join('\n');

    it('auto-imports /transactions_rows.csv once in dev mode when local transactions are empty', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => sampleCsv,
      } as Response);

      const storage = createDevAutoSeedingLocalStorage({
        storageKey: 'dev-auto-seed-empty',
        enabled: true,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const transactions = await storage.getTransactionsByRange({
        from: '2023-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/transactions_rows.csv');
      expect(transactions).toHaveLength(2);
      expect(transactions.map((t) => t.name)).toEqual(['Dentist', 'Taxi']);

      // Subsequent calls do not fetch again
      await storage.getCategories();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('skips fetching CSV when local storage already has transactions or when disabled', async () => {
      const fetchMock = vi.fn();

      const disabledStorage = createDevAutoSeedingLocalStorage({
        storageKey: 'dev-auto-seed-disabled',
        enabled: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });
      await disabledStorage.getCategories();
      expect(fetchMock).not.toHaveBeenCalled();

      const prePopulatedStorage = createDevAutoSeedingLocalStorage({
        storageKey: 'dev-auto-seed-populated',
        enabled: true,
        fetchFn: fetchMock as unknown as typeof fetch,
        categories: [{ id: foodCategory.id, title: 'Food', icon: 'food' }],
        transactions: [
          {
            id: 'tx-existing',
            name: 'Existing Coffee',
            value: 200,
            createdAt: '2026-10-10T10:00:00.000Z',
            categoryId: foodCategory.id,
            category: { id: foodCategory.id, title: 'Food', icon: 'food' },
          },
        ],
      });

      const txList = await prePopulatedStorage.getTransactionsByRange({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-12-31T23:59:59.999Z',
      });
      expect(txList).toHaveLength(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('falls back silently when /transactions_rows.csv is not found (404) or fetch throws', async () => {
      const fetch404 = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const storage = createDevAutoSeedingLocalStorage({
        storageKey: 'dev-auto-seed-404',
        enabled: true,
        fetchFn: fetch404 as unknown as typeof fetch,
      });

      const categories = await storage.getCategories();
      expect(categories).toHaveLength(14);
      expect(fetch404).toHaveBeenCalledTimes(1);
    });
  });
});
