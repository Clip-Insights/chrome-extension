import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ONE_DAY_MS } from '@/core/time';
import {
  DailyLimit,
  decrementScreenshotCount,
  getScreenshotCount,
  incrementScreenshotCount,
  limitTone,
  resetScreenshotCount,
} from './limitService';

// The limit service persists to localStorage, which the `node` test environment
// doesn't provide; a tiny in-memory stub keeps the tests dependency-free.
function installLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

beforeEach(() => {
  installLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DailyLimit', () => {
  it('starts at the configured maximum', () => {
    const limit = new DailyLimit('k', 5);
    expect(limit.remaining()).toBe(5);
    expect(limit.isReached()).toBe(false);
  });

  it('decrements on consume and reports remaining', () => {
    const limit = new DailyLimit('k', 3);
    expect(limit.consume()).toBe(2);
    expect(limit.consume()).toBe(1);
    expect(limit.remaining()).toBe(1);
  });

  it('reports reached and never goes negative', () => {
    const limit = new DailyLimit('k', 2);
    limit.consume();
    limit.consume();
    limit.consume();
    expect(limit.isReached()).toBe(true);
    expect(limit.remaining()).toBe(0);
  });

  it('resets after the 24h rolling window', () => {
    const now = 1_000_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    const limit = new DailyLimit('k', 5);
    limit.consume();
    expect(limit.remaining()).toBe(4);

    nowSpy.mockReturnValue(now + ONE_DAY_MS + 1);
    expect(limit.remaining()).toBe(5);
  });

  it('keeps the count within the window', () => {
    const now = 2_000_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    const limit = new DailyLimit('k', 5);
    limit.consume();

    nowSpy.mockReturnValue(now + ONE_DAY_MS - 1);
    expect(limit.remaining()).toBe(4);
  });
});

describe('screenshot counters', () => {
  it('increments, decrements and resets per content id', () => {
    expect(getScreenshotCount('vid')).toBe(0);
    expect(incrementScreenshotCount('vid')).toBe(1);
    incrementScreenshotCount('vid');
    expect(getScreenshotCount('vid')).toBe(2);
    decrementScreenshotCount('vid');
    expect(getScreenshotCount('vid')).toBe(1);
    resetScreenshotCount('vid');
    expect(getScreenshotCount('vid')).toBe(0);
  });

  it('does not go below zero on decrement', () => {
    decrementScreenshotCount('vid');
    expect(getScreenshotCount('vid')).toBe(0);
  });

  it('tracks counts independently per content id', () => {
    incrementScreenshotCount('a');
    expect(getScreenshotCount('a')).toBe(1);
    expect(getScreenshotCount('b')).toBe(0);
  });
});

describe('limitTone', () => {
  it('is depleted at zero', () => {
    expect(limitTone(0)).toBe('depleted');
  });

  it('warns at or below the threshold', () => {
    expect(limitTone(2)).toBe('warning');
    expect(limitTone(1, 2)).toBe('warning');
  });

  it('is normal above the threshold', () => {
    expect(limitTone(5)).toBe('normal');
  });
});
