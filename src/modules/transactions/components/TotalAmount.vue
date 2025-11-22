<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonGrid, IonLabel, IonIcon } from '@ionic/vue';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { formatDateByTemplate } from '@/core/utils/dates';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';

const store = useTransactionStore();

const isAmountHidden = ref(false);

const toggleVisibility = () => {
  isAmountHidden.value = !isAmountHidden.value;
};

const formattedTotal = computed<string>(() => {
  return store.total.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1 `);
});

const amountToDisplay = computed(() => (isAmountHidden.value ? '********' : formattedTotal.value));

const icon = computed(() => (isAmountHidden.value ? eyeOutline : eyeOffOutline));
</script>

<template>
  <ion-grid>
    <div class="card">
      <ion-label class="card__total">
        <span class="card__total-amount"> {{ amountToDisplay }}</span>
        KGS
      </ion-label>
      <ion-label class="card__date">{{ formatDateByTemplate('MMMM YYYY') }}</ion-label>
      <ion-icon :icon color="medium" class="card__icon" @click="toggleVisibility"></ion-icon>
    </div>
  </ion-grid>
</template>

<style scoped>
.card {
  padding: 2rem 1rem;
  margin: 16px 8px 0;
  border: 1px solid var(--ion-color-medium);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.card__icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.6rem;
}

.card__total {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
}

.card__total-amount {
  display: inline-block;
  min-width: 6.5ch;
  text-align: center;
}

.card__date {
  font-size: 16px;
}
</style>
