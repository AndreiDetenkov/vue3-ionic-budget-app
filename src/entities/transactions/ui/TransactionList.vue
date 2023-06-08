<script setup lang="ts">
import { IonItem, IonLabel, IonList } from '@ionic/vue';
import { TransactionWithCategory } from '@/entities/transactions';

defineProps<{
  list: TransactionWithCategory[];
}>();
</script>

<template>
  <ion-list lines="none">
    <ion-item v-for="item in list" :key="item.id" class="list__item">
      <ion-label>{{ item.name + ' ' + item.value }}</ion-label>
    </ion-item>
  </ion-list>
</template>

<style scoped></style>
