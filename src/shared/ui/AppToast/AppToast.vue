<script setup lang="ts">
import { IonToast } from '@ionic/vue';
import { Color, Position, PositionAnchor } from '@/shared/ui/AppToast/Toast.types';

interface Props {
  message: string;
  color?: Color;
  duration?: number;
  position?: Position;
  positionAnchor?: PositionAnchor;
}

const prop = withDefaults(defineProps<Props>(), {
  color: undefined,
  duration: 5000,
  position: 'bottom',
  positionAnchor: undefined,
});

const model = defineModel();
</script>

<template>
  <ion-toast
    :is-open="model"
    :duration="prop.duration"
    :message="prop.message"
    :position="prop.position"
    :color="color"
  ></ion-toast>
</template>
