export interface Category {
  id: string;
  title: string;
  icon: string | null;
}

export interface Transaction {
  id: string;
  name: string;
  value: number;
  createdAt: string;
  categoryId: string;
  category: Category;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface CreateTransactionInput {
  name: string;
  value: number;
  categoryId: string;
}

export interface UpdateTransactionInput {
  id: string;
  name: string;
  value: number;
  categoryId: string;
}

export interface BudgetStorage {
  getTransactionsByRange(range: DateRange): Promise<Transaction[]>;
  createTransaction(input: CreateTransactionInput): Promise<void>;
  updateTransaction(input: UpdateTransactionInput): Promise<void>;
  removeTransaction(id: string): Promise<void>;
  getCategories(): Promise<Category[]>;
}
