import { describe, expect, it } from 'vitest';
import type { TranscriptSegment } from '@/core/platform/types';
import { sliceByTokenBudget } from './slicer';

const segments: TranscriptSegment[] = [
  { start: 0, duration: 2, text: 'aaaa' }, // 4 chars
  { start: 2, duration: 2, text: 'bbbb' }, // 4 chars
  { start: 4, duration: 2, text: 'cccc' }, // 4 chars
];

describe('sliceByTokenBudget', () => {
  it('returns the whole transcript when it fits (lastTagTime = -1)', () => {
    const result = sliceByTokenBudget(segments, { tokens: 100, charPerToken: 1 });
    expect(result.transcript).toBe('aaaa bbbb cccc');
    expect(result.lastTagTime).toBe(-1);
  });

  it('cuts at the token budget and reports the cut time', () => {
    // charPerToken 1 => each 4-char segment costs 4 tokens; budget 8 fits two.
    const result = sliceByTokenBudget(segments, { tokens: 8, charPerToken: 1 });
    expect(result.transcript).toBe('aaaa bbbb');
    expect(result.lastTagTime).toBe(4); // start(2) + duration(2) of second segment
  });

  it('handles an empty transcript', () => {
    const result = sliceByTokenBudget([], { tokens: 10, charPerToken: 1 });
    expect(result.transcript).toBe('');
    expect(result.lastTagTime).toBe(-1);
  });
});
