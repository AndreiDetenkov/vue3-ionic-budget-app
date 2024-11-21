<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { IonLabel, IonList, IonListHeader } from '@ionic/vue';
import { useTransactionStore, TransactionsEmpty } from '@/entities/transactions';
import { SlideListItem } from '@/features/SlideTransaction';

const store = useTransactionStore();
const { transactions } = storeToRefs(store);

const showList = computed(() => transactions.value?.length);
</script>

<template>
  <template v-if="showList">
    <ion-list-header>
      <ion-label>
        <h2>Recent Transactions</h2>
      </ion-label>
    </ion-list-header>

    <ion-list lines="full">
      <slide-list-item v-for="transaction in transactions" :key="transaction.id" :transaction="transaction" />
    </ion-list>
  </template>

  <template v-else>
    <transactions-empty />
  </template>
</template>
