<script setup lang="ts">
import { IonContent, IonButtons, IonBackButton, IonPage, IonProgressBar, onIonViewWillEnter } from '@ionic/vue';
import { storeToRefs } from 'pinia';
import TransactionForm from '@/modules/transactions/components/AddTransaction/TransactionForm.vue';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';
import BaseHeader from '@/core/components/BaseHeader.vue';

const categoryStore = useCategoryStore();
const { loading } = storeToRefs(categoryStore);

onIonViewWillEnter(() => categoryStore.getCategoryList());
</script>

<template>
  <ion-page>
    <BaseHeader title="Add transaction">
      <template #buttons>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
      </template>
      <ion-progress-bar v-if="loading" type="indeterminate" />
    </BaseHeader>

    <ion-content class="ion-padding">
      <transaction-form />
    </ion-content>
  </ion-page>
</template>
