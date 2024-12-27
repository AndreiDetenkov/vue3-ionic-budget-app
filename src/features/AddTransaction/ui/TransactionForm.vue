<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonInput, IonButton, IonSpinner } from '@ionic/vue';
import { useRouter } from 'vue-router';

import { TransactionPayload, useTransactionStore } from '@/entities/transactions';
import { CategoriesForm } from '@/entities/categories';
import { FormValues } from '@/features/AddTransaction';
import AppToast from '@/core/components/AppToast/AppToast.vue';
import { useToast } from '@/core/components/AppToast/useToast';

const router = useRouter();
const transactionStore = useTransactionStore();
const { setToast, toast } = useToast();

const form = ref<FormValues>({
  transaction: '',
  amount: '',
  categoryId: '',
});

const notValidForm = computed(() => Object.values(form.value).some((item) => !item));

function setCategoryId(id: string): void {
  form.value.categoryId = id;
}

function createPayload(): TransactionPayload {
  const { transaction, categoryId, amount } = form.value;

  return {
    name: transaction,
    value: parseInt(amount, 10),
    category_id: categoryId,
  };
}

async function onSubmitFormHandler(): Promise<void> {
  if (notValidForm.value) {
    setToast({ state: true, message: 'There are fields that are not filled in!' });
    return;
  }

  const { success } = await transactionStore.createTransaction(createPayload());

  if (!success) {
    setToast({ state: true, message: 'Oops! Something went wrong!' });
    return;
  }

  router.push('/tabs/transactions').then(() => clearState());
}

function clearState(): void {
  form.value.transaction = form.value.amount = form.value.categoryId = '';
}
</script>

<template>
  <app-toast
    v-model="toast.isOpen"
    :duration="2000"
    :message="toast.message"
    position="top"
    position-anchor="header"
    color="danger"
  ></app-toast>

  <form @submit.prevent="onSubmitFormHandler">
    <ion-input
      v-model="form.transaction"
      label="Transaction"
      label-placement="floating"
      fill="outline"
      autocapitalize="on"
      :autofocus="true"
      :clear-input="true"
      class="ion-margin-vertical"
    />

    <ion-input
      v-model="form.amount"
      inputmode="numeric"
      label="Amount"
      label-placement="floating"
      fill="outline"
      class="ion-margin-bottom"
    />

    <categories-form @select-category="setCategoryId" />

    <ion-button expand="block" type="submit" :disabled="transactionStore.loading">
      <ion-spinner name="lines" v-if="transactionStore.loading" />
      <span v-else>Create transaction</span>
    </ion-button>
  </form>
</template>

<style scoped>
ion-grid {
  --ion-grid-padding: 0;
}

ion-button {
  height: 48px;
}
</style>
