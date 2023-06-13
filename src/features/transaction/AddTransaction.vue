<script setup lang="ts">
import { IonCol, IonGrid, IonImg, IonInput, IonItem, IonLabel, IonList, IonRow } from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { useCategoryStore } from '@/entities/categories';

const categoryStore = useCategoryStore();
const { pressedCategories } = storeToRefs(categoryStore);
</script>

<template>
  <ion-list>
    <ion-item>
      <ion-input label="Transaction" label-placement="floating" autocapitalize="on" :autofocus="true" />
    </ion-item>

    <ion-item>
      <ion-input type="number" inputmode="numeric" label="Amount" label-placement="floating" />
    </ion-item>
  </ion-list>

  <ion-grid>
    <ion-row>
      <ion-col v-for="{ id, title, icon } in pressedCategories" :key="id" size="4">
        <div class="card">
          <ion-img :src="icon" :alt="title" />
          <ion-label>{{ title }}</ion-label>
        </div>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<style scoped>
ion-list {
  margin: 12px 0 0;
}

ion-item {
  margin-bottom: 16px;
  margin-right: 16px;
}

.card {
  padding: 4px;
  margin: 4px;
  border: 1px solid var(--ion-color-medium-tint);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  text-align: center;
  justify-content: center;
  align-items: center;
  color: var(--ion-color-dark);
  min-height: 72px;
}

ion-img {
  width: 32px;
  height: auto;
  margin-bottom: 4px;
}

ion-label {
  font-size: 12px;
  font-weight: 500;
}
</style>
