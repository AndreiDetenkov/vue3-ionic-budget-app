import { createLocalStorage } from './localStorage';
import { createSupabaseStorage } from './supabaseStorage';
import type {
  BudgetStorage,
  LocalBudgetStorage,
  LocalStorageOptions,
  LocalStorageSnapshot,
  StoredCategory,
  StoredTransaction,
  Transaction,
} from './types';

export interface MigrationResult {
  categoriesCount: number;
  transactionsCount: number;
}

export interface MigrateFromSupabaseOptions {
  startYear?: number;
  endYear?: number;
}

export interface AutoMigratingStorageOptions extends LocalStorageOptions, MigrateFromSupabaseOptions {
  migrationFlagKey?: string;
  remoteStorage?: BudgetStorage;
  localStorage?: LocalBudgetStorage;
}

const DEFAULT_MIGRATION_FLAG_KEY = 'budget-app-supabase-migrated-v1';
const DEFAULT_MIGRATION_START_YEAR = 2020;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
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

function shouldIncomingWin(localUpdatedAt: string, incomingUpdatedAt: string): boolean {
  const localTime = Date.parse(localUpdatedAt);
  const incomingTime = Date.parse(incomingUpdatedAt);
  if (!Number.isNaN(localTime) && !Number.isNaN(incomingTime)) {
    return incomingTime >= localTime;
  }
  return true;
}

function mergeRecordsById<T extends { id: string; updatedAt: string }>(
  localItems: readonly T[],
  incomingItems: readonly T[],
  clone: (item: T) => T,
): T[] {
  const merged = new Map<string, T>();

  for (const item of localItems) {
    merged.set(item.id, clone(item));
  }

  for (const incomingItem of incomingItems) {
    const existing = merged.get(incomingItem.id);
    if (!existing || shouldIncomingWin(existing.updatedAt, incomingItem.updatedAt)) {
      merged.set(incomingItem.id, clone(incomingItem));
    }
  }

  return Array.from(merged.values());
}

function pickLatestTimestamp(timestamps: string[]): string {
  let bestIso = new Date().toISOString();
  let bestTime = Date.parse(bestIso);

  for (const ts of timestamps) {
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed) && parsed > bestTime) {
      bestTime = parsed;
      bestIso = ts;
    }
  }

  return bestIso;
}

export function mergeSnapshots(local: LocalStorageSnapshot, incoming: LocalStorageSnapshot): LocalStorageSnapshot {
  return {
    version: 1,
    updatedAt: pickLatestTimestamp([local.updatedAt, incoming.updatedAt]),
    categories: mergeRecordsById(local.categories, incoming.categories, cloneStoredCategory),
    transactions: mergeRecordsById(local.transactions, incoming.transactions, cloneStoredTransaction),
  };
}

export function serializeBackupSnapshot(snapshot: LocalStorageSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

function parseStoredCategory(raw: unknown): StoredCategory {
  if (!isPlainObject(raw)) {
    throw new Error('Invalid backup category');
  }

  const { id, title, icon, updatedAt, deletedAt } = raw;
  const isValidIcon = icon === null || typeof icon === 'string';

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(title) ||
    !isValidIcon ||
    !isNonEmptyString(updatedAt) ||
    !isOptionalNullableString(deletedAt)
  ) {
    throw new Error('Invalid backup category');
  }

  return {
    id,
    title,
    icon,
    updatedAt,
    deletedAt: deletedAt ?? null,
  };
}

function parseStoredTransaction(raw: unknown): StoredTransaction {
  if (!isPlainObject(raw)) {
    throw new Error('Invalid backup transaction');
  }

  const { id, name, value, createdAt, updatedAt, deletedAt, categoryId } = raw;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(name) ||
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !isNonEmptyString(createdAt) ||
    !isNonEmptyString(updatedAt) ||
    !isNonEmptyString(categoryId) ||
    !isOptionalNullableString(deletedAt)
  ) {
    throw new Error('Invalid backup transaction');
  }

  return {
    id,
    name,
    value,
    createdAt,
    updatedAt,
    deletedAt: deletedAt ?? null,
    categoryId,
  };
}

export function parseBackupSnapshot(rawJson: string): LocalStorageSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid backup JSON');
  }

  if (!isPlainObject(parsed)) {
    throw new Error('Invalid backup JSON');
  }

  if (parsed.version !== 1) {
    throw new Error(`Unsupported backup version: ${String(parsed.version)}`);
  }

  if (!isNonEmptyString(parsed.updatedAt) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions)) {
    throw new Error('Invalid backup JSON');
  }

  return {
    version: 1,
    updatedAt: parsed.updatedAt,
    categories: parsed.categories.map(parseStoredCategory),
    transactions: parsed.transactions.map(parseStoredTransaction),
  };
}

export async function exportBackupJson(storage: LocalBudgetStorage): Promise<string> {
  const snapshot = await storage.getSnapshot();
  return serializeBackupSnapshot(snapshot);
}

