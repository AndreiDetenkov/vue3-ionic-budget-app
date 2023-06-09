<script setup lang="ts">
import { IonItem, IonLabel, IonList, IonGrid, IonRow, IonCol, IonThumbnail } from '@ionic/vue';
import { TransactionWithCategory } from '@/entities/transactions';
import { formatDate } from '@/shared/dates';

defineProps<{
  list: TransactionWithCategory[];
}>();
</script>

<template>
  <ion-list lines="none">
    <ion-item v-for="{ name, value, categories, created_at, id } in list" :key="id">
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

ion-thumbnail {
  --size: 24px;
  --border-radius: 4px;
  margin-right: 10px;
}

.title {
  font-size: 14px;
  margin-bottom: 2px;
}

.category {
  font-size: 10px;
  color: var(--ion-color-medium-shade);
}

.amount {
  font-size: 14px;
  margin-bottom: 2px;
}

.date {
  font-size: 10px;
  color: var(--ion-color-medium-shade);
}
</style>
