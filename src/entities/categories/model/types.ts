import { Database } from '@/shared/config/supabase';
import { CategoriesResponseError, CategoriesResponseSuccess } from '@/entities/categories';

export type Category = Database['public']['Tables']['categories']['Row'];

export interface PressedCategory extends Category {
  isPressed: boolean;
}

export interface CategoryStoreState {
  categories: CategoriesResponseSuccess | null;
  pressedCategories: PressedCategory[] | null;
  error: CategoriesResponseError | null;
  loading: boolean;
}
