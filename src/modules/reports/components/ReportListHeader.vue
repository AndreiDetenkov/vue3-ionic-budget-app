<script setup lang="ts">
import { IonCol, IonGrid, IonItem, IonLabel, IonRow, IonThumbnail } from '@ionic/vue';
import { Report } from '@/modules/reports';
import { formatAmount } from '@/modules/transactions/utils';

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
          <ion-label>{{ formatAmount(value) }}
            &nbsp;<span class="currency">KGS</span>
          </ion-label>
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

.currency {
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}
</style>
