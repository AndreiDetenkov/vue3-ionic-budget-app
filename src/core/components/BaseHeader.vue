<script setup lang="ts">
import { IonHeader, IonTitle, IonToolbar } from '@ionic/vue';

defineProps<{
  title: string;
}>();
</script>

<template>
  <ion-header class="ion-no-border">
    <ion-toolbar color="light">
      <ion-title> {{ title }} </ion-title>
      <slot name="buttons" />
      <slot />
    </ion-toolbar>
  </ion-header>
</template>
