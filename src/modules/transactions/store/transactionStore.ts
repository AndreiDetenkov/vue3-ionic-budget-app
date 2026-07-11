import { defineStore } from 'pinia';
import dayjs from 'dayjs';

import { getRangeDates } from '@/core/utils/dates';
import {
  createTransactionApi,
  getTransactionsByRangeApi,
  removeTransactionApi,
  updateTransactionApi,
  TransactionItemsForUpdate,
  TransactionPayload,
  type TransactionStoreState,
  type Transaction,
} from '@/modules/transactions';
import { PostgrestError } from '@supabase/supabase-js';
import type { OpUnitType } from 'dayjs';
import { mappedTransactions } from '@/modules/transactions/utils';

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

    recentTransactions(state): { today: Transaction[]; yesterday: Transaction[] } {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

      const today: Transaction[] = [];
      const yesterday: Transaction[] = [];

      state.transactions.forEach((transaction) => {
        const date = dayjs(transaction.createdAt).format('YYYY-MM-DD');
        if (date === todayStr) {
          today.push(transaction);
        } else if (date === yesterdayStr) {
          yesterday.push(transaction);
        }
      });

      return { today, yesterday };
    },

    transactionsByDate(state) {
      return state.transactions.reduce(
        (acc, item) => {
          const date = item.createdAt.split('T')[0];
          if (!acc[date]) {
            acc[date] = [];
          }

          acc[date].push(item);
          return acc;
        },
        {} as Record<string, Transaction[]>,
      );
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

        this.transactions = mappedTransactions(data);
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
