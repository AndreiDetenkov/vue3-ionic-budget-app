<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonContent, IonHeader, IonPage, IonProgressBar, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import TotalAmount from '@/modules/transactions/components/TotalAmount.vue';
import TransactionList from '@/modules/transactions/components/TransactionList.vue';
import AppRefresher from '@/core/components/AppRefresher.vue';
import { ref } from 'vue';

const transactionStore = useTransactionStore();
const { loading, transactions } = storeToRefs(transactionStore);
const { getTransactionsByRange } = transactionStore;

onIonViewWillEnter(() => {
  if (!transactions.value.length) getTransactionsByRange('month');
});

const refreshContent = () => {
  getTransactionsByRange('month');
};

const isOpen = ref(false);

const setOpen = (open: boolean) => (isOpen.value = open);
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Transactions</ion-title>
        <ion-progress-bar v-if="loading" type="indeterminate" />
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen>
      <app-refresher @refresh="refreshContent" />
      <total-amount />
      <transaction-list @handle-click="isOpen = true" />

      <ion-modal :is-open="isOpen">
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>All Transactions</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="setOpen(false)">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Magni illum quidem recusandae ducimus quos
            reprehenderit. Veniam, molestias quos, dolorum consequuntur nisi deserunt omnis id illo sit cum qui. Eaque,
            dicta.
          </p>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>
