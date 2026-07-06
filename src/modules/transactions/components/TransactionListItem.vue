<script setup lang="ts">
import { IonGrid, IonRow, IonCol, IonThumbnail, IonItem, IonLabel } from '@ionic/vue';
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
          <ion-label class="title">{{ transaction.name }}</ion-label>
          <ion-label class="category">{{ transaction.category.title }}</ion-label>
        </ion-col>

        <ion-col size="auto">
          <ion-label class="amount">{{ formatAmount(transaction.value) }}</ion-label>
          <ion-label class="date">{{ formatDate(transaction.createdAt) }}</ion-label>
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

.date {
  color: var(--ion-color-medium);
  font-size: 0.65rem;
  text-align: right;
}
</style>
