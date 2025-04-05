<script setup lang="ts">
import { IonRefresher, IonRefresherContent, RefresherCustomEvent } from '@ionic/vue';

const emit = defineEmits<{
  refresh: [void];
}>();

const onRefreshHandler = (event: RefresherCustomEvent): void => {
  emit('refresh');
  event.detail.complete()
};
</script>

<template>
  <ion-refresher slot="fixed" @onIonRefresh="onRefreshHandler($event)" mode="md">
    <ion-refresher-content></ion-refresher-content>
  </ion-refresher>
</template>
