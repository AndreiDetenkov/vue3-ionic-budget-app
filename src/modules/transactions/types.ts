import type { CreateTransactionInput, DateRange, Transaction, UpdateTransactionInput } from '@/core/storage';

export type { CreateTransactionInput, DateRange, Transaction, UpdateTransactionInput };

export type RangeInterface = DateRange;
export type TransactionItemsForUpdate = UpdateTransactionInput;
export type TransactionPayload = CreateTransactionInput;

export interface FormValues {
  transaction: string;
  amount: string;
  categoryId: string;
}
