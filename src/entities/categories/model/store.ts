import { defineStore } from 'pinia';
import { Category, CategoryStoreState, getCategoriesApi, PressedCategory } from '@/entities/categories';

export const useCategoryStore = defineStore('categoryStore', {
  state: (): CategoryStoreState => ({
    categories: null,
    pressedCategories: null,
    error: null,
    loading: false,
  }),

  actions: {
    async getCategoryList(): Promise<void> {
      try {
        this.loading = true;
        const { data, error } = await getCategoriesApi();
        if (error) {
          this.error = error;
          return;
        }

        this.categories = data;
        this.pressedCategories = data.map((category: Category): PressedCategory => {
          return { ...category, isPressed: false };
        });
      } catch (error: any) {
        console.error(error.error_description || error.message);
        this.error = error.error_description || error.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
