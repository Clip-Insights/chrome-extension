import { useCallback, useEffect, useState } from 'react';
import { ApiAuthError, ApiLimitError, fetchSummary } from '@/core/api/client';
import { getValidAccessToken } from '@/core/auth/session';
import { parseKeypoints } from '@/core/format';
import { getPlanInfo, invalidatePlanInfo } from '@/core/limits/limitService';
import { deleteInsights, getKeypoints, getSummary, saveKeypoints, saveSummary } from '@/core/storage/repository';
import { getSlicedTranscript } from '@/core/transcript/slicer';
import { usePlatform } from '@/ui/PlatformContext';
import { useToast } from '@/ui/toast/ToastContext';
import type { ContextState } from '@/ui/components/StatusBar';

export type InsightsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'limit' | 'signup';

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
  /** Discard the cached result and generate fresh (the old one may be poor). */
  regenerate: () => Promise<void>;
  /** Delete the cached summary + key points and return to the idle state. */
  clear: () => Promise<void>;
  reset: () => void;
}

const SIGNUP_MESSAGE = 'AI summaries are free with an account. Sign up to unlock them.';

function deriveContext(summaryText: string): string {
  const match = summaryText.match(/upto\s+([\d.]+)\s*minutes/i);
  return match ? `Context up to ${match[1]} min` : 'Full video context';
}

/**
 * Summary and Key Points are produced by a single backend call and cached
 * together in IndexedDB; this hook backs both views (ARCHITECTURE.md A.10).
 * Limits are enforced by the backend; remaining counts come from the plan API.
 * Generation is explicit: views show a Generate button and call `generate()`
 * only on the user's click (never automatically), plus `regenerate`/`clear`
 * to replace or drop a cached result.
 */
export function useInsights(): UseInsights {
  const { adapter, ctx } = usePlatform();
  const { show } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [keypoints, setKeypoints] = useState<string[]>([]);
  const [status, setStatus] = useState<InsightsStatus>('idle');
  const [message, setMessage] = useState('');
  const [contextText, setContextText] = useState('Ready when you are');
  const [contextState, setContextState] = useState<ContextState>('normal');
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    void getPlanInfo().then((info) => setRemaining(info.usage?.summary.remaining ?? 0));
  }, []);

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

  /** The network generation flow (no cache checks — callers decide). */
  const runGeneration = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setStatus('signup');
      setContextText('Account required');
      setContextState('error');
      setMessage(SIGNUP_MESSAGE);
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

    try {
      const data = await fetchSummary(ctx.contentUrl, sliced.transcript, token);
      invalidatePlanInfo();
      void getPlanInfo().then((info) => setRemaining(info.usage?.summary.remaining ?? 0));

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
    } catch (error) {
      if (error instanceof ApiAuthError) {
        setStatus('signup');
        setContextText('Account required');
        setContextState('error');
        setMessage(SIGNUP_MESSAGE);
        return;
      }
      if (error instanceof ApiLimitError) {
        setRemaining(0);
        setStatus('limit');
        setContextText('Limit reached');
        setContextState('error');
        setMessage(error.message);
        return;
      }
      setStatus('error');
      setContextState('error');
      setContextText('Error');
      setMessage('An error occurred while fetching the summary.');
    }
  }, [adapter, ctx]);

  const generate = useCallback(async () => {
    if (status === 'ready' || status === 'loading') return;
    // Re-check the cache to avoid a network call (and quota spend) if the initial
    // load effect hasn't resolved yet.
    if (await loadFromDb()) return;
    await runGeneration();
  }, [status, loadFromDb, runGeneration]);

  const clearStored = useCallback(async () => {
    await deleteInsights(ctx.contentId);
    setSummary(null);
    setKeypoints([]);
    setMessage('');
  }, [ctx.contentId]);

  const regenerate = useCallback(async () => {
    if (status === 'loading') return;
    try {
      await clearStored();
    } catch (error) {
      console.error('Failed to clear cached insights', error);
      show('Could not discard the previous result. Please try again.', 'error');
      return;
    }
    await runGeneration();
  }, [status, clearStored, runGeneration, show]);

  const clear = useCallback(async () => {
    if (status === 'loading') return;
    try {
      await clearStored();
    } catch (error) {
      console.error('Failed to clear cached insights', error);
      show('Could not clear the saved result. Please try again.', 'error');
      return;
    }
    setStatus('idle');
    setContextText('Ready when you are');
    setContextState('normal');
    show('Summary and key points cleared.', 'success');
  }, [status, clearStored, show]);

  const reset = useCallback(() => {
    setSummary(null);
    setKeypoints([]);
    setStatus('idle');
    setMessage('');
    setContextText('Ready when you are');
    setContextState('normal');
  }, []);

  return { summary, keypoints, status, message, contextText, contextState, remaining, generate, regenerate, clear, reset };
}
