import { OpUnitType } from 'dayjs';
import { TransactionsResponseError } from '@/modules/transactions/api/transactions';

export interface TransactionStoreState {
  transactions: Transaction[] | [];
  error: TransactionsResponseError | null;
  loading: boolean;
  transactionsFilterUnit: OpUnitType;
  transactionItems: TransactionItemsForUpdate;
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

export interface FormValues {
  transaction: string;
  amount: string;
  categoryId: string;
}
