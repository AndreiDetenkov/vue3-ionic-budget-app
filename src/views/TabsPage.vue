<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { list, barChartSharp, addCircleOutline } from 'ionicons/icons';
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
          <ion-icon aria-hidden="true" :icon="addCircleOutline" size="large" />
          <ion-label>Add</ion-label>
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
  padding: 0.5rem var(--ion-safe-area-right, 0px) calc(var(--ion-safe-area-bottom, 0px) + 0.5rem) var(--ion-safe-area-left, 0px);
}

ion-tab-button {
  border-radius: 1rem;
  margin: 0 1rem;
  --color-selected: var(--ion-color-primary);
}

ion-tab-button.tab-selected {
  --background: var(--ion-color-bg-light-green);
}

ion-tab-button ion-label {
  text-transform: uppercase;
  font-size: 0.6rem;
  font-weight: 700;
}
</style>
