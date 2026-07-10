import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleGoogleLoginMessage } from './googleAuth';
import { GOOGLE_LOGIN_MSG } from '@/core/auth/googleLogin';

describe('handleGoogleLoginMessage', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      identity: {
        getRedirectURL: vi.fn(() => 'https://extid.chromiumapp.org/'),
        launchWebAuthFlow: vi.fn(),
      },
    });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001' as `${string}-${string}-${string}-${string}-${string}`,
    );
  });

  it('launches the Google auth flow and returns the redirect URL', async () => {
    const launch = chrome.identity.launchWebAuthFlow as unknown as ReturnType<typeof vi.fn>;
    launch.mockResolvedValue('https://extid.chromiumapp.org/#id_token=abc');

    const result = await handleGoogleLoginMessage({
      type: GOOGLE_LOGIN_MSG,
      clientId: 'client.apps.googleusercontent.com',
    });

    expect(result).toEqual({
      ok: true,
      redirectUrl: 'https://extid.chromiumapp.org/#id_token=abc',
    });
    expect(launch).toHaveBeenCalledWith({
      url: expect.stringContaining('accounts.google.com'),
      interactive: true,
    });
    const authUrl = new URL(launch.mock.calls[0][0].url as string);
    expect(authUrl.searchParams.get('client_id')).toBe('client.apps.googleusercontent.com');
    expect(authUrl.searchParams.get('nonce')).toBe('00000000-0000-4000-8000-000000000001');
    expect(authUrl.searchParams.get('redirect_uri')).toBe('https://extid.chromiumapp.org/');
  });

  it('returns cancelled when the flow yields no redirect', async () => {
    const launch = chrome.identity.launchWebAuthFlow as unknown as ReturnType<typeof vi.fn>;
    launch.mockResolvedValue(undefined);

    await expect(
      handleGoogleLoginMessage({ type: GOOGLE_LOGIN_MSG, clientId: 'c' }),
    ).resolves.toEqual({ ok: false, error: 'Google sign-in was cancelled' });
  });
});
