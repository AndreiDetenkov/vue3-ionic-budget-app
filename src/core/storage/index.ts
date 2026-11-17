import { createAutoMigratingLocalStorage } from './backup';
import type { BudgetStorage, LocalBudgetStorage } from './types';

function isLocalBudgetStorage(storage: BudgetStorage): storage is LocalBudgetStorage {
  return (
    typeof (storage as Partial<LocalBudgetStorage>).getSnapshot === 'function' &&
    typeof (storage as Partial<LocalBudgetStorage>).replaceSnapshot === 'function'
  );
}

const defaultLocalStorage: LocalBudgetStorage = createAutoMigratingLocalStorage();
let activeStorage: BudgetStorage = defaultLocalStorage;

function resolveLocalStorage(): LocalBudgetStorage {
  return isLocalBudgetStorage(activeStorage) ? activeStorage : defaultLocalStorage;
}

const storageProxy: BudgetStorage = {
  getTransactionsByRange: (range) => activeStorage.getTransactionsByRange(range),
  createTransaction: (input) => activeStorage.createTransaction(input),
  updateTransaction: (input) => activeStorage.updateTransaction(input),
  removeTransaction: (id) => activeStorage.removeTransaction(id),
  getCategories: () => activeStorage.getCategories(),
};

const localStorageProxy: LocalBudgetStorage = {
  getTransactionsByRange: (range) => resolveLocalStorage().getTransactionsByRange(range),
  createTransaction: (input) => resolveLocalStorage().createTransaction(input),
  updateTransaction: (input) => resolveLocalStorage().updateTransaction(input),
  removeTransaction: (id) => resolveLocalStorage().removeTransaction(id),
  getCategories: () => resolveLocalStorage().getCategories(),
  getSnapshot: () => resolveLocalStorage().getSnapshot(),
  replaceSnapshot: (snapshot) => resolveLocalStorage().replaceSnapshot(snapshot),
};

export function useStorage(): BudgetStorage {
  return storageProxy;
}

export function getLocalStorage(): LocalBudgetStorage {
  return localStorageProxy;
}

export function setStorage(storage: BudgetStorage): void {
  activeStorage = storage;
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export * from './types';
export { DEFAULT_CATEGORIES } from './defaultCategories';
export { createInMemoryStorage, type InMemoryStorageSeed } from './inMemoryStorage';
export { createLocalStorage } from './localStorage';
export { createSupabaseStorage } from './supabaseStorage';
export {
  createAutoMigratingLocalStorage,
  exportBackupJson,
  importBackupJson,
  mergeSnapshots,
  migrateFromSupabase,
  parseBackupSnapshot,
  serializeBackupSnapshot,
  type AutoMigratingStorageOptions,
  type MigrateFromSupabaseOptions,
  type MigrationResult,
} from './backup';
