<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonCol, IonContent, IonGrid, IonLabel, IonPage, IonProgressBar, IonRow, onIonViewWillEnter } from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions';
import BaseRefresher from '@/core/components/BaseRefresher.vue';
import BaseHeader from '@/core/components/BaseHeader.vue';
import TotalAmount from '@/modules/transactions/components/TotalAmount.vue';
import TransactionList from '@/modules/transactions/components/TransactionList.vue';

const transactionStore = useTransactionStore();
const { loading, transactions } = storeToRefs(transactionStore);
const { getTransactionsByRange } = transactionStore;

onIonViewWillEnter(() => {
  if (!transactions.value.length) getTransactionsByRange('month');
});

const refreshContent = () => getTransactionsByRange('month');
</script>

<template>
  <ion-page>
    <BaseHeader title="Transactions">
      <ion-progress-bar v-if="loading" type="indeterminate" color="secondary" />
    </BaseHeader>

    <ion-content fullscreen class="ion-padding">
      <BaseRefresher @refresh="refreshContent" />

      <template v-if="transactions.length">
        <TotalAmount />
        <TransactionList />
      </template>
      <ion-grid v-else class="ion-padding-top">
        <ion-row>
          <ion-col class="ion-text-center">
            <ion-label> Oops!...No Transactions at this moment </ion-label>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-content {
  --background: var(--ion-color-bg-light-grey);
}
</style>
