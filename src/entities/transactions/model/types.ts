export interface RangeInterface {
  from: string;
  to: string;
}

interface Category {
  icon: string;
  id: string;
  title: string;
}

export interface Transaction {
  categoryId: string;
  createdAt: string;
  id: string;
  name: string;
  value: number;
  category: Category;
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
