<script setup lang="ts">
import { IonRefresher, IonRefresherContent } from '@ionic/vue';

const emit = defineEmits<{
  refresh: [void];
}>();

const onRefreshHandler = (event: CustomEvent): void => {
  emit('refresh');
  event.detail.complete();
};
</script>

<template>
  <ion-refresher slot="fixed" @ionRefresh="onRefreshHandler">
    <ion-refresher-content></ion-refresher-content>
  </ion-refresher>
</template>
