import { defineStore } from 'pinia';
import {
  RangeInterface,
  getTransactionsByRangeApi,
  TransactionsResponseError,
  TransactionsResponseSuccess,
  CreateTransactionPayload,
  createTransactionApi,
  TransactionWithCategory,
} from '@/entities/transactions/';
import { getCurrentMonthDates } from '@/shared/dates';

interface State {
  transactions: TransactionsResponseSuccess;
  error: TransactionsResponseError;
  loading: boolean;
}

export const useTransactionStore = defineStore('transactionStore', {
  state: (): State => ({
    transactions: null,
    error: null,
    loading: false,
  }),
  getters: {
    recentTransactions(state): TransactionWithCategory[] {
      if (!state.transactions) return [];
      else {
        const list = [...state.transactions];
        return list.splice(0, 20) as TransactionWithCategory[];
      }
    },
    total(state): number {
      if (!state.transactions) return 0;
      return state.transactions.reduce((acc, item) => {
        return acc + item.value;
      }, 0);
    },
  },
  actions: {
    async getTransactionsByRange({ from, to }: RangeInterface): Promise<void> {
      try {
        this.loading = true;
        const { data, error } = await getTransactionsByRangeApi({ from, to });
        if (error) {
          this.error = error;
          return;
        }
        this.transactions = data;
      } finally {
        this.loading = false;
      }
    },
    async createTransaction(payload: CreateTransactionPayload): Promise<{ success: boolean }> {
      const { error } = await createTransactionApi(payload);

      if (error) {
        this.error = error;
        return { success: false };
      }

      const { startDate, endDate } = getCurrentMonthDates();
      await getTransactionsByRangeApi({ from: startDate, to: endDate });
      return { success: true };
    },
  },
});
