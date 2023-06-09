<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonProgressBar, onIonViewDidEnter } from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { getCurrentMonthDates } from '@/shared/dates';
import { useTransactionStore } from '@/entities/transactions';
import TransactionList from '@/entities/transactions/ui/TransactionList.vue';

const store = useTransactionStore();
const { transactionList, transactions, loading } = storeToRefs(store);

onIonViewDidEnter(() => {
  if (!transactions.value) getTransactions();
});

const getTransactions = async () => {
  const { startDate, endDate } = getCurrentMonthDates();
  await store.getTransactionsByRange({ from: startDate, to: endDate });
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

    <ion-content :fullscreen="true">
      <TransactionList :list="transactionList" />
    </ion-content>
  </ion-page>
</template>
