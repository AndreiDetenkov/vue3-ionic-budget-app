<script setup lang="ts">
import { IonSegment, IonSegmentButton, IonLabel } from '@ionic/vue';
import { OpUnitType } from 'dayjs';
import { rangeUnits } from '@/modules/transactions/types';

const model = defineModel<OpUnitType>();
</script>

<template>
  <ion-segment v-model="model" class="ion-padding-horizontal" color="primary">
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

<style scoped>
ion-segment {
  margin-bottom: 16px;
}

ion-segment-button {
  letter-spacing: 0;
  font-size: 16px;
}
</style>
