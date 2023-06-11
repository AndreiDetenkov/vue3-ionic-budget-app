import { Database } from '@/shared/config/supabase';

export type Category = Database['public']['Tables']['categories']['Row'];

export interface PressedCategory extends Category {
  isPressed: boolean;
}
