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
  pressedCategories: PressedCategory[] | null;
  error: CategoriesResponseError | null;
  loading: boolean;
}

export const useCategoryStore = defineStore('categoryStore', {
  state: (): State => ({
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
      } finally {
        this.loading = false;
      }
    },
  },
});