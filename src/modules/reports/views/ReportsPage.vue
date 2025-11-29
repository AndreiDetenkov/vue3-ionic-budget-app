<script setup lang="ts">
import { IonPage, IonContent, IonProgressBar } from '@ionic/vue';
import { useReportStore } from '@/modules/reports';
import ReportList from '@/modules/reports/components/ReportList.vue';
import BaseHeader from '@/core/components/BaseHeader.vue';
import ReportFilters from '@/modules/reports/components/ReportFilters.vue';
import ReportTotalAmount from '@/modules/reports/components/ReportTotalAmount.vue';

const reportStore = useReportStore();

const filter = (key: string) => {
  console.log(key);
};
</script>

<template>
  <ion-page>
    <BaseHeader title="Reports">
      <ion-progress-bar v-if="reportStore.isLoading" type="indeterminate" />
    </BaseHeader>

    <ion-content fullscreen>
      <ReportTotalAmount />
      <ReportFilters @filter="filter" />
      <ReportList :reports="reportStore.reportList" />
    </ion-content>
  </ion-page>
</template>
