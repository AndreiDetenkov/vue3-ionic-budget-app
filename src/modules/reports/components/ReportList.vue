<script setup lang="ts">
import { IonCol, IonGrid, IonItem, IonLabel, IonList, IonRow } from '@ionic/vue';

defineProps<{
  reports: { name: string; value: number }[];
}>();
</script>

<template>
  <ion-list class="ion-padding-top">
    <ion-item v-for="report in reports" :key="report.name" detail button>
      <ion-grid>
        <ion-row>
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

<style scoped></style>
