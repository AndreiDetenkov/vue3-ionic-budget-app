<script setup lang="ts">
import {
  IonModal,
  IonContent,
  IonButtons,
  IonChip,
  IonList,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
} from '@ionic/vue';
import type { Transaction } from '@/modules/transactions';
import { formatDate } from '@/core/utils/dates';
import BaseHeader from '@/core/components/BaseHeader.vue';
import TransactionListItem from '@/modules/transactions/components/TransactionListItem.vue';

defineProps<{
  list: Record<string, Transaction[]>;
}>();

const model = defineModel();

const closeModal = () => {
  model.value = false;
};
</script>

<template>
  <ion-modal :is-open="model" @didDismiss="closeModal">
    <BaseHeader title="Transaction List">
      <template #buttons>
        <ion-buttons slot="end">
          <ion-chip color="primary" @click="closeModal">Close</ion-chip>
        </ion-buttons>
      </template>
    </BaseHeader>

    <ion-content fullscreen>
      <ion-list lines="full" class="ion-no-padding">
        <ion-item-group v-for="(transactions, date) in list" :key="date">
          <ion-item-divider mode="md" sticky>
            <ion-label> {{ formatDate(date.toString(), 'DD.MM.YYYY dddd') }} </ion-label>
          </ion-item-divider>

          <TransactionListItem
            v-for="transaction in transactions"
            :key="transaction.id"
            :transaction="transaction"
          />
        </ion-item-group>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
ion-button {
  text-transform: capitalize;
  letter-spacing: 0;
  font-size: 1.2rem;
}

ion-item-divider {
  background: var(--ion-color-bg-light-grey);
  color: var(--ion-color-primary);
  font-weight: 500;
}
</style>
