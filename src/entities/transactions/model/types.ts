import { Database } from '@/shared/config/supabase';

export interface RangeInterface {
  from: string;
  to: string;
}

type Transaction = Database['public']['Tables']['transactions']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export type TransactionWithCategory = Transaction & {
  categories: Category | Category[];
};

// {
//   category_id: string
//   created_at: string
//   id: string
//   name: string
//   value: number
//   categories: {
//     icon: string
//     id: string
//     title: string
//   }
// }
