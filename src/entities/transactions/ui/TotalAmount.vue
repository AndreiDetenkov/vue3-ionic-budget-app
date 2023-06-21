<script setup lang="ts">
import { IonGrid, IonRow, IonCol, IonLabel } from '@ionic/vue';
import { formatDateByTemplate } from '@/shared/dates';
import { useTransactionStore } from '@/entities/transactions';
import { computed } from 'vue';

const store = useTransactionStore();

const currentDate = formatDateByTemplate('MMMM YYYY');

const formattedTotal = computed<string>(() => {
  return store.total.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1 `);
});
</script>

<template>
  <ion-grid>
    <ion-row class="ion-align-items-center ion-justify-content-center">
      <ion-col>
        <div class="card">
          <ion-label class="card__title">Expense</ion-label>
          <ion-label class="card__total">{{ formattedTotal }}&nbsp;cом</ion-label>
          <ion-label class="card__date">{{ currentDate }}</ion-label>
        </div>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<style scoped>
.card {
  padding: 8px;
  margin: 16px 8px 0;
  border: 1px solid var(--ion-color-medium-tint);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--ion-color-dark);
}

.card__title {
  text-transform: uppercase;
  font-size: 12px;
  margin-bottom: 4px;
}
.card__total {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 4px;
}
.card__date {
  font-size: 14px;
}
</style>
