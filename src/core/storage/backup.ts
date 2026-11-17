import type { LocalBudgetStorage, LocalStorageSnapshot, StoredCategory, StoredTransaction } from './types';

export interface MigrationResult {
  categoriesCount: number;
  transactionsCount: number;
}

const EXPECTED_CSV_HEADERS = ['id', 'created_at', 'name', 'value', 'category_id'] as const;

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

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      if (current.length > 0) {
        throw new Error('Unexpected quote inside unquoted CSV field');
      }
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted CSV field');
  }

  fields.push(current);
  return fields;
}

function normalizePostgresTimestamp(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // Convert Postgres `YYYY-MM-DD HH:mm:ss.ffffff+HH` into strict ISO 8601 `...T...+HH:00`
  const withT = trimmed.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, '$1T$2');
  const withFullOffset = withT.replace(/([+-]\d{2})$/, '$1:00').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');

  const parsed = Date.parse(withFullOffset);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

export function parseTransactionsCsv(rawCsv: string): StoredTransaction[] {
  const lines = rawCsv.replace(/^\uFEFF/, '').split(/\r?\n/);

  let headerParsed = false;
  const transactions: StoredTransaction[] = [];

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (line.trim().length === 0) {
      continue;
    }

    const lineNumber = idx + 1;

    if (!headerParsed) {
      const headers = parseCsvRow(line).map((col) => col.trim().toLowerCase());
      const matchesExpected =
        headers.length === EXPECTED_CSV_HEADERS.length &&
        EXPECTED_CSV_HEADERS.every((expected, i) => headers[i] === expected);

      if (!matchesExpected) {
        throw new Error('Invalid CSV header: expected id,created_at,name,value,category_id');
      }
      headerParsed = true;
      continue;
    }

    let columns: string[];
    try {
      columns = parseCsvRow(line);
    } catch {
      throw new Error(`Invalid CSV row at line ${lineNumber}`);
    }

    if (columns.length !== EXPECTED_CSV_HEADERS.length) {
      throw new Error(`Invalid CSV row at line ${lineNumber}`);
    }

    const [rawId, rawCreatedAt, rawName, rawValue, rawCategoryId] = columns;
    const id = rawId.trim();
    const categoryId = rawCategoryId.trim();
    const numericText = rawValue.trim();
    const value = numericText.length > 0 ? Number(numericText) : Number.NaN;
    const isoCreatedAt = normalizePostgresTimestamp(rawCreatedAt);

    if (!id || !categoryId || !Number.isFinite(value) || !isoCreatedAt) {
      throw new Error(`Invalid CSV row at line ${lineNumber}`);
    }

    transactions.push({
      id,
      name: rawName.trim() || 'Transaction',
      value,
      createdAt: isoCreatedAt,
      updatedAt: isoCreatedAt,
      deletedAt: null,
      categoryId,
    });
  }

  if (!headerParsed) {
    throw new Error('Invalid CSV header: expected id,created_at,name,value,category_id');
  }

  return transactions;
}

export async function importTransactionsCsv(storage: LocalBudgetStorage, rawCsv: string): Promise<MigrationResult> {
  const incomingTransactions = parseTransactionsCsv(rawCsv);
  const local = await storage.getSnapshot();
  const merged = mergeSnapshots(local, {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories: [],
    transactions: incomingTransactions,
  });

  await storage.replaceSnapshot(merged);

  return {
    categoriesCount: merged.categories.filter((c) => !c.deletedAt).length,
    transactionsCount: incomingTransactions.length,
  };
}
