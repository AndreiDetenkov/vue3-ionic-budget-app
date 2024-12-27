import { defineStore } from 'pinia';
import {
  createTransactionApi,
  getTransactionsByRangeApi,
  removeTransactionApi,
  Transaction,
  TransactionItemsForUpdate,
  TransactionPayload,
  TransactionStoreState,
  updateTransactionApi,
} from '@/entities/transactions/';
import { Category } from '@/entities/categories';
import { getRangeDates } from '@/core/utils/dates';

export const useTransactionStore = defineStore('transactionStore', {
  state: (): TransactionStoreState => ({
    transactions: [],
    error: null,
    loading: false,
    transactionsFilterUnit: 'day',
    transactionItems: { id: '', name: '', value: 0, categoryId: '' },
  }),

  getters: {
    total(state): number {
      if (!state.transactions) return 0;

      return state.transactions.reduce((acc, item) => {
        return acc + item.value;
      }, 0);
    },

    calculatedTransactionsByCategory(state) {
      if (!state.transactions) return [];

      const result = state.transactions.reduce(
        (acc: Record<string, number>, item: Transaction) => {
          const category = item.category.title;

          if (!acc[category]) {
            acc[category] = 0;
          }

          acc[category] += item.value;

          return acc;
        },
        {} as Record<string, number>,
      );

      return Object.entries(result).map(([name, value]) => ({
        name,
        value,
      }));
    },
  },

  actions: {
    async getTransactionsByRange(): Promise<void> {
      const { startDate, endDate } = getRangeDates(this.transactionsFilterUnit);

      try {
        this.loading = true;
        const { data, error } = await getTransactionsByRangeApi({
          from: startDate,
          to: endDate,
        });

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

        await this.getTransactionsByRange();

        return { success: true };
      } finally {
        this.loading = false;
      }
    },

    async removeTransaction(id: string): Promise<void> {
      try {
        this.loading = true;
        const { error } = await removeTransactionApi(id);

        if (error) {
          this.error = error;
          return;
        }

        await this.getTransactionsByRange();
      } finally {
        this.loading = false;
      }
    },

    async updateTransaction(): Promise<{ success: boolean }> {
      try {
        this.loading = true;
        const { error } = await updateTransactionApi(this.transactionItems);

        if (error) {
          this.error = error;
          return { success: false };
        }

        await this.getTransactionsByRange();

        return { success: true };
      } finally {
        this.loading = false;
      }
    },

    setTransactionItems({ id, name, value, categoryId }: TransactionItemsForUpdate): void {
      this.transactionItems.id = id;
      this.transactionItems.name = name;
      this.transactionItems.value = value;
      this.transactionItems.categoryId = categoryId;
    },
  },
});
