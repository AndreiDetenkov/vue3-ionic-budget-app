import { createSupabaseStorage } from './supabaseStorage';
import type { BudgetStorage } from './types';

let activeStorage: BudgetStorage = createSupabaseStorage();

const storageProxy: BudgetStorage = {
  getTransactionsByRange: (range) => activeStorage.getTransactionsByRange(range),
  createTransaction: (input) => activeStorage.createTransaction(input),
  updateTransaction: (input) => activeStorage.updateTransaction(input),
  removeTransaction: (id) => activeStorage.removeTransaction(id),
  getCategories: () => activeStorage.getCategories(),
};

export function useStorage(): BudgetStorage {
  return storageProxy;
}

export function setStorage(storage: BudgetStorage): void {
  activeStorage = storage;
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export * from './types';
export { createInMemoryStorage, type InMemoryStorageSeed } from './inMemoryStorage';
export { createSupabaseStorage } from './supabaseStorage';
