import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createInMemoryStorage, setStorage, type BudgetStorage } from '@/core/storage';
import { useCategoryStore } from './categoryStore';

describe('useCategoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads Categories sorted alphabetically by title through the BudgetStorage seam and caches them', async () => {
    setStorage(
      createInMemoryStorage({
        categories: [
          { id: 'cat-2', title: 'Transportation', icon: 'transportation' },
          { id: 'cat-1', title: 'Food', icon: 'food' },
        ],
      }),
    );

    const store = useCategoryStore();
    await store.getCategoryList();

    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.categories).toEqual([
      { id: 'cat-1', title: 'Food', icon: 'food' },
      { id: 'cat-2', title: 'Transportation', icon: 'transportation' },
    ]);
    expect(store.pressedCategories).toEqual([
      { id: 'cat-1', title: 'Food', icon: 'food', isPressed: false },
      { id: 'cat-2', title: 'Transportation', icon: 'transportation', isPressed: false },
    ]);

    // Subsequent call keeps cached categories even if storage is replaced
    setStorage(createInMemoryStorage({ categories: [] }));
    await store.getCategoryList();
    expect(store.categories).toHaveLength(2);
  });

  it('captures an Error and resets loading when BudgetStorage fails to load Categories', async () => {
    const failingStorage: BudgetStorage = {
      ...createInMemoryStorage(),
      async getCategories() {
        throw new Error('Failed to load categories');
      },
    };
    setStorage(failingStorage);

    const store = useCategoryStore();
    await store.getCategoryList();

    expect(store.loading).toBe(false);
    expect(store.categories).toEqual([]);
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error?.message).toBe('Failed to load categories');
  });
});
