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
import { formatDate, formatDateByTemplate } from '@/core/utils/dates';

const model = defineModel();
const store = useTransactionStore();

const currentMonth = formatDateByTemplate('MMMM');
</script>

<template>
  <ion-modal :is-open="model">
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Transactions in {{ currentMonth }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="model = false" color="primary"> Close </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list lines="full">
        <ion-item-group v-for="(transactions, date) in store.transactionsByDate">
          <ion-item-divider mode="md" color="light" sticky>
            <ion-label> {{ formatDate(date.toString()) }} </ion-label>
          </ion-item-divider>

          <ion-item
            v-for="(transaction, index) in transactions"
            :key="transaction.id"
            :lines="index === transactions.length - 1 ? 'none' : 'full'"
          >
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
