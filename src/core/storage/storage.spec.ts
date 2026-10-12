import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInMemoryStorage, createSupabaseStorage, type Category } from '@/core/storage';

const food: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const clothes: Category = { id: 'cat-clothes', title: 'Clothes', icon: 'clothes' };

describe('BudgetStorage adapters', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  describe('createSupabaseStorage', () => {
    it('does not throw on creation when env variables are missing, and throws a descriptive Error on first operation', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

      const storage = createSupabaseStorage();

      await expect(storage.getCategories()).rejects.toThrow('Env variable VITE_SUPABASE_URL is required');

      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      await expect(
        storage.getTransactionsByRange({
          from: '2026-10-01T00:00:00.000Z',
          to: '2026-10-31T23:59:59.999Z',
        }),
      ).rejects.toThrow('Env variable VITE_SUPABASE_PUBLISHABLE_KEY is required');
    });
  });
});
