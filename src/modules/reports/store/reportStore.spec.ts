import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createInMemoryStorage, setStorage, type BudgetStorage, type Category } from '@/core/storage';
import { useReportStore } from './reportStore';

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const sportCategory: Category = { id: 'cat-sport', title: 'Sport', icon: 'sport' };

describe('useReportStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('aggregates Transactions within the Date Range into Category Reports and formats totalAmount', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [foodCategory, sportCategory],
        transactions: [
          {
            id: 'tx-1',
            name: 'Dinner',
            value: 600,
            createdAt: '2026-10-05T12:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-2',
            name: 'Snacks',
            value: 400,
            createdAt: '2026-10-06T12:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-3',
            name: 'Gym membership',
            value: 500,
            createdAt: '2026-10-07T12:00:00.000Z',
            categoryId: sportCategory.id,
            category: sportCategory,
          },
          {
            id: 'tx-out-of-range',
            name: 'September Grocery',
            value: 999,
            createdAt: '2026-09-15T12:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
        ],
      }),
    );

    const store = useReportStore();
    await store.getReports('2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z');

    expect(store.isLoading).toBe(false);
    expect(store.reportList).toEqual([
      {
        name: 'Sport',
        value: 500,
        icon: 'sport',
        transactions: [expect.objectContaining({ id: 'tx-3', value: 500 })],
      },
      {
        name: 'Food',
        value: 1000,
        icon: 'food',
        transactions: [
          expect.objectContaining({ id: 'tx-2', value: 400 }),
          expect.objectContaining({ id: 'tx-1', value: 600 }),
        ],
      },
    ]);
    expect(store.totalAmount).toBe('1 500');
  });

  it('always resets isLoading to false when BudgetStorage throws an Error', async () => {
    const failingStorage: BudgetStorage = {
      ...createInMemoryStorage(),
      async getTransactionsByRange() {
        throw new Error('Storage offline');
      },
    };
    setStorage(failingStorage);

    const store = useReportStore();
    await store.getReports('2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z');

    expect(store.isLoading).toBe(false);
  });
});
