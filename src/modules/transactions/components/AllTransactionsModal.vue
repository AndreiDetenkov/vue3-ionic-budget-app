<script setup lang="ts">
import {
  IonModal,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
} from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions';
import TransactionListItem from '@/modules/transactions/components/TransactionListItem.vue';

const model = defineModel();
const store = useTransactionStore();
</script>

<template>
  <ion-modal :is-open="model">
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>All transactions</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="model = false">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-vertical">
      <ion-list lines="full">
        <ion-item-group v-for="(transactions, date) in store.transactionsByDate">
          <ion-item-divider>
            <ion-label> {{ date }} </ion-label>
          </ion-item-divider>

          <ion-item v-for="transaction in transactions" :key="transaction.id">
            <ion-label>{{ transaction.name }}</ion-label>
            <ion-label>{{ transaction.value }}</ion-label>
          </ion-item>
        </ion-item-group>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
ion-button {
  text-transform: capitalize;
  letter-spacing: 0;
  font-size: 1rem;
}
</style>
