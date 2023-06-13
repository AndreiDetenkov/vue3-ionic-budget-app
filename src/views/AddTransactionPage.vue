<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonProgressBar, IonTitle, IonToolbar, onIonViewDidEnter } from '@ionic/vue';
import AddTransaction from '@/features/transaction/AddTransaction.vue';
import { useCategoryStore } from '@/entities/categories';
import { storeToRefs } from 'pinia';

const categoryStore = useCategoryStore();
const { categories, loading } = storeToRefs(categoryStore);

onIonViewDidEnter(() => {
  if (!categories.value) categoryStore.getCategoryList();
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar mode="md">
        <ion-title>Add transaction</ion-title>
        <ion-progress-bar v-if="loading" type="indeterminate" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <add-transaction />
    </ion-content>
  </ion-page>
</template>