export async function importBackupJson(storage: LocalBudgetStorage, rawJson: string): Promise<MigrationResult> {
  const incoming = parseBackupSnapshot(rawJson);
  const local = await storage.getSnapshot();
  const merged = mergeSnapshots(local, incoming);

  await storage.replaceSnapshot(merged);

  return {
    categoriesCount: merged.categories.filter((c) => !c.deletedAt).length,
    transactionsCount: merged.transactions.filter((t) => !t.deletedAt).length,
  };
}

export async function migrateFromSupabase(
  target: LocalBudgetStorage,
  remote: BudgetStorage = createSupabaseStorage(),
  options: MigrateFromSupabaseOptions = {},
): Promise<MigrationResult> {
  const startYear = options.startYear ?? DEFAULT_MIGRATION_START_YEAR;
  const endYear = options.endYear ?? new Date().getUTCFullYear() + 1;
  const remoteCategories = await remote.getCategories();

  // Query year-by-year so multi-year histories do not silently truncate at PostgREST's 1000-row default limit
  const transactionsById = new Map<string, Transaction>();
  for (let year = startYear; year <= endYear; year += 1) {
    const chunk = await remote.getTransactionsByRange({
      from: `${year}-01-01T00:00:00.000Z`,
      to: `${year}-12-31T23:59:59.999Z`,
    });
    for (const tx of chunk) {
      transactionsById.set(tx.id, tx);
    }
  }

  const now = new Date().toISOString();
  const storedCategories: StoredCategory[] = remoteCategories.map((category) => ({
    id: category.id,
    title: category.title,
    icon: category.icon,
    updatedAt: now,
    deletedAt: null,
  }));

  const storedTransactions: StoredTransaction[] = Array.from(transactionsById.values()).map((tx) => ({
    id: tx.id,
    name: tx.name,
    value: tx.value,
    createdAt: tx.createdAt,
    updatedAt: tx.createdAt,
    deletedAt: null,
    categoryId: tx.categoryId,
  }));

  const incomingSnapshot: LocalStorageSnapshot = {
    version: 1,
    updatedAt: now,
    categories: storedCategories,
    transactions: storedTransactions,
  };

  const localSnapshot = await target.getSnapshot();
  const merged = mergeSnapshots(localSnapshot, incomingSnapshot);
  await target.replaceSnapshot(merged);

  return {
    categoriesCount: storedCategories.length,
    transactionsCount: storedTransactions.length,
  };
}

function hasSupabaseEnv(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
}

function isMigrationCompleted(flagKey: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    return window.localStorage.getItem(flagKey) === 'true';
  } catch {
    return false;
  }
}

function markMigrationCompleted(flagKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(flagKey, 'true');
  } catch {
    // Ignore storage quota errors for flag persistence
  }
}

export function createAutoMigratingLocalStorage(options: AutoMigratingStorageOptions = {}): LocalBudgetStorage {
  const local = options.localStorage ?? createLocalStorage(options);
  const migrationFlagKey = options.migrationFlagKey ?? DEFAULT_MIGRATION_FLAG_KEY;
  let migrationPromise: Promise<void> | null = null;
  let checkedInSession = false;

  async function ensureMigratedOnce(): Promise<void> {
    if (checkedInSession || isMigrationCompleted(migrationFlagKey) || !hasSupabaseEnv()) {
      checkedInSession = true;
      return;
    }

    if (!migrationPromise) {
      migrationPromise = (async () => {
        try {
          const snapshot = await local.getSnapshot();
          if (snapshot.transactions.length > 0) {
            markMigrationCompleted(migrationFlagKey);
            return;
          }

          const remote = options.remoteStorage ?? createSupabaseStorage();
          await migrateFromSupabase(local, remote, {
            startYear: options.startYear,
            endYear: options.endYear,
          });
          markMigrationCompleted(migrationFlagKey);
        } catch {
          // Offline or remote error must not prevent local-first operation
        } finally {
          checkedInSession = true;
          migrationPromise = null;
        }
      })();
    }

    await migrationPromise;
  }

  return {
    async getTransactionsByRange(range) {
      await ensureMigratedOnce();
      return local.getTransactionsByRange(range);
    },

    async createTransaction(input) {
      await ensureMigratedOnce();
      return local.createTransaction(input);
    },

    async updateTransaction(input) {
      await ensureMigratedOnce();
      return local.updateTransaction(input);
    },

    async removeTransaction(id) {
      await ensureMigratedOnce();
      return local.removeTransaction(id);
    },

    async getCategories() {
      await ensureMigratedOnce();
      return local.getCategories();
    },

    async getSnapshot() {
      await ensureMigratedOnce();
      return local.getSnapshot();
    },

    replaceSnapshot(snapshot) {
      return local.replaceSnapshot(snapshot);
    },
  };
}
