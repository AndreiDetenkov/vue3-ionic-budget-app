import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import { Transaction } from '@/modules/transactions/types';

interface CategoryReport {
  name: string;
  value: number;
  categoryId: string;
}

export const useReportStore = defineStore('reportStore', () => {
  const transactionStore = useTransactionStore();

  const calculateCategoryReports = (transactions: Transaction[]): CategoryReport[] => {
    const categoryTotals = transactions.reduce(
      (acc: Record<string, { value: number; categoryId: string }>, transaction: Transaction) => {
        const category = transaction.category.title;

        if (!acc[category]) {
          acc[category] = {
            value: 0,
            categoryId: transaction.category.id,
          };
        }

        acc[category].value += transaction.value;
        return acc;
      },
      {},
    );

    return Object.entries(categoryTotals).map(([name, data]) => ({
      name,
      value: data.value,
      categoryId: data.categoryId,
    }));
  };

  const reports = computed((): CategoryReport[] => {
    return calculateCategoryReports(transactionStore.transactions);
  });

  return { reports };
});
