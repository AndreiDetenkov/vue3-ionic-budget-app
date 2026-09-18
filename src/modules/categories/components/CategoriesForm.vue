<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { IonCol, IonGrid, IonLabel, IonRippleEffect, IonRow } from '@ionic/vue';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';
import { PressedCategory } from '@/modules/categories/types';
import { getCategoryIconUrl } from '@/core/utils';

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
          <div
            class="category-icon"
            :style="({ maskImage: `url(${getCategoryIconUrl(icon)})` })"
          />
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
  color: var(--ion-color-dark-tint);
  min-height: 70px;
  box-sizing: border-box;
  background-color: var(--ion-color-bg-light-green);
}

.card-title {
  font-size: 14px;
  font-weight: 500;
}

.category-icon {
  width: 32px;
  height: 32px;
  margin-bottom: 8px;
  background-color: var(--ion-color-dark);
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  transition: background-color 0.2s ease;
}

.card-custom-ripple {
  width: calc(100% - 10px);
  height: 78px;
  border-radius: 8px;
  color: var(--ion-color-secondary-tint);
  transform: translateX(6px) translateY(6px);
}

.pressed-card {
  border: 1px solid var(--ion-color-bg-green-pastel);
  background: var(--ion-color-bg-green-pastel);
  color: var(--ion-color-primary);
}

.pressed-card .category-icon {
  background-color: var(--ion-color-primary-tint);
}
</style>
