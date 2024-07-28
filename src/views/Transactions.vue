<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  onIonViewWillEnter,
} from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { getCurrentMonthDates } from '@/shared/dates';
import { useTransactionStore, TransactionList, TotalAmount } from '@/entities/transactions';

const store = useTransactionStore();
const { recentTransactions, loading, transactions } = storeToRefs(store);
const { startDate, endDate } = getCurrentMonthDates();

onIonViewWillEnter(() => {
  if (!transactions.value) getTransactions(startDate, endDate);
});

const getTransactions = async (startDate: string, endDate: string) =>
  store.getTransactionsByRange({ from: startDate, to: endDate });

const handleRefresh = async (event: CustomEvent) => {
  await getTransactions(startDate, endDate);
  event.detail.complete();
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
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <TotalAmount />

      <ion-segment value="daily">
        <ion-segment-button value="daily">
          <ion-label>Daily</ion-label>
        </ion-segment-button>
        <ion-segment-button value="weekly">
          <ion-label>Weekly</ion-label>
        </ion-segment-button>
        <ion-segment-button value="monthly">
          <ion-label>Monthly</ion-label>
        </ion-segment-button>
      </ion-segment>

      <TransactionList />
    </ion-content>
  </ion-page>
</template>
