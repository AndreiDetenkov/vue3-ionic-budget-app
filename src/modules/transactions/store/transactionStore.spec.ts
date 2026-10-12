import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import dayjs from 'dayjs';
import { createInMemoryStorage, setStorage, type Category } from '@/core/storage';
import { useTransactionStore } from './transactionStore';

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const housingCategory: Category = { id: 'cat-housing', title: 'Housing', icon: 'housing' };

describe('useTransactionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads Transactions for the selected Date Range, sorts them newest-first, and computes total, recentTransactions, and transactionsByDate', async () => {
    const todayIso = dayjs().hour(10).minute(0).second(0).millisecond(0).toISOString();
    const yesterdayIso = dayjs().subtract(1, 'day').hour(12).minute(0).second(0).millisecond(0).toISOString();
    const lastYearIso = dayjs().subtract(1, 'year').toISOString();

    setStorage(
      createInMemoryStorage({
        categories: [foodCategory, housingCategory],
        transactions: [
          {
            id: 'tx-yesterday',
            name: 'Groceries',
            value: 150,
            createdAt: yesterdayIso,
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-today',
            name: 'Coffee',
            value: 50,
            createdAt: todayIso,
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-old',
            name: 'Old Rent',
            value: 1000,
            createdAt: lastYearIso,
            categoryId: housingCategory.id,
            category: housingCategory,
          },
        ],
      }),
    );

    const store = useTransactionStore();
    expect(store.total).toBe(0);
    expect(store.recentTransactions).toEqual({ today: [], yesterday: [] });
    expect(store.transactionsByDate).toEqual({});

    await store.getTransactionsByRange('year');

    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.transactions.map((t) => t.id)).toEqual(['tx-today', 'tx-yesterday']);
    expect(store.total).toBe(200);
    expect(store.recentTransactions.today.map((t) => t.id)).toEqual(['tx-today']);
    expect(store.recentTransactions.yesterday.map((t) => t.id)).toEqual(['tx-yesterday']);
    expect(Object.keys(store.transactionsByDate)).toContain(todayIso.split('T')[0]);
  });

  it('creates, updates, and removes a Transaction using camelCase domain inputs and refreshes the current Date Range', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [foodCategory, housingCategory],
      }),
    );

    const store = useTransactionStore();

    const createResult = await store.createTransaction({
      name: 'Lunch',
      value: 120,
      categoryId: foodCategory.id,
    });

    expect(createResult).toEqual({ success: true });
    expect(store.creating).toBe(false);
    expect(store.error).toBeNull();
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0]).toMatchObject({
      name: 'Lunch',
      value: 120,
      categoryId: foodCategory.id,
      category: foodCategory,
    });

    const createdId = store.transactions[0].id;
    store.setTransactionItems({
      id: createdId,
      name: 'Team Lunch',
      value: 250,
      categoryId: housingCategory.id,
    });

    const updateResult = await store.updateTransaction();
    expect(updateResult).toEqual({ success: true });
    expect(store.loading).toBe(false);
    expect(store.transactions[0]).toMatchObject({
      id: createdId,
      name: 'Team Lunch',
      value: 250,
      categoryId: housingCategory.id,
      category: housingCategory,
    });

    await store.removeTransaction(createdId);
    expect(store.loading).toBe(false);
    expect(store.transactions).toEqual([]);
  });

  it('records an Error and returns { success: false } when creating or updating a Transaction fails', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [foodCategory],
      }),
    );

    const store = useTransactionStore();

    const createResult = await store.createTransaction({
      name: 'Mystery expense',
      value: 99,
      categoryId: 'unknown-category',
    });

    expect(createResult).toEqual({ success: false });
    expect(store.creating).toBe(false);
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error?.message).toContain('unknown-category');

    store.setTransactionItems({
      id: 'missing-tx',
      name: 'Ghost',
      value: 10,
      categoryId: foodCategory.id,
    });

    const updateResult = await store.updateTransaction();
    expect(updateResult).toEqual({ success: false });
    expect(store.loading).toBe(false);
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error?.message).toContain('missing-tx');
  });
});
