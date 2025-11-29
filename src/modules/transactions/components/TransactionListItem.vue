<script setup lang="ts">
import { IonGrid, IonRow, IonCol, IonThumbnail, IonItem } from '@ionic/vue';
import { formatDate } from '@/core/utils/dates';
import { Transaction } from '@/modules/transactions/types';
import { formatAmount } from '@/core/utils';

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
          <div class="title">{{ transaction.name }}</div>
          <div class="category">{{ transaction.category.title }}</div>
        </ion-col>

        <ion-col size="auto">
          <div class="amount">{{ formatAmount(transaction.value) }}</div>
          <div class="date">{{ formatDate(transaction.createdAt) }}</div>
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

.title {
  font-size: 1.1rem;
}

.category {
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

.amount {
  font-size: 1.125rem;
  text-align: right;
}

.date {
  color: var(--ion-color-medium);
  font-size: 0.65rem;
  text-align: right;
}
</style>
