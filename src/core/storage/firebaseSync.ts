import { mergeSnapshots } from './backup';
import type { LocalBudgetStorage, LocalStorageSnapshot, StoredCategory, StoredTransaction } from './types';

export const MAX_FIRESTORE_BATCH_SIZE = 450;
export const DEFAULT_SYNC_CURSOR_KEY = 'budget-app-firebase-sync-cursor-v1';

export interface SyncCursorState {
  lastPulledAt: string | null;
  lastPushedAt: string | null;
}

export interface FirebaseSyncSummary {
  pulledCategories: number;
  pulledTransactions: number;
  pushedCategories: number;
  pushedTransactions: number;
}

export interface FirebaseRemoteAdapter {
  fetchCategoriesSince(sinceIso: string | null): Promise<StoredCategory[]>;
  fetchTransactionsSince(sinceIso: string | null): Promise<StoredTransaction[]>;
  upsertBatch(categories: StoredCategory[], transactions: StoredTransaction[]): Promise<void>;
}

export interface FirebaseSyncServiceOptions {
  local: LocalBudgetStorage;
  remote: FirebaseRemoteAdapter;
  cursorKey?: string;
}

export interface FirebaseSyncService {
  syncNow(): Promise<FirebaseSyncSummary>;
  getCursors(): SyncCursorState;
  resetCursors(): void;
}

type SyncBatch = {
  categories: StoredCategory[];
  transactions: StoredTransaction[];
};

function readCursorState(cursorKey: string): SyncCursorState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { lastPulledAt: null, lastPushedAt: null };
  }

  try {
    const raw = window.localStorage.getItem(cursorKey);
    if (!raw) {
      return { lastPulledAt: null, lastPushedAt: null };
    }
    const parsed = JSON.parse(raw) as Partial<SyncCursorState>;
    return {
      lastPulledAt: typeof parsed.lastPulledAt === 'string' ? parsed.lastPulledAt : null,
      lastPushedAt: typeof parsed.lastPushedAt === 'string' ? parsed.lastPushedAt : null,
    };
  } catch {
    return { lastPulledAt: null, lastPushedAt: null };
  }
}

function writeCursorState(cursorKey: string, state: SyncCursorState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(cursorKey, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors when saving sync cursors
  }
}

function clearCursorState(cursorKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(cursorKey);
  } catch {
    // Ignore storage errors when resetting sync cursors
  }
}

function pickMaxTimestamp(current: string | null, candidates: readonly string[]): string | null {
  let bestIso = current;
  let bestMs = current ? Date.parse(current) : Number.NaN;

  for (const ts of candidates) {
    const ms = Date.parse(ts);
    if (!Number.isNaN(ms) && (Number.isNaN(bestMs) || ms > bestMs)) {
      bestMs = ms;
      bestIso = ts;
    }
  }

  return bestIso;
}

function filterOutgoingItems<T extends { id: string; updatedAt: string }>(
  items: readonly T[],
  lastPushedAt: string | null,
  pulledVersions: ReadonlyMap<string, string>,
): T[] {
  const lastPushedMs = lastPushedAt ? Date.parse(lastPushedAt) : Number.NaN;

  return items.filter((item) => {
    const itemMs = Date.parse(item.updatedAt);
    if (!Number.isNaN(lastPushedMs) && !Number.isNaN(itemMs) && itemMs <= lastPushedMs) {
      return false;
    }

    const pulledUpdatedAt = pulledVersions.get(item.id);
    if (pulledUpdatedAt) {
      const pulledMs = Date.parse(pulledUpdatedAt);
      if (!Number.isNaN(pulledMs) && !Number.isNaN(itemMs) && itemMs <= pulledMs) {
        return false;
      }
    }

    return true;
  });
}

function buildBatches(
  categories: readonly StoredCategory[],
  transactions: readonly StoredTransaction[],
  batchSize: number,
): SyncBatch[] {
  const tagged = [
    ...categories.map((cat) => ({ kind: 'category' as const, item: cat })),
    ...transactions.map((tx) => ({ kind: 'transaction' as const, item: tx })),
  ];
  const batches: SyncBatch[] = [];

  for (let i = 0; i < tagged.length; i += batchSize) {
    const slice = tagged.slice(i, i + batchSize);
    const catChunk: StoredCategory[] = [];
    const txChunk: StoredTransaction[] = [];

    for (const entry of slice) {
      if (entry.kind === 'category') {
        catChunk.push(entry.item);
      } else {
        txChunk.push(entry.item);
      }
    }

    batches.push({ categories: catChunk, transactions: txChunk });
  }

  return batches;
}

