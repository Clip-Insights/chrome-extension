import { API_URL } from './env';

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

async function postJson<T>(path: string, body: unknown, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });
  return response.json() as Promise<T>;
}

export async function fetchTokenLimit(): Promise<TokenLimit> {
  const response = await fetch(`${API_URL}/api/textutils/tokenlimit/`);
  return response.json() as Promise<TokenLimit>;
}

export function login(email: string, password: string): Promise<{ ok: boolean; data: LoginResponse }> {
  return fetch(`${API_URL}/api/account/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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

export function fetchSummary(contentUrl: string, transcription: string): Promise<SummaryResponse> {
  return postJson<SummaryResponse>('/api/textutils/summary/', {
    youtube_url: contentUrl,
    transcription,
  });
}

export async function uploadPdf(blob: Blob, fileName: string, accessToken: string): Promise<{ ok: boolean; error?: string }> {
  const formData = new FormData();
  formData.append('file', blob, fileName);
  const response = await fetch(`${API_URL}/api/userspace/files/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  if (response.ok) return { ok: true };
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: result.error ?? 'Unknown error' };
}

export interface ChatStreamHandlers {
  onToken: (token: string) => void;
  onError?: (message: string) => void;
}

/**
 * Stream an AI chat response. The backend emits SSE-style `data: <token>` lines,
 * terminated by `[DONE]`; `Error:`-prefixed payloads carry errors.
 * Resolves `true` when at least one token was received.
 */
export async function streamChat(request: ChatRequest, handlers: ChatStreamHandlers): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/textutils/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok || !response.body) throw new Error('Network response was not ok');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    for (const event of chunk.split('\n\n')) {
      if (!event.startsWith('data: ')) continue;
      const content = event.slice('data: '.length);

      if (content === '[DONE]') return true;
      if (content.startsWith('Error:')) {
        handlers.onError?.(content);
        continue;
      }
      handlers.onToken(content);
      received = true;
    }
  }

  return received;
}
