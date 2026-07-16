import { useCallback, useEffect, useState } from 'react';
import { captureFrame } from '@/core/screenshot/capture';
import {
  decrementScreenshotCount,
  getPlanInfo,
  getScreenshotCount,
  incrementScreenshotCount,
  resetScreenshotCount,
} from '@/core/limits/limitService';
import { purgeOldRecords } from '@/core/storage/retention';
import {
  deleteAllForContent,
  deleteNote,
  deleteScreenshotById,
  getTimeline,
  saveNote,
  saveScreenshot,
  updateNote,
} from '@/core/storage/repository';
import type { TimelineItem } from '@/core/types';
import { useToast } from '@/ui/toast/ToastContext';
import { usePlatform } from '@/ui/PlatformContext';

const STORAGE_FULL_MESSAGE =
  "Couldn't save — your browser storage may be full. Clear old notes/screenshots and try again.";

function insertSorted(items: TimelineItem[], item: TimelineItem): TimelineItem[] {
  return [...items, item].sort((a, b) => a.data.videoTimestamp - b.data.videoTimestamp);
}

export interface UseTimeline {
  items: TimelineItem[];
  /** Per-plan cap on a single note's length, for the composer's live enforcement. */
  maxNoteChars: number;
  addNote: (text: string) => Promise<void>;
  addScreenshot: () => Promise<void>;
  removeNote: (id: number) => Promise<void>;
  removeScreenshot: (id: number) => Promise<void>;
  editNote: (id: number, text: string) => Promise<void>;
  clearAll: () => Promise<void>;
  /** Jump the video to a timestamp (clicking a note/screenshot time badge). */
  seekTo: (seconds: number) => void;
}

export function useTimeline(): UseTimeline {
  const { adapter, ctx } = usePlatform();
  const { show } = useToast();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [maxNoteChars, setMaxNoteChars] = useState(0);

  useEffect(() => {
    void getTimeline(ctx.contentId).then(setItems);
    void getPlanInfo().then((info) => setMaxNoteChars(info.limits.max_note_chars));
    // Retention cleanup, mirroring v3's per-mount purge (ARCHITECTURE.md A.11).
    void purgeOldRecords();
  }, [ctx.contentId]);

  const addNote = useCallback(
    async (text: string) => {
      const video = adapter.getVideoElement();
      if (!video) {
        show('No video found on this page.', 'error');
        return;
      }
      const { limits } = await getPlanInfo();
      const noteCount = items.filter((i) => i.type === 'note').length;
      if (noteCount >= limits.max_notes_per_video) {
        show(`Note limit (${limits.max_notes_per_video}) reached for this video on your plan.`, 'error');
        return;
      }
      // The composer already trims to the plan limit; this is the safety net.
      const capped = limits.max_note_chars > 0 ? text.slice(0, limits.max_note_chars) : text;
      try {
        const note = await saveNote(capped, video.currentTime, ctx.contentId);
        setItems((prev) => insertSorted(prev, { type: 'note', data: note }));
      } catch (error) {
        // Never fail silently: a rejected write (e.g. browser storage full) would
        // otherwise just drop the note with no feedback. Rethrow so the composer
        // keeps the user's text for a retry.
        console.error('Failed to save note', error);
        show(STORAGE_FULL_MESSAGE, 'error');
        throw error;
      }
    },
    [adapter, ctx.contentId, items, show],
  );

  const addScreenshot = useCallback(async () => {
    const { limits } = await getPlanInfo();
    if (getScreenshotCount(ctx.contentId) >= limits.max_screenshots_per_video) {
      show(`Screenshot limit (${limits.max_screenshots_per_video}) reached for this video on your plan.`, 'error');
      return;
    }
    const video = adapter.getVideoElement();
    if (!video) {
      show('No video found on this page.', 'error');
      return;
    }
    try {
      const { dataUrl, time } = captureFrame(video);
      const shot = await saveScreenshot(dataUrl, time, ctx.contentId);
      incrementScreenshotCount(ctx.contentId);
      setItems((prev) => insertSorted(prev, { type: 'screenshot', data: shot }));
    } catch (error) {
      console.error('Failed to save screenshot', error);
      show(STORAGE_FULL_MESSAGE, 'error');
    }
  }, [adapter, ctx.contentId, show]);

  const removeNote = useCallback(async (id: number) => {
    await deleteNote(id);
    setItems((prev) => prev.filter((i) => !(i.type === 'note' && i.data.id === id)));
  }, []);

  const removeScreenshot = useCallback(
    async (id: number) => {
      await deleteScreenshotById(id);
      decrementScreenshotCount(ctx.contentId);
      setItems((prev) => prev.filter((i) => !(i.type === 'screenshot' && i.data.id === id)));
    },
    [ctx.contentId],
  );

  const editNote = useCallback(async (id: number, text: string) => {
    await updateNote(id, { text });
    setItems((prev) =>
      prev.map((i) => (i.type === 'note' && i.data.id === id ? { type: 'note', data: { ...i.data, text } } : i)),
    );
  }, []);

  const clearAll = useCallback(async () => {
    await deleteAllForContent(ctx.contentId);
    resetScreenshotCount(ctx.contentId);
    setItems([]);
  }, [ctx.contentId]);

  const seekTo = useCallback(
    (seconds: number) => {
      const video = adapter.getVideoElement();
      if (!video) {
        show('No video found on this page.', 'error');
        return;
      }
      video.currentTime = seconds;
    },
    [adapter, show],
  );

  return { items, maxNoteChars, addNote, addScreenshot, removeNote, removeScreenshot, editNote, clearAll, seekTo };
}
