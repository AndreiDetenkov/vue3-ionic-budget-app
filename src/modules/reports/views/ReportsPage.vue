<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { useReportStore } from '@/modules/reports';
import ReportList from '@/modules/reports/components/ReportList.vue';
import BaseHeader from '@/core/components/BaseHeader.vue';
import ReportFilters from '@/modules/reports/components/ReportFilters.vue';
import { useTransactionStore } from '@/modules/transactions';

const reportStore = useReportStore();
const transactionStore = useTransactionStore();

const filter = (key: string) => {
  console.log(key);
};
</script>

<template>
  <ion-page>
    <BaseHeader title="Reports"></BaseHeader>

    <ion-content fullscreen>
      <ReportFilters @filter="filter" />
      <ReportList :reports="reportStore.reports" />
    </ion-content>
  </ion-page>
</template>
