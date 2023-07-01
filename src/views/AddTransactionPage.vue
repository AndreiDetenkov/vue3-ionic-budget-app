<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonProgressBar, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { useCategoryStore } from '@/entities/categories';
import { AddTransaction } from '@/features/transaction';

const categoryStore = useCategoryStore();
const { categories, loading } = storeToRefs(categoryStore);

onIonViewWillEnter(() => {
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
