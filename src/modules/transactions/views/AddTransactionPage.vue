<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonButtons,
  IonBackButton,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { storeToRefs } from 'pinia';
import { useCategoryStore } from '@/entities/categories';
import { AddTransactionForm } from '../components/AddTransaction';

const categoryStore = useCategoryStore();
const { loading } = storeToRefs(categoryStore);

onIonViewWillEnter(() => categoryStore.getCategoryList());
</script>

<template>
  <ion-page>
    <ion-header id="header">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Add transaction</ion-title>
        <ion-progress-bar v-if="loading" type="indeterminate" />
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <add-transaction-form />
    </ion-content>
  </ion-page>
</template>
