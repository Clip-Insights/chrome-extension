import { fetchTokenLimit, type TokenLimit } from '@/core/api/client';
import type { PlatformAdapter, TranscriptSegment, VideoContext } from '@/core/platform/types';
import { getTranscript } from '@/core/transcript/transcriptCache';
import { formatHMS } from '@/core/time';

export interface SlicedTranscript {
  /** Transcript text trimmed to the token budget. */
  transcript: string;
  /** Time (s) at which the transcript was cut, or -1 if the whole thing fits. */
  lastTagTime: number;
  available: boolean;
  error?: string;
}

/**
 * Trim a transcript to a token budget, walking segments and accumulating
 * `ceil(chars / charPerToken)` tokens until the budget is exhausted (pure).
 */
export function sliceByTokenBudget(
  segments: TranscriptSegment[],
  { tokens, charPerToken }: TokenLimit,
): { transcript: string; lastTagTime: number } {
  let transcript = '';
  let count = 0;
  let lastTagTime = -1;
  let sliced = false;

  for (const segment of segments) {
    const segmentTokens = Math.ceil(segment.text.length / charPerToken);
    if (count + segmentTokens > tokens) {
      sliced = true;
      break;
    }
    count += segmentTokens;
    transcript += `${segment.text} `;
    lastTagTime = segment.start + segment.duration;
  }

  return { transcript: transcript.trim(), lastTagTime: sliced ? lastTagTime : -1 };
}

/** Fetch the transcript via the adapter and slice it to the backend's token budget. */
export async function getSlicedTranscript(
  adapter: PlatformAdapter,
  ctx: VideoContext,
): Promise<SlicedTranscript> {
  try {
    const limit = await fetchTokenLimit();
    const result = await getTranscript(adapter, ctx);

    if (!result.success || !result.data || result.data.length === 0) {
      return { transcript: result.error ?? 'Transcript not available', lastTagTime: -1, available: false, error: result.error ?? undefined };
    }

    const { transcript, lastTagTime } = sliceByTokenBudget(result.data, limit);
    // An empty slice means there was nothing usable to send to the AI; treat it
    // as unavailable so we never POST a blank/garbage transcript to the backend.
    if (!transcript.trim()) {
      return { transcript: 'Transcript not available', lastTagTime: -1, available: false, error: 'Empty transcript' };
    }
    return { transcript, lastTagTime, available: true };
  } catch (error) {
    return {
      transcript: 'Failed to fetch transcript',
      lastTagTime: -1,
      available: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transcript',
    };
  }
}

/** Format full transcript segments as `[HMS] text` lines for clipboard copy. */
export function formatTranscriptForCopy(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${formatHMS(s.start)}] ${s.text}`).join('\n').trim();
}
