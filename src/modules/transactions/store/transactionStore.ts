import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import dayjs, { type OpUnitType } from 'dayjs';

import { getRangeDates } from '@/core/utils/dates';
import { getStorage, type CreateTransactionInput, type Transaction, type UpdateTransactionInput } from '@/core/storage';

export const useTransactionStore = defineStore('transactionStore', () => {
  const transactions = ref<Transaction[]>([]);
  const error = ref<Error | null>(null);
  const loading = ref<boolean>(false);
  const creating = ref<boolean>(false);
  const transactionsUnit = ref<OpUnitType>('month');
  const transactionItems = ref<UpdateTransactionInput>({ id: '', name: '', value: 0, categoryId: '' });

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

    error.value = null;
    loading.value = true;

    try {
      transactions.value = await getStorage().getTransactionsByRange({
        from: startDate,
        to: endDate,
      });
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  async function createTransaction(payload: CreateTransactionInput): Promise<{ success: boolean }> {
    error.value = null;
    creating.value = true;

    try {
      await getStorage().createTransaction(payload);
      await getTransactionsByRange(transactionsUnit.value);
      return { success: true };
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      return { success: false };
    } finally {
      creating.value = false;
    }
  }

  async function removeTransaction(id: string): Promise<void> {
    error.value = null;
    loading.value = true;

    try {
      await getStorage().removeTransaction(id);
      await getTransactionsByRange(transactionsUnit.value);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  async function updateTransaction(): Promise<{ success: boolean }> {
    error.value = null;
    loading.value = true;

    try {
      await getStorage().updateTransaction(transactionItems.value);
      await getTransactionsByRange(transactionsUnit.value);
      return { success: true };
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      return { success: false };
    } finally {
      loading.value = false;
    }
  }

  function setTransactionItems({ id, name, value, categoryId }: UpdateTransactionInput): void {
    transactionItems.value.id = id;
    transactionItems.value.name = name;
    transactionItems.value.value = value;
    transactionItems.value.categoryId = categoryId;
  }

  return {
    transactions,
    error,
    loading,
    creating,
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
