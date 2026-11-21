import { mergeSnapshots } from './backup';
import { deleteIdbValue, hasIndexedDb, IDB_SYNC_CURSORS_STORE, readIdbValue, writeIdbValue } from './idb';
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

const pendingCursorClears = new Map<string, Promise<void>>();

function isPlainRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function emptyCursorState(): SyncCursorState {
  return {
    lastPulledAt: null,
    lastPushedAt: null,
    syncedCategories: {},
    syncedTransactions: {},
  };
}

function cloneCursorState(state: SyncCursorState): SyncCursorState {
  return {
    lastPulledAt: state.lastPulledAt,
    lastPushedAt: state.lastPushedAt,
    syncedCategories: { ...(state.syncedCategories ?? {}) },
    syncedTransactions: { ...(state.syncedTransactions ?? {}) },
  };
}

function parseVersionMap(raw: unknown): Record<string, string> {
  if (!isPlainRecord(raw)) {
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

function parseCursorState(raw: unknown): { state: SyncCursorState; compactOnly: boolean } | null {
  if (!isPlainRecord(raw)) {
    return null;
  }

  const lastPulledAt = typeof raw.lastPulledAt === 'string' ? raw.lastPulledAt : null;
  const lastPushedAt = typeof raw.lastPushedAt === 'string' ? raw.lastPushedAt : null;
  const hasVersionMaps = isPlainRecord(raw.syncedCategories) && isPlainRecord(raw.syncedTransactions);
  const compactOnly = !hasVersionMaps && (lastPulledAt !== null || lastPushedAt !== null);

  return {
    state: {
      lastPulledAt,
      lastPushedAt,
      syncedCategories: parseVersionMap(raw.syncedCategories),
      syncedTransactions: parseVersionMap(raw.syncedTransactions),
    },
    compactOnly,
  };
}

function readLocalStorageCursorState(cursorKey: string): { state: SyncCursorState; compactOnly: boolean } | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(cursorKey);
    if (!raw) {
      return null;
    }
    return parseCursorState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function removeLocalStorageCursor(cursorKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(cursorKey);
  } catch {
    // Ignore storage errors when resetting or cleaning up sync cursors
  }
}

async function readCursorStateAsync(cursorKey: string): Promise<{ state: SyncCursorState; compactOnly: boolean }> {
  while (pendingCursorClears.has(cursorKey)) {
    await pendingCursorClears.get(cursorKey);
  }

  if (hasIndexedDb()) {
    try {
      const idbRaw = await readIdbValue<unknown>(IDB_SYNC_CURSORS_STORE, cursorKey);
      const parsed = parseCursorState(idbRaw);
      if (parsed) {
        return parsed;
      }
    } catch {
      // Fall back to window.localStorage if IndexedDB fails
    }
  }

  return readLocalStorageCursorState(cursorKey) ?? { state: emptyCursorState(), compactOnly: false };
}

async function writeCursorStateAsync(
  cursorKey: string,
  state: SyncCursorState,
  compactOnly = false,
  compactLastPushedAt: string | null = state.lastPushedAt,
): Promise<void> {
  const cloned = cloneCursorState(state);
  const compactPayload = { lastPulledAt: cloned.lastPulledAt, lastPushedAt: compactLastPushedAt };
  const payload = compactOnly ? compactPayload : cloned;

  if (hasIndexedDb()) {
    try {
      await writeIdbValue(IDB_SYNC_CURSORS_STORE, cursorKey, payload);
      removeLocalStorageCursor(cursorKey);
      return;
    } catch {
      // Fall back to window.localStorage if IndexedDB fails
    }
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(cursorKey, JSON.stringify(payload));
  } catch {
    try {
      window.localStorage.setItem(cursorKey, JSON.stringify(compactPayload));
    } catch {
      // Ignore storage quota errors even for compact fallback cursors
    }
  }
}

function clearCursorState(cursorKey: string): void {
  removeLocalStorageCursor(cursorKey);

  if (hasIndexedDb()) {
    const clearPromise = deleteIdbValue(IDB_SYNC_CURSORS_STORE, cursorKey)
      .catch(() => {
        // Ignore IDB errors when resetting sync cursors
      })
      .finally(() => {
        if (pendingCursorClears.get(cursorKey) === clearPromise) {
          pendingCursorClears.delete(cursorKey);
        }
      });
    pendingCursorClears.set(cursorKey, clearPromise);
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
  fallbackWatermarkIso: string | null = null,
): T[] {
  const baselineMs = Date.parse(BASELINE_SEED_EPOCH);
  const watermarkMs = fallbackWatermarkIso ? Date.parse(fallbackWatermarkIso) : Number.NaN;

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

    // shortcut: in no-IDB + localStorage quota fallback, items at or older than watermark are treated as synced; upgrade only if non-IDB environments need full version maps
    if (!Number.isNaN(watermarkMs) && !Number.isNaN(itemMs) && itemMs <= watermarkMs) {
      return false;
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
  let cachedCursors: SyncCursorState | null = null;
  let resetEpoch = 0;

  async function executeSync(): Promise<FirebaseSyncSummary> {
    const startEpoch = resetEpoch;
    const { state: cursors, compactOnly } = await readCursorStateAsync(cursorKey);

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

    const fallbackWatermarkIso = compactOnly
      ? pickMaxTimestamp(cursors.lastPulledAt, cursors.lastPushedAt ? [cursors.lastPushedAt] : [])
      : null;
    const remoteHadCategories =
      remoteCategories.length > 0 ||
      Object.keys(cursors.syncedCategories ?? {}).length > 0 ||
      fallbackWatermarkIso !== null;

    // Push phase: send only items missing on remote or strictly newer than synced version
    let outgoingCategories = filterOutgoingItems(
      workingSnapshot.categories,
      nextSyncedCategories,
      pulledCategoryVersions,
      remoteHadCategories,
      fallbackWatermarkIso,
    );
    let outgoingTransactions = filterOutgoingItems(
      workingSnapshot.transactions,
      nextSyncedTransactions,
      pulledTransactionVersions,
      false,
      fallbackWatermarkIso,
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
    let pushCompleted = false;
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
      pushCompleted = true;
    } finally {
      if (startEpoch === resetEpoch) {
        const wasInitialPushToEmptyRemote =
          pushCompleted &&
          cursors.lastPulledAt === null &&
          remoteCategories.length === 0 &&
          remoteTransactions.length === 0 &&
          nextLastPushedAt !== null;
        const finalLastPulledAt = wasInitialPushToEmptyRemote ? nextLastPushedAt : newLastPulledAt;
        const nextCursorState: SyncCursorState = {
          lastPulledAt: finalLastPulledAt,
          lastPushedAt: nextLastPushedAt,
          syncedCategories: nextSyncedCategories,
          syncedTransactions: nextSyncedTransactions,
        };
        const compactLastPushedAt = pushCompleted ? nextLastPushedAt : cursors.lastPushedAt;
        cachedCursors = cloneCursorState(nextCursorState);
        await writeCursorStateAsync(cursorKey, nextCursorState, compactOnly, compactLastPushedAt);
      }
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
      return cachedCursors
        ? cloneCursorState(cachedCursors)
        : (readLocalStorageCursorState(cursorKey)?.state ?? emptyCursorState());
    },

    resetCursors(): void {
      resetEpoch += 1;
      cachedCursors = emptyCursorState();
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
