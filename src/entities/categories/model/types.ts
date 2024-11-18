import { Database } from '@/shared/config/supabase';
import { CategoriesResponseError } from '@/entities/categories';

export type Category = Database['public']['Tables']['categories']['Row'];

export interface PressedCategory extends Category {
  isPressed: boolean;
}

export interface CategoryStoreState {
  categories: Category[] | [];
  pressedCategories: PressedCategory[] | [];
  error: CategoriesResponseError | null;
  loading: boolean;
}
