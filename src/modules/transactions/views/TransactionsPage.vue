<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonContent, IonHeader, IonPage, IonProgressBar, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import AppTabs from '@/core/components/AppTabs.vue';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import TotalAmount from '@/modules/transactions/components/TotalAmount.vue';
import TransactionList from '@/modules/transactions/components/TransactionList.vue';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';
// import AppRefresher from '@/core/components/AppRefresher.vue';

const transactionStore = useTransactionStore();
const { loading, transactions, transactionsFilterUnit } = storeToRefs(transactionStore);
const { getTransactionsByRange } = transactionStore;

const categoryStore = useCategoryStore();
const { categories } = storeToRefs(categoryStore);
const { getCategoryList } = categoryStore;

onIonViewWillEnter(() => {
  if (!transactions.value.length) getTransactionsByRange();
  if (!categories.value.length) getCategoryList();
});

// const refreshView = () => getTransactionsByRange();

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
      <!-- <app-refresher @refresh="refreshView" /> -->
      <total-amount />
      <app-tabs v-model="transactionsFilterUnit" @update:modelValue="onChangeTab" />
      <transaction-list />
    </ion-content>
  </ion-page>
</template>
