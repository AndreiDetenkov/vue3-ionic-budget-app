import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { alertController, modalController } from '@ionic/vue';
import { createInMemoryStorage, setStorage, type Category, type Transaction } from '@/core/storage';
import { useTransactionStore } from '@/modules/transactions';
import SlideListItem from './SlideListItem.vue';
import UpdateItemModal from './UpdateItemModal.vue';

const showErrorToastMock = vi.fn();

vi.mock('@/core/composables/useToast', () => ({
  useToast: () => ({
    showErrorToast: showErrorToastMock,
    showSuccessToast: vi.fn(),
  }),
}));

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };

const sampleTransaction: Transaction = {
  id: 'tx-100',
  name: 'Grocery run',
  value: 85,
  createdAt: '2026-03-05T10:00:00Z',
  categoryId: foodCategory.id,
  category: foodCategory,
};

describe('SlideListItem.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    setStorage(
      createInMemoryStorage({
        categories: [foodCategory],
        transactions: [sampleTransaction],
      }),
    );
  });

  it('opens UpdateItemModal with transaction prop via modalController when edit option is clicked', async () => {
    const presentMock = vi.fn().mockResolvedValue(undefined);
    const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue({
      present: presentMock,
    } as any);

    const wrapper = mount(SlideListItem, {
      props: {
        transaction: sampleTransaction,
      },
      global: {
        stubs: {
          TransactionListItem: true,
        },
      },
    });

    const editOption = wrapper.find('ion-item-option');
    await editOption.trigger('click');
    await flushPromises();

    expect(createModalSpy).toHaveBeenCalledWith({
      component: UpdateItemModal,
      componentProps: {
        transaction: sampleTransaction,
      },
    });
    expect(presentMock).toHaveBeenCalled();
  });

  it('opens confirmation alert and invokes store.removeTransaction upon confirming removal', async () => {
    let confirmHandler: (() => Promise<void>) | undefined;

    const presentAlertMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(alertController, 'create').mockImplementation(async (options: any) => {
      const removeBtn = options.buttons.find((btn: any) => btn.role === 'confirm');
      confirmHandler = removeBtn?.handler;
      return {
        present: presentAlertMock,
      } as any;
    });

    const store = useTransactionStore();
    const removeTransactionSpy = vi.spyOn(store, 'removeTransaction');

    const wrapper = mount(SlideListItem, {
      props: {
        transaction: sampleTransaction,
      },
      global: {
        stubs: {
          TransactionListItem: true,
        },
      },
    });

    const options = wrapper.findAll('ion-item-option');
    const removeOption = options[options.length - 1];
    await removeOption.trigger('click');
    await flushPromises();

    expect(presentAlertMock).toHaveBeenCalled();
    expect(confirmHandler).toBeDefined();

    if (confirmHandler) {
      await confirmHandler();
      await flushPromises();
    }

    expect(removeTransactionSpy).toHaveBeenCalledWith('tx-100');
    expect(showErrorToastMock).not.toHaveBeenCalled();
  });

  it('shows error toast when removeTransaction returns { success: false }', async () => {
    let confirmHandler: (() => Promise<void>) | undefined;

    vi.spyOn(alertController, 'create').mockImplementation(async (options: any) => {
      const removeBtn = options.buttons.find((btn: any) => btn.role === 'confirm');
      confirmHandler = removeBtn?.handler;
      return {
        present: vi.fn().mockResolvedValue(undefined),
      } as any;
    });

    const store = useTransactionStore();
    vi.spyOn(store, 'removeTransaction').mockResolvedValue({ success: false });

    const wrapper = mount(SlideListItem, {
      props: {
        transaction: sampleTransaction,
      },
      global: {
        stubs: {
          TransactionListItem: true,
        },
      },
    });

    const options = wrapper.findAll('ion-item-option');
    const removeOption = options[options.length - 1];
    await removeOption.trigger('click');

    if (confirmHandler) {
      await confirmHandler();
      await flushPromises();
    }

    expect(showErrorToastMock).toHaveBeenCalledWith('Oops...Something went wrong');
  });
});
