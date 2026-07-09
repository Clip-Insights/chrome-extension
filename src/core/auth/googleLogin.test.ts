import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildGoogleAuthUrl,
  parseIdTokenFromRedirectUrl,
  getGoogleIdToken,
  GOOGLE_LOGIN_MSG,
} from './googleLogin';

describe('parseIdTokenFromRedirectUrl', () => {
  it('reads id_token from URL hash', () => {
    const url = 'https://abc.chromiumapp.org/#id_token=eyJ.test&authuser=0';
    expect(parseIdTokenFromRedirectUrl(url)).toBe('eyJ.test');
  });

  it('reads id_token from query string', () => {
    const url = 'https://abc.chromiumapp.org/?id_token=eyJ.query';
    expect(parseIdTokenFromRedirectUrl(url)).toBe('eyJ.query');
  });

  it('throws when id_token is missing', () => {
    expect(() => parseIdTokenFromRedirectUrl('https://abc.chromiumapp.org/#state=x')).toThrow(
      'No id_token in Google redirect',
    );
  });
});

describe('buildGoogleAuthUrl', () => {
  it('builds an OpenID id_token request with nonce', () => {
    const url = new URL(
      buildGoogleAuthUrl('client.apps.googleusercontent.com', 'https://ext.chromiumapp.org/', 'n-1'),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client.apps.googleusercontent.com');
    expect(url.searchParams.get('response_type')).toBe('id_token');
    expect(url.searchParams.get('redirect_uri')).toBe('https://ext.chromiumapp.org/');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('nonce')).toBe('n-1');
  });
});

describe('getGoogleIdToken', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn(),
        lastError: undefined as chrome.runtime.LastError | undefined,
      },
    });
  });

  it('asks the background worker for an id_token (identity is not available in content scripts)', async () => {
    const sendMessage = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>;
    sendMessage.mockResolvedValue({
      ok: true,
      redirectUrl: 'https://abc.chromiumapp.org/#id_token=eyJ.from.sw',
    });

    await expect(getGoogleIdToken('client-id')).resolves.toBe('eyJ.from.sw');
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: GOOGLE_LOGIN_MSG, clientId: 'client-id' }),
    );
  });

  it('surfaces background errors', async () => {
    const sendMessage = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>;
    sendMessage.mockResolvedValue({ ok: false, error: 'User cancelled' });

    await expect(getGoogleIdToken('client-id')).rejects.toThrow('User cancelled');
  });
});
