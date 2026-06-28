import { ONE_DAY_MS } from '@/core/time';

/**
 * Unified quota service. Replaces v3's four overlapping limit systems with one
 * (ARCHITECTURE.md A.11 / B.5), preserving the same numbers and 24h windows.
 * The non-functional `clipinsights_daily_limit` system from v3 is dropped.
 */

interface DailyState {
  count: number;
  timestamp: number;
}

/** A daily quota backed by localStorage with a rolling 24h reset. */
export class DailyLimit {
  constructor(
    private readonly key: string,
    readonly max: number,
  ) {}

  private read(): DailyState {
    const raw = localStorage.getItem(this.key);
    const now = Date.now();
    if (raw) {
      const state = JSON.parse(raw) as DailyState;
      if (now - state.timestamp <= ONE_DAY_MS) return state;
    }
    return { count: 0, timestamp: now };
  }

  private write(state: DailyState): void {
    localStorage.setItem(this.key, JSON.stringify(state));
  }

  remaining(): number {
    return Math.max(0, this.max - this.read().count);
  }

  isReached(): boolean {
    return this.read().count >= this.max;
  }

  /** Record one use; returns the remaining count afterwards. */
  consume(): number {
    const state = this.read();
    state.count += 1;
    this.write(state);
    return Math.max(0, this.max - state.count);
  }
}

/** Shared by Summary and Key Points (one backend call serves both). */
export const summaryLimit = new DailyLimit('yt-player-bandwidth-performance', 5);
export const chatLimit = new DailyLimit('yt-chat-limit', 10);

// --- Per-content screenshot cap -----------------------------------------

export const SCREENSHOT_LIMIT_PER_CONTENT = 40;

const screenshotKey = (contentId: string) => `${contentId}_screenshotCount`;

export function getScreenshotCount(contentId: string): number {
  return parseInt(localStorage.getItem(screenshotKey(contentId)) ?? '0', 10) || 0;
}

export function incrementScreenshotCount(contentId: string): number {
  const next = getScreenshotCount(contentId) + 1;
  localStorage.setItem(screenshotKey(contentId), String(next));
  return next;
}

export function decrementScreenshotCount(contentId: string): void {
  const current = getScreenshotCount(contentId);
  if (current > 0) localStorage.setItem(screenshotKey(contentId), String(current - 1));
}

export function resetScreenshotCount(contentId: string): void {
  localStorage.removeItem(screenshotKey(contentId));
}

export type LimitTone = 'normal' | 'warning' | 'depleted';

/** Badge colour tone given remaining count (warning threshold defaults to 2). */
export function limitTone(remaining: number, warnAt = 2): LimitTone {
  if (remaining <= 0) return 'depleted';
  if (remaining <= warnAt) return 'warning';
  return 'normal';
}
