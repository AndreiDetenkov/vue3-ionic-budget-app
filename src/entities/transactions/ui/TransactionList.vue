<script setup lang="ts">
import { IonLabel, IonList, IonListHeader } from '@ionic/vue';
import { useTransactionStore, TransactionsEmpty, TransactionListItemSlide } from '@/entities/transactions';
import { computed } from 'vue';

const store = useTransactionStore();

const showList = computed(() => store.transactions?.length);
</script>

<template>
  <template v-if="showList">
    <ion-list-header>
      <ion-label>
        <h2 class="header-title">Recent Transactions</h2>
      </ion-label>
    </ion-list-header>

    <ion-list lines="none">
      <transaction-list-item-slide
        v-for="transaction in store.transactions"
        :key="transaction.id"
        :transaction="transaction"
        @remove-transaction="store.removeTransaction"
      />
    </ion-list>
  </template>

  <template v-else>
    <transactions-empty />
  </template>
</template>

<style scoped>
ion-grid {
  --ion-grid-padding: 0;
  color: var(--ion-color-dark);
}

ion-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
