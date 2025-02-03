<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';

import ReportList from '@/modules/reports/components/ReportList.vue';
import { useReportStore } from '@/modules/reports';

const store = useReportStore();
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar mode="md">
        <ion-title>Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen>
      <report-list :reports="store.reports" />
    </ion-content>
  </ion-page>
</template>
