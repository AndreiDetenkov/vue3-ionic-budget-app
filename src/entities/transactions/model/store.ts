import { defineStore } from 'pinia';
import {
  RangeInterface,
  TransactionsResponseError,
  CreateTransactionPayload,
  createTransactionApi,
  getTransactionsByRangeApi,
  TransactionWithCategory,
} from '@/entities/transactions/';

interface State {
  transactions: TransactionWithCategory[] | null;
  error: TransactionsResponseError | null;
  loading: boolean;
}

export const useTransactionStore = defineStore('transactionStore', {
  state: (): State => ({
    transactions: null,
    error: null,
    loading: false,
  }),

  getters: {
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
