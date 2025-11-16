import { OpUnitType } from 'dayjs';
import type { TransactionsResponseError } from '@/modules/transactions/api/transactions';
import { Tables } from '@/core/plugins/database.types';

export interface TransactionStoreState {
  transactions: Transaction[];
  error: TransactionsResponseError | null;
  loading: boolean;
  transactionsUnit: OpUnitType;
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

export interface Transaction extends Tables<'transactions'> {
  categoryId: string;
  createdAt: string;
  category: Tables<'categories'>;
}

export interface TransactionPayload {
  name: string;
  value: number;
  category_id: string;
}

// export const rangeUnits = {
//   day: 'day',
//   week: 'week',
//   month: 'month',
// };

export interface FormValues {
  transaction: string;
  amount: string;
  categoryId: string;
}
