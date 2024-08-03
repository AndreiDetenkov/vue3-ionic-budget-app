<script setup lang="ts">
import { ref } from 'vue';
import { IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonLabel } from '@ionic/vue';
import { trash } from 'ionicons/icons';
import { Transaction, TransactionListItem, useTransactionStore } from '@/entities/transactions';

const store = useTransactionStore();

const prop = defineProps<{
  transaction: Transaction;
}>();

// const emit = defineEmits<{
//   'remove-transaction': [id: string];
// }>();

const itemSliding = ref();

function onSlideHandler() {
  // emit('remove-transaction', prop.transaction.id);
  store.removeTransaction(prop.transaction.id);
  itemSliding.value?.$el.close();
}
</script>

<template>
  <ion-item-sliding ref="itemSliding">
    <transaction-list-item :transaction="transaction" />

    <ion-item-options @click="onSlideHandler">
      <ion-item-option color="danger">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        <ion-label>Remove</ion-label>
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>
