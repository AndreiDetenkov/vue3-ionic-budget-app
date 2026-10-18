import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createInMemoryStorage, setStorage, type BudgetStorage, type Category, type Transaction } from '@/core/storage';
import { useReportStore } from './reportStore';

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const sportCategory: Category = { id: 'cat-sport', title: 'Sport', icon: 'sport' };

describe('useReportStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with selectedPeriod = "currentMonth", empty reportList, and deterministic string totalAmount ("0") without exposing raw state', () => {
    setStorage(createInMemoryStorage());

    const store = useReportStore();

    expect(store.selectedPeriod).toBe('currentMonth');
    expect(store.isLoading).toBe(false);
    expect(store.reportList).toEqual([]);
    expect(store.totalAmount).toBe('0');
    expect('getReports' in store).toBe(false);
    expect('reports' in store).toBe(false);
  });

  it('aggregates Transactions within the active period into Category Reports and formats totalAmount on refreshReports()', async () => {
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
    await store.refreshReports();

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

  it('switches selectedPeriod via setPeriod() and recalculates Category Reports across lastMonth, currentYear, lastYear, and currentMonth', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [foodCategory, sportCategory],
        transactions: [
          {
            id: 'tx-current-month',
            name: 'October Dinner',
            value: 600,
            createdAt: '2026-10-05T12:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-last-month',
            name: 'September Grocery',
            value: 900,
            createdAt: '2026-09-15T12:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-earlier-current-year',
            name: 'March Gym',
            value: 1200,
            createdAt: '2026-03-10T12:00:00.000Z',
            categoryId: sportCategory.id,
            category: sportCategory,
          },
          {
            id: 'tx-last-year',
            name: '2025 Equipment',
            value: 2500,
            createdAt: '2025-07-20T12:00:00.000Z',
            categoryId: sportCategory.id,
            category: sportCategory,
          },
        ],
      }),
    );

    const store = useReportStore();

    await store.setPeriod('lastMonth');
    expect(store.selectedPeriod).toBe('lastMonth');
    expect(store.totalAmount).toBe('900');
    expect(store.reportList).toEqual([
      {
        name: 'Food',
        value: 900,
        icon: 'food',
        transactions: [expect.objectContaining({ id: 'tx-last-month', value: 900 })],
      },
    ]);

    await store.setPeriod('currentYear');
    expect(store.selectedPeriod).toBe('currentYear');
    expect(store.totalAmount).toBe('2 700');
    expect(store.reportList).toEqual([
      {
        name: 'Food',
        value: 1500,
        icon: 'food',
        transactions: [
          expect.objectContaining({ id: 'tx-current-month', value: 600 }),
          expect.objectContaining({ id: 'tx-last-month', value: 900 }),
        ],
      },
      {
        name: 'Sport',
        value: 1200,
        icon: 'sport',
        transactions: [expect.objectContaining({ id: 'tx-earlier-current-year', value: 1200 })],
      },
    ]);

    await store.setPeriod('lastYear');
    expect(store.selectedPeriod).toBe('lastYear');
    expect(store.totalAmount).toBe('2 500');
    expect(store.reportList).toEqual([
      {
        name: 'Sport',
        value: 2500,
        icon: 'sport',
        transactions: [expect.objectContaining({ id: 'tx-last-year', value: 2500 })],
      },
    ]);

    await store.setPeriod('currentMonth');
    expect(store.selectedPeriod).toBe('currentMonth');
    expect(store.totalAmount).toBe('600');
    expect(store.reportList).toEqual([
      {
        name: 'Food',
        value: 600,
        icon: 'food',
        transactions: [expect.objectContaining({ id: 'tx-current-month', value: 600 })],
      },
    ]);
  });

  it('synchronizes Category Reports when refreshReports() is called after creating, updating, or removing Transactions in BudgetStorage', async () => {
    const storage = createInMemoryStorage({
      categories: [foodCategory, sportCategory],
      transactions: [
        {
          id: 'tx-1',
          name: 'Lunch',
          value: 500,
          createdAt: '2026-10-10T12:00:00.000Z',
          categoryId: foodCategory.id,
          category: foodCategory,
        },
      ],
    });
    setStorage(storage);

    const store = useReportStore();
    await store.refreshReports();
    expect(store.totalAmount).toBe('500');

    await storage.createTransaction({
      name: 'Yoga',
      value: 700,
      categoryId: sportCategory.id,
    });
    await storage.updateTransaction({
      id: 'tx-1',
      name: 'Lunch Updated',
      value: 800,
      categoryId: foodCategory.id,
    });

    await store.refreshReports();
    expect(store.totalAmount).toBe('1 500');
    expect(store.reportList).toEqual([
      {
        name: 'Sport',
        value: 700,
        icon: 'sport',
        transactions: [expect.objectContaining({ name: 'Yoga', value: 700 })],
      },
      {
        name: 'Food',
        value: 800,
        icon: 'food',
        transactions: [expect.objectContaining({ id: 'tx-1', name: 'Lunch Updated', value: 800 })],
      },
    ]);

    await storage.removeTransaction('tx-1');
    await store.refreshReports();
    expect(store.totalAmount).toBe('700');
    expect(store.reportList).toEqual([
      {
        name: 'Sport',
        value: 700,
        icon: 'sport',
        transactions: [expect.objectContaining({ name: 'Yoga', value: 700 })],
      },
    ]);
  });

  it('always resets isLoading to false and clears reports when BudgetStorage throws an Error', async () => {
    const failingStorage: BudgetStorage = {
      ...createInMemoryStorage(),
      async getTransactionsByRange() {
        throw new Error('Storage offline');
      },
    };
    setStorage(failingStorage);

    const store = useReportStore();
    await store.refreshReports();

    expect(store.isLoading).toBe(false);
    expect(store.reportList).toEqual([]);
    expect(store.totalAmount).toBe('0');
  });

  it('ignores stale out-of-order responses when setPeriod() is called concurrently', async () => {
    const resolvers: Array<(value: Transaction[]) => void> = [];
    const slowStorage: BudgetStorage = {
      ...createInMemoryStorage(),
      getTransactionsByRange() {
        return new Promise<Transaction[]>((resolve) => {
          resolvers.push(resolve);
        });
      },
    };
    setStorage(slowStorage);

    const store = useReportStore();

    const firstCall = store.setPeriod('lastYear');
    const secondCall = store.setPeriod('lastMonth');

    expect(store.selectedPeriod).toBe('lastMonth');
    expect(store.isLoading).toBe(true);

    // Resolve the second (newer) request first
    resolvers[1]([
      {
        id: 'tx-last-month',
        name: 'September Grocery',
        value: 900,
        createdAt: '2026-09-15T12:00:00.000Z',
        categoryId: foodCategory.id,
        category: foodCategory,
      },
    ]);
    await secondCall;

    expect(store.isLoading).toBe(false);
    expect(store.totalAmount).toBe('900');

    // Resolve the first (stale) request afterwards — should be ignored
    resolvers[0]([
      {
        id: 'tx-last-year',
        name: '2025 Equipment',
        value: 2500,
        createdAt: '2025-07-20T12:00:00.000Z',
        categoryId: sportCategory.id,
        category: sportCategory,
      },
    ]);
    await firstCall;

    expect(store.totalAmount).toBe('900');
  });
});
