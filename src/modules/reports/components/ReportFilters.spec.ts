import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createInMemoryStorage, setStorage, type Category } from '@/core/storage';
import { useReportStore } from '@/modules/reports';
import ReportFilters from './ReportFilters.vue';

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };

describe('ReportFilters.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all 4 period chips with "Current month" active by default and does not fetch on mount', () => {
    const getTransactionsByRangeSpy = vi.fn().mockResolvedValue([]);
    setStorage({
      ...createInMemoryStorage(),
      getTransactionsByRange: getTransactionsByRangeSpy,
    });

    const wrapper = mount(ReportFilters);
    const chips = wrapper.findAllComponents({ name: 'IonChip' });

    expect(chips).toHaveLength(4);
    expect(chips.map((chip) => chip.text())).toEqual(['Last year', 'Current year', 'Last month', 'Current month']);
    expect(chips.map((chip) => chip.props('outline'))).toEqual([true, true, true, false]);
    expect(getTransactionsByRangeSpy).not.toHaveBeenCalled();
  });

  it('updates selectedPeriod, chip outline state, and Category Reports when a period chip is clicked', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [foodCategory],
        transactions: [
          {
            id: 'tx-last-month',
            name: 'September Grocery',
            value: 900,
            createdAt: '2026-09-15T12:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
          {
            id: 'tx-last-year',
            name: '2025 Feast',
            value: 2500,
            createdAt: '2025-05-10T12:00:00.000Z',
            categoryId: foodCategory.id,
            category: foodCategory,
          },
        ],
      }),
    );

    const reportStore = useReportStore();
    const wrapper = mount(ReportFilters);
    const chips = wrapper.findAllComponents({ name: 'IonChip' });

    // Click "Last month" (index 2)
    await chips[2].trigger('click');
    await flushPromises();

    expect(reportStore.selectedPeriod).toBe('lastMonth');
    expect(reportStore.totalAmount).toBe('900');
    expect(chips.map((chip) => chip.props('outline'))).toEqual([true, true, false, true]);

    // Click "Last year" (index 0)
    await chips[0].trigger('click');
    await flushPromises();

    expect(reportStore.selectedPeriod).toBe('lastYear');
    expect(reportStore.totalAmount).toBe('2 500');
    expect(chips.map((chip) => chip.props('outline'))).toEqual([false, true, true, true]);
  });
});
