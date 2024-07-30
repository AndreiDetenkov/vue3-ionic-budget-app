<script setup lang="ts">
import { formatDate } from '@/shared/dates';
import { TransactionWithCategory } from '@/entities/transactions';

defineProps<{
  transactions: TransactionWithCategory[];
}>();
</script>

<template>
  <ion-item v-for="{ categories, name, value, created_at, id } in transactions" :key="id">
    <ion-grid>
      <ion-row class="ion-align-items-center">
        <ion-col size="auto">
          <ion-thumbnail>
            <img :alt="categories.title" :src="categories.icon" />
          </ion-thumbnail>
        </ion-col>

        <ion-col>
          <ion-label class="title">{{ name }}</ion-label>
          <ion-label class="category">{{ categories.title }}</ion-label>
        </ion-col>

        <ion-col size="auto">
          <ion-label class="amount">{{ value }}</ion-label>
          <ion-label class="date">{{ formatDate(created_at) }}</ion-label>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item>
</template>

<style scoped>
ion-thumbnail {
  --size: 32px;
  --border-radius: 4px;
  margin-right: 10px;
}

.title {
  font-size: 16px;
}

.category {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}

.amount {
  font-size: 16px;
  text-align: right;
}

.date {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}
</style>
