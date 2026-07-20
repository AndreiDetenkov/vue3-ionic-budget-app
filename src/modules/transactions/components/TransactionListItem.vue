<script setup lang="ts">
import { IonGrid, IonRow, IonCol, IonThumbnail, IonItem } from '@ionic/vue';
import { Transaction } from '@/modules/transactions/types';
import { formatAmount, getCategoryIconUrl } from '@/core/utils';

defineProps<{
  transaction: Transaction;
}>();
</script>

<template>
  <ion-item>
    <ion-grid>
      <ion-row class="ion-align-items-center">
        <ion-col size="auto">
          <ion-thumbnail>
            <img alt="" :src="getCategoryIconUrl(transaction.category.icon)" />
          </ion-thumbnail>
        </ion-col>

        <ion-col>
          <div class="title">{{ transaction.name }}</div>
          <div class="category">{{ transaction.category.title }}</div>
        </ion-col>

        <ion-col size="auto">
          <div class="amount">{{ formatAmount(transaction.value) }}</div>
          <div class="currency">KGS</div>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<style scoped>
ion-item {
  border-radius: 1rem;
}

ion-thumbnail {
  --size: 32px;
  --border-radius: 4px;
  margin-right: 10px;
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
}

.category {
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

.amount {
  font-size: 1.2rem;
  font-weight: 600;
  text-align: right;
}

.currency {
  color: var(--ion-color-medium);
  font-size: 0.65rem;
  text-align: right;
}
</style>
