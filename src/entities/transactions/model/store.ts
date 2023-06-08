import { defineStore } from 'pinia';
import {
  RangeInterface,
  getTransactionsByRangeApi,
  TransactionsResponseError,
  TransactionsResponseSuccess,
} from '@/entities/transactions/';

interface State {
  transactions: TransactionsResponseSuccess | null;
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
    transactionList(state): TransactionsResponseSuccess {
      if (!state.transactions) return [];
      const list = [...state.transactions];
      return list.splice(0, 10);
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
      } catch (error: any) {
        console.error(error.error_description || error.message);
      } finally {
        this.loading = false;
      }
    },
  },
});
