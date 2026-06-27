/**
 * Domain record shapes. Field names (`videoUrl`, `videoTimestamp`) are preserved
 * from v3 so existing users' IndexedDB data keeps working after the upgrade
 * (ARCHITECTURE.md A.5 / B.5). `videoUrl` holds the platform-neutral `contentId`.
 */

export interface NoteRecord {
  id?: number;
  text: string;
  videoTimestamp: number;
  videoUrl: string;
  createdAt: number;
}

export interface ScreenshotRecord {
  id?: number;
  /** JPEG data URL of the captured frame. */
  url: string;
  videoTimestamp: number;
  videoUrl: string;
  createdAt: number;
}

export interface SummaryRecord {
  id?: number;
  text: string;
  videoUrl: string;
  createdAt: number;
}

export interface KeypointsRecord {
  id?: number;
  /** Stored as a stringified list or array (normalized on read). */
  text: string;
  videoUrl: string;
  createdAt: number;
}

/** A note or screenshot, tagged for the chronological timeline view. */
export type TimelineItem =
  | { type: 'note'; data: NoteRecord }
  | { type: 'screenshot'; data: ScreenshotRecord };
