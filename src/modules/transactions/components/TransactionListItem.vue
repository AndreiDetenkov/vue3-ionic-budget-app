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
            <img alt="" :src="transaction.category.icon" />
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

.title {
  font-size: 16px;
}

.category {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}

.amount {
  font-size: 16px;
  text-align: right;
}

.date {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}
</style>
