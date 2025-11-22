import type { Transaction } from '@/modules/transactions';

export interface Report {
  name: string;
  value: number;
  icon: string;
  transactions: Transaction[];
}
