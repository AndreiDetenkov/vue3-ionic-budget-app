import { createFirebaseCloudController, type FirebaseCloudController } from './firebaseClient';
import { createSyncedLocalStorage } from './firebaseSync';
import { createLocalStorage } from './localStorage';
import type { BudgetStorage, LocalBudgetStorage } from './types';

function isLocalBudgetStorage(storage: BudgetStorage): storage is LocalBudgetStorage {
  return (
    typeof (storage as Partial<LocalBudgetStorage>).getSnapshot === 'function' &&
    typeof (storage as Partial<LocalBudgetStorage>).replaceSnapshot === 'function'
  );
}

const baseLocalStorage: LocalBudgetStorage = createLocalStorage();
let activeCloud: FirebaseCloudController | null = null;

function getOrCreateDefaultCloud(): FirebaseCloudController {
  if (!activeCloud) {
    activeCloud = createFirebaseCloudController(baseLocalStorage);
  }
  return activeCloud;
}

const cloudProxy: FirebaseCloudController = {
  getCurrentUser: () => (activeCloud ? activeCloud.getCurrentUser() : null),
  subscribeAuthState: (listener) => getOrCreateDefaultCloud().subscribeAuthState(listener),
  signInWithGoogle: () => getOrCreateDefaultCloud().signInWithGoogle(),
  signOut: () => getOrCreateDefaultCloud().signOut(),
  syncNow: () => getOrCreateDefaultCloud().syncNow(),
  isSyncEnabled: () => (activeCloud ? activeCloud.isSyncEnabled() : false),
  resetCursors: () => getOrCreateDefaultCloud().resetCursors(),
  isSyncInFlight: () => (activeCloud ? (activeCloud.isSyncInFlight?.() ?? false) : false),
};

const defaultLocalStorage: LocalBudgetStorage = createSyncedLocalStorage(baseLocalStorage, cloudProxy, () =>
  cloudProxy.isSyncEnabled(),
);
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

export function useFirebaseCloud(): FirebaseCloudController {
  return cloudProxy;
}

export function setFirebaseCloud(cloud: FirebaseCloudController | null): void {
  activeCloud = cloud;
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export * from './types';
export { DEFAULT_CATEGORIES } from './defaultCategories';
export { createInMemoryStorage, type InMemoryStorageSeed } from './inMemoryStorage';
export { createLocalStorage } from './localStorage';
export {
  exportBackupJson,
  importBackupJson,
  mergeSnapshots,
  parseBackupSnapshot,
  serializeBackupSnapshot,
  type MigrationResult,
} from './backup';
export {
  createFirebaseSyncService,
  createSyncedLocalStorage,
  DEFAULT_SYNC_CURSOR_KEY,
  MAX_FIRESTORE_BATCH_SIZE,
  type FirebaseRemoteAdapter,
  type FirebaseSyncService,
  type FirebaseSyncServiceOptions,
  type FirebaseSyncSummary,
  type SyncCursorState,
} from './firebaseSync';
export {
  createFirebaseCloudController,
  createFirestoreRemoteAdapter,
  getApp,
  getDb,
  getFirebaseAuth,
  parseAllowedEmails,
  type FirebaseAuthUser,
  type FirebaseCloudController,
  type FirebaseCloudControllerOptions,
} from './firebaseClient';
