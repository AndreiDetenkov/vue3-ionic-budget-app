export interface RangeInterface {
  from: string;
  to: string;
}

interface Category {
  icon: string;
  id: string;
  title: string;
}

export interface TransactionWithCategory {
  category_id: string;
  created_at: string;
  id: string;
  name: string;
  value: number;
  categories: Category | Category[];
}

export interface CreateTransactionPayload {
  name: string;
  value: number;
  category_id: string;
}

export const rangeUnits = {
  day: 'day',
  week: 'week',
  month: 'month',
};
