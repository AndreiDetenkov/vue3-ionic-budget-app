import { describe, expect, test, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import dayjs from 'dayjs';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import type { Transaction } from '@/modules/transactions';

const mockCategory = {
  id: 'cat-1',
  title: 'Food',
  icon: 'fast-food-outline',
  created_at: '2026-07-11T00:00:00Z',
};

const createMockTransaction = (id: string, value: number, createdAt: string): Transaction => ({
  id,
  name: `Transaction ${id}`,
  value,
  createdAt,
  categoryId: 'cat-1',
  category: mockCategory,
});

describe('transactionStore computed properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('total', () => {
    test('returns 0 when transactions array is empty', () => {
      const store = useTransactionStore();
      store.transactions = [];
      expect(store.total).toBe(0);
    });

    test('calculates correct total for positive and negative transactions', () => {
      const store = useTransactionStore();
      store.transactions = [
        createMockTransaction('1', 100, '2026-07-11T12:00:00Z'),
        createMockTransaction('2', 250, '2026-07-11T13:00:00Z'),
        createMockTransaction('3', -50, '2026-07-11T14:00:00Z'),
      ];
      expect(store.total).toBe(300);
    });
  });

  describe('recentTransactions', () => {
    test('groups transactions into today and yesterday categories', () => {
      const store = useTransactionStore();

      const todayStr = dayjs().toISOString();
      const yesterdayStr = dayjs().subtract(1, 'day').toISOString();
      const otherDayStr = dayjs().subtract(2, 'days').toISOString();

      const tToday = createMockTransaction('1', 100, todayStr);
      const tYesterday = createMockTransaction('2', 200, yesterdayStr);
      const tOther = createMockTransaction('3', 300, otherDayStr);

      store.transactions = [tToday, tYesterday, tOther];

      expect(store.recentTransactions.today).toEqual([tToday]);
      expect(store.recentTransactions.yesterday).toEqual([tYesterday]);
    });

    test('returns empty arrays when no transactions match today or yesterday', () => {
      const store = useTransactionStore();
      const otherDayStr = dayjs().subtract(2, 'days').toISOString();
      store.transactions = [createMockTransaction('1', 100, otherDayStr)];

      expect(store.recentTransactions.today).toEqual([]);
      expect(store.recentTransactions.yesterday).toEqual([]);
    });
  });

  describe('transactionsByDate', () => {
    test('groups transactions by their date string representation', () => {
      const store = useTransactionStore();

      const t1 = createMockTransaction('1', 100, '2026-07-11T10:00:00Z');
      const t2 = createMockTransaction('2', 150, '2026-07-11T15:30:00Z');
      const t3 = createMockTransaction('3', 200, '2026-07-12T08:00:00Z');

      store.transactions = [t1, t2, t3];

      expect(store.transactionsByDate).toEqual({
        '2026-07-11': [t1, t2],
        '2026-07-12': [t3],
      });
    });

    test('returns empty object when there are no transactions', () => {
      const store = useTransactionStore();
      store.transactions = [];
      expect(store.transactionsByDate).toEqual({});
    });
  });
});
