<script setup lang="ts">
import { IonInput, IonItem, IonList } from '@ionic/vue';
import CategoryList from '@/entities/categories/ui/CategoryList.vue';
</script>

<template>
  <ion-list>
    <ion-item>
      <ion-input label="Transaction" label-placement="floating" autocapitalize="on" :autofocus="true" />
    </ion-item>

    <ion-item>
      <ion-input type="number" inputmode="numeric" label="Amount" label-placement="floating" />
    </ion-item>
  </ion-list>

  <category-list />
</template>

<style scoped>
ion-list {
  margin: 12px 0 0;
}

ion-item {
  margin-bottom: 16px;
  margin-right: 16px;
}
</style>
