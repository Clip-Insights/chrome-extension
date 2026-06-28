import { useCallback, useEffect, useState } from 'react';
import { fetchSummary } from '@/core/api/client';
import { parseKeypoints } from '@/core/format';
import { summaryLimit } from '@/core/limits/limitService';
import { getKeypoints, getSummary, saveKeypoints, saveSummary } from '@/core/storage/repository';
import { getSlicedTranscript } from '@/core/transcript/slicer';
import { usePlatform } from '@/ui/PlatformContext';
import type { ContextState } from '@/ui/components/StatusBar';

export type InsightsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'limit';

export interface UseInsights {
  summary: string | null;
  keypoints: string[];
  status: InsightsStatus;
  message: string;
  contextText: string;
  contextState: ContextState;
  remaining: number;
  /** Generate (or display cached) summary + key points. Safe to call repeatedly. */
  generate: () => Promise<void>;
  reset: () => void;
}

function deriveContext(summaryText: string): string {
  const match = summaryText.match(/upto\s+([\d.]+)\s*minutes/i);
  return match ? `Context up to ${match[1]} min` : 'Full video context';
}

/**
 * Summary and Key Points are produced by a single backend call and cached
 * together in IndexedDB; this hook backs both views (ARCHITECTURE.md A.10).
 */
export function useInsights(): UseInsights {
  const { adapter, ctx } = usePlatform();
  const [summary, setSummary] = useState<string | null>(null);
  const [keypoints, setKeypoints] = useState<string[]>([]);
  const [status, setStatus] = useState<InsightsStatus>('idle');
  const [message, setMessage] = useState('');
  const [contextText, setContextText] = useState('Analyzing video...');
  const [contextState, setContextState] = useState<ContextState>('normal');
  const [remaining, setRemaining] = useState(() => summaryLimit.remaining());

  const loadFromDb = useCallback(async (): Promise<boolean> => {
    const [savedSummary, savedKeypoints] = await Promise.all([getSummary(ctx.contentId), getKeypoints(ctx.contentId)]);
    if (savedSummary && savedKeypoints) {
      setSummary(savedSummary.text);
      setKeypoints(parseKeypoints(savedKeypoints.text));
      setContextText(deriveContext(savedSummary.text));
      setStatus('ready');
      return true;
    }
    return false;
  }, [ctx.contentId]);

  useEffect(() => {
    void loadFromDb();
  }, [loadFromDb]);

  const generate = useCallback(async () => {
    if (status === 'ready' || status === 'loading') return;
    // Re-check the cache to avoid a network call (and quota spend) if the initial
    // load effect hasn't resolved yet.
    if (await loadFromDb()) return;

    setRemaining(summaryLimit.remaining());
    if (summaryLimit.isReached()) {
      setStatus('limit');
      setContextText('Limit reached');
      setContextState('error');
      setMessage('Your summary limit has been reached. Please try again tomorrow.');
      return;
    }

    setStatus('loading');
    setContextText('Analyzing video...');
    setContextState('loading');

    const sliced = await getSlicedTranscript(adapter, ctx);
    if (!sliced.available) {
      setStatus('error');
      setContextText('No transcript available');
      setContextState('error');
      setMessage("We're sorry, we were unable to summarize this video because the transcription is unavailable.");
      return;
    }

    setRemaining(summaryLimit.consume());

    try {
      const data = await fetchSummary(ctx.contentUrl, sliced.transcript);
      if (!data.success) {
        setStatus('error');
        setContextState('error');
        setContextText('Error');
        setMessage(data.message ?? 'An error occurred while fetching the summary.');
        return;
      }

      let finalSummary = data.summary ?? '';
      const finalKeypoints = parseKeypoints(data.keypoints);

      if (sliced.lastTagTime !== -1) {
        const mins = (sliced.lastTagTime / 60).toFixed(2);
        finalSummary += `...upto ${mins} minutes`;
        setContextText(`Context up to ${mins} min`);
      } else {
        setContextText('Full video context');
      }
      setContextState('normal');

      await saveSummary(finalSummary, ctx.contentId);
      await saveKeypoints(JSON.stringify(finalKeypoints), ctx.contentId);

      setSummary(finalSummary);
      setKeypoints(finalKeypoints);
      setStatus('ready');
    } catch {
      setStatus('error');
      setContextState('error');
      setContextText('Error');
      setMessage('An error occurred while fetching the summary.');
    }
  }, [adapter, ctx, status, loadFromDb]);

  const reset = useCallback(() => {
    setSummary(null);
    setKeypoints([]);
    setStatus('idle');
    setMessage('');
    setContextText('Analyzing video...');
    setContextState('normal');
  }, []);

  return { summary, keypoints, status, message, contextText, contextState, remaining, generate, reset };
}
