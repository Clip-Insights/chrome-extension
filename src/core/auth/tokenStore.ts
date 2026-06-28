import { decrypt, encrypt } from './crypto';

export type TokenName = 'access' | 'refresh';

/** Persist an encrypted token under the given key. */
export async function storeToken(name: TokenName, token: string): Promise<void> {
  localStorage.setItem(name, await encrypt(token));
}

/** Read and decrypt a token, or null if absent/undecryptable. */
export async function getToken(name: TokenName): Promise<string | null> {
  const encrypted = localStorage.getItem(name);
  if (!encrypted) return null;
  try {
    return await decrypt(encrypted);
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}
