<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { IonContent, IonPage, IonProgressBar, onIonViewWillEnter } from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import TotalAmount from '@/modules/transactions/components/TotalAmount.vue';
import TransactionList from '@/modules/transactions/components/TransactionList.vue';
import AppRefresher from '@/core/components/AppRefresher.vue';
import AllTransactionsModal from '@/modules/transactions/components/AllTransactionsModal.vue';
import BaseHeader from '@/core/components/BaseHeader.vue';

const transactionStore = useTransactionStore();
const { loading, transactions, transactionsByDate } = storeToRefs(transactionStore);
const { getTransactionsByRange } = transactionStore;

onIonViewWillEnter(() => {
  if (!transactions.value.length) getTransactionsByRange('month');
});

const refreshContent = () => getTransactionsByRange('month');

const isOpenModal = ref(false);
</script>

<template>
  <ion-page>
    <BaseHeader title="Transactions">
      <ion-progress-bar v-if="loading" type="indeterminate" />
    </BaseHeader>

    <ion-content fullscreen>
      <app-refresher @refresh="refreshContent" />
      <total-amount />
      <transaction-list @view-all-transactions="isOpenModal = !isOpenModal" />
      <all-transactions-modal v-model="isOpenModal" :list="transactionsByDate" />
    </ion-content>
  </ion-page>
</template>
