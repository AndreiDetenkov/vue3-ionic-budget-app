<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Transactions</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" :icon="add"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-progress-bar v-if="loading" type="indeterminate"></ion-progress-bar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true"></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonProgressBar,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/vue';
import { add } from 'ionicons/icons';
import { onMounted, ref } from 'vue';
import { getCurrentMonthDates } from '@/shared/dates';
import { useTransactionStore } from '@/entities/transactions';

const store = useTransactionStore();
const loading = ref(false);

onMounted(() => {
  getTransactions();
});

const getTransactions = async () => {
  const { startDate, endDate } = getCurrentMonthDates();
  loading.value = true;
  await store.getTransactionsByRange({ from: startDate, to: endDate });
  loading.value = false;
};
</script>
