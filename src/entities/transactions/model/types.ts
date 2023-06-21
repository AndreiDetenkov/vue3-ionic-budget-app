export interface RangeInterface {
  from: string;
  to: string;
}

export interface TransactionWithCategory {
  category_id: string;
  created_at: string;
  id: string;
  name: string;
  value: number;
  categories: {
    icon: string;
    id: string;
    title: string;
  };
}

export interface CreateTransactionPayload {
  name: string;
  value: number;
  category_id: string;
}
