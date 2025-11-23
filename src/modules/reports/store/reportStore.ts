import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useTransactionStore, type Transaction } from '@/modules/transactions';
import { Report } from '@/modules/reports';

export const useReportStore = defineStore('reportStore', () => {
  const transactionStore = useTransactionStore();

  const reports = computed((): Report[] => {
    const categoryGroups = transactionStore.transactions.reduce(
      (acc: Record<string, Report>, transaction: Transaction) => {
        const categoryId = transaction.category.id;

        if (!acc[categoryId]) {
          acc[categoryId] = {
            name: transaction.category.title,
            value: 0,
            icon: transaction.category.icon ?? '',
            transactions: [],
          };
        }

        acc[categoryId].value += transaction.value;
        acc[categoryId].transactions.push(transaction);
        return acc;
      },
      {},
    );

    return Object.entries(categoryGroups).map(([, data]) => ({
      name: data.name,
      value: data.value,
      icon: data.icon,
      transactions: data.transactions,
    }));
  });

  return { reports };
});
