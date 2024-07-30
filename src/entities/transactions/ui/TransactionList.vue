<script setup lang="ts">
import { IonLabel, IonList, IonListHeader } from '@ionic/vue';
import { useTransactionStore } from '@/entities/transactions';
import TransactionListItem from '@/entities/transactions/ui/TransactionListItem.vue';

const store = useTransactionStore();
</script>

<template>
  <template v-if="store.transactions">
    <ion-list-header>
      <ion-label>
        <h2 class="header-title">Recent Transactions</h2>
      </ion-label>
    </ion-list-header>

    <ion-list lines="none">
      <transaction-list-item :transactions="store.transactions" />
    </ion-list>
  </template>

  <template v-else> No Transactions in this moment </template>
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
