import { mergeSnapshots } from './backup';
import type { LocalBudgetStorage, LocalStorageSnapshot, StoredCategory, StoredTransaction } from './types';

export const MAX_FIRESTORE_BATCH_SIZE = 450;
export const DEFAULT_SYNC_CURSOR_KEY = 'budget-app-firebase-sync-cursor-v1';
const BASELINE_SEED_EPOCH = '1970-01-01T00:00:00.000Z';

export interface SyncCursorState {
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  syncedCategories?: Record<string, string>;
  syncedTransactions?: Record<string, string>;
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
  isSyncInFlight(): boolean;
}

type SyncBatch = {
  categories: StoredCategory[];
  transactions: StoredTransaction[];
};

function parseVersionMap(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

function readCursorState(cursorKey: string): SyncCursorState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      lastPulledAt: null,
      lastPushedAt: null,
      syncedCategories: {},
      syncedTransactions: {},
    };
  }

  try {
    const raw = window.localStorage.getItem(cursorKey);
    if (!raw) {
      return {
        lastPulledAt: null,
        lastPushedAt: null,
        syncedCategories: {},
        syncedTransactions: {},
      };
    }
    const parsed = JSON.parse(raw) as Partial<SyncCursorState>;
    return {
      lastPulledAt: typeof parsed.lastPulledAt === 'string' ? parsed.lastPulledAt : null,
      lastPushedAt: typeof parsed.lastPushedAt === 'string' ? parsed.lastPushedAt : null,
      syncedCategories: parseVersionMap(parsed.syncedCategories),
      syncedTransactions: parseVersionMap(parsed.syncedTransactions),
    };
  } catch {
    return {
      lastPulledAt: null,
      lastPushedAt: null,
      syncedCategories: {},
      syncedTransactions: {},
    };
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
  syncedVersions: Readonly<Record<string, string>>,
  pulledVersions: ReadonlyMap<string, string>,
  skipUneditedBaselineEpoch = false,
): T[] {
  const baselineMs = Date.parse(BASELINE_SEED_EPOCH);

  return items.filter((item) => {
    const itemMs = Date.parse(item.updatedAt);
    const knownRemoteUpdatedAt = pulledVersions.get(item.id) ?? syncedVersions[item.id];

    if (knownRemoteUpdatedAt) {
      const knownMs = Date.parse(knownRemoteUpdatedAt);
      if (!Number.isNaN(knownMs) && !Number.isNaN(itemMs)) {
        return itemMs > knownMs;
      }
      return item.updatedAt !== knownRemoteUpdatedAt;
    }

    if (skipUneditedBaselineEpoch && !Number.isNaN(itemMs) && itemMs === baselineMs) {
      return false;
    }

    return true;
  });
}

function bumpItemsPastCursor<T extends { id: string; updatedAt: string }>(
  items: T[],
  cutoffMs: number,
  bumpIso: string,
): { bumpedIds: Set<string>; items: T[] } {
  const bumpedIds = new Set<string>();
  const nextItems = items.map((item) => {
    const itemMs = Date.parse(item.updatedAt);
    if (Number.isNaN(itemMs) || itemMs <= cutoffMs) {
      bumpedIds.add(item.id);
      return {
        ...item,
        updatedAt: bumpIso,
      };
    }
    return item;
  });
  return { bumpedIds, items: nextItems };
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

    const nextSyncedCategories: Record<string, string> = { ...(cursors.syncedCategories ?? {}) };
    for (const [id, updatedAt] of pulledCategoryVersions) {
      nextSyncedCategories[id] = updatedAt;
    }
    const nextSyncedTransactions: Record<string, string> = { ...(cursors.syncedTransactions ?? {}) };
    for (const [id, updatedAt] of pulledTransactionVersions) {
      nextSyncedTransactions[id] = updatedAt;
    }

    const remoteHadCategories = remoteCategories.length > 0 || Object.keys(cursors.syncedCategories ?? {}).length > 0;

    // Push phase: send only items missing on remote or strictly newer than synced version
    let outgoingCategories = filterOutgoingItems(
      workingSnapshot.categories,
      nextSyncedCategories,
      pulledCategoryVersions,
      remoteHadCategories,
    );
    let outgoingTransactions = filterOutgoingItems(
      workingSnapshot.transactions,
      nextSyncedTransactions,
      pulledTransactionVersions,
    );

    const pulledCutoffMs = newLastPulledAt ? Date.parse(newLastPulledAt) : Number.NaN;
    if (!Number.isNaN(pulledCutoffMs) && (outgoingCategories.length > 0 || outgoingTransactions.length > 0)) {
      const bumpIso = new Date(Math.max(Date.now(), pulledCutoffMs + 1)).toISOString();
      const bumpedCats = bumpItemsPastCursor(outgoingCategories, pulledCutoffMs, bumpIso);
      const bumpedTxs = bumpItemsPastCursor(outgoingTransactions, pulledCutoffMs, bumpIso);

      if (bumpedCats.bumpedIds.size > 0 || bumpedTxs.bumpedIds.size > 0) {
        outgoingCategories = bumpedCats.items;
        outgoingTransactions = bumpedTxs.items;
        workingSnapshot = {
          ...workingSnapshot,
          categories: workingSnapshot.categories.map((c) =>
            bumpedCats.bumpedIds.has(c.id) ? { ...c, updatedAt: bumpIso } : c,
          ),
          transactions: workingSnapshot.transactions.map((t) =>
            bumpedTxs.bumpedIds.has(t.id) ? { ...t, updatedAt: bumpIso } : t,
          ),
        };
        await options.local.replaceSnapshot(workingSnapshot);
      }
    }

    let nextLastPushedAt = cursors.lastPushedAt;
    const batches = buildBatches(outgoingCategories, outgoingTransactions, MAX_FIRESTORE_BATCH_SIZE);

    try {
      for (const batch of batches) {
        await options.remote.upsertBatch(batch.categories, batch.transactions);
        for (const cat of batch.categories) {
          nextSyncedCategories[cat.id] = cat.updatedAt;
        }
        for (const tx of batch.transactions) {
          nextSyncedTransactions[tx.id] = tx.updatedAt;
        }
        nextLastPushedAt = pickMaxTimestamp(nextLastPushedAt, [
          ...batch.categories.map((c) => c.updatedAt),
          ...batch.transactions.map((t) => t.updatedAt),
        ]);
      }
    } finally {
      writeCursorState(cursorKey, {
        lastPulledAt: newLastPulledAt,
        lastPushedAt: nextLastPushedAt,
        syncedCategories: nextSyncedCategories,
        syncedTransactions: nextSyncedTransactions,
      });
    }

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

    isSyncInFlight(): boolean {
      return activeSync !== null;
    },
  };
}

export function createSyncedLocalStorage(
  local: LocalBudgetStorage,
  syncService: Pick<FirebaseSyncService, 'syncNow'> & { isSyncInFlight?: () => boolean },
  isSyncEnabled: () => boolean,
): LocalBudgetStorage {
  let inFlightBgSync: Promise<void> | null = null;
  let pendingBgSync = false;

  function triggerBackgroundSync(): void {
    if (!isSyncEnabled()) {
      return;
    }

    const externalInFlight = inFlightBgSync === null && syncService.isSyncInFlight?.() === true;
    if (inFlightBgSync !== null || externalInFlight) {
      pendingBgSync = true;
      if (inFlightBgSync !== null) {
        return;
      }
    }

    inFlightBgSync = (async () => {
      try {
        if (externalInFlight) {
          try {
            await syncService.syncNow();
          } catch {
            // Wait for pre-existing sync to settle before trailing background sync
          }
        }

        while (true) {
          if (!isSyncEnabled()) {
            pendingBgSync = false;
            break;
          }
          pendingBgSync = false;
          try {
            await syncService.syncNow();
          } catch {
            // Offline or auth errors during background sync must not break local-first mutations
          }
          if (!pendingBgSync) {
            break;
          }
        }
      } finally {
        inFlightBgSync = null;
      }
    })();
  }

  return {
    getTransactionsByRange: (range) => local.getTransactionsByRange(range),
    getCategories: () => local.getCategories(),
    getSnapshot: () => local.getSnapshot(),

    async replaceSnapshot(snapshot) {
      await local.replaceSnapshot(snapshot);
      triggerBackgroundSync();
    },

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
