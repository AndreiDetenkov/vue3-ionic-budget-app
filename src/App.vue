<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { useCloudAutoSync } from '@/core/composables/useCloudAutoSync';
import { useCategoryStore } from '@/modules/categories';
import { useReportStore } from '@/modules/reports';
import { useTransactionStore } from '@/modules/transactions';

const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();
const reportStore = useReportStore();

useCloudAutoSync(async () => {
  await Promise.all([
    categoryStore.getCategoryList(true),
    transactionStore.getTransactionsByRange(transactionStore.transactionsUnit),
    reportStore.refreshReports(),
  ]);
});
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
