import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useTransactionStore, type Transaction } from '@transactions/index';
import { CategoryReport } from '@reports/index';

export const useReportStore = defineStore('reportStore', () => {
  const transactionStore = useTransactionStore();

  const calculateCategoryReports = (transactions: Transaction[]): CategoryReport[] => {
    const categoryGroups = transactions.reduce(
      (
        acc: Record<
          string,
          {
            name: string;
            value: number;
            transactions: Transaction[];
          }
        >,
        transaction: Transaction,
      ) => {
        const categoryId = transaction.category.id;

        if (!acc[categoryId]) {
          acc[categoryId] = {
            name: transaction.category.title,
            value: 0,
            transactions: [],
          };
        }

        acc[categoryId].value += transaction.value;
        acc[categoryId].transactions.push(transaction);
        return acc;
      },
      {},
    );

    console.log(categoryGroups);

    return Object.entries(categoryGroups).map(([, data]) => ({
      name: data.name,
      value: data.value,
      transactions: data.transactions,
    }));
  };

  const reports = computed((): CategoryReport[] => {
    return calculateCategoryReports(transactionStore.transactions);
  });

  return { reports };
});
