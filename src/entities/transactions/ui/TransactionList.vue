<script setup lang="ts">
import { IonItem, IonLabel, IonList, IonGrid, IonRow, IonCol, IonThumbnail, IonListHeader } from '@ionic/vue';
import { useTransactionStore } from '@/entities/transactions';
import { formatDate } from '@/shared/dates';
import { storeToRefs } from 'pinia';

const store = useTransactionStore();
const { recentTransactions } = storeToRefs(store);
</script>

<template>
  <ion-list-header>
    <ion-label>
      <h2 class="header-title">Recent Transactions</h2>
    </ion-label>
  </ion-list-header>

  <ion-list lines="none">
    <ion-item v-for="{ name, value, categories, created_at, id } in recentTransactions" :key="id">
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
            <ion-label class="amount">{{ value }}c</ion-label>
            <ion-label class="date">{{ formatDate(created_at) }}</ion-label>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-item>
  </ion-list>
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

ion-thumbnail {
  --size: 24px;
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
  font-size: 10px;
  color: var(--ion-color-medium-shade);
}
</style>
