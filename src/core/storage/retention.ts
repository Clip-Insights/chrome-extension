import { promisifyRequest, STORE, type StoreName, withStore } from './db';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export type RetentionCounts = Record<StoreName, number>;

/**
 * Delete records older than `thresholdMs` across all stores (default 5 days).
 * Returns how many records were removed per store. Runs on each panel mount
 * (ARCHITECTURE.md A.11).
 */
export async function purgeOldRecords(
  thresholdMs: number = FIVE_DAYS_MS,
  now: number = Date.now(),
): Promise<RetentionCounts> {
  const stores: StoreName[] = [STORE.textNotes, STORE.screenshots, STORE.summaries, STORE.keypoints];
  const deleted: RetentionCounts = { textNotes: 0, screenshots: 0, summaries: 0, keypoints: 0 };

  await withStore(stores, 'readwrite', async (tx) => {
    for (const name of stores) {
      const store = tx.objectStore(name);
      const rows = await promisifyRequest(store.getAll() as IDBRequest<Array<{ id?: number; createdAt: number }>>);
      for (const row of rows) {
        if (row.id !== undefined && now - row.createdAt > thresholdMs) {
          store.delete(row.id);
          deleted[name] += 1;
        }
      }
    }
  });

  return deleted;
}
