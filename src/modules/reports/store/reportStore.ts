import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useStorage, type DateRange, type Transaction } from '@/core/storage';
import { formatAmount, getDateRange } from '@/core/utils';
import type { CategoryReport, ReportPeriod } from '../types';

const PERIOD_RANGES: Record<ReportPeriod, () => DateRange> = {
  lastYear: () => getDateRange('year', 1),
  currentYear: () => getDateRange('year'),
  lastMonth: () => getDateRange('month', 1),
  currentMonth: () => getDateRange('month'),
};

export const useReportStore = defineStore('reportStore', () => {
  const storage = useStorage();
  const isLoading = ref(false);
  const transactions = ref<Transaction[]>([]);
  const selectedPeriod = ref<ReportPeriod>('currentMonth');
  let latestRequestId = 0;

  const reportList = computed<CategoryReport[]>(() => {
    const groups: Record<string, CategoryReport> = {};

    for (const transaction of transactions.value) {
      const { id, title, icon } = transaction.category;
      groups[id] ??= { name: title, value: 0, icon: icon ?? '', transactions: [] };
      groups[id].value += transaction.value;
      groups[id].transactions.push(transaction);
    }

    return Object.values(groups);
  });

  const totalAmount = computed<string>(() => {
    return formatAmount(transactions.value.reduce((acc, transaction) => acc + transaction.value, 0));
  });

  const refreshReports = async (): Promise<void> => {
    const requestId = ++latestRequestId;
    isLoading.value = true;
    try {
      const range = PERIOD_RANGES[selectedPeriod.value]();
      const result = await storage.getTransactionsByRange(range);
      if (requestId === latestRequestId) {
        transactions.value = result;
      }
    } catch {
      if (requestId === latestRequestId) {
        transactions.value = [];
      }
    } finally {
      if (requestId === latestRequestId) {
        isLoading.value = false;
      }
    }
  };

  const setPeriod = (period: ReportPeriod): Promise<void> => {
    selectedPeriod.value = period;
    return refreshReports();
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
