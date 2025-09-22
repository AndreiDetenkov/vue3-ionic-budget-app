import { CategoriesResponseError } from '@/modules/categories/api/categories';
import type { Tables } from '@/core/plugins/database.types';

export type Category = Tables<'categories'>;

export interface PressedCategory extends Category {
  isPressed: boolean;
}

export interface CategoryStoreState {
  categories: Category[] | [];
  pressedCategories: PressedCategory[] | [];
  error: CategoriesResponseError | null;
  loading: boolean;
}
