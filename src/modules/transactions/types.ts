import { Tables } from '@/core/plugins/database.types';

export interface RangeInterface {
  from: string;
  to: string;
}

export interface TransactionItemsForUpdate {
  id: string;
  name: string;
  value: number;
  categoryId: string;
}

export interface Transaction extends Omit<Tables<'transactions'>, 'category_id' | 'created_at'> {
  categoryId: string;
  createdAt: string;
  category: Tables<'categories'>;
}

export interface TransactionPayload {
  name: string;
  value: number;
  category_id: string;
}

export interface FormValues {
  transaction: string;
  amount: string;
  categoryId: string;
}
