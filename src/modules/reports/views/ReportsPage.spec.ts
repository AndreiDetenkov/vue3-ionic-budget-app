import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createInMemoryStorage, setStorage, type Category } from '@/core/storage';
import { useReportStore } from '@/modules/reports';
import ReportsPage from './ReportsPage.vue';

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

describe('ReportsPage.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    setActivePinia(createPinia());
    ionViewWillEnterCallback = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes Category Reports and totalAmount on onIonViewWillEnter when entering or returning to the Reports tab', async () => {
    const storage = createInMemoryStorage({
      categories: [foodCategory],
      transactions: [
        {
          id: 'tx-1',
          name: 'Coffee',
          value: 250,
          createdAt: '2026-10-10T10:00:00.000Z',
          categoryId: foodCategory.id,
          category: foodCategory,
        },
      ],
    });
    setStorage(storage);

    const reportStore = useReportStore();
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: {
          ReportList: true,
        },
      },
    });

    expect(ionViewWillEnterCallback).toBeTypeOf('function');

    // Initial tab entry
    ionViewWillEnterCallback?.();
    await flushPromises();

    expect(reportStore.totalAmount).toBe('250');
    expect(wrapper.find('.total__amount').text()).toBe('250');

    // Simulate creating a transaction on another tab, then returning to Reports tab
    await storage.createTransaction({
      name: 'Groceries',
      value: 1250,
      categoryId: foodCategory.id,
    });

    ionViewWillEnterCallback?.();
    await flushPromises();

    expect(reportStore.totalAmount).toBe('1 500');
    expect(wrapper.find('.total__amount').text()).toBe('1 500');
  });
});
