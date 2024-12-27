<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { list, apps, add } from 'ionicons/icons';
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet mode="md"></ion-router-outlet>

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="transactions" href="/tabs/transactions">
          <ion-icon aria-hidden="true" :icon="list" />
          <ion-label>Transactions</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="add" href="/tabs/add">
          <ion-icon aria-hidden="true" :icon="add" class="add-btn-icon" />
        </ion-tab-button>

        <ion-tab-button tab="categories" href="/tabs/calculations">
          <ion-icon aria-hidden="true" :icon="apps" />
          <ion-label>Calculation</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<style>
.add-btn-icon {
  font-size: 30px;
  border-width: 1px;
  border-style: solid;
  padding: 1px;
  border-radius: 10px;
  color: var(--ion-color-primary);
}
</style>
