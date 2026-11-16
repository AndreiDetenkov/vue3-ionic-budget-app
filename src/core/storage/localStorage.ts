import { DEFAULT_CATEGORIES } from './defaultCategories';
import type {
  Category,
  CreateTransactionInput,
  DateRange,
  LocalBudgetStorage,
  LocalStorageOptions,
  LocalStorageSnapshot,
  StoredCategory,
  StoredTransaction,
  Transaction,
  UpdateTransactionInput,
} from './types';

const DEFAULT_STORAGE_KEY = 'budget-app-local-snapshot-v1';
const IDB_DB_NAME = 'budget-app-db';
const IDB_STORE_NAME = 'snapshots';

function cloneCategory(category: Category): Category {
  return {
    id: category.id,
    title: category.title,
    icon: category.icon,
  };
}

function cloneStoredCategory(category: StoredCategory): StoredCategory {
  return {
    id: category.id,
    title: category.title,
    icon: category.icon,
    updatedAt: category.updatedAt,
    deletedAt: category.deletedAt ?? null,
  };
}

function cloneStoredTransaction(tx: StoredTransaction): StoredTransaction {
  return {
    id: tx.id,
    name: tx.name,
    value: tx.value,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    deletedAt: tx.deletedAt ?? null,
    categoryId: tx.categoryId,
  };
}

function cloneSnapshot(snapshot: LocalStorageSnapshot): LocalStorageSnapshot {
  return {
    version: 1,
    updatedAt: snapshot.updatedAt,
    categories: snapshot.categories.map(cloneStoredCategory),
    transactions: snapshot.transactions.map(cloneStoredTransaction),
  };
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openSnapshotDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function readPersistedSnapshot(storageKey: string): Promise<LocalStorageSnapshot | null> {
  if (hasIndexedDb()) {
    try {
      const db = await openSnapshotDb();
      try {
        const result = await new Promise<LocalStorageSnapshot | null>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE_NAME, 'readonly');
          const store = tx.objectStore(IDB_STORE_NAME);
          const req = store.get(storageKey);
          req.onsuccess = () => resolve((req.result as LocalStorageSnapshot | undefined) ?? null);
          req.onerror = () => reject(req.error ?? new Error('Failed to read from IndexedDB'));
        });
        if (result) {
          return cloneSnapshot(result);
        }
      } finally {
        db.close();
      }
    } catch {
      // Fallback to window.localStorage if IndexedDB fails in restricted environments
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalStorageSnapshot;
        return cloneSnapshot(parsed);
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function writePersistedSnapshot(storageKey: string, snapshot: LocalStorageSnapshot): Promise<void> {
  const cloned = cloneSnapshot(snapshot);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cloned));
    } catch {
      // Continue to IndexedDB persistence if localStorage quota is exceeded
    }
  }

  if (hasIndexedDb()) {
    try {
      const db = await openSnapshotDb();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
          const store = tx.objectStore(IDB_STORE_NAME);
          store.put(cloned, storageKey);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error('Failed to write to IndexedDB'));
        });
      } finally {
        db.close();
      }
    } catch {
      // Already persisted to window.localStorage fallback
    }
  }
}

function buildInitialSnapshot(options: LocalStorageOptions): LocalStorageSnapshot {
  const now = new Date().toISOString();
  const seedCategories = options.categories ?? DEFAULT_CATEGORIES;
  const seedTransactions = options.transactions ?? [];

  return {
    version: 1,
    updatedAt: now,
    categories: seedCategories.map((cat) => ({
      id: cat.id,
      title: cat.title,
      icon: cat.icon,
      updatedAt: now,
      deletedAt: null,
    })),
    transactions: seedTransactions.map((tx) => ({
      id: tx.id,
      name: tx.name,
      value: tx.value,
      createdAt: tx.createdAt,
      updatedAt: tx.createdAt || now,
      deletedAt: null,
      categoryId: tx.categoryId,
    })),
  };
}

