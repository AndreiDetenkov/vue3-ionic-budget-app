import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useStorage, type Transaction } from '@/core/storage';
import { Report } from '@/modules/reports';
import { formatAmount } from '@/core/utils';

export const useReportStore = defineStore('reportStore', () => {
  const storage = useStorage();
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
    try {
      reports.value = await storage.getTransactionsByRange({ from, to });
    } catch {
      reports.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  return { reportList, isLoading, getReports, reports, totalAmount };
});
