<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { OpUnitType } from 'dayjs';
import { IonContent, IonHeader, IonPage, IonProgressBar, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { TotalAmount, TransactionList, TransactionTabs, useTransactionStore } from '@/entities/transactions';
import AppRefresher from '@/shared/ui/AppRefresher.vue';
import { getRangeDates } from '@/shared/dates';

const store = useTransactionStore();
const { loading, transactions } = storeToRefs(store);

onIonViewWillEnter(() => {
  if (!transactions.value) {
    getTransactions(store.transactionsFilterUnit);
  }
});

const getTransactions = async (range: OpUnitType) => {
  const { startDate, endDate } = getRangeDates(range);
  await store.getTransactionsByRange({ from: startDate, to: endDate });
};

const refreshView = () => getTransactions(store.transactionsFilterUnit);

const onChangeTab = () => {
  getTransactions(store.transactionsFilterUnit);
};
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

      <transaction-tabs v-model="store.transactionsFilterUnit" @update:modelValue="onChangeTab" />

      <transaction-list />
    </ion-content>
  </ion-page>
</template>
