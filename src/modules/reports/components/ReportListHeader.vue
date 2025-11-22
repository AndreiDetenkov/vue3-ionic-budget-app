<script setup lang="ts">
import { IonCol, IonGrid, IonItem, IonLabel, IonRow } from '@ionic/vue';
import { Report } from '@/modules/reports';

interface Props {
  name: Report['name'];
  value: Report['value'];
  icon: Report['icon'];
}

const { icon, name, value } = defineProps<Props>();
</script>

<template>
  <ion-item slot="header">
    <ion-grid>
      <ion-row class="ion-align-items-center">
        <ion-col size="auto">
          <ion-thumbnail>
            <img alt="" :src="icon" />
          </ion-thumbnail>
        </ion-col>

        <ion-col>
          <ion-label>{{ name }}</ion-label>
        </ion-col>

        <ion-col size="auto">
          <ion-label>{{ value }}&nbsp;&#8838;</ion-label>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<style scoped>
ion-thumbnail {
  --size: 2rem;
  margin-right: 1rem;
}
</style>
