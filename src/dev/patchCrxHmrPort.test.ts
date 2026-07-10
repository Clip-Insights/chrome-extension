import { describe, expect, it } from 'vitest';
import { patchCrxHmrPortSource } from './patchCrxHmrPort';

const UNGUARDED_SEND = `send = (data) => {
    if (this.port)
      this.port.postMessage({ data });
    else
      throw new Error("HMRPort is not initialized");
  };`;

describe('patchCrxHmrPortSource', () => {
  it('wraps unguarded HMRPort.send postMessage in the same try/catch as ping', () => {
    const patched = patchCrxHmrPortSource(UNGUARDED_SEND);

    expect(patched).toContain('try {');
    expect(patched).toContain('this.port.postMessage({ data })');
    expect(patched).toContain('Extension context invalidated.');
    expect(patched).toContain('location.reload()');
    expect(patched).not.toMatch(
      /if \(this\.port\)\s*\n\s*this\.port\.postMessage\(\{ data \}\);/,
    );
  });

  it('is a no-op when send is already guarded or absent', () => {
    const already = `send = (data) => {
    if (this.port)
      try {
        this.port.postMessage({ data });
      } catch (error) {
        if (error instanceof Error && error.message.includes("Extension context invalidated.")) {
          location.reload();
        } else
          throw error;
      }
    else
      throw new Error("HMRPort is not initialized");
  };`;
    expect(patchCrxHmrPortSource(already)).toBe(already);
    expect(patchCrxHmrPortSource('export const x = 1')).toBe('export const x = 1');
  });
});
