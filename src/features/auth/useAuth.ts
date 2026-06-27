import { useCallback, useEffect, useState } from 'react';
import { type AuthStatus, checkAuthStatus, login as sessionLogin, logout as sessionLogout, type LoginResult } from '@/core/auth/session';

export interface UseAuth {
  status: AuthStatus | 'unknown';
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus | 'unknown'>('unknown');

  const refresh = useCallback(async () => {
    setStatus(await checkAuthStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await sessionLogin(email, password);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const logout = useCallback(() => {
    sessionLogout();
    setStatus('logged-out');
  }, []);

  return { status, login, logout, refresh };
}
