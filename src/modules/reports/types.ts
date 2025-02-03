import type { Transaction } from '@/modules/transactions';

export interface CategoryReport {
  name: string;
  value: number;
  icon: string;
  transactions: Transaction[];
}
