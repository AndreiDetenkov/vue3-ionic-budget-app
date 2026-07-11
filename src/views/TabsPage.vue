<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { list, add, barChartSharp } from 'ionicons/icons';
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="transactions" href="/tabs/transactions">
          <ion-icon aria-hidden="true" :icon="list" />
          <ion-label>Transactions</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="add" href="/tabs/add">
          <ion-icon aria-hidden="true" :icon="add" class="add-btn-icon" />
        </ion-tab-button>

        <ion-tab-button tab="categories" href="/tabs/reports">
          <ion-icon aria-hidden="true" :icon="barChartSharp" />
          <ion-label>Reports</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<style scoped>
ion-tab-bar {
  border-top-left-radius: 1.5rem;
  border-top-right-radius: 1.5rem;
  padding: 0.5rem 0;
}

ion-tab-button {
  border-radius: 1rem;
  margin: 0 1rem;
}

.add-btn-icon {
  font-size: 30px;
  border-width: 1.5px;
  border-style: solid;
  padding: 1px;
  border-radius: 10px;
  color: var(--ion-color-primary);
}
</style>
