<script setup lang="ts">
import { ref } from 'vue';
import { IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonLabel, alertController } from '@ionic/vue';
import { trash } from 'ionicons/icons';
import { Transaction, TransactionListItem, useTransactionStore } from '@/entities/transactions';

const prop = defineProps<{
  transaction: Transaction;
}>();

const itemSliding = ref();

const store = useTransactionStore();
const { removeTransaction } = store;

const onRemoveHandler = () => {
  removeTransaction(prop.transaction.id);
  itemSliding.value?.$el.close();
};

const presentAlert = async () => {
  const alert = await alertController.create({
    subHeader: 'Submit your action',
    message: `${prop.transaction.name} will be removed.`,
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel',
        handler: () => itemSliding.value?.$el.close(),
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
</script>

<template>
  <ion-item-sliding ref="itemSliding">
    <transaction-list-item :transaction="transaction" />

    <ion-item-options>
      <ion-item-option @click.stop="presentAlert" color="danger">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        <ion-label>Remove</ion-label>
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>
