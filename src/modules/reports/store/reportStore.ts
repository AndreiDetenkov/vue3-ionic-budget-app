import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useStorage, type DateRange, type Transaction } from '@/core/storage';
import { type CategoryReport, type ReportPeriod } from '@/modules/reports';
import { formatAmount, getDateRange } from '@/core/utils';

const PERIOD_RANGES: Record<ReportPeriod, () => DateRange> = {
  lastYear: () => getDateRange('year', 1),
  currentYear: () => getDateRange('year', 0),
  lastMonth: () => getDateRange('month', 1),
  currentMonth: () => getDateRange('month', 0),
};

export const useReportStore = defineStore('reportStore', () => {
  const storage = useStorage();
  const isLoading = ref(false);
  const transactions = ref<Transaction[]>([]);
  const selectedPeriod = ref<ReportPeriod>('currentMonth');

  const reportList = computed((): CategoryReport[] => {
    const categoryGroups = transactions.value.reduce(
      (acc: Record<string, CategoryReport>, transaction: Transaction) => {
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

  const totalAmount = computed<string>(() => {
    return formatAmount(transactions.value.reduce((acc, transaction) => acc + transaction.value, 0));
  });

  const refreshReports = async (): Promise<void> => {
    isLoading.value = true;
    try {
      const range = PERIOD_RANGES[selectedPeriod.value]();
      transactions.value = await storage.getTransactionsByRange(range);
    } catch {
      transactions.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const setPeriod = async (period: ReportPeriod): Promise<void> => {
    selectedPeriod.value = period;
    await refreshReports();
  };

  return {
    reportList,
    totalAmount,
    isLoading,
    selectedPeriod,
    setPeriod,
    refreshReports,
  };
});
