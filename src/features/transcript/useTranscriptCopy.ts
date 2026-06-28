import { useCallback, useState } from 'react';
import { formatTranscriptForCopy } from '@/core/transcript/slicer';
import { getTranscript } from '@/core/transcript/transcriptCache';
import { useToast } from '@/ui/toast/ToastContext';
import { usePlatform } from '@/ui/PlatformContext';

export type CopyStatus = 'idle' | 'copying' | 'done' | 'failed';

export interface UseTranscriptCopy {
  status: CopyStatus;
  copy: () => Promise<void>;
}

export function useTranscriptCopy(): UseTranscriptCopy {
  const { adapter, ctx } = usePlatform();
  const { show } = useToast();
  const [status, setStatus] = useState<CopyStatus>('idle');

  const copy = useCallback(async () => {
    setStatus('copying');
    try {
      const result = await getTranscript(adapter, ctx);
      if (!result.success || !result.data || result.data.length === 0) {
        setStatus('failed');
        show(result.error ?? 'Transcript not available for this video.', 'error');
        return;
      }
      await navigator.clipboard.writeText(formatTranscriptForCopy(result.data));
      setStatus('done');
      show('Transcript copied to clipboard.', 'success');
    } catch {
      setStatus('failed');
      show('Could not copy the transcript. Please try again.', 'error');
    } finally {
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [adapter, ctx, show]);

  return { status, copy };
}
