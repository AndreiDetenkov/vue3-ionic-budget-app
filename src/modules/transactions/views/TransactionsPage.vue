<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { IonContent, IonPage, IonProgressBar, onIonViewWillEnter } from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import BaseRefresher from '@/core/components/BaseRefresher.vue';
import BaseHeader from '@/core/components/BaseHeader.vue';
import AllTransactionsModal from '@/modules/transactions/components/AllTransactionsModal.vue';
import TotalAmount from '@/modules/transactions/components/TotalAmount.vue';
import TransactionList from '@/modules/transactions/components/TransactionList.vue';
import TransactionsEmpty from '@/modules/transactions/components/TransactionsEmpty.vue';

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
  <ion-page color="light">
    <BaseHeader title="Transactions">
      <ion-progress-bar v-if="loading" type="indeterminate" />
    </BaseHeader>

    <ion-content fullscreen>
      <BaseRefresher @refresh="refreshContent" />

      <template v-if="transactions.length">
        <TotalAmount />
        <TransactionList @view-all-transactions="isOpenModal = !isOpenModal" />
      </template>
      <TransactionsEmpty v-else class="ion-padding-top" />

      <AllTransactionsModal v-model="isOpenModal" :list="transactionsByDate" />
    </ion-content>
  </ion-page>
</template>
