import { formatResetTime } from '@/core/time';
import { API_URL } from './env';
import { decodeSseToken, splitSseEvents } from './sse';

/** Token budget used to slice long transcripts before sending to the AI. */
export interface TokenLimit {
  tokens: number;
  charPerToken: number;
}

export interface LoginResponse {
  token: { access: string; refresh: string };
  msg?: string;
}

export interface SummaryResponse {
  success: boolean;
  summary?: string;
  keypoints?: string | string[];
  message?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  youtube_url: string;
  query: string;
  transcription: string;
  stream: boolean;
  chat_memory_enabled: boolean;
  chat_history: ChatMessage[];
}

/** Plan limits as served by the backend (`GET /api/plans/` and `/api/plans/me/`). */
export interface PlanLimits {
  slug: string;
  name: string;
  description: string;
  monthly_price_usd: number;
  daily_summaries: number;
  daily_chat_messages: number;
  max_chat_query_chars: number;
  transcript_token_budget: number;
  storage_limit_mb: number;
  max_file_size_mb: number;
  max_note_chars: number;
  max_notes_per_video: number;
  max_screenshots_per_video: number;
}

export interface UsageCounter {
  used: number;
  limit: number;
  remaining: number;
  /** UTC ISO time when `used` next decreases (rolling 24h window); null while unused. */
  resets_at: string | null;
}

export interface MyPlanResponse {
  plan: PlanLimits;
  usage: {
    summary: UsageCounter;
    chat: UsageCounter;
  };
}

/** The request needs a logged-in user (backend returned 401). */
export class ApiAuthError extends Error {
  constructor() {
    super('You need an account to use this feature.');
    this.name = 'ApiAuthError';
  }
}

/** A plan limit was hit (backend returned a structured 429). */
export class ApiLimitError extends Error {
  constructor(
    message: string,
    readonly reason: string,
    readonly cta: string,
    /** When the rolling window returns an allowance; null when waiting doesn't help. */
    readonly resetsAt: Date | null = null,
  ) {
    super(message);
    this.name = 'ApiLimitError';
  }
}

function authHeaders(accessToken?: string | null): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

type TokenRefresher = () => Promise<string | null>;
let tokenRefresher: TokenRefresher | null = null;

/**
 * Auth layer hook (set by core/auth/session): how to obtain a fresh access
 * token after a 401. Registered as a callback to keep this module free of an
 * import cycle with the session module.
 */
export function registerTokenRefresher(refresher: TokenRefresher): void {
  tokenRefresher = refresher;
}

/**
 * Authenticated fetch with the standard 401 recovery: if the access token is
 * rejected (expired mid-flight, revoked), refresh once and retry the request.
 */
async function fetchWithAuth(url: string, init: RequestInit, accessToken: string): Promise<Response> {
  const request = (token: string) =>
    fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), ...authHeaders(token) },
    });

  let response = await request(accessToken);
  if (response.status === 401 && tokenRefresher) {
    const freshToken = await tokenRefresher();
    if (freshToken) response = await request(freshToken);
  }
  return response;
}

/** Convert 401/429 responses into typed errors; return the response otherwise. */
async function throwForLimitErrors(response: Response): Promise<Response> {
  if (response.status === 401) throw new ApiAuthError();
  if (response.status === 429) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      reason?: string;
      cta?: string;
      resets_at?: string | null;
    };
    const parsed = body.resets_at ? new Date(body.resets_at) : null;
    const resetsAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    let message = body.message ?? 'You have reached your plan limit. Please try again later.';
    // The backend sends UTC; the phrase renders in the viewer's timezone.
    if (resetsAt) message += ` Your limit resets ${formatResetTime(resetsAt)}.`;
    throw new ApiLimitError(message, body.reason ?? 'limit_exceeded', body.cta ?? 'upgrade', resetsAt);
  }
  return response;
}

export async function fetchTokenLimit(accessToken?: string | null): Promise<TokenLimit> {
  const response = await fetch(`${API_URL}/api/textutils/tokenlimit/`, {
    headers: authHeaders(accessToken),
  });
  return response.json() as Promise<TokenLimit>;
}

/** Public plan catalogue; used to read the guest plan's limits when logged out. */
export async function fetchPlans(): Promise<PlanLimits[]> {
  const response = await fetch(`${API_URL}/api/plans/`);
  if (!response.ok) throw new Error('Failed to load plans');
  const data = (await response.json()) as { plans: PlanLimits[] };
  return data.plans;
}

/** The logged-in user's plan and live usage counters. */
export async function fetchMyPlan(accessToken: string): Promise<MyPlanResponse> {
  const response = await throwForLimitErrors(
    await fetchWithAuth(`${API_URL}/api/plans/me/`, {}, accessToken),
  );
  if (!response.ok) throw new Error('Failed to load plan');
  return response.json() as Promise<MyPlanResponse>;
}

export function login(email: string, password: string): Promise<{ ok: boolean; data: LoginResponse }> {
  return fetch(`${API_URL}/api/account/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  }).then(async (r) => ({ ok: r.ok, data: (await r.json()) as LoginResponse }));
}

export function googleLogin(idToken: string): Promise<{ ok: boolean; data: LoginResponse }> {
  return fetch(`${API_URL}/api/account/google-login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: idToken }),
    credentials: 'include',
  }).then(async (r) => ({ ok: r.ok, data: (await r.json()) as LoginResponse }));
}

export async function refreshAccessToken(refresh: string): Promise<string | null> {
  const response = await fetch(`${API_URL}/api/account/refresh-token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { access: string };
  return data.access;
}

export async function fetchSummary(
  contentUrl: string,
  transcription: string,
  accessToken: string,
): Promise<SummaryResponse> {
  const response = await throwForLimitErrors(
    await fetchWithAuth(
      `${API_URL}/api/textutils/summary/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: contentUrl, transcription }),
      },
      accessToken,
    ),
  );
  return response.json() as Promise<SummaryResponse>;
}

export async function uploadPdf(blob: Blob, fileName: string, accessToken: string): Promise<{ ok: boolean; error?: string }> {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  const response = await fetchWithAuth(
    `${API_URL}/api/userspace/files/`,
    { method: 'POST', body: formData },
    accessToken,
  );
  if (response.ok) return { ok: true };
  const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return { ok: false, error: result.message ?? result.error ?? 'Unknown error' };
}

export interface ChatStreamHandlers {
  onToken: (token: string) => void;
  onError?: (message: string) => void;
}

/**
 * Stream an AI chat response. The backend emits SSE-style `data: <token>` lines,
 * terminated by `[DONE]`; `Error:`-prefixed payloads carry errors.
 * Resolves `true` when at least one token was received.
 * Throws ApiAuthError / ApiLimitError for 401 / 429 before the stream starts.
 */
export async function streamChat(
  request: ChatRequest,
  handlers: ChatStreamHandlers,
  accessToken: string,
): Promise<boolean> {
  const response = await throwForLimitErrors(
    await fetchWithAuth(
      `${API_URL}/api/textutils/chat/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
      accessToken,
    ),
  );
  if (!response.ok || !response.body) throw new Error('Network response was not ok');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = false;
  // Events can straddle network reads, so buffer until a full `\n\n` boundary.
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = splitSseEvents(buffer);
    buffer = rest;

    for (const event of events) {
      if (!event.startsWith('data: ')) continue;
      const content = event.slice('data: '.length);

      if (content === '[DONE]') return true;
      if (content.startsWith('Error:')) {
        handlers.onError?.(content);
        continue;
      }
      handlers.onToken(decodeSseToken(content));
      received = true;
    }
  }

  return received;
}
