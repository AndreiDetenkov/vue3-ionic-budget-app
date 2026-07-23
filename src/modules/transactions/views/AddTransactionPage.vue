<script setup lang="ts">
import { IonContent, IonButtons, IonBackButton, IonPage, IonProgressBar, onIonViewWillEnter } from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';
import AddTransactionForm from '@/modules/transactions/components/AddTransactionForm.vue';
import BaseHeader from '@/core/components/BaseHeader.vue';

const categoryStore = useCategoryStore();
const { loading } = storeToRefs(categoryStore);

onIonViewWillEnter(() => categoryStore.getCategoryList());
</script>

<template>
  <ion-page>
    <BaseHeader title="New transaction">
      <template #buttons>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
      </template>
      <ion-progress-bar v-if="loading" type="indeterminate" />
    </BaseHeader>

    <ion-content fullscreen class="ion-padding">
      <AddTransactionForm />
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-content {
  --background: var(--ion-color-bg-light-grey);
}
</style>
