<script setup lang="ts">
import { IonCol, IonGrid, IonItem, IonLabel, IonRow, IonThumbnail } from '@ionic/vue';
import { Report } from '@/modules/reports';
import { formatAmount, getCategoryIconUrl } from '@/core/utils';

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
        <ion-col size="auto" class="ion-no-padding">
          <ion-thumbnail>
            <div class="category-icon" :style="{ maskImage: `url(${getCategoryIconUrl(icon)})` }" />
          </ion-thumbnail>
        </ion-col>

        <ion-col class="ion-padding-start">
          <ion-label class="title">{{ name }}</ion-label>
        </ion-col>

        <ion-col size="auto">
          <ion-label class="amount">{{ formatAmount(value) }} &nbsp;<span class="currency">KGS</span> </ion-label>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<style scoped>
ion-thumbnail {
  --size: 40px;
  --border-radius: 0.7rem;
  padding: 0.5rem;
  background: var(--ion-color-bg-green-pastel);
}

.category-icon {
  width: 100%;
  height: 100%;
  background-color: var(--ion-color-primary-tint);
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}

.currency {
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  font-weight: 600;
}

ion-label.title {
  font-size: 1rem;
  font-weight: 600;
}

ion-label.amount {
  font-size: 1.1rem;
  font-weight: 600;
  text-align: right;
}

</style>
