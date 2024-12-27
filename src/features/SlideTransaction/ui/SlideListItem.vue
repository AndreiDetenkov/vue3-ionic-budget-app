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
  toastController,
  ToastOptions,
} from '@ionic/vue';
import { pencil, trash } from 'ionicons/icons';
import { Transaction, TransactionListItem, useTransactionStore } from '@/modules/transaction';
import { UpdateItemModal } from '@/features/SlideTransaction';

const { transaction } = defineProps<{
  transaction: Transaction;
}>();

const store = useTransactionStore();
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
  await store.removeTransaction(transaction.id);
  closeSlidingItems();
};

const toastHandler = async (options: ToastOptions): Promise<void> => {
  const toast = await toastController.create({
    duration: 2000,
    ...options,
  });
  await toast.present();
};

const openModal = async () => {
  const modal = await modalController.create({
    component: UpdateItemModal,
  });
  modal.present().then(() => closeSlidingItems());

  const { data, role } = await modal.onWillDismiss();

  if (role === 'confirm') {
    if (data) toastHandler({ message: 'Successfully updated!', color: 'success' });
    else toastHandler({ message: 'Oops...Something went wrong', color: 'danger' });
  }
};

const updateHandler = () => {
  store.setTransactionItems({
    id: transaction.id,
    name: transaction.name,
    value: transaction.value,
    categoryId: transaction.categoryId,
  });

  openModal();
};
</script>

<template>
  <ion-item-sliding ref="item-sliding">
    <ion-item-options side="start">
      <ion-item-option @click.stop="updateHandler">
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
