export const IDB_DB_NAME = 'budget-app-db';
export const IDB_VERSION = 2;
export const IDB_SNAPSHOTS_STORE = 'snapshots';
export const IDB_SYNC_CURSORS_STORE = 'sync_cursors';

export type BudgetIdbStoreName = typeof IDB_SNAPSHOTS_STORE | typeof IDB_SYNC_CURSORS_STORE;

export function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openBudgetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_SNAPSHOTS_STORE)) {
        db.createObjectStore(IDB_SNAPSHOTS_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_SYNC_CURSORS_STORE)) {
        db.createObjectStore(IDB_SYNC_CURSORS_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function withStore<T>(
  storeName: BudgetIdbStoreName,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openBudgetDb();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return await run(store, tx);
  } finally {
    db.close();
  }
}

export function readIdbValue<T>(storeName: BudgetIdbStoreName, key: string): Promise<T | null> {
  return withStore(storeName, 'readonly', (store, tx) => {
    return new Promise<T | null>((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error(`Failed to read from IndexedDB (${storeName})`));
      tx.onabort = () => reject(tx.error ?? new Error(`IndexedDB read aborted (${storeName})`));
      tx.onerror = () => reject(tx.error ?? new Error(`IndexedDB read failed (${storeName})`));
    });
  });
}

export function writeIdbValue(storeName: BudgetIdbStoreName, key: string, value: unknown): Promise<void> {
  return withStore(storeName, 'readwrite', (store, tx) => {
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error(`IndexedDB write aborted (${storeName})`));
      tx.onerror = () => reject(tx.error ?? new Error(`Failed to write to IndexedDB (${storeName})`));
      store.put(value, key);
    });
  });
}

export function deleteIdbValue(storeName: BudgetIdbStoreName, key: string): Promise<void> {
  return withStore(storeName, 'readwrite', (store, tx) => {
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error(`IndexedDB delete aborted (${storeName})`));
      tx.onerror = () => reject(tx.error ?? new Error(`Failed to delete from IndexedDB (${storeName})`));
      store.delete(key);
    });
  });
}