export function createFirebaseSyncService(options: FirebaseSyncServiceOptions): FirebaseSyncService {
  const cursorKey = options.cursorKey ?? DEFAULT_SYNC_CURSOR_KEY;
  let activeSync: Promise<FirebaseSyncSummary> | null = null;

  async function executeSync(): Promise<FirebaseSyncSummary> {
    const cursors = readCursorState(cursorKey);

    // Pull phase: fetch remote deltas updated since lastPulledAt
    const [remoteCategories, remoteTransactions] = await Promise.all([
      options.remote.fetchCategoriesSince(cursors.lastPulledAt),
      options.remote.fetchTransactionsSince(cursors.lastPulledAt),
    ]);

    const pulledCategoryVersions = new Map(remoteCategories.map((cat) => [cat.id, cat.updatedAt]));
    const pulledTransactionVersions = new Map(remoteTransactions.map((tx) => [tx.id, tx.updatedAt]));

    const localSnapshot = await options.local.getSnapshot();
    let workingSnapshot: LocalStorageSnapshot = localSnapshot;

    if (remoteCategories.length > 0 || remoteTransactions.length > 0) {
      workingSnapshot = mergeSnapshots(localSnapshot, {
        version: 1,
        updatedAt: new Date().toISOString(),
        categories: remoteCategories,
        transactions: remoteTransactions,
      });
      await options.local.replaceSnapshot(workingSnapshot);
    }

    const newLastPulledAt = pickMaxTimestamp(cursors.lastPulledAt, [
      ...remoteCategories.map((c) => c.updatedAt),
      ...remoteTransactions.map((t) => t.updatedAt),
    ]);

    // Push phase: send only local/newer items in Firestore-safe batches (<= 450 operations)
    const outgoingCategories = filterOutgoingItems(
      workingSnapshot.categories,
      cursors.lastPushedAt,
      pulledCategoryVersions,
    );
    const outgoingTransactions = filterOutgoingItems(
      workingSnapshot.transactions,
      cursors.lastPushedAt,
      pulledTransactionVersions,
    );

    const batches = buildBatches(outgoingCategories, outgoingTransactions, MAX_FIRESTORE_BATCH_SIZE);
    for (const batch of batches) {
      await options.remote.upsertBatch(batch.categories, batch.transactions);
    }

    const pushedTimestamps = [
      ...outgoingCategories.map((c) => c.updatedAt),
      ...outgoingTransactions.map((t) => t.updatedAt),
    ];

    const finalLastPulledAt = pickMaxTimestamp(newLastPulledAt, pushedTimestamps);
    const newLastPushedAt = pickMaxTimestamp(cursors.lastPushedAt, [
      ...workingSnapshot.categories.map((c) => c.updatedAt),
      ...workingSnapshot.transactions.map((t) => t.updatedAt),
    ]);

    writeCursorState(cursorKey, {
      lastPulledAt: finalLastPulledAt,
      lastPushedAt: newLastPushedAt,
    });

    return {
      pulledCategories: remoteCategories.length,
      pulledTransactions: remoteTransactions.length,
      pushedCategories: outgoingCategories.length,
      pushedTransactions: outgoingTransactions.length,
    };
  }

  return {
    syncNow(): Promise<FirebaseSyncSummary> {
      if (!activeSync) {
        activeSync = executeSync().finally(() => {
          activeSync = null;
        });
      }
      return activeSync;
    },

    getCursors(): SyncCursorState {
      return readCursorState(cursorKey);
    },

    resetCursors(): void {
      clearCursorState(cursorKey);
    },
  };
}

export function createSyncedLocalStorage(
  local: LocalBudgetStorage,
  syncService: FirebaseSyncService,
  isSyncEnabled: () => boolean,
): LocalBudgetStorage {
  function triggerBackgroundSync(): void {
    if (isSyncEnabled()) {
      void syncService.syncNow().catch(() => {
        // Offline or auth errors during background sync must not break local-first mutations
      });
    }
  }

  return {
    getTransactionsByRange: (range) => local.getTransactionsByRange(range),
    getCategories: () => local.getCategories(),
    getSnapshot: () => local.getSnapshot(),
    replaceSnapshot: (snapshot) => local.replaceSnapshot(snapshot),

    async createTransaction(input) {
      await local.createTransaction(input);
      triggerBackgroundSync();
    },

    async updateTransaction(input) {
      await local.updateTransaction(input);
      triggerBackgroundSync();
    },

    async removeTransaction(id) {
      await local.removeTransaction(id);
      triggerBackgroundSync();
    },
  };
}
