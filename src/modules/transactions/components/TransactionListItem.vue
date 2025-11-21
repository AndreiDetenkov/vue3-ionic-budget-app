<script setup lang="ts">
import { IonLabel, IonGrid, IonRow, IonCol, IonThumbnail, IonItem } from '@ionic/vue';
import { formatDate } from '@/core/utils/dates';
import { Transaction } from '@/modules/transactions/types';

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
            <img alt="" :src="transaction.category.icon ?? ''" />
          </ion-thumbnail>
        </ion-col>

        <ion-col>
          <ion-label class="title">{{ transaction.name }}</ion-label>
          <ion-label class="category">{{ transaction.category.title }}</ion-label>
        </ion-col>

        <ion-col size="auto">
          <ion-label class="amount">{{ transaction.value }}</ion-label>
          <ion-label class="date">{{ formatDate(transaction.createdAt) }}</ion-label>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<style scoped>
ion-thumbnail {
  --size: 32px;
  --border-radius: 4px;
  margin-right: 10px;
}

ion-label {
  display: block;
}

.title {
  font-size: 1.1rem;
}

.category {
  --color: var(--ion-color-medium);
  font-size: 0.8rem;
}

.amount {
  font-size: 1.125rem;
  text-align: right;
}

.date {
  --color: var(--ion-color-medium);
  font-size: 0.65rem;
  text-align: right;
}
</style>
