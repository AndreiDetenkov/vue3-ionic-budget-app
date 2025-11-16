import { defineStore } from 'pinia';

import { getRangeDates } from '@/core/utils/dates';
import {
  createTransactionApi,
  getTransactionsByRangeApi,
  removeTransactionApi,
  updateTransactionApi,
  TransactionItemsForUpdate,
  TransactionPayload,
  TransactionStoreState,
} from '@/modules/transactions';
import { PostgrestError } from '@supabase/supabase-js';
import type { OpUnitType } from 'dayjs';

export const useTransactionStore = defineStore('transactionStore', {
  state: (): TransactionStoreState => ({
    transactions: [],
    error: null,
    loading: false,
    transactionsUnit: 'month',
    transactionItems: { id: '', name: '', value: 0, categoryId: '' },
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
    async getTransactionsByRange(unit: OpUnitType): Promise<void> {
      this.transactionsUnit = unit;
      const { startDate, endDate } = getRangeDates(unit);

      try {
        this.loading = true;
        const { data, error } = await getTransactionsByRangeApi({
          from: startDate,
          to: endDate,
        });

        if (error instanceof PostgrestError) {
          this.error = error;
          return;
        }

        if (data) {
          this.transactions = data.map((item) => ({
            id: item.id,
            name: item.name,
            value: item.value,
            createdAt: item.created_at,
            categoryId: item.category_id,
            category: {
              id: item.categories.id,
              title: item.categories.title,
              icon: item.categories.icon,
            },
          }));
        }
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

        await this.getTransactionsByRange(this.transactionsUnit);

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

        await this.getTransactionsByRange(this.transactionsUnit);
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

        await this.getTransactionsByRange(this.transactionsUnit);

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
