<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonButton, IonInput, IonLabel, IonSpinner, IonGrid, IonCol, IonRow } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useToast } from '@/core/composables/useToast';
import { FormValues, TransactionPayload } from '@/modules/transactions/types';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import CategoriesForm from '@/modules/categories/components/CategoriesForm.vue';

const router = useRouter();
const transactionStore = useTransactionStore();
const { loading } = storeToRefs(transactionStore)
const { showErrorToast } = useToast();

const state = ref<FormValues>({
  transaction: '',
  amount: '',
  categoryId: '',
});

const notValidForm = computed(() => Object.values(state.value).some((item) => !item));

function setCategoryId(id: string): void {
  state.value.categoryId = id;
}

function createPayload(): TransactionPayload {
  const { transaction, categoryId, amount } = state.value;

  return {
    name: transaction,
    value: parseInt(amount, 10),
    category_id: categoryId,
  };
}

function clearState(): void {
  state.value.transaction = state.value.amount = state.value.categoryId = '';
}

async function onSubmitFormHandler(): Promise<void> {
  if (notValidForm.value) {
    await showErrorToast('There are fields that are not filled in!');
    return;
  }

  const { success } = await transactionStore.createTransaction(createPayload());

  if (!success) {
    await showErrorToast('Oops! Something went wrong!');
    return;
  }

  router.push('/tabs/transactions').then(() => clearState());
}
</script>

<template>
  <form @submit.prevent="onSubmitFormHandler">
      <ion-grid class="ion-margin-bottom ion-no-padding">
        <ion-row>
          <ion-col></ion-col>
          <ion-col size="6" class="ion-text-center">
            <ion-label class="amount-label">Enter Amount</ion-label>
            <ion-input
              v-model="state.amount"
              type="number"
              inputmode="numeric"
              placeholder="0.00"
              class="amount-input"
            />
          </ion-col>
          <ion-col></ion-col>
        </ion-row>
      </ion-grid>

    <CategoriesForm @select-category="setCategoryId" />

    <div class="transaction-name-group">
      <ion-label class="transaction-name-label">What is this for?</ion-label>
      <ion-input
        v-model="state.transaction"
        autocapitalize="on"
        placeholder="e.g., Bazaar"
        :clear-input="true"
        class="transaction-name-input"
      />
    </div>

    <ion-button
      expand="block"
      type="submit"
      shape="round"
      size="large"
      :disabled="loading"
      class="submit-btn"
    >
      <ion-spinner name="lines" v-if="loading" />
      <span v-else>Create transaction</span>
    </ion-button>
  </form>
</template>

<style scoped>
ion-label.amount-label {
  font-size: .8rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.5rem;
}

ion-input.amount-input {
  width: 100%;
  font-size: 3rem;
  font-weight: 700;
  --placeholder-color: var(--ion-color-light-grey);
  --placeholder-font-weight: 700;
}

.transaction-name-group {
  margin: 1.5rem 0 1.25rem;
}

.transaction-name-label {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ion-color-dark, #2f2f2f);
  display: block;
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;
}

ion-input.transaction-name-input {
  background: var(--ion-color-bg-light-green);
  border-radius: 9999px;
  overflow: hidden;
  --padding-start: 1.5rem;
  --padding-end: 1.5rem;
  --padding-top: 1rem;
  --padding-bottom: 1rem;
  --placeholder-color: #8e95a2;
  --placeholder-opacity: 1;
  --placeholder-font-weight: 400;
  --highlight-height: 0;
  --border-width: 0;
  --border-style: none;
  min-height: 54px;
  font-size: 1rem;
  color: var(--ion-color-dark, #2f2f2f);
}

.submit-btn {
  --background: linear-gradient(90deg,rgba(27, 67, 50, 1) 0%, rgba(64, 145, 108, 1) 100%);
  margin-top: 1rem;
}
</style>
