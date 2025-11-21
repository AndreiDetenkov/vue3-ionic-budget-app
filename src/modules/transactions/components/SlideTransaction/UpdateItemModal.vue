<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonInput,
  modalController,
  IonSpinner,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';

const transactionStore = useTransactionStore();
const { transactionItems } = storeToRefs(transactionStore);
const categoryStore = useCategoryStore();

const cancelHandler = async () => modalController.dismiss(null, 'cancel');

const confirmHandler = async () => {
  const { success } = await transactionStore.updateTransaction();
  await modalController.dismiss(success, 'confirm');
};
</script>

<template>
  <ion-header>
    <ion-toolbar color="light">
      <ion-title>Update transaction</ion-title>
      <ion-buttons slot="end">
        <ion-button color="primary" class="cancel-btn" @click="cancelHandler">Cancel</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <form @submit.prevent="confirmHandler" v-if="transactionItems">
      <ion-input
        v-model="transactionItems.name"
        label="Transaction"
        label-placement="floating"
        fill="outline"
        autocapitalize="on"
        :autofocus="true"
        :clear-input="true"
        class="ion-margin-vertical"
      />

      <ion-input
        v-model="transactionItems.value"
        inputmode="numeric"
        label="Amount"
        label-placement="floating"
        fill="outline"
        class="ion-margin-bottom"
      />

      <ion-select
        v-model="transactionItems.categoryId"
        label="Category"
        placeholder="Select category"
        label-placement="floating"
        fill="outline"
        interface="action-sheet"
        class="ion-margin-bottom"
      >
        <ion-select-option v-for="category in categoryStore.categories" :key="category.id" :value="category.id">
          {{ category.title }}
        </ion-select-option>
      </ion-select>

      <ion-button expand="block" type="submit" :disabled="transactionStore.loading">
        <ion-spinner name="lines" v-if="transactionStore.loading" />
        <span v-else>Update transaction</span>
      </ion-button>
    </form>
  </ion-content>
</template>

<style scoped>
ion-button {
  height: 48px;
}

.cancel-btn {
  text-transform: capitalize;
  letter-spacing: 0;
  font-size: 1.2rem;
}
</style>
