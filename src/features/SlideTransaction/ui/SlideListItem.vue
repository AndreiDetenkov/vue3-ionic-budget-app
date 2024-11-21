<script setup lang="ts">
import { ComponentPublicInstance, useTemplateRef } from 'vue';
import { IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonLabel, alertController } from '@ionic/vue';
import { pencil, trash } from 'ionicons/icons';
import { Transaction, TransactionListItem, useTransactionStore } from '@/entities/transactions';

const { transaction } = defineProps<{
  transaction: Transaction;
}>();

const store = useTransactionStore();
const { removeTransaction, updateTransaction } = store;
const itemSliding = useTemplateRef<ComponentPublicInstance>('item-sliding');

const closeSlidingItems = () => {
  itemSliding.value?.$el.close();
};

const alertHandler = async () => {
  const alert = await alertController.create({
    subHeader: 'Submit your action',
    message: `${transaction.name} will be removed.`,
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel',
        handler: closeSlidingItems,
      },
      {
        text: 'Remove',
        role: 'confirm',
        handler: () => onRemoveHandler(),
      },
    ],
  });

  await alert.present();
};

const onRemoveHandler = async () => {
  await removeTransaction(transaction.id);
  closeSlidingItems();
};

const editHandler = async () => {
  await updateTransaction({});
  closeSlidingItems();
};
</script>

<template>
  <ion-item-sliding ref="item-sliding">
    <transaction-list-item :transaction="transaction" />

    <ion-item-options>
      <ion-item-option @click.stop="editHandler">
        <ion-icon slot="start" :icon="pencil"></ion-icon>
        <ion-label>Edit</ion-label>
      </ion-item-option>
      <ion-item-option @click.stop="alertHandler" color="danger">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        <ion-label>Remove</ion-label>
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>
