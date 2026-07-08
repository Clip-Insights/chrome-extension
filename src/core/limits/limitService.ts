import { fetchMyPlan, fetchPlans, type MyPlanResponse, type PlanLimits } from '@/core/api/client';
import { getValidAccessToken } from '@/core/auth/session';

/**
 * Plan-driven quota service. Limits are defined and enforced on the backend;
 * this module caches the caller's plan (guest plan when logged out) so the UI
 * can show remaining counts and gate client-only features (notes, screenshots)
 * with backend-managed values. Replaces the old localStorage daily counters.
 */

export interface PlanInfo {
  limits: PlanLimits;
  /** Live usage counters; null when logged out (guests have no AI usage). */
  usage: MyPlanResponse['usage'] | null;
  isGuest: boolean;
}

/** Used only when the backend is unreachable, mirroring the seeded guest plan. */
const OFFLINE_FALLBACK: PlanInfo = {
  limits: {
    slug: 'guest',
    name: 'Guest',
    description: '',
    monthly_price_usd: 0,
    daily_summaries: 0,
    daily_chat_messages: 0,
    daily_transcriptions: 0,
    max_chat_query_chars: 0,
    transcript_token_budget: 0,
    max_transcription_seconds: 0,
    storage_limit_mb: 0,
    max_file_size_mb: 0,
    max_note_chars: 500,
    max_notes_per_video: 10,
    max_screenshots_per_video: 10,
  },
  usage: null,
  isGuest: true,
};

const PLAN_CACHE_TTL_MS = 60_000;

let cached: { info: PlanInfo; fetchedAt: number } | null = null;
let inflight: Promise<PlanInfo> | null = null;

async function loadPlanInfo(): Promise<PlanInfo> {
  const token = await getValidAccessToken();
  if (token) {
    const { plan, usage } = await fetchMyPlan(token);
    return { limits: plan, usage, isGuest: false };
  }
  const plans = await fetchPlans();
  const guest = plans.find((p) => p.slug === 'guest');
  if (!guest) throw new Error('Guest plan missing from catalogue');
  return { limits: guest, usage: null, isGuest: true };
}

/** The caller's plan limits and usage, cached briefly to keep the UI snappy. */
export async function getPlanInfo(): Promise<PlanInfo> {
  if (cached && Date.now() - cached.fetchedAt < PLAN_CACHE_TTL_MS) return cached.info;
  inflight ??= loadPlanInfo()
    .then((info) => {
      cached = { info, fetchedAt: Date.now() };
      return info;
    })
    .catch(() => cached?.info ?? OFFLINE_FALLBACK)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drop the cache (after consuming a quota, logging in/out, or a 401/429). */
export function invalidatePlanInfo(): void {
  cached = null;
}

// --- Per-content screenshot cap (client-side feature; value comes from the plan) ---

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
