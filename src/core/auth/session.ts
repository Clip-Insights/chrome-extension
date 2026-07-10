import { login as apiLogin, googleLogin as apiGoogleLogin, refreshAccessToken, registerTokenRefresher } from '@/core/api/client';
import { getGoogleIdToken } from '@/core/auth/googleLogin';
import { GOOGLE_EXTENSION_CLIENT_ID } from '@/core/api/env';
import { clearTokens, getToken, storeToken } from './tokenStore';

export type AuthStatus = 'logged-in' | 'logged-out';

export interface LoginResult {
  ok: boolean;
  message: string;
}

// Treat tokens as expired slightly early so a token that would lapse mid-flight
// is refreshed before the request, not after a 401. Matters with 5-min tokens.
const EXPIRY_BUFFER_MS = 30_000;

/** Decode a JWT's `exp` claim and report whether it has (nearly) passed. */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Date.now() >= payload.exp * 1000 - EXPIRY_BUFFER_MS;
  } catch {
    return true;
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const { ok, data } = await apiLogin(email, password);
    if (!ok) return { ok: false, message: data.msg ?? 'Login failed. Please check your credentials.' };
    await storeToken('access', data.token.access);
    await storeToken('refresh', data.token.refresh);
    return { ok: true, message: 'Login successful' };
  } catch {
    return { ok: false, message: 'An error occurred while logging in. Please try again.' };
  }
}

export async function googleLogin(): Promise<LoginResult> {
  if (!GOOGLE_EXTENSION_CLIENT_ID) {
    return { ok: false, message: 'Google sign-in is not configured for this build.' };
  }
  try {
    const idToken = await getGoogleIdToken(GOOGLE_EXTENSION_CLIENT_ID);
    const { ok, data } = await apiGoogleLogin(idToken);
    if (!ok) {
      const err = (data as { error?: string }).error;
      return { ok: false, message: err ?? 'Google login failed.' };
    }
    await storeToken('access', data.token.access);
    await storeToken('refresh', data.token.refresh);
    return { ok: true, message: 'Login successful' };
  } catch (err) {
    const msg = err instanceof Error ? err.message.trim() : '';
    return { ok: false, message: msg || 'Google sign-in failed. Please try again.' };
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = await getToken('refresh');
  if (!refresh) return false;
  const access = await refreshAccessToken(refresh);
  if (!access) return false;
  await storeToken('access', access);
  return true;
}

/** Current auth status, refreshing the access token when possible. */
export async function checkAuthStatus(): Promise<AuthStatus> {
  const access = await getToken('access');
  const refresh = await getToken('refresh');
  if (!access || !refresh) return 'logged-out';

  if (isTokenExpired(refresh)) {
    logout();
    return 'logged-out';
  }
  if (isTokenExpired(access)) {
    return (await tryRefresh()) ? 'logged-in' : 'logged-out';
  }
  return 'logged-in';
}

/** Returns a valid access token (refreshing if needed), or null. */
export async function getValidAccessToken(): Promise<string | null> {
  if ((await checkAuthStatus()) !== 'logged-in') return null;
  return getToken('access');
}

export function logout(): void {
  clearTokens();
}

// Let the API client recover from a 401 mid-session (token revoked or expired
// despite the proactive check) by refreshing once and retrying the request.
registerTokenRefresher(async () => ((await tryRefresh()) ? getToken('access') : null));
