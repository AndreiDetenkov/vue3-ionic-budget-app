<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonContent, IonHeader, IonPage, IonProgressBar, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { TotalAmount, TransactionList, TransactionTabs, useTransactionStore } from '@/entities/transactions';
import AppRefresher from '@/shared/ui/AppRefresher.vue';

const store = useTransactionStore();
const { loading, transactions, transactionsFilterUnit } = storeToRefs(store);
const { getTransactionsByRange } = store;

onIonViewWillEnter(() => {
  if (!transactions.value) {
    getTransactionsByRange();
  }
});

const refreshView = () => getTransactionsByRange();

const onChangeTab = () => getTransactionsByRange();
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar mode="md">
        <ion-title>Transactions</ion-title>
        <ion-progress-bar v-if="loading" type="indeterminate" />
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen>
      <app-refresher @refresh="refreshView" />

      <total-amount />

      <transaction-tabs v-model="transactionsFilterUnit" @update:modelValue="onChangeTab" />

      <transaction-list />
    </ion-content>
  </ion-page>
</template>
