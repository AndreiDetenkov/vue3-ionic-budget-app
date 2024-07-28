import { defineStore } from 'pinia';
import {
  RangeInterface,
  TransactionsResponseError,
  TransactionsResponseSuccess,
  CreateTransactionPayload,
  TransactionWithCategory,
  createTransactionApi,
  getTransactionsByRangeApi,
} from '@/entities/transactions/';

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
      if (!state.transactions) {
        return [];
      }

      return state.transactions.slice(0, 20);
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

      return { success: true };
    },
  },
});
