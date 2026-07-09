/** Message type: content script → background for Google OAuth (identity API). */
export const GOOGLE_LOGIN_MSG = 'ci:google-login' as const;

export interface GoogleLoginRequest {
  type: typeof GOOGLE_LOGIN_MSG;
  clientId: string;
}

export type GoogleLoginResponse =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/** Parse id_token from chrome.identity.launchWebAuthFlow redirect URL. */
export function parseIdTokenFromRedirectUrl(redirectUrl: string): string {
  const fragment = redirectUrl.includes('#')
    ? redirectUrl.split('#')[1]
    : redirectUrl.split('?')[1] ?? '';
  const token = new URLSearchParams(fragment).get('id_token');
  if (!token) {
    throw new Error('No id_token in Google redirect');
  }
  return token;
}

export function buildGoogleAuthUrl(clientId: string, redirectUri: string, nonce: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('nonce', nonce);
  return url.toString();
}

/**
 * Obtain a Google ID token via the background service worker.
 * chrome.identity is not available in content scripts — only via messaging.
 */
export async function getGoogleIdToken(clientId: string): Promise<string> {
  const response = (await chrome.runtime.sendMessage({
    type: GOOGLE_LOGIN_MSG,
    clientId,
  } satisfies GoogleLoginRequest)) as GoogleLoginResponse | undefined;

  if (chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError.message);
  }
  if (!response?.ok) {
    throw new Error(response?.error ?? 'Google sign-in failed');
  }
  return parseIdTokenFromRedirectUrl(response.redirectUrl);
}
