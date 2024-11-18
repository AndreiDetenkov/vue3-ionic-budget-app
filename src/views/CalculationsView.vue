<script setup lang="ts">
// import { ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';
// import AppTabs from '@/shared/ui/AppTabs.vue';
import { useTransactionStore } from '@/entities/transactions';
import { storeToRefs } from 'pinia';

// const tab = ref('day');

const store = useTransactionStore();
const { calculatedTransactionsByCategory } = storeToRefs(store);
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar mode="md">
        <ion-title>Calculations</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen class="ion-padding">
      <!--      <app-tabs v-model="tab" />-->

      <pre>{{ calculatedTransactionsByCategory }}</pre>
    </ion-content>
  </ion-page>
</template>
