<script setup lang="ts">
import {
  IonModal,
  IonContent,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/vue';
import type { Transaction } from '@/modules/transactions';
import { formatDate, formatDateByTemplate } from '@/core/utils/dates';
import BaseHeader from '@/core/components/BaseHeader.vue';
import { computed } from 'vue';

defineProps<{
  list: Record<string, Transaction[]>;
}>();

const model = defineModel();

const title = computed(() => `Transactions in ${formatDateByTemplate('MMMM')}`);

const closeModal = () => {
  model.value = false;
};
</script>

<template>
  <ion-modal :is-open="model" @didDismiss="closeModal">
    <BaseHeader :title>
      <template #buttons>
        <ion-buttons slot="end">
          <ion-button color="primary" @click="closeModal">Close</ion-button>
        </ion-buttons>
      </template>
    </BaseHeader>

    <ion-content fullscreen>
      <ion-list lines="full" class="ion-no-padding">
        <ion-item-group v-for="(transactions, date) in list" :key="date">
          <ion-item-divider mode="md" color="light" sticky>
            <ion-label> {{ formatDate(date.toString(), 'DD.MM.YYYY dddd') }} </ion-label>
          </ion-item-divider>

          <ion-item
            v-for="(transaction, index) in transactions"
            :key="transaction.id"
            :lines="index === transactions.length - 1 ? 'none' : 'full'"
          >
            <ion-grid>
              <ion-row class="ion-align-items-center">
                <ion-col>
                  <ion-label class="title">{{ transaction.name }}</ion-label>
                  <ion-label class="category">{{ transaction.category.title }}</ion-label>
                </ion-col>

                <ion-col size="auto">
                  <ion-label class="price">{{ transaction.value }}&nbsp;&#8838;</ion-label>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-item>
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

.title {
  font-size: 1.1rem;
}

.price {
  font-size: 1.125rem;
}

.category {
  font-size: 12px;
  --color: var(--ion-color-medium-shade);
}
</style>
