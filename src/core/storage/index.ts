import { createSupabaseStorage } from './supabaseStorage';
import type { BudgetStorage } from './types';

let activeStorage: BudgetStorage = createSupabaseStorage();

export function getStorage(): BudgetStorage {
  return activeStorage;
}

export function setStorage(storage: BudgetStorage): void {
  activeStorage = storage;
}

export function resetStorage(): void {
  activeStorage = createSupabaseStorage();
}

export * from './types';
export { createInMemoryStorage, type InMemoryStorageSeed } from './inMemoryStorage';
export { createSupabaseStorage } from './supabaseStorage';
