import { DEFAULT_CATEGORIES } from './defaultCategories';
import { hasIndexedDb, IDB_SNAPSHOTS_STORE, readIdbValue, writeIdbValue } from './idb';
import type {
  Category,
  CreateTransactionInput,
  DateRange,
  LocalBudgetStorage,
  LocalStorageOptions,
  LocalStorageSnapshot,
  StoredCategory,
  StoredTransaction,
  UpdateTransactionInput,
} from './types';

const DEFAULT_STORAGE_KEY = 'budget-app-local-snapshot-v1';

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

async function readPersistedSnapshot(storageKey: string): Promise<LocalStorageSnapshot | null> {
  if (hasIndexedDb()) {
    try {
      const result = await readIdbValue<LocalStorageSnapshot>(IDB_SNAPSHOTS_STORE, storageKey);
      if (result) {
        return cloneSnapshot(result);
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
  if (hasIndexedDb()) {
    try {
      await writeIdbValue(IDB_SNAPSHOTS_STORE, storageKey, snapshot);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // Ignore legacy localStorage cleanup errors
        }
      }
      return;
    } catch {
      // Fall back to window.localStorage if IndexedDB fails
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota errors in fallback environment
    }
  }
}

const DEFAULT_SEED_EPOCH = '1970-01-01T00:00:00.000Z';

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
      updatedAt: DEFAULT_SEED_EPOCH,
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
  let operationChain: Promise<unknown> = Promise.resolve();

  function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = operationChain.then(fn, fn);
    operationChain = next.catch(() => {
      // Keep the serialization chain alive even if an individual operation fails
    });
    return next;
  }

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
    getCategories: () =>
      runExclusive(async () => {
        const snapshot = await ensureSnapshot();
        return snapshot.categories
          .filter((cat) => !cat.deletedAt)
          .map(cloneCategory)
          .sort((a, b) => a.title.localeCompare(b.title));
      }),

    getTransactionsByRange: ({ from, to }: DateRange) =>
      runExclusive(async () => {
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
      }),

    createTransaction: (input: CreateTransactionInput) =>
      runExclusive(async () => {
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
      }),

    updateTransaction: (input: UpdateTransactionInput) =>
      runExclusive(async () => {
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
      }),

    removeTransaction: (id: string) =>
      runExclusive(async () => {
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
      }),

    getSnapshot: () =>
      runExclusive(async () => {
        const snapshot = await ensureSnapshot();
        return cloneSnapshot(snapshot);
      }),

    replaceSnapshot: (snapshot: LocalStorageSnapshot) =>
      runExclusive(async () => {
        await saveSnapshot(snapshot);
      }),
  };
}
