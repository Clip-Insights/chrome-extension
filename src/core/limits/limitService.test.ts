import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyPlanResponse, PlanLimits } from '@/core/api/client';

vi.mock('@/core/api/client', () => ({
  fetchMyPlan: vi.fn(),
  fetchPlans: vi.fn(),
}));
vi.mock('@/core/auth/session', () => ({
  getValidAccessToken: vi.fn(),
}));

import { fetchMyPlan, fetchPlans } from '@/core/api/client';
import { getValidAccessToken } from '@/core/auth/session';
import {
  decrementScreenshotCount,
  getPlanInfo,
  getScreenshotCount,
  incrementScreenshotCount,
  invalidatePlanInfo,
  limitTone,
  resetScreenshotCount,
} from './limitService';

function makePlan(overrides: Partial<PlanLimits> = {}): PlanLimits {
  return {
    slug: 'free',
    name: 'Free',
    description: '',
    monthly_price_usd: 0,
    daily_summaries: 5,
    daily_chat_messages: 15,
    daily_transcriptions: 2,
    max_chat_query_chars: 1000,
    transcript_token_budget: 8000,
    max_transcription_seconds: 300,
    storage_limit_mb: 100,
    max_file_size_mb: 10,
    max_note_chars: 1000,
    max_notes_per_video: 100,
    max_screenshots_per_video: 40,
    ...overrides,
  };
}

function makeMyPlan(): MyPlanResponse {
  return {
    plan: makePlan(),
    usage: {
      summary: { used: 1, limit: 5, remaining: 4 },
      chat: { used: 0, limit: 15, remaining: 15 },
      transcription: { used: 0, limit: 2, remaining: 2 },
    },
  };
}

// The plan service persists nothing itself, but screenshot counters use
// localStorage, which the `node` test environment doesn't provide.
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
  invalidatePlanInfo();
  vi.mocked(getValidAccessToken).mockReset();
  vi.mocked(fetchMyPlan).mockReset();
  vi.mocked(fetchPlans).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPlanInfo', () => {
  it('returns the user plan with usage when logged in', async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue('token');
    vi.mocked(fetchMyPlan).mockResolvedValue(makeMyPlan());

    const info = await getPlanInfo();

    expect(info.isGuest).toBe(false);
    expect(info.limits.slug).toBe('free');
    expect(info.usage?.summary.remaining).toBe(4);
  });

  it('returns the guest plan without usage when logged out', async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue(null);
    vi.mocked(fetchPlans).mockResolvedValue([
      makePlan({ slug: 'guest', daily_summaries: 0, max_note_chars: 500 }),
      makePlan(),
    ]);

    const info = await getPlanInfo();

    expect(info.isGuest).toBe(true);
    expect(info.usage).toBeNull();
    expect(info.limits.max_note_chars).toBe(500);
  });

  it('caches the result until invalidated', async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue('token');
    vi.mocked(fetchMyPlan).mockResolvedValue(makeMyPlan());

    await getPlanInfo();
    await getPlanInfo();
    expect(fetchMyPlan).toHaveBeenCalledTimes(1);

    invalidatePlanInfo();
    await getPlanInfo();
    expect(fetchMyPlan).toHaveBeenCalledTimes(2);
  });

  it('falls back to guest defaults when the backend is unreachable', async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue(null);
    vi.mocked(fetchPlans).mockRejectedValue(new Error('offline'));

    const info = await getPlanInfo();

    expect(info.isGuest).toBe(true);
    expect(info.limits.max_note_chars).toBe(500);
    expect(info.limits.daily_summaries).toBe(0);
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
