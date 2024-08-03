<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonLabel, IonList, IonListHeader } from '@ionic/vue';
import { useTransactionStore, TransactionsEmpty, TransactionListItemSlide } from '@/entities/transactions';

const store = useTransactionStore();

const list = ref();

const showList = computed(() => store.transactions?.length);

function removeTransaction(id: string) {
  store.removeTransaction(id);
  list.value?.$el.closeSlidingItems();
}
</script>

<template>
  <template v-if="showList">
    <ion-list-header>
      <ion-label>
        <h2 class="header-title">Recent Transactions</h2>
      </ion-label>
    </ion-list-header>

    <ion-list lines="none" ref="list">
      <transaction-list-item-slide
        v-for="transaction in store.transactions"
        :key="transaction.id"
        :transaction="transaction"
        @remove-transaction="removeTransaction"
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
