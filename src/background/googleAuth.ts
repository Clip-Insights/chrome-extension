import {
  buildGoogleAuthUrl,
  GOOGLE_LOGIN_MSG,
  type GoogleLoginRequest,
  type GoogleLoginResponse,
} from '@/core/auth/googleLogin';

/** Run Google OAuth via chrome.identity (background / SW only). */
export async function handleGoogleLoginMessage(
  message: GoogleLoginRequest,
): Promise<GoogleLoginResponse> {
  if (message.type !== GOOGLE_LOGIN_MSG || !message.clientId) {
    return { ok: false, error: 'Invalid Google login request' };
  }

  try {
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = buildGoogleAuthUrl(message.clientId, redirectUri, crypto.randomUUID());
    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });

    if (!redirectUrl) {
      return { ok: false, error: 'Google sign-in was cancelled' };
    }
    return { ok: true, redirectUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Google sign-in failed';
    return { ok: false, error: msg };
  }
}
