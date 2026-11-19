<script setup lang="ts">
import { IonRefresher, IonRefresherContent, RefresherCustomEvent } from '@ionic/vue';

const props = defineProps<{
  onRefresh?: () => void | Promise<void>;
}>();

const handleRefresh = async (event: RefresherCustomEvent) => {
  try {
    await props.onRefresh?.();
  } finally {
    event.detail.complete();
  }
};
</script>

<template>
  <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)" mode="md">
    <ion-refresher-content></ion-refresher-content>
  </ion-refresher>
</template>
