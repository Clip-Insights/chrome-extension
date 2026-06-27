import type { TranscriptResult, TranscriptSegment } from '@/core/platform/types';

/** Public Innertube key used as a fallback if the watch page no longer embeds one. */
const FALLBACK_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

function decodeHtmlEntities(text: string): string {
  const ta = document.createElement('textarea');
  ta.innerHTML = text;
  return ta.value;
}

/**
 * Fetch a YouTube transcript via the Innertube player API using the ANDROID
 * client (which avoids the WEB client's PO-token requirement). Mirrors the
 * Python `youtube-transcript-api` flow. See ARCHITECTURE.md A.9.
 */
export async function fetchYouTubeTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  try {
    const videoId = new URLSearchParams(new URL(youtubeUrl).search).get('v');
    if (!videoId) return { success: false, data: null, error: 'Invalid YouTube URL' };

    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    }).then((r) => r.text());

    const apiKey = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/)?.[1] ?? FALLBACK_API_KEY;

    const playerData = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } }, videoId }),
    }).then((r) => r.json());

    const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks as
      | Array<{ baseUrl: string; languageCode: string; kind?: string }>
      | undefined;
    if (!captionTracks?.length) return { success: false, data: null, error: 'No captions available' };

    const track =
      captionTracks.find((t) => t.languageCode === 'en' && t.kind !== 'asr') ??
      captionTracks.find((t) => t.languageCode === 'en') ??
      captionTracks[0];

    const baseUrl = track.baseUrl.replace(/&fmt=srv3/g, '');
    if (baseUrl.includes('&exp=xpe')) {
      return { success: false, data: null, error: 'Transcript requires authentication (PoToken)' };
    }

    const xml = await fetch(baseUrl).then((r) => r.text());
    const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    const nodes = xmlDoc.getElementsByTagName('text');

    const data: TranscriptSegment[] = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (!node.textContent) continue;
      const text = decodeHtmlEntities(node.textContent).replace(/<[^>]*>/g, '').trim();
      if (text) {
        data.push({
          start: parseFloat(node.getAttribute('start') ?? '0'),
          duration: parseFloat(node.getAttribute('dur') ?? '0'),
          text,
        });
      }
    }

    return { success: true, data, error: null };
  } catch (error) {
    return { success: false, data: null, error: error instanceof Error ? error.message : 'Error fetching transcript' };
  }
}
