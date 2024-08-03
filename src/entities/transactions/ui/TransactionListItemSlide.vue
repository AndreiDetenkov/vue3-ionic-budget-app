<script setup lang="ts">
import { IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonLabel } from '@ionic/vue';
import { trash } from 'ionicons/icons';
import { Transaction, TransactionListItem } from '@/entities/transactions';

const prop = defineProps<{
  transaction: Transaction;
}>();

const emit = defineEmits<{
  'remove-transaction': [id: string];
}>();
</script>

<template>
  <ion-item-sliding>
    <transaction-list-item :transaction="transaction" />

    <ion-item-options @click="emit('remove-transaction', prop.transaction.id)">
      <ion-item-option color="danger">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        <ion-label>Remove</ion-label>
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>
