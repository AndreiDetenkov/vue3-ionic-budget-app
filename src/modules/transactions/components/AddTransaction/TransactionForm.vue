<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonInput, IonButton, IonSpinner } from '@ionic/vue';
import { useRouter } from 'vue-router';

import { useToast } from '@/core/composables/useToast';
import { FormValues, TransactionPayload } from '@/modules/transactions/types';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import CategoriesForm from '@/modules/categories/components/CategoriesForm.vue';

const router = useRouter();
const transactionStore = useTransactionStore();
const { showToast } = useToast();

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

function clearState(): void {
  form.value.transaction = form.value.amount = form.value.categoryId = '';
}

async function onSubmitFormHandler(): Promise<void> {
  if (notValidForm.value) {
    await showToast({
      message: 'There are fields that are not filled in!',
      color: 'danger',
      positionAnchor: 'header',
    });
    return;
  }

  const { success } = await transactionStore.createTransaction(createPayload());

  if (!success) {
    await showToast({
      message: 'Oops! Something went wrong!',
      color: 'danger',
      positionAnchor: 'header',
    });
    return;
  }

  router.push('/tabs/transactions').then(() => clearState());
}
</script>

<template>
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
