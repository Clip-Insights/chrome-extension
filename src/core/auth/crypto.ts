import { TOKEN_SECRET } from '@/core/api/env';

/**
 * AES-GCM-256 encryption with a PBKDF2-derived key. Used to obfuscate JWTs in
 * localStorage. NOTE: the secret ships in the bundle, so this is obfuscation,
 * not real secrecy (ARCHITECTURE.md A.12).
 */

const SALT = 'unique-salt';
const IV_BYTES = 12;

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(TOKEN_SECRET),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode(SALT), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(data: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(data));

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedData: string): Promise<string> {
  const key = await deriveKey();
  const combined = Uint8Array.from(atob(encryptedData), (char) => char.charCodeAt(0));
  const iv = combined.slice(0, IV_BYTES);
  const encrypted = combined.slice(IV_BYTES);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}
