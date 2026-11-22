import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStorage, type LocalStorageSnapshot } from '@/core/storage';
import {
  exportBackupJson,
  importBackupJson,
  mergeSnapshots,
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
});
