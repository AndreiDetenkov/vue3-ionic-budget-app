import type { Transaction } from '@transactions/index';

export interface CategoryReport {
  name: string;
  value: number;
  transactions: Transaction[];
}
