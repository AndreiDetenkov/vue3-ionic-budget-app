<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { ref, UnwrapRef } from 'vue';
import { storeToRefs } from 'pinia';
import { getRangeDates } from '@/shared/dates';
import { rangeUnits, TotalAmount, TransactionList, useTransactionStore } from '@/entities/transactions';
import { OpUnitType } from 'dayjs';

const store = useTransactionStore();
const { loading, transactions } = storeToRefs(store);

onIonViewWillEnter(() => {
  if (!transactions.value) {
    getTransactions(frequency.value);
  }
});

const getTransactions = async (range: OpUnitType) => {
  const { startDate, endDate } = getRangeDates(range);
  await store.getTransactionsByRange({ from: startDate, to: endDate });
};

const handleRefresh = async (event: CustomEvent) => {
  await getTransactions(frequency.value);
  event.detail.complete();
};

const frequency = ref<OpUnitType>('day');

const onChangeSegment = async () => {
  await getTransactions(frequency.value);
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

      <ion-segment v-model="frequency" @ion-change="onChangeSegment" class="ion-padding-horizontal">
        <ion-segment-button :value="rangeUnits.day" class="ion-text-capitalize">
          <ion-label>Daily</ion-label>
        </ion-segment-button>
        <ion-segment-button :value="rangeUnits.week" class="ion-text-capitalize">
          <ion-label>Weekly</ion-label>
        </ion-segment-button>
        <ion-segment-button :value="rangeUnits.month" class="ion-text-capitalize">
          <ion-label>Monthly</ion-label>
        </ion-segment-button>
      </ion-segment>

      <TransactionList />
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-segment {
  margin-bottom: 16px;
}

ion-segment-button {
  letter-spacing: 0;
  font-size: 16px;
}
</style>
