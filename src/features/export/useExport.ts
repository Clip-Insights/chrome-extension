import { useCallback } from 'react';
import { uploadPdf as apiUploadPdf } from '@/core/api/client';
import { getValidAccessToken } from '@/core/auth/session';
import { parseKeypoints } from '@/core/format';
import { generatePdf, type PdfInput } from '@/core/pdf/generatePdf';
import { getKeypoints, getSummary, getTimeline } from '@/core/storage/repository';
import { useToast } from '@/ui/toast/ToastContext';
import { usePlatform } from '@/ui/PlatformContext';

export interface UseExport {
  downloadPdf: () => Promise<void>;
  uploadPdf: () => Promise<void>;
}

/** Builds the PDF from the database (source of truth), then downloads or uploads it. */
export function useExport(): UseExport {
  const { adapter, ctx } = usePlatform();
  const { show } = useToast();

  const buildInput = useCallback(async (): Promise<PdfInput> => {
    const [timeline, summary, keypoints] = await Promise.all([
      getTimeline(ctx.contentId),
      getSummary(ctx.contentId),
      getKeypoints(ctx.contentId),
    ]);
    return {
      // Read the title fresh so the PDF/filename match the current video, not a
      // stale title captured at mount time.
      title: adapter.getTitle(),
      contentUrl: ctx.contentUrl,
      timeline,
      summary: summary?.text ?? null,
      keypoints: keypoints ? parseKeypoints(keypoints.text) : [],
    };
  }, [adapter, ctx]);

  const downloadPdf = useCallback(async () => {
    try {
      const { blob, fileName } = await generatePdf(await buildInput());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      show('PDF downloaded.', 'success');
    } catch {
      show('Could not generate the PDF. Please try again.', 'error');
    }
  }, [buildInput, show]);

  const uploadPdf = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) {
      show('Please log in to upload your PDF.', 'info');
      return;
    }
    try {
      const { blob, fileName } = await generatePdf(await buildInput());
      const result = await apiUploadPdf(blob, fileName, token);
      show(result.ok ? 'File uploaded successfully.' : `Upload failed: ${result.error}`, result.ok ? 'success' : 'error');
    } catch {
      show('Upload failed. Please try again.', 'error');
    }
  }, [buildInput, show]);

  return { downloadPdf, uploadPdf };
}
