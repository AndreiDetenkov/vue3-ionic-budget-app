import { defineStore } from 'pinia';
import {
  createTransactionApi,
  getTransactionsByRangeApi,
  RangeInterface,
  TransactionPayload,
  TransactionStoreState,
} from '@/entities/transactions/';
import { Category } from '@/entities/categories';

export const useTransactionStore = defineStore('transactionStore', {
  state: (): TransactionStoreState => ({
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

        this.transactions = data.map((item) => ({
          id: item.id,
          name: item.name,
          value: item.value,
          createdAt: item.created_at,
          categoryId: item.category_id,
          category: { ...item.categories } as unknown as Category,
        }));
      } finally {
        this.loading = false;
      }
    },

    async createTransaction(payload: TransactionPayload): Promise<{ success: boolean }> {
      try {
        this.loading = true;
        const { error } = await createTransactionApi(payload);

        if (error) {
          this.error = error;
          return { success: false };
        }

        return { success: true };
      } finally {
        this.loading = false;
      }
    },

    async removeTransaction(id: number): Promise<void> {
      console.log(id);
    },
  },
});
