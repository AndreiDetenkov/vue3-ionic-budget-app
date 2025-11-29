<script setup lang="ts">
import { IonCol, IonGrid, IonItem, IonLabel, IonRow } from '@ionic/vue';
import { formatDate } from '@/core/utils/dates';
import { Transaction } from '@/modules/transactions';
import { formatAmount } from '@/core/utils';

type ItemProp = Pick<Transaction, 'name' | 'value' | 'createdAt'>;

defineProps<{ item: ItemProp }>();
</script>

<template>
  <ion-item>
    <ion-grid>
      <ion-row class="ion-align-items-center">
        <ion-col>
          <ion-label class="title">{{ item.name }}</ion-label>
        </ion-col>

        <ion-col size="auto">
          <ion-label class="amount">{{ formatAmount(item.value) }}</ion-label>
          <ion-label class="date">{{ formatDate(item.createdAt) }}</ion-label>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<style scoped>
.title {
  font-size: 1rem;
}

.amount {
  font-size: 1rem;
  text-align: right;
}

.date {
  color: var(--ion-color-medium);
  font-size: 0.65rem;
  text-align: right;
}
</style>
