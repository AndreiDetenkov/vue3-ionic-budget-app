<script setup lang="ts">
import { IonChip } from '@ionic/vue';

const emit = defineEmits<{
  filter: [key: string];
}>();

enum Filter {
  LastYear = 'lastYear',
  CurrentYear = 'currentYear',
  LastMonth = 'lastMonth',
  CurrentMonth = 'currentMonth',
}
</script>

<template>
  <div class="ion-padding">
    <ion-chip outline color="primary" @click="emit('filter', Filter.LastYear)">Last year</ion-chip>
    <ion-chip color="primary" @click="emit('filter', Filter.CurrentYear)">Current year</ion-chip>
    <ion-chip color="primary" @click="emit('filter', Filter.LastMonth)">Last month</ion-chip>
    <ion-chip color="primary" @click="emit('filter', Filter.CurrentMonth)">Current month</ion-chip>
  </div>
</template>

<style scoped></style>
