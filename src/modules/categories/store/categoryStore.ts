import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getCategoriesApi, CategoriesResponseError, Category, PressedCategory  } from '@/modules/categories';

export const useCategoryStore = defineStore('categoryStore', () => {
  const categories = ref<Category[]>([]);
  const pressedCategories = ref<PressedCategory[]>([]);
  const error = ref<CategoriesResponseError | null>(null);
  const loading = ref<boolean>(false);

  function setCategoriesToPressed(newCategories: Category[]): void {
    pressedCategories.value = newCategories.map(
      (category: Category): PressedCategory => ({ ...category, isPressed: false }),
    );
  }

  async function getCategoryList(): Promise<void> {
    if (categories.value.length > 0) {
      return;
    }

    try {
      loading.value = true;
      const { data, error: apiError } = await getCategoriesApi();

      if (apiError) {
        error.value = apiError;
        return;
      }

      categories.value = data;
      setCategoriesToPressed(data);
    } finally {
      loading.value = false;
    }
  }

  return {
    categories,
    pressedCategories,
    error,
    loading,
    setCategoriesToPressed,
    getCategoryList,
  };
});
