<script setup lang="ts">
import { IonChip } from '@ionic/vue';
import { ref, watchEffect } from 'vue';
import { useReportStore } from '@/modules/reports';
import { currentMonthRange, currentYearRange, previousMonthRange, previousYearRange } from '@/core/utils/dates';

enum Filter {
  LastYear = 'lastYear',
  CurrentYear = 'currentYear',
  LastMonth = 'lastMonth',
  CurrentMonth = 'currentMonth',
}

const { getReports } = useReportStore();

const selectedFilter = ref<Filter>(Filter.CurrentMonth);

const filters = [
  { value: Filter.LastYear, label: 'Last year', fn: previousYearRange },
  { value: Filter.CurrentYear, label: 'Current year', fn: currentYearRange },
  { value: Filter.LastMonth, label: 'Last month', fn: previousMonthRange },
  { value: Filter.CurrentMonth, label: 'Current month', fn: currentMonthRange },
];

watchEffect(() => {
  console.log(selectedFilter.value);
  const result = filters.find((filter) => filter.value === selectedFilter.value);
  if (!result?.fn) {
    return;
  }

  const { startDate, endDate } = result.fn();
  getReports(startDate, endDate);
});
</script>

<template>
  <div class="ion-padding">
    <ion-chip
      v-for="filter in filters"
      :key="filter.value"
      :outline="selectedFilter !== filter.value"
      color="primary"
      @click="selectedFilter = filter.value"
    >
      {{ filter.label }}
    </ion-chip>
  </div>
</template>

<style scoped></style>
