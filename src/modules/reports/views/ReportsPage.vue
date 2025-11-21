<script setup lang="ts">
import { IonPage, IonContent, IonChip } from '@ionic/vue';

import ReportList from '@/modules/reports/components/ReportList.vue';
import { useReportStore } from '@/modules/reports';
import BaseHeader from '@/core/components/BaseHeader.vue';

const store = useReportStore();
</script>

<template>
  <ion-page>
    <BaseHeader title="Reports"></BaseHeader>

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
