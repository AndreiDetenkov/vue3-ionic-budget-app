<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonInput,
  IonItem,
  IonList,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/vue';
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar mode="md">
        <ion-title>Add transaction</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item>
          <ion-input label="Transaction" label-placement="floating" autocapitalize="on" :autofocus="true" />
        </ion-item>

        <ion-item>
          <ion-input type="number" inputmode="numeric" label="Amount" label-placement="floating" />
        </ion-item>
      </ion-list>

      <ion-grid> </ion-grid>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-list {
  margin: 12px 0 24px;
}

ion-item {
  margin-bottom: 16px;
  margin-right: 16px;
}
</style>
