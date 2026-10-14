import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { modalController } from '@ionic/vue';
import { createInMemoryStorage, setStorage, type Category, type Transaction } from '@/core/storage';
import { useTransactionStore } from '@/modules/transactions';
import { useCategoryStore } from '@/modules/categories';
import UpdateItemModal from './UpdateItemModal.vue';

const showSuccessToastMock = vi.fn();
const showErrorToastMock = vi.fn();

vi.mock('@/core/composables/useToast', () => ({
  useToast: () => ({
    showSuccessToast: showSuccessToastMock,
    showErrorToast: showErrorToastMock,
  }),
}));

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const billsCategory: Category = { id: 'cat-bills', title: 'Bills', icon: 'bills' };

const sampleTransaction: Transaction = {
  id: 'tx-1',
  name: 'Lunch with colleagues',
  value: 45,
  createdAt: '2026-03-01T12:00:00Z',
  categoryId: foodCategory.id,
  category: foodCategory,
};

describe('UpdateItemModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.spyOn(modalController, 'dismiss').mockResolvedValue(true);

    setStorage(
      createInMemoryStorage({
        categories: [foodCategory, billsCategory],
        transactions: [sampleTransaction],
      }),
    );
  });

  it('initializes form inputs with the provided transaction prop and loads categories on mount', async () => {
    const wrapper = mount(UpdateItemModal, {
      props: {
        transaction: sampleTransaction,
      },
    });
    await flushPromises();

    const categoryStore = useCategoryStore();
    expect(categoryStore.categories).toHaveLength(2);

    const inputs = wrapper.findAllComponents({ name: 'IonInput' });
    expect(inputs).toHaveLength(2);
    expect(inputs[0].props('modelValue')).toBe('Lunch with colleagues');
    expect(inputs[1].props('modelValue')).toBe('45');

    const select = wrapper.findComponent({ name: 'IonSelect' });
    expect(select.props('modelValue')).toBe(foodCategory.id);
  });

  it('keeps local draft isolated: changes before submit do not modify the prop or store, and cancel dismisses with null', async () => {
    const wrapper = mount(UpdateItemModal, {
      props: {
        transaction: sampleTransaction,
      },
    });
    await flushPromises();

    const inputs = wrapper.findAllComponents({ name: 'IonInput' });
    await inputs[0].vm.$emit('update:modelValue', 'Super expensive dinner');
    await inputs[1].vm.$emit('update:modelValue', '999');

    expect(sampleTransaction.name).toBe('Lunch with colleagues');
    expect(sampleTransaction.value).toBe(45);

    const cancelChip = wrapper.find('ion-chip');
    await cancelChip.trigger('click');

    expect(modalController.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('converts string amount to number, updates transaction, shows success toast, and dismisses on success', async () => {
    const wrapper = mount(UpdateItemModal, {
      props: {
        transaction: sampleTransaction,
      },
    });
    await flushPromises();

    const transactionStore = useTransactionStore();
    await transactionStore.getTransactionsByRange('year');

    const inputs = wrapper.findAllComponents({ name: 'IonInput' });
    const select = wrapper.findComponent({ name: 'IonSelect' });

    await inputs[0].vm.$emit('update:modelValue', 'Electricity Bill');
    await inputs[1].vm.$emit('update:modelValue', '120');
    await select.vm.$emit('update:modelValue', billsCategory.id);

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(showSuccessToastMock).toHaveBeenCalledWith('Successfully updated!');
    expect(modalController.dismiss).toHaveBeenCalledWith(true, 'confirm');

    expect(transactionStore.transactions[0]).toMatchObject({
      id: 'tx-1',
      name: 'Electricity Bill',
      value: 120,
      categoryId: billsCategory.id,
    });
  });

  it('shows error toast and does not dismiss modal when updateTransaction fails', async () => {
    const storage = createInMemoryStorage({
      categories: [foodCategory],
      transactions: [sampleTransaction],
    });
    storage.updateTransaction = async () => {
      throw new Error('Database write failure');
    };
    setStorage(storage);

    const wrapper = mount(UpdateItemModal, {
      props: {
        transaction: sampleTransaction,
      },
    });
    await flushPromises();

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Oops...Something went wrong');
    expect(modalController.dismiss).not.toHaveBeenCalled();
  });

  it('disables submit button and prevents submission when amount or name is invalid', async () => {
    const wrapper = mount(UpdateItemModal, {
      props: {
        transaction: sampleTransaction,
      },
    });

    const inputs = wrapper.findAllComponents({ name: 'IonInput' });
    const submitBtn = wrapper.findComponent({ name: 'IonButton' });

    // Invalid: empty name
    await inputs[0].vm.$emit('update:modelValue', '   ');
    expect(submitBtn.props('disabled')).toBe(true);

    const form = wrapper.find('form');
    await form.trigger('submit');
    expect(modalController.dismiss).not.toHaveBeenCalled();

    // Invalid: negative or 0 amount
    await inputs[0].vm.$emit('update:modelValue', 'Valid name');
    await inputs[1].vm.$emit('update:modelValue', '0');
    expect(submitBtn.props('disabled')).toBe(true);

    // Invalid: non-numeric amount
    await inputs[1].vm.$emit('update:modelValue', 'abc');
    expect(submitBtn.props('disabled')).toBe(true);

    // Valid again
    await inputs[1].vm.$emit('update:modelValue', '50');
    expect(submitBtn.props('disabled')).toBe(false);
  });
});
