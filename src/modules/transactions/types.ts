import { OpUnitType } from 'dayjs';
import type { TransactionsResponseError } from '@/modules/transactions/api/transactions';
import { Tables } from '@/core/plugins/database.types';

export interface TransactionStoreState {
  transactions: Transaction[];
  error: TransactionsResponseError | null;
  loading: boolean;
  transactionsFilterUnit: OpUnitType;
  transactionItems: TransactionItemsForUpdate;
}

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

export interface Transaction {
  categoryId: string;
  createdAt: string;
  id: string;
  name: string;
  value: number;
  category: Tables<'categories'>;
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

export interface FormValues {
  transaction: string;
  amount: string;
  categoryId: string;
}
