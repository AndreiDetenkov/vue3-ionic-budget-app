import { defineStore } from 'pinia';
import { Category, CategoryStoreState, getCategoriesApi, PressedCategory } from '@/entities/categories';
import { getItem, setItem } from '@/core/utils/storage';

export const useCategoryStore = defineStore('categoryStore', {
  state: (): CategoryStoreState => ({
    categories: [],
    pressedCategories: [],
    error: null,
    loading: false,
  }),

  actions: {
    checkCategoriesInStorage(): boolean {
      const localCategories = getItem('categories');
      this.categories = localCategories ?? [];
      if (localCategories) this.setCategoriesToPressed(localCategories);

      return !!localCategories;
    },

    setCategoriesToPressed(categories: Category[]): void {
      this.pressedCategories = categories.map(
        (category: Category): PressedCategory => ({ ...category, isPressed: false }),
      );
    },

    async getCategoryList(): Promise<void> {
      const isCategoriesInStorage = this.checkCategoriesInStorage();
      if (isCategoriesInStorage) {
        return;
      }

      try {
        this.loading = true;
        const { data, error } = await getCategoriesApi();

        if (error) {
          this.error = error;
          return;
        }

        this.categories = data;
        this.setCategoriesToPressed(data);
        setItem('categories', data);
      } finally {
        this.loading = false;
      }
    },
  },
});
