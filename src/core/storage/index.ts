import { createSupabaseStorage } from './supabaseStorage';
import type { BudgetStorage } from './types';

let activeStorage: BudgetStorage = createSupabaseStorage();

export function getStorage(): BudgetStorage {
  return activeStorage;
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
