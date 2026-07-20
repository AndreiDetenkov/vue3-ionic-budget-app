import { ref, computed } from 'vue';
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
  type Transaction,
} from '@/modules/transactions';
import { PostgrestError } from '@supabase/supabase-js';
import type { OpUnitType } from 'dayjs';
import { mappedTransactions } from '@/modules/transactions/utils';

export const useTransactionStore = defineStore('transactionStore', () => {
  const transactions = ref<Transaction[]>([]);
  const error = ref<PostgrestError | null>(null);
  const loading = ref<boolean>(false);
  const transactionsUnit = ref<OpUnitType>('month');
  const transactionItems = ref<TransactionItemsForUpdate>({ id: '', name: '', value: 0, categoryId: '' });

  const total = computed<number>(() => {
    if (!transactions.value) return 0;

    return transactions.value.reduce((acc, item) => {
      return acc + item.value;
    }, 0);
  });

  const recentTransactions = computed<{ today: Transaction[]; yesterday: Transaction[] }>(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const today: Transaction[] = [];
    const yesterday: Transaction[] = [];

    transactions.value.forEach((transaction) => {
      const date = dayjs(transaction.createdAt).format('YYYY-MM-DD');
      if (date === todayStr) {
        today.push(transaction);
      } else if (date === yesterdayStr) {
        yesterday.push(transaction);
      }
    });

    return { today, yesterday };
  });

  const transactionsByDate = computed<Record<string, Transaction[]>>(() => {
    return transactions.value.reduce(
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
  });

  async function getTransactionsByRange(unit: OpUnitType): Promise<void> {
    transactionsUnit.value = unit;
    const { startDate, endDate } = getRangeDates(unit);

    loading.value = true;

    try {
      const { data, error: apiError } = await getTransactionsByRangeApi({
        from: startDate,
        to: endDate,
      });

      if (apiError instanceof PostgrestError) {
        error.value = apiError;
        return;
      }

      transactions.value = mappedTransactions(data);
    } finally {
      loading.value = false;
    }
  }

  async function createTransaction(payload: TransactionPayload): Promise<{ success: boolean }> {
    try {
      loading.value = true;
      const { error: apiError } = await createTransactionApi(payload);

      if (apiError) {
        error.value = apiError;
        return { success: false };
      }

      await getTransactionsByRange(transactionsUnit.value);

      return { success: true };
    } finally {
      loading.value = false;
    }
  }

  async function removeTransaction(id: string): Promise<void> {
    try {
      loading.value = true;
      const { error: apiError } = await removeTransactionApi(id);

      if (apiError) {
        error.value = apiError;
      } else {
        await getTransactionsByRange(transactionsUnit.value);
      }
    } finally {
      loading.value = false;
    }
  }

  async function updateTransaction(): Promise<{ success: boolean }> {
    try {
      loading.value = true;
      const { error: apiError } = await updateTransactionApi(transactionItems.value);

      if (apiError) {
        error.value = apiError;
        return { success: false };
      }

      await getTransactionsByRange(transactionsUnit.value);

      return { success: true };
    } finally {
      loading.value = false;
    }
  }

  function setTransactionItems({ id, name, value, categoryId }: TransactionItemsForUpdate): void {
    transactionItems.value.id = id;
    transactionItems.value.name = name;
    transactionItems.value.value = value;
    transactionItems.value.categoryId = categoryId;
  }

  return {
    transactions,
    error,
    loading,
    transactionsUnit,
    transactionItems,
    total,
    recentTransactions,
    transactionsByDate,
    getTransactionsByRange,
    createTransaction,
    removeTransaction,
    updateTransaction,
    setTransactionItems,
  };
});
