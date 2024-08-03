import { TransactionsResponseError } from '@/entities/transactions';

export interface TransactionStoreState {
  transactions: Transaction[] | null;
  error: TransactionsResponseError | null;
  loading: boolean;
}

export interface RangeInterface {
  from: string;
  to: string;
}

interface Category {
  icon: string;
  id: string;
  title: string;
}

export interface Transaction {
  categoryId: string;
  createdAt: string;
  id: string;
  name: string;
  value: number;
  category: Category;
}

export interface TransactionPayload {
  name: string;
  value: number;
  category_id: string;
}

export const rangeUnits = {
  day: 'day',
  week: 'week',
  month: 'month',
};
