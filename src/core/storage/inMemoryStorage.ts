import type {
  BudgetStorage,
  Category,
  CreateTransactionInput,
  DateRange,
  Transaction,
  UpdateTransactionInput,
} from './types';

export interface InMemoryStorageSeed {
  categories?: Category[];
  transactions?: Transaction[];
}

function cloneCategory(category: Category): Category {
  return {
    id: category.id,
    title: category.title,
    icon: category.icon,
  };
}

function cloneTransaction(transaction: Transaction): Transaction {
  return {
    id: transaction.id,
    name: transaction.name,
    value: transaction.value,
    createdAt: transaction.createdAt,
    categoryId: transaction.categoryId,
    category: cloneCategory(transaction.category),
  };
}

export function createInMemoryStorage(seed: InMemoryStorageSeed = {}): BudgetStorage {
  const categories: Category[] = (seed.categories ?? []).map(cloneCategory);
  let transactions: Transaction[] = (seed.transactions ?? []).map(cloneTransaction);
  let nextId = transactions.length + 1;

  function findCategoryOrThrow(categoryId: string): Category {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }
    return cloneCategory(category);
  }

  return {
    async getCategories(): Promise<Category[]> {
      return categories.map(cloneCategory).sort((a, b) => a.title.localeCompare(b.title));
    },

    async getTransactionsByRange({ from, to }: DateRange): Promise<Transaction[]> {
      const fromTime = new Date(from).getTime();
      const toTime = new Date(to).getTime();

      return transactions
        .filter((item) => {
          const itemTime = new Date(item.createdAt).getTime();
          if (!Number.isNaN(fromTime) && !Number.isNaN(toTime) && !Number.isNaN(itemTime)) {
            return itemTime >= fromTime && itemTime <= toTime;
          }
          return item.createdAt >= from && item.createdAt <= to;
        })
        .sort((a, b) => {
          const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
            return timeDiff;
          }
          return b.createdAt.localeCompare(a.createdAt);
        })
        .map(cloneTransaction);
    },

    async createTransaction(input: CreateTransactionInput): Promise<void> {
      const category = findCategoryOrThrow(input.categoryId);
      const id = `tx-${nextId++}`;
      const createdAt = new Date().toISOString();

      transactions.push({
        id,
        name: input.name,
        value: input.value,
        createdAt,
        categoryId: input.categoryId,
        category,
      });
    },

    async updateTransaction(input: UpdateTransactionInput): Promise<void> {
      const index = transactions.findIndex((item) => item.id === input.id);
      if (index === -1) {
        throw new Error(`Transaction not found: ${input.id}`);
      }

      const category = findCategoryOrThrow(input.categoryId);
      const existing = transactions[index];

      transactions[index] = {
        ...existing,
        name: input.name,
        value: input.value,
        categoryId: input.categoryId,
        category,
      };
    },

    async removeTransaction(id: string): Promise<void> {
      transactions = transactions.filter((item) => item.id !== id);
    },
  };
}
