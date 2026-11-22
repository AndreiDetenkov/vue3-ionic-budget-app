import type { LocalBudgetStorage, LocalStorageSnapshot, StoredCategory, StoredTransaction } from './types';

export interface MigrationResult {
  categoriesCount: number;
  transactionsCount: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isOptionalValidTimestamp(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isValidTimestamp(value);
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
  if (Number.isNaN(incomingTime)) {
    return Number.isNaN(localTime);
  }
  if (Number.isNaN(localTime)) {
    return true;
  }
  return incomingTime >= localTime;
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
    !isValidTimestamp(updatedAt) ||
    !isOptionalValidTimestamp(deletedAt)
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
    !isValidTimestamp(createdAt) ||
    !isValidTimestamp(updatedAt) ||
    !isNonEmptyString(categoryId) ||
    !isOptionalValidTimestamp(deletedAt)
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

  if (!isValidTimestamp(parsed.updatedAt) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions)) {
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
