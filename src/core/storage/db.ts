/**
 * IndexedDB bootstrap. The database name, version, store names, key paths and
 * `byVideoUrl` index are intentionally identical to v3 so existing users' data
 * survives the migration (ARCHITECTURE.md A.5 / B.5).
 */

const DB_NAME = 'YouTubeNotesDatabase';
const DB_VERSION = 1;

export const STORE = {
  textNotes: 'textNotes',
  screenshots: 'screenshots',
  summaries: 'summaries',
  keypoints: 'keypoints',
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];

const ALL_STORES: StoreName[] = [STORE.textNotes, STORE.screenshots, STORE.summaries, STORE.keypoints];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const name of ALL_STORES) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
          store.createIndex('byVideoUrl', 'videoUrl', { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/** Promise wrapper around a single IDBRequest. */
export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Run `fn` within a transaction and resolve when the transaction completes. */
export async function withStore<T>(
  stores: StoreName | StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => T | Promise<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(stores, mode);
  const result = await fn(tx);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return result;
}
