<script setup lang="ts">
import { ComponentPublicInstance, useTemplateRef } from 'vue';
import {
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonIcon,
  IonLabel,
  alertController,
  modalController,
} from '@ionic/vue';
import { useToast } from '@/core/composables/useToast';
import { pencil, trash } from 'ionicons/icons';
import { useTransactionStore } from '@/modules/transactions';
import { Transaction } from '@/modules/transactions/types';
import UpdateItemModal from '@/modules/transactions/components/SlideTransaction/UpdateItemModal.vue';
import TransactionListItem from '@/modules/transactions/components/TransactionListItem.vue';

const { transaction } = defineProps<{
  transaction: Transaction;
}>();

const store = useTransactionStore();
const itemSliding = useTemplateRef<ComponentPublicInstance>('item-sliding');
const { showErrorToast } = useToast();

function closeSlidingItems() {
  itemSliding.value?.$el.close();
}

async function alertHandler() {
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
}

async function onRemoveHandler() {
  const { success } = await store.removeTransaction(transaction.id);
  closeSlidingItems();
  if (!success) {
    await showErrorToast('Oops...Something went wrong');
  }
}

async function openUpdateTransactionModal() {
  const modal = await modalController.create({
    component: UpdateItemModal,
    componentProps: {
      transaction,
    },
  });
  modal.present().then(() => closeSlidingItems());
}
</script>

<template>
  <ion-item-sliding ref="item-sliding">
    <ion-item-options side="start">
      <ion-item-option @click.stop="openUpdateTransactionModal">
        <ion-icon slot="start" :icon="pencil"></ion-icon>
        <ion-label>Edit</ion-label>
      </ion-item-option>
    </ion-item-options>

    <transaction-list-item :transaction="transaction" />

    <ion-item-options side="end">
      <ion-item-option @click.stop="alertHandler" color="danger">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        <ion-label>Remove</ion-label>
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<style scoped>
ion-item-sliding {
  margin-bottom: 0.5rem;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 1rem;
}

ion-item-option {
  border-radius: 1rem;
}
</style>
