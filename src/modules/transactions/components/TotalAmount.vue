<script setup lang="ts">
import { computed } from 'vue';
import { IonCardSubtitle, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip } from '@ionic/vue';
import { formatDateByTemplate } from '@/core/utils/dates';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import { formatAmount } from '@/core/utils';

const store = useTransactionStore();

const formattedTotal = computed<string>(() => formatAmount(store.total));
</script>

<template>
  <ion-card class="ion-no-margin">
    <ion-card-header>
      <ion-card-subtitle>monthly spending</ion-card-subtitle>
      <ion-card-title>
        <span class="amount"> {{ formattedTotal }}</span>
        <span class="currency">&nbsp;KGS</span>
      </ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-chip>
        {{ formatDateByTemplate('MMMM YYYY') }}
      </ion-chip>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
ion-card {
  background: #1B4332;
  background: linear-gradient(90deg,rgba(27, 67, 50, 1) 0%, rgba(64, 145, 108, 1) 100%);
  border-radius: 1.6rem;
  padding: 0.5rem 1rem 0.5rem 1.4rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

ion-card-subtitle {
  font-size: 0.8rem;
  color: var(--ion-color-amount);
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 2px
}

ion-card-title .amount {
  font-size: 3.4rem;
  font-weight: bold;
  color: var(--ion-color-amount);
}

ion-card-title .currency {
  font-size: 1.5rem;
  color: var(--ion-color-amount);
  opacity: 0.8;
}

ion-chip {
  font-size: 1rem;
  --color: var(--ion-color-amount);
  background: #3F7A63;
  opacity: 0.8;
  pointer-events: none;
  padding: 0.4rem 1.2rem;
  letter-spacing: 1px;
}
</style>
