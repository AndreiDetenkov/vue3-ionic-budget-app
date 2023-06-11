import { defineStore } from 'pinia';
import {
  CategoriesResponseError,
  CategoriesResponseSuccess,
  Category,
  getCategoriesApi,
  PressedCategory,
} from '@/entities/categories';

interface State {
  categories: CategoriesResponseSuccess | null;
  error: CategoriesResponseError | null;
  loading: boolean;
}

export const useCategoryStore = defineStore('categoryStore', {
  state: (): State => ({
    categories: null,
    error: null,
    loading: false,
  }),
  getters: {
    pressedCategories(state: State): PressedCategory[] {
      if (!state.categories) return [];
      return state.categories.map((category: Category): PressedCategory => {
        return { ...category, isPressed: false };
      });
    },
  },
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
      } catch (error: any) {
        console.error(error.error_description || error.message);
      } finally {
        this.loading = false;
      }
    },
  },
});
