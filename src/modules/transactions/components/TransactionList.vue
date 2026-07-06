<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonTitle, IonList, IonListHeader, IonChip } from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import SlideListItem from '@/modules/transactions/components/SlideTransaction/SlideListItem.vue';

const emit = defineEmits(['viewAllTransactions']);

const store = useTransactionStore();
const { recentTransactions } = storeToRefs(store);
</script>

<template>
  <ion-list lines="none">
    <ion-list-header>
      <ion-title>Recent Expenses</ion-title>
      <ion-chip outline @click="emit('viewAllTransactions')"> View All </ion-chip>
    </ion-list-header>

    <slide-list-item v-for="transaction in recentTransactions" :key="transaction.id" :transaction="transaction" />
  </ion-list>
</template>

<style scoped>
ion-list {
  background: var(--ion-color-bg-light-grey);
}

ion-list-header {
  margin-bottom: 1rem;
  padding-left: 0;
}

ion-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ion-color-primary);
  padding-left: 0;
}

ion-chip {
  font-size: 1rem;
  color: var(--ion-color-primary);
  font-weight: 500;
}
</style>
