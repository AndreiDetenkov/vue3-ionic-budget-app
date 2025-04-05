<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonChip } from '@ionic/vue';

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
      <div class="ion-padding">
        <ion-chip outline color="primary">All time</ion-chip>
        <ion-chip outline color="primary">Last year</ion-chip>
        <ion-chip outline color="primary">Last month</ion-chip>
        <ion-chip outline color="primary">Range</ion-chip>
      </div>

      <report-list :reports="store.reports" />
    </ion-content>
  </ion-page>
</template>