export function createLocalStorage(options: LocalStorageOptions = {}): LocalBudgetStorage {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  let cachedSnapshot: LocalStorageSnapshot | null = null;

  async function ensureSnapshot(): Promise<LocalStorageSnapshot> {
    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    const existing = await readPersistedSnapshot(storageKey);
    if (existing) {
      cachedSnapshot = existing;
      return cachedSnapshot;
    }

    const initial = buildInitialSnapshot(options);
    cachedSnapshot = initial;
    await writePersistedSnapshot(storageKey, initial);
    return cachedSnapshot;
  }

  async function saveSnapshot(snapshot: LocalStorageSnapshot): Promise<void> {
    cachedSnapshot = cloneSnapshot(snapshot);
    await writePersistedSnapshot(storageKey, cachedSnapshot);
  }

  function findActiveCategoryOrThrow(snapshot: LocalStorageSnapshot, categoryId: string): Category {
    const found = snapshot.categories.find((cat) => cat.id === categoryId && !cat.deletedAt);
    if (!found) {
      throw new Error(`Category not found: ${categoryId}`);
    }
    return cloneCategory(found);
  }

  return {
    async getCategories(): Promise<Category[]> {
      const snapshot = await ensureSnapshot();
      return snapshot.categories
        .filter((cat) => !cat.deletedAt)
        .map(cloneCategory)
        .sort((a, b) => a.title.localeCompare(b.title));
    },

    async getTransactionsByRange({ from, to }: DateRange): Promise<Transaction[]> {
      const snapshot = await ensureSnapshot();
      const fromTime = new Date(from).getTime();
      const toTime = new Date(to).getTime();

      return snapshot.transactions
        .filter((tx) => {
          if (tx.deletedAt) {
            return false;
          }
          const itemTime = new Date(tx.createdAt).getTime();
          if (!Number.isNaN(fromTime) && !Number.isNaN(toTime) && !Number.isNaN(itemTime)) {
            return itemTime >= fromTime && itemTime <= toTime;
          }
          return tx.createdAt >= from && tx.createdAt <= to;
        })
        .sort((a, b) => {
          const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
            return timeDiff;
          }
          return b.createdAt.localeCompare(a.createdAt);
        })
        .map((tx) => {
          const category = snapshot.categories.find((cat) => cat.id === tx.categoryId) ?? {
            id: tx.categoryId,
            title: 'Other',
            icon: 'other',
          };
          return {
            id: tx.id,
            name: tx.name,
            value: tx.value,
            createdAt: tx.createdAt,
            categoryId: tx.categoryId,
            category: cloneCategory(category),
          };
        });
    },

    async createTransaction(input: CreateTransactionInput): Promise<void> {
      const snapshot = await ensureSnapshot();
      findActiveCategoryOrThrow(snapshot, input.categoryId);

      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      snapshot.transactions.push({
        id,
        name: input.name,
        value: input.value,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        categoryId: input.categoryId,
      });
      snapshot.updatedAt = now;

      await saveSnapshot(snapshot);
    },

    async updateTransaction(input: UpdateTransactionInput): Promise<void> {
      const snapshot = await ensureSnapshot();
      const txIndex = snapshot.transactions.findIndex((tx) => tx.id === input.id && !tx.deletedAt);
      if (txIndex === -1) {
        throw new Error(`Transaction not found: ${input.id}`);
      }

      findActiveCategoryOrThrow(snapshot, input.categoryId);

      const now = new Date().toISOString();
      const existing = snapshot.transactions[txIndex];

      snapshot.transactions[txIndex] = {
        ...existing,
        name: input.name,
        value: input.value,
        categoryId: input.categoryId,
        updatedAt: now,
      };
      snapshot.updatedAt = now;

      await saveSnapshot(snapshot);
    },

    async removeTransaction(id: string): Promise<void> {
      const snapshot = await ensureSnapshot();
      const txIndex = snapshot.transactions.findIndex((tx) => tx.id === id && !tx.deletedAt);
      if (txIndex === -1) {
        return;
      }

      const now = new Date().toISOString();
      snapshot.transactions[txIndex] = {
        ...snapshot.transactions[txIndex],
        updatedAt: now,
        deletedAt: now,
      };
      snapshot.updatedAt = now;

      await saveSnapshot(snapshot);
    },

    async getSnapshot(): Promise<LocalStorageSnapshot> {
      const snapshot = await ensureSnapshot();
      return cloneSnapshot(snapshot);
    },

    async replaceSnapshot(snapshot: LocalStorageSnapshot): Promise<void> {
      await saveSnapshot(snapshot);
    },
  };
}
