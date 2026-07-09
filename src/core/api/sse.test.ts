import { describe, expect, it } from 'vitest';
import { decodeSseToken, splitSseEvents } from './sse';

describe('splitSseEvents', () => {
  it('returns complete events and keeps the partial tail', () => {
    const { events, rest } = splitSseEvents('data: "a"\n\ndata: "b"\n\ndata: "c');
    expect(events).toEqual(['data: "a"', 'data: "b"']);
    expect(rest).toBe('data: "c');
  });

  it('handles a buffer with no complete event', () => {
    const { events, rest } = splitSseEvents('data: par');
    expect(events).toEqual([]);
    expect(rest).toBe('data: par');
  });

  it('returns empty rest when the buffer ends on an event boundary', () => {
    const { events, rest } = splitSseEvents('data: [DONE]\n\n');
    expect(events).toEqual(['data: [DONE]']);
    expect(rest).toBe('');
  });
});

describe('decodeSseToken', () => {
  it('decodes JSON-encoded tokens, preserving newlines', () => {
    expect(decodeSseToken('"line1\\n\\nline2"')).toBe('line1\n\nline2');
  });

  it('passes plain payloads through unchanged (older backend)', () => {
    expect(decodeSseToken('Hello world')).toBe('Hello world');
  });

  it('passes malformed JSON-looking payloads through unchanged', () => {
    expect(decodeSseToken('"unterminated')).toBe('"unterminated');
  });
});
