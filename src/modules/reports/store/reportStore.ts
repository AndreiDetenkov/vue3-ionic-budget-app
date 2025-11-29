import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { type Transaction, getTransactionsByRangeApi } from '@/modules/transactions';
import { Report } from '@/modules/reports';
import { formatAmount, mappedTransactions } from '@/modules/transactions/utils';

export const useReportStore = defineStore('reportStore', () => {
  const isLoading = ref(false);
  const reports = ref<Transaction[]>();

  const reportList = computed((): Report[] => {
    if (!reports.value) {
      return [];
    }

    const categoryGroups = reports.value.reduce((acc: Record<string, Report>, transaction: Transaction) => {
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
    }, {});

    return Object.entries(categoryGroups).map(([, data]) => ({
      name: data.name,
      value: data.value,
      icon: data.icon,
      transactions: data.transactions,
    }));
  });

  const totalAmount = computed(() => {
    if (!reports.value) {
      return 0;
    }

    return formatAmount(reports.value.reduce((acc, transaction) => acc + transaction.value, 0));
  });

  const getReports = async (from: string, to: string) => {
    isLoading.value = true;
    const { data } = await getTransactionsByRangeApi({ from, to });
    reports.value = mappedTransactions(data);
    isLoading.value = false;
  };

  return { reportList, isLoading, getReports, reports, totalAmount };
});
