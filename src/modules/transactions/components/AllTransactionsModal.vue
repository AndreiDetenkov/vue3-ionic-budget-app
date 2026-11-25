<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonModal, IonContent, IonButtons, IonChip, IonList, IonItemGroup, IonItemDivider, IonLabel } from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions';
import { formatDate } from '@/core/utils';
import BaseHeader from '@/core/components/BaseHeader.vue';
import SlideListItem from '@/modules/transactions/components/SlideTransaction/SlideListItem.vue';

const model = defineModel<boolean>({ default: false });

const transactionStore = useTransactionStore();
const { transactionsByDate } = storeToRefs(transactionStore);

const closeModal = () => {
  model.value = false;
};
</script>

<template>
  <ion-modal :is-open="model" data-testid="all-transactions-modal" @didDismiss="closeModal">
    <BaseHeader title="Transaction List">
      <template #buttons>
        <ion-buttons slot="end">
          <ion-chip color="primary" data-testid="close-all-transactions-btn" @click="closeModal">Close</ion-chip>
        </ion-buttons>
      </template>
    </BaseHeader>

    <ion-content fullscreen>
      <ion-list lines="none" class="ion-no-padding">
        <ion-item-group v-for="(transactions, date) in transactionsByDate" :key="date">
          <ion-item-divider mode="md" sticky>
            <ion-label> {{ formatDate(date.toString(), 'DD.MM.YYYY dddd') }} </ion-label>
          </ion-item-divider>

          <div class="group-items">
            <SlideListItem v-for="transaction in transactions" :key="transaction.id" :transaction="transaction" />
          </div>
        </ion-item-group>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
ion-content {
  --background: var(--ion-color-bg-light-grey);
}

ion-list {
  background: var(--ion-color-bg-light-grey);
}

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

.group-items {
  padding: 0.5rem 1rem 0;
}
</style>
