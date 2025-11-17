<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { IonLabel, IonList, IonListHeader, IonButton } from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import TransactionsEmpty from '@/modules/transactions/components/TransactionsEmpty.vue';
import SlideListItem from '@/modules/transactions/components/SlideTransaction/SlideListItem.vue';

const emit = defineEmits(['handleClick']);

const store = useTransactionStore();
const { recentTransactions } = storeToRefs(store);

const showList = computed(() => recentTransactions.value?.length);
</script>

<template>
  <template v-if="showList">
    <ion-list lines="full">
      <ion-list-header>
        <ion-label> Recent Transactions </ion-label>
        <ion-button color="dark" @click="emit('handleClick')"> See All </ion-button>
      </ion-list-header>

      <slide-list-item v-for="transaction in recentTransactions" :key="transaction.id" :transaction="transaction" />
    </ion-list>
  </template>

  <template v-else>
    <transactions-empty />
  </template>
</template>

<style scoped>
ion-list-header {
  margin-bottom: 8px;
}

ion-label {
  font-size: 1rem;
  font-weight: 500;
}

ion-button {
  text-transform: capitalize;
  letter-spacing: 0;
  font-size: 1rem;
}
</style>
