import type { Tables } from '@/core/plugins/database.types';

export type Category = Tables<'categories'>;

export interface PressedCategory extends Category {
  isPressed: boolean;
}
