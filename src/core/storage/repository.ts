import type {
  KeypointsRecord,
  NoteRecord,
  ScreenshotRecord,
  SummaryRecord,
  TimelineItem,
} from '@/core/types';
import { promisifyRequest, STORE, withStore } from './db';

/**
 * Typed persistence API for notes, screenshots, summaries and key points.
 * `contentId` is the platform-neutral key (stored in the legacy `videoUrl` field).
 */

function getAllByContent<T>(store: IDBObjectStore, contentId: string): Promise<T[]> {
  return promisifyRequest(store.index('byVideoUrl').getAll(contentId) as IDBRequest<T[]>);
}

// --- Notes ---------------------------------------------------------------

export function saveNote(text: string, videoTimestamp: number, contentId: string): Promise<NoteRecord> {
  const entry: NoteRecord = { text, videoTimestamp: Number(videoTimestamp), videoUrl: contentId, createdAt: Date.now() };
  return withStore(STORE.textNotes, 'readwrite', async (tx) => {
    const id = await promisifyRequest(tx.objectStore(STORE.textNotes).add(entry) as IDBRequest<number>);
    return { ...entry, id };
  });
}

export function getNotes(contentId: string): Promise<NoteRecord[]> {
  return withStore(STORE.textNotes, 'readonly', (tx) => getAllByContent<NoteRecord>(tx.objectStore(STORE.textNotes), contentId));
}

export function deleteNote(id: number): Promise<void> {
  return withStore(STORE.textNotes, 'readwrite', (tx) => {
    tx.objectStore(STORE.textNotes).delete(id);
  });
}

export function updateNote(id: number, patch: Partial<NoteRecord>): Promise<void> {
  return withStore(STORE.textNotes, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE.textNotes);
    const existing = await promisifyRequest(store.get(id) as IDBRequest<NoteRecord | undefined>);
    if (!existing) throw new Error(`Note ${id} not found`);
    store.put({ ...existing, ...patch });
  });
}

// --- Screenshots ---------------------------------------------------------

export function saveScreenshot(dataUrl: string, videoTimestamp: number, contentId: string): Promise<ScreenshotRecord> {
  const entry: ScreenshotRecord = { url: dataUrl, videoTimestamp: Number(videoTimestamp), videoUrl: contentId, createdAt: Date.now() };
  return withStore(STORE.screenshots, 'readwrite', async (tx) => {
    const id = await promisifyRequest(tx.objectStore(STORE.screenshots).add(entry) as IDBRequest<number>);
    return { ...entry, id };
  });
}

export function getScreenshots(contentId: string): Promise<ScreenshotRecord[]> {
  return withStore(STORE.screenshots, 'readonly', (tx) => getAllByContent<ScreenshotRecord>(tx.objectStore(STORE.screenshots), contentId));
}

export function deleteScreenshotById(id: number): Promise<void> {
  return withStore(STORE.screenshots, 'readwrite', (tx) => {
    tx.objectStore(STORE.screenshots).delete(id);
  });
}

// --- Summary / Key points ------------------------------------------------

export function saveSummary(text: string, contentId: string): Promise<void> {
  return withStore(STORE.summaries, 'readwrite', (tx) => {
    tx.objectStore(STORE.summaries).add({ text, videoUrl: contentId, createdAt: Date.now() });
  });
}

export async function getSummary(contentId: string): Promise<SummaryRecord | null> {
  const rows = await withStore(STORE.summaries, 'readonly', (tx) =>
    getAllByContent<SummaryRecord>(tx.objectStore(STORE.summaries), contentId),
  );
  return rows[0] ?? null;
}

export function saveKeypoints(text: string, contentId: string): Promise<void> {
  return withStore(STORE.keypoints, 'readwrite', (tx) => {
    tx.objectStore(STORE.keypoints).add({ text, videoUrl: contentId, createdAt: Date.now() });
  });
}

export async function getKeypoints(contentId: string): Promise<KeypointsRecord | null> {
  const rows = await withStore(STORE.keypoints, 'readonly', (tx) =>
    getAllByContent<KeypointsRecord>(tx.objectStore(STORE.keypoints), contentId),
  );
  return rows[0] ?? null;
}

/** Delete the cached summary and key points for a content item (regenerate/clear). */
export function deleteInsights(contentId: string): Promise<void> {
  const stores = [STORE.summaries, STORE.keypoints];
  return withStore(stores, 'readwrite', async (tx) => {
    for (const name of stores) {
      const store = tx.objectStore(name);
      const items = await promisifyRequest(
        store.index('byVideoUrl').getAll(contentId) as IDBRequest<Array<{ id?: number }>>,
      );
      for (const item of items) if (item.id !== undefined) store.delete(item.id);
    }
  });
}

// --- Aggregate views -----------------------------------------------------

/** Merged notes + screenshots for a content item, sorted by timestamp. */
export async function getTimeline(contentId: string): Promise<TimelineItem[]> {
  const [notes, screenshots] = await Promise.all([getNotes(contentId), getScreenshots(contentId)]);
  const items: TimelineItem[] = [
    ...notes.map((data): TimelineItem => ({ type: 'note', data })),
    ...screenshots.map((data): TimelineItem => ({ type: 'screenshot', data })),
  ];
  return items.sort((a, b) => a.data.videoTimestamp - b.data.videoTimestamp);
}

/** Delete every record (notes, screenshots, summary, key points) for a content item. */
export function deleteAllForContent(contentId: string): Promise<void> {
  const stores = [STORE.textNotes, STORE.screenshots, STORE.summaries, STORE.keypoints];
  return withStore(stores, 'readwrite', async (tx) => {
    for (const name of stores) {
      const store = tx.objectStore(name);
      const items = await promisifyRequest(
        store.index('byVideoUrl').getAll(contentId) as IDBRequest<Array<{ id?: number }>>,
      );
      for (const item of items) if (item.id !== undefined) store.delete(item.id);
    }
  });
}
