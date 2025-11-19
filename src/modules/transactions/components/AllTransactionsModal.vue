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
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions';
import { formatDate, formatDateByTemplate } from '@/core/utils/dates';

const model = defineModel();
const store = useTransactionStore();

const currentMonth = formatDateByTemplate('MMMM');
</script>

<template>
  <ion-modal :is-open="model">
    <ion-header>
      <ion-toolbar color="light">
        <ion-title>Transactions in {{ currentMonth }}</ion-title>
        <ion-buttons slot="end">
          <ion-button color="primary" @click="model = false">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen>
      <ion-list lines="full" class="ion-no-padding">
        <ion-item-group v-for="(transactions, date) in store.transactionsByDate" :key="date">
          <ion-item-divider mode="md" color="light" sticky>
            <ion-label> {{ formatDate(date.toString(), 'DD.MM.YYYY dddd') }} </ion-label>
          </ion-item-divider>

          <ion-item
            v-for="(transaction, index) in transactions"
            :key="transaction.id"
            :lines="index === transactions.length - 1 ? 'none' : 'full'"
          >
            <ion-grid>
              <ion-row>
                <ion-col>
                  <ion-label>{{ transaction.name }}</ion-label>
                  <ion-label color="medium" class="category">{{ transaction.category.title }}</ion-label>
                </ion-col>
                <ion-col size="auto">
                  <ion-label>{{ transaction.value }}</ion-label>
                </ion-col>
              </ion-row>
            </ion-grid>
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

.category {
  font-size: 12px;
}
</style>
