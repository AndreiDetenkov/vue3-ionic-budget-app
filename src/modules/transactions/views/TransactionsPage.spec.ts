import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createInMemoryStorage, setStorage, type Category } from '@/core/storage';
import { formatDate } from '@/core/utils/dates';
import AllTransactionsModal from '@/modules/transactions/components/AllTransactionsModal.vue';
import TotalAmount from '@/modules/transactions/components/TotalAmount.vue';
import TransactionList from '@/modules/transactions/components/TransactionList.vue';
import TransactionsPage from './TransactionsPage.vue';

let ionViewWillEnterCallback: (() => void) | undefined;

vi.mock('@ionic/vue', async () => {
  const actual = await vi.importActual<typeof import('@ionic/vue')>('@ionic/vue');
  return {
    ...actual,
    onIonViewWillEnter: vi.fn((cb: () => void) => {
      ionViewWillEnterCallback = cb;
    }),
  };
});

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };

const IonModalStub = {
  name: 'IonModal',
  props: ['isOpen'],
  emits: ['didDismiss'],
  template: '<div class="ion-modal-stub" :data-is-open="String(Boolean(isOpen))"><slot v-if="isOpen" /></div>',
};

describe('TransactionsPage.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    setActivePinia(createPinia());
    ionViewWillEnterCallback = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats current date when date parameter is omitted in formatDate', () => {
    expect(formatDate(undefined, 'MMMM YYYY')).toBe('October 2026');
    expect(formatDate()).toBe('15.10.2026');
    expect(formatDate('2026-10-14T15:00:00.000Z', 'DD.MM.YYYY dddd')).toBe('14.10.2026 Wednesday');
  });

  it('renders inline empty state when there are no Transactions for the current month', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [foodCategory],
        transactions: [],
      }),
    );

    const wrapper = mount(TransactionsPage, {
      global: {
        stubs: {
          IonModal: IonModalStub,
        },
      },
    });

    ionViewWillEnterCallback?.();
    await flushPromises();

    expect(wrapper.text()).toContain('Oops!...No Transactions at this moment');
    expect(wrapper.findComponent(TotalAmount).exists()).toBe(false);
    expect(wrapper.findComponent(TransactionList).exists()).toBe(false);
  });

  it('loads Transactions on onIonViewWillEnter, renders TotalAmount and TransactionList, and opens AllTransactionsModal directly from TransactionList', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-today',
            name: 'Coffee',
            value: 250,
            createdAt: '2026-10-15T10:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-yesterday',
            name: 'Groceries',
            value: 1250,
            createdAt: '2026-10-14T15:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-earlier-in-month',
            name: 'Bakery',
            value: 500,
            createdAt: '2026-10-05T09:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
        ],
      }),
    );

    const wrapper = mount(TransactionsPage, {
      global: {
        stubs: {
          IonModal: IonModalStub,
        },
      },
    });

    ionViewWillEnterCallback?.();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Oops!...No Transactions at this moment');

    const totalAmount = wrapper.findComponent(TotalAmount);
    expect(totalAmount.exists()).toBe(true);
    expect(totalAmount.find('.amount').text()).toBe('2 000');
    expect(totalAmount.text()).toContain('October 2026');

    const transactionList = wrapper.findComponent(TransactionList);
    expect(transactionList.exists()).toBe(true);
    expect(transactionList.text()).toContain('Today');
    expect(transactionList.text()).toContain('Coffee');
    expect(transactionList.text()).toContain('Yesterday');
    expect(transactionList.text()).toContain('Groceries');

    // AllTransactionsModal is owned by TransactionList, not passed props from TransactionsPage
    const modal = transactionList.findComponent(AllTransactionsModal);
    expect(modal.exists()).toBe(true);
    expect(modal.props('modelValue')).toBe(false);

    // Click "View All" chip inside TransactionList
    const viewAllChip = transactionList.find('ion-list-header ion-chip');
    await viewAllChip.trigger('click');
    await flushPromises();

    expect(modal.props('modelValue')).toBe(true);
    expect(modal.text()).toContain('15.10.2026 Thursday');
    expect(modal.text()).toContain('14.10.2026 Wednesday');
    expect(modal.text()).toContain('05.10.2026 Monday');
    expect(modal.text()).toContain('Bakery');

    // Close modal via Close chip inside AllTransactionsModal
    const closeChip = modal.find('ion-buttons ion-chip');
    await closeChip.trigger('click');
    await flushPromises();

    expect(modal.props('modelValue')).toBe(false);
  });
});
