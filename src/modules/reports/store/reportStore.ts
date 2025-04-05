import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useTransactionStore, type Transaction } from '@/modules/transactions';
import { CategoryReport } from '@/modules/reports';

export const useReportStore = defineStore('reportStore', () => {
  const transactionStore = useTransactionStore();

  const calculateCategoryReports = (transactions: Transaction[]): CategoryReport[] => {
    const categoryGroups = transactions.reduce((acc: Record<string, CategoryReport>, transaction: Transaction) => {
      const categoryId = transaction.category.id;

      if (!acc[categoryId]) {
        acc[categoryId] = {
          name: transaction.category.title,
          value: 0,
          icon: transaction.category.icon,
          transactions: [],
        };
      }

      acc[categoryId].value += transaction.value;
      acc[categoryId].transactions.push(transaction);
      return acc;
    }, {});

    return Object.entries(categoryGroups).map(([, data]) => ({
      name: data.name,
      value: data.value,
      icon: data.icon,
      transactions: data.transactions,
    }));
  };

  const reports = computed((): CategoryReport[] => {
    return calculateCategoryReports(transactionStore.transactions);
  });

  return { reports };
});
