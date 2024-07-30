<script setup lang="ts">
import { IonSegment, IonSegmentButton, IonLabel } from '@ionic/vue';
import { OpUnitType } from 'dayjs';
import { rangeUnits } from '@/entities/transactions';

const model = defineModel<OpUnitType>('day');
</script>

<template>
  <ion-segment v-model="model" class="ion-padding-horizontal">
    <ion-segment-button :value="rangeUnits.day" class="ion-text-capitalize">
      <ion-label>Daily</ion-label>
    </ion-segment-button>

    <ion-segment-button :value="rangeUnits.week" class="ion-text-capitalize">
      <ion-label>Weekly</ion-label>
    </ion-segment-button>

    <ion-segment-button :value="rangeUnits.month" class="ion-text-capitalize">
      <ion-label>Monthly</ion-label>
    </ion-segment-button>
  </ion-segment>
</template>

<style scoped></style>
