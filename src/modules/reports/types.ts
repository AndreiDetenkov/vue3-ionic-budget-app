import type { Transaction } from '@/modules/transactions';

export type ReportPeriod = 'lastYear' | 'currentYear' | 'lastMonth' | 'currentMonth';

export interface CategoryReport {
  name: string;
  value: number;
  icon: string;
  transactions: Transaction[];
}
