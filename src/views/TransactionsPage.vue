<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonProgressBar, onIonViewWillEnter } from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { getCurrentMonthDates } from '@/shared/dates';
import { useTransactionStore, TransactionList, TotalAmount } from '@/entities/transactions';

const store = useTransactionStore();
const { recentTransactions, loading, transactions } = storeToRefs(store);
const { startDate, endDate } = getCurrentMonthDates();

onIonViewWillEnter(() => {
  if (!transactions.value) getTransactions(startDate, endDate);
});

const getTransactions = async (startDate: string, endDate: string) => {
  store.getTransactionsByRange({ from: startDate, to: endDate });
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
      <TotalAmount v-if="recentTransactions?.length" />
      <TransactionList />
    </ion-content>
  </ion-page>
</template>
