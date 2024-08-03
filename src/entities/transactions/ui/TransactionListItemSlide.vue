<script setup lang="ts">
import { IonItemSliding, IonItemOptions, IonItemOption, IonIcon } from '@ionic/vue';
import { trash } from 'ionicons/icons';
import { Transaction, TransactionListItem } from '@/entities/transactions';
import { ref } from 'vue';

const prop = defineProps<{
  transaction: Transaction;
}>();

const emit = defineEmits<{
  'remove-transaction': [id: string];
}>();

const itemSliding = ref();

function onSlideHandler(): void {
  emit('remove-transaction', prop.transaction.id);

  // itemSliding.value?.$el.close();
}
</script>

<template>
  <ion-item-sliding ref="itemSliding">
    <transaction-list-item :transaction="transaction" />

    <ion-item-options @ionSwipe="onSlideHandler">
      <ion-item-option color="danger">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        Remove
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>
