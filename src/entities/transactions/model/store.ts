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
}

export const useTransactionStore = defineStore('transactionStore', {
  state: (): State => ({
    transactions: null,
    error: null,
  }),
  getters: {},
  actions: {
    async getTransactionsByRange({ from, to }: RangeInterface) {
      try {
        const { data, error } = await getTransactionsByRangeApi({ from, to });
        if (error) {
          this.error = error;
          return;
        }
        this.transactions = data;
      } catch (error: any) {
        console.error(error.error_description || error.message);
      }
    },
  },
});
