<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  IonContent,
  IonButtons,
  IonButton,
  IonChip,
  IonInput,
  modalController,
  IonSpinner,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import { useTransactionStore } from '@/modules/transactions/store/transactionStore';
import { useCategoryStore } from '@/modules/categories/store/categoryStore';
import { useToast } from '@/core/composables/useToast';
import type { Transaction } from '@/core/storage';
import BaseHeader from '@/core/components/BaseHeader.vue';

const props = defineProps<{
  transaction: Transaction;
}>();

const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const { showSuccessToast, showErrorToast } = useToast();

onMounted(async () => {
  await categoryStore.getCategoryList();
});

const draft = ref({
  name: props.transaction.name,
  value: String(props.transaction.value),
  categoryId: props.transaction.categoryId,
});

const isValid = computed(() => {
  const numericValue = Number(draft.value.value);
  return (
    draft.value.name.trim().length > 0 &&
    draft.value.categoryId.length > 0 &&
    Number.isFinite(numericValue) &&
    numericValue > 0
  );
});

const cancelHandler = async () => modalController.dismiss(null, 'cancel');

const confirmHandler = async () => {
  if (!isValid.value) {
    return;
  }

  const { success } = await transactionStore.updateTransaction({
    id: props.transaction.id,
    name: draft.value.name.trim(),
    value: Number(draft.value.value),
    categoryId: draft.value.categoryId,
  });

  if (success) {
    await showSuccessToast('Successfully updated!');
    await modalController.dismiss(true, 'confirm');
  } else {
    await showErrorToast('Oops...Something went wrong');
  }
};
</script>

<template>
  <BaseHeader title="Update transaction">
    <template #buttons>
      <ion-buttons slot="end">
        <ion-chip color="primary" @click="cancelHandler">Cancel</ion-chip>
      </ion-buttons>
    </template>
  </BaseHeader>

  <ion-content class="ion-padding">
    <form @submit.prevent="confirmHandler">
      <ion-input
        v-model="draft.name"
        label="Transaction"
        label-placement="floating"
        fill="outline"
        autocapitalize="on"
        :autofocus="true"
        :clear-input="true"
        class="ion-margin-vertical"
      />

      <ion-input
        v-model="draft.value"
        type="number"
        inputmode="numeric"
        label="Amount"
        label-placement="floating"
        fill="outline"
        class="ion-margin-bottom"
      />

      <ion-select
        v-model="draft.categoryId"
        label="Category"
        placeholder="Select category"
        label-placement="floating"
        fill="outline"
        interface="action-sheet"
        class="ion-margin-bottom"
      >
        <ion-select-option v-for="category in categoryStore.categories" :key="category.id" :value="category.id">
          {{ category.title }}
        </ion-select-option>
      </ion-select>

      <ion-button expand="block" type="submit" :disabled="transactionStore.loading || !isValid">
        <ion-spinner name="lines" v-if="transactionStore.loading" />
        <span v-else>Update transaction</span>
      </ion-button>
    </form>
  </ion-content>
</template>

<style scoped>
ion-button {
  height: 48px;
}
</style>
