import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAdapter, TranscriptResult, VideoContext } from '@/core/platform/types';
import { clearTranscriptCache, getTranscript } from './transcriptCache';

const ctx: VideoContext = {
  contentId: 'https://www.youtube.com/watch?v=abc',
  contentUrl: 'https://www.youtube.com/watch?v=abc',
};

const ok: TranscriptResult = { success: true, data: [{ start: 0, duration: 1, text: 'hi' }], error: null };
const empty: TranscriptResult = { success: true, data: [], error: null };
const fail: TranscriptResult = { success: false, data: null, error: 'No captions available' };

function adapterWith(getTranscriptMock: () => Promise<TranscriptResult>): PlatformAdapter {
  return { getTranscript: getTranscriptMock } as unknown as PlatformAdapter;
}

describe('getTranscript (cache)', () => {
  beforeEach(() => clearTranscriptCache());

  it('memoizes a successful fetch and does not call the adapter again', async () => {
    const spy = vi.fn().mockResolvedValue(ok);
    const adapter = adapterWith(spy);

    await getTranscript(adapter, ctx);
    const second = await getTranscript(adapter, ctx);

    expect(second).toEqual(ok);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retries once when the first response is empty/unusable', async () => {
    const spy = vi.fn().mockResolvedValueOnce(empty).mockResolvedValueOnce(ok);
    const result = await getTranscript(adapterWith(spy), ctx);

    expect(result).toEqual(ok);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures, so a later call retries', async () => {
    const failing = vi.fn().mockResolvedValue(fail);
    const first = await getTranscript(adapterWith(failing), ctx);
    expect(first.success).toBe(false);
    expect(failing).toHaveBeenCalledTimes(2); // initial + one retry

    const recovering = vi.fn().mockResolvedValue(ok);
    const second = await getTranscript(adapterWith(recovering), ctx);
    expect(second).toEqual(ok);
  });
});
