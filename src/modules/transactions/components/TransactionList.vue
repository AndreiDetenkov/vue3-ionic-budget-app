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

    <template v-if="recentTransactions.today.length">
      <div class="date-header-container">
        <span class="date-header-text">Today</span>
      </div>
      <slide-list-item
        v-for="transaction in recentTransactions.today"
        :key="transaction.id"
        :transaction="transaction"
      />
    </template>

    <template v-if="recentTransactions.yesterday.length">
      <div class="date-header-container">
        <span class="date-header-text">Yesterday</span>
      </div>
      <slide-list-item
        v-for="transaction in recentTransactions.yesterday"
        :key="transaction.id"
        :transaction="transaction"
      />
    </template>
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

.date-header-container {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0 1rem 0;
}

.date-header-text {
  color: var(--ion-color-medium);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1rem;
  text-transform: uppercase;
  padding: 0 1rem;
}

.date-header-container::before,
.date-header-container::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--ion-color-light-shade);
}
</style>
