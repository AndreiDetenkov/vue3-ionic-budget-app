import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { IonList, alertController, modalController } from '@ionic/vue';
import { createInMemoryStorage, setStorage, type Category, type Transaction } from '@/core/storage';
import { useTransactionStore } from '@/modules/transactions';
import { useReportStore } from '@/modules/reports';
import AllTransactionsModal from './AllTransactionsModal.vue';
import SlideListItem from './SlideTransaction/SlideListItem.vue';
import UpdateItemModal from './SlideTransaction/UpdateItemModal.vue';

vi.mock('@/core/composables/useToast', () => ({
  useToast: () => ({
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  }),
}));

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const transportCategory: Category = { id: 'cat-transport', title: 'Transport', icon: 'car' };

const IonModalStub = {
  name: 'IonModal',
  props: ['isOpen'],
  emits: ['didDismiss'],
  template: '<div class="ion-modal-stub" :data-is-open="String(Boolean(isOpen))"><slot v-if="isOpen" /></div>',
};

const seedTransactions = (): Transaction[] => [
  {
    id: 'tx-today',
    name: 'Coffee',
    value: 250,
    createdAt: '2026-10-15T10:00:00.000Z',
    categoryId: foodCategory.id,
    category: foodCategory,
  },
  {
    id: 'tx-older',
    name: 'Old Train Ticket',
    value: 500,
    createdAt: '2026-10-03T09:00:00.000Z',
    categoryId: transportCategory.id,
    category: transportCategory,
  },
];

describe('AllTransactionsModal.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    setActivePinia(createPinia());
    vi.clearAllMocks();

    setStorage(
      createInMemoryStorage({
        categories: [foodCategory, transportCategory],
        transactions: seedTransactions(),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders SlideListItem for every transaction grouped by date with lines="none"', async () => {
    const store = useTransactionStore();
    await store.getTransactionsByRange('month');

    const wrapper = mount(AllTransactionsModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          IonModal: IonModalStub,
        },
      },
    });

    const list = wrapper.findComponent(IonList);
    expect(list.props('lines')).toBe('none');

    const groups = wrapper.findAll('ion-item-group');
    expect(groups).toHaveLength(2);
    expect(wrapper.text()).toContain('15.10.2026 Thursday');
    expect(wrapper.text()).toContain('03.10.2026 Saturday');

    const slideItems = wrapper.findAllComponents(SlideListItem);
    expect(slideItems).toHaveLength(2);
    expect(slideItems.map((item) => item.props('transaction').id)).toEqual(['tx-today', 'tx-older']);
  });

  it('opens UpdateItemModal for an older transaction and reactively updates modal list, total, and reports', async () => {
    const store = useTransactionStore();
    const reportStore = useReportStore();
    await store.getTransactionsByRange('month');

    const presentMock = vi.fn().mockResolvedValue(undefined);
    const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue({
      present: presentMock,
    } as any);

    const wrapper = mount(AllTransactionsModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          IonModal: IonModalStub,
        },
      },
    });

    const slideItems = wrapper.findAllComponents(SlideListItem);
    const olderSlideItem = slideItems.find((item) => item.props('transaction').id === 'tx-older');
    expect(olderSlideItem).toBeDefined();

    await olderSlideItem!.find('[data-testid="transaction-edit-option"]').trigger('click');
    await flushPromises();

    expect(createModalSpy).toHaveBeenCalledWith({
      component: UpdateItemModal,
      componentProps: {
        transaction: expect.objectContaining({ id: 'tx-older', name: 'Old Train Ticket' }),
      },
    });
    expect(presentMock).toHaveBeenCalledTimes(1);

    // Simulate UpdateItemModal saving the edit to the store
    const { success } = await store.updateTransaction({
      id: 'tx-older',
      name: 'Express Train Ticket',
      value: 750,
      categoryId: transportCategory.id,
    });
    await flushPromises();

    expect(success).toBe(true);
    expect(wrapper.text()).toContain('Express Train Ticket');
    expect(wrapper.text()).not.toContain('Old Train Ticket');
    expect(store.total).toBe(1000);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await reportStore.refreshReports();
    expect(reportStore.totalAmount).toBe('1 000');
  });

  it('confirms and removes an older transaction from the modal and reactively updates list, total, and reports', async () => {
    const store = useTransactionStore();
    const reportStore = useReportStore();
    await store.getTransactionsByRange('month');

    let confirmHandler: (() => Promise<void>) | undefined;
    const presentAlertMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(alertController, 'create').mockImplementation(async (options: any) => {
      const removeBtn = options.buttons.find((btn: any) => btn.role === 'confirm');
      confirmHandler = removeBtn?.handler;
      return {
        present: presentAlertMock,
      } as any;
    });

    const wrapper = mount(AllTransactionsModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          IonModal: IonModalStub,
        },
      },
    });

    const slideItems = wrapper.findAllComponents(SlideListItem);
    const olderSlideItem = slideItems.find((item) => item.props('transaction').id === 'tx-older');
    expect(olderSlideItem).toBeDefined();

    await olderSlideItem!.find('[data-testid="transaction-remove-option"]').trigger('click');
    await flushPromises();

    expect(presentAlertMock).toHaveBeenCalledTimes(1);
    expect(confirmHandler).toBeDefined();

    await confirmHandler!();
    await flushPromises();

    expect(wrapper.findAllComponents(SlideListItem)).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Old Train Ticket');
    expect(wrapper.text()).not.toContain('03.10.2026 Saturday');
    expect(store.total).toBe(250);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await reportStore.refreshReports();
    expect(reportStore.totalAmount).toBe('250');
    expect(reportStore.reportList.map((r) => r.name)).toEqual(['Food']);
  });

  it('closes modal when clicking Close chip', async () => {
    const store = useTransactionStore();
    await store.getTransactionsByRange('month');

    const wrapper = mount(AllTransactionsModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          IonModal: IonModalStub,
        },
      },
    });

    await wrapper.find('[data-testid="close-all-transactions-btn"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });
});
