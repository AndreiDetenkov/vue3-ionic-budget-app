<script setup lang="ts">
import { IonCol, IonGrid, IonItem, IonLabel, IonList, IonRow, IonThumbnail } from '@ionic/vue';
import { CategoryReport } from '@/modules/reports';

defineProps<{
  reports: CategoryReport[];
}>();
</script>

<template>
  <ion-list class="ion-padding-top">
    <ion-item v-for="report in reports" :key="report.name" detail button>
      <ion-grid>
        <ion-row class="ion-align-items-center">
          <ion-col size="auto">
            <ion-thumbnail>
              <img alt="" :src="report.icon" />
            </ion-thumbnail>
          </ion-col>

          <ion-col>
            <ion-label>{{ report.name }}</ion-label>
          </ion-col>

          <ion-col size="auto">
            <ion-label>{{ report.value }}&nbsp;&#8838;</ion-label>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-item>
  </ion-list>
</template>

<style scoped>
ion-thumbnail {
  --size: 40px;
  margin-right: 10px;
}
</style>
