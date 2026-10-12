import type { Category } from '@/core/storage';

export type { Category };

export interface PressedCategory extends Category {
  isPressed: boolean;
}
