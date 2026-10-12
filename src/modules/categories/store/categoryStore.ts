import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getStorage, toError } from '@/core/storage';
import type { Category } from '../types';

export const useCategoryStore = defineStore('categoryStore', () => {
  const categories = ref<Category[]>([]);
  const error = ref<Error | null>(null);
  const loading = ref<boolean>(false);

  async function getCategoryList(): Promise<void> {
    if (categories.value.length > 0) {
      return;
    }

    error.value = null;
    loading.value = true;

    try {
      categories.value = await getStorage().getCategories();
    } catch (err) {
      error.value = toError(err);
    } finally {
      loading.value = false;
    }
  }

  return {
    categories,
    error,
    loading,
    getCategoryList,
  };
});
