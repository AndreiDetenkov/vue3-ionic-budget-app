<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonCol, IonGrid, IonImg, IonLabel, IonRippleEffect, IonRow } from '@ionic/vue';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';
import { PressedCategory } from '@/modules/categories/types';

const emit = defineEmits<{
  'select-category': [id: string];
}>();

const categoryStore = useCategoryStore();
const { pressedCategories } = storeToRefs(categoryStore);

function onTapHandler(id: string): void {
  if (!id) {
    return;
  }

  pressedCategories.value.forEach((category: PressedCategory): void => {
    category.isPressed = category.id === id;
  });

  emit('select-category', id);
}
</script>

<template>
  <ion-grid class="ion-margin-bottom">
    <ion-row>
      <ion-col v-for="{ id, title, icon, isPressed } in pressedCategories" :key="id.toString()" size="4">
        <div
          @click.stop="onTapHandler(id)"
          class="ion-activatable ripple-parent card"
          :class="{ 'pressed-card': isPressed }"
        >
          <ion-ripple-effect class="card-custom-ripple" />
          <ion-img class="card-img" :src="icon as string" :alt="title" />
          <ion-label class="card-title">{{ title }}</ion-label>
        </div>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<style scoped>
.card {
  padding: 8px;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  text-align: center;
  justify-content: center;
  align-items: center;
  color: var(--ion-color-dark);
  min-height: 70px;
  box-sizing: border-box;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
}

.card-img {
  width: 36px;
  height: auto;
  margin-bottom: 8px;
}

.card-custom-ripple {
  width: calc(100% - 10px);
  height: 78px;
  border-radius: 8px;
  color: var(--ion-color-tertiary);
  transform: translateX(6px) translateY(6px);
}

.pressed-card {
  border: 1px solid var(--ion-color-tertiary);
  background: var(--ion-color-tertiary-light);
}
</style>
