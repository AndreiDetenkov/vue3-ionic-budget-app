import type { CreateTransactionInput, DateRange, Transaction, UpdateTransactionInput } from '@/core/storage';

export type { CreateTransactionInput, DateRange, Transaction, UpdateTransactionInput };

export interface FormValues {
  transaction: string;
  amount: string;
  categoryId: string;
}
