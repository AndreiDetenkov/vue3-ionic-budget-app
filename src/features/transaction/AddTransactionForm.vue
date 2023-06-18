<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import {
  IonCol,
  IonGrid,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  IonRippleEffect,
  IonButton,
  IonLoading,
  loadingController,
} from '@ionic/vue';
import { PressedCategory, useCategoryStore } from '@/entities/categories';
import { CreateTransactionPayload, useTransactionStore } from '@/entities/transactions';
import router from '@/app/router';

const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const { pressedCategories } = storeToRefs(categoryStore);

const form = ref<{ transaction: string | null; amount: number | null }>({
  transaction: null,
  amount: null,
});
const categoryId = ref<string | null>(null);

function handleTap(id: string): void {
  if (!pressedCategories.value) return;
  pressedCategories.value.forEach((category: PressedCategory): void => {
    category.isPressed = category.id === id;
  });
  categoryId.value = id;
}

async function handleSubmit() {
  if (!form.value.transaction || !form.value.amount || !categoryId.value) return;

  const payload: CreateTransactionPayload = {
    name: form.value.transaction,
    value: form.value.amount,
    category_id: categoryId.value,
  };

  await loadingController.create({ keyboardClose: true });
  const { success } = await transactionStore.createTransaction(payload);
  if (success) {
    await router.push('/tabs/transactions').catch(() => {});
  }
  await loadingController.dismiss();
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <ion-list>
      <ion-item>
        <ion-input
          v-model="form.transaction"
          label="Transaction"
          label-placement="floating"
          autocapitalize="on"
          :autofocus="true"
        />
      </ion-item>

      <ion-item>
        <ion-input v-model="form.amount" type="number" inputmode="numeric" label="Amount" label-placement="floating" />
      </ion-item>
    </ion-list>

    <ion-grid>
      <ion-row>
        <ion-col v-for="{ id, title, icon, isPressed } in pressedCategories" :key="id" size="4">
          <div
            @click.stop="handleTap(id)"
            class="ion-activatable ripple-parent card"
            :class="{ 'pressed-card': isPressed }"
          >
            <ion-ripple-effect class="custom-ripple" />
            <ion-img :src="icon" :alt="title" />
            <ion-label>{{ title }}</ion-label>
          </div>
        </ion-col>
      </ion-row>
    </ion-grid>

    <ion-button id="open-loading" expand="block" type="submit"> Add transaction </ion-button>

    <ion-loading trigger="open-loading" message="Saving transaction..." />
  </form>
</template>

<style scoped>
ion-list {
  margin: 12px 0 0;
}

ion-item {
  margin-bottom: 16px;
  margin-right: 16px;
}

ion-img {
  width: 28px;
  height: auto;
  margin-bottom: 8px;
}

ion-label {
  font-size: 12px;
  font-weight: 500;
}

ion-button {
  margin: 12px 12px 24px;
}

.card {
  padding: 4px;
  margin: 4px;
  border: 1px solid var(--ion-color-medium-tint);
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

.pressed-card {
  border: 2px solid #501ace;
}

.custom-ripple {
  width: 98px;
  height: 70px;
  border-radius: 8px;
  color: #501ace;
  transform: translateX(8px) translateY(8px);
}
</style>
