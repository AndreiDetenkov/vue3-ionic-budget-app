import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getStorage } from '@/core/storage';
import type { Category, PressedCategory } from '@/modules/categories/types';

export const useCategoryStore = defineStore('categoryStore', () => {
  const categories = ref<Category[]>([]);
  const pressedCategories = ref<PressedCategory[]>([]);
  const error = ref<Error | null>(null);
  const loading = ref<boolean>(false);

  function setCategoriesToPressed(newCategories: Category[]): void {
    pressedCategories.value = newCategories.map((category: Category): PressedCategory => ({
      ...category,
      isPressed: false,
    }));
  }

  function resetPressedCategories(): void {
    pressedCategories.value.forEach((category: PressedCategory): void => {
      category.isPressed = false;
    });
  }

  async function getCategoryList(): Promise<void> {
    if (categories.value.length > 0) {
      return;
    }

    error.value = null;
    loading.value = true;

    try {
      const data = await getStorage().getCategories();
      categories.value = data;
      setCategoriesToPressed(data);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
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
    resetPressedCategories,
    getCategoryList,
  };
});
