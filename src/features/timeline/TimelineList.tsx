import { useCallback, useEffect, useRef } from 'react';
import type { TimelineItem } from '@/core/types';
import { NoteItem } from './NoteItem';
import { ScreenshotItem } from './ScreenshotItem';

interface TimelineListProps {
  items: TimelineItem[];
  onEditNote: (id: number, text: string) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  onDeleteScreenshot: (id: number) => Promise<void>;
  onSeek: (seconds: number) => void;
}

export function TimelineList({ items, onEditNote, onDeleteNote, onDeleteScreenshot, onSeek }: TimelineListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  const scrollToEnd = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  // Auto-scroll to the newest item, matching v3 behaviour (only when items
  // were added — deleting shouldn't yank the scroll position).
  useEffect(() => {
    if (items.length > prevCount.current) scrollToEnd();
    prevCount.current = items.length;
  }, [items.length, scrollToEnd]);

  // A freshly added screenshot grows the list *after* the scroll effect ran
  // (the <img> has no height until it decodes), leaving the view at the top of
  // the image. Re-scroll when the last item's image finishes loading so the
  // whole screenshot (and its timestamp) is in view.
  const onLastImageLoad = useCallback(() => scrollToEnd(), [scrollToEnd]);

  return (
    <div id="clipinsights__screenshotNoteContainer" ref={containerRef}>
      {items.map((item, index) =>
        item.type === 'note' ? (
          <NoteItem key={`n${item.data.id}`} note={item.data} onEdit={onEditNote} onDelete={onDeleteNote} onSeek={onSeek} />
        ) : (
          <ScreenshotItem
            key={`s${item.data.id}`}
            screenshot={item.data}
            onDelete={onDeleteScreenshot}
            onSeek={onSeek}
            onImageLoad={index === items.length - 1 ? onLastImageLoad : undefined}
          />
        ),
      )}
    </div>
  );
}
