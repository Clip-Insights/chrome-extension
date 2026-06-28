import type { PlatformAdapter, TranscriptResult, TranscriptSegment, VideoContext } from '@/core/platform/types';

/**
 * Fetch a content item's transcript once and reuse it for every feature
 * (copy, summary, key points, chat).
 *
 * Previously each feature called `adapter.getTranscript` independently. The
 * transcript API is intermittent — it occasionally returns an empty/"no
 * captions" response even for captioned videos — so one feature could see a
 * valid transcript (e.g. the Copy button) while another saw none (e.g. Summary),
 * which then sent that error string to the backend. Memoizing the first
 * successful fetch per content guarantees a single source of truth.
 *
 * Failures are intentionally not cached, so a later user action can retry, and a
 * single retry here smooths over the API's transient empty responses.
 */
const cache = new Map<string, TranscriptSegment[]>();

function isUsable(result: TranscriptResult): result is TranscriptResult & { data: TranscriptSegment[] } {
  return result.success && Array.isArray(result.data) && result.data.length > 0;
}

export async function getTranscript(adapter: PlatformAdapter, ctx: VideoContext): Promise<TranscriptResult> {
  const cached = cache.get(ctx.contentId);
  if (cached) return { success: true, data: cached, error: null };

  let result = await adapter.getTranscript(ctx);
  if (!isUsable(result)) {
    result = await adapter.getTranscript(ctx);
  }

  if (isUsable(result)) {
    cache.set(ctx.contentId, result.data);
    return result;
  }

  return {
    success: false,
    data: null,
    error: result.error ?? 'No transcript available',
  };
}

/** Test seam: drop memoized transcripts. */
export function clearTranscriptCache(): void {
  cache.clear();
}
