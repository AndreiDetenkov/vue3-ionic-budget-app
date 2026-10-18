<script setup lang="ts">
import { IonChip } from '@ionic/vue';
import { useReportStore, type ReportPeriod } from '@/modules/reports';

const reportStore = useReportStore();

const filters: { value: ReportPeriod; label: string }[] = [
  { value: 'lastYear', label: 'Last year' },
  { value: 'currentYear', label: 'Current year' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'currentMonth', label: 'Current month' },
];
</script>

<template>
  <div class="ion-padding">
    <ion-chip
      v-for="filter in filters"
      :key="filter.value"
      :outline="reportStore.selectedPeriod !== filter.value"
      color="primary"
      @click="reportStore.setPeriod(filter.value)"
    >
      {{ filter.label }}
    </ion-chip>
  </div>
</template>
