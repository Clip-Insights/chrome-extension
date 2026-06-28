import { useEffect, useRef } from 'react';
import type { TimelineItem } from '@/core/types';
import { NoteItem } from './NoteItem';
import { ScreenshotItem } from './ScreenshotItem';

interface TimelineListProps {
  items: TimelineItem[];
  onEditNote: (id: number, text: string) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  onDeleteScreenshot: (id: number) => Promise<void>;
}

export function TimelineList({ items, onEditNote, onDeleteNote, onDeleteScreenshot }: TimelineListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest item, matching v3 behaviour.
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [items.length]);

  return (
    <div id="clipinsights__screenshotNoteContainer" ref={containerRef}>
      {items.map((item) =>
        item.type === 'note' ? (
          <NoteItem key={`n${item.data.id}`} note={item.data} onEdit={onEditNote} onDelete={onDeleteNote} />
        ) : (
          <ScreenshotItem key={`s${item.data.id}`} screenshot={item.data} onDelete={onDeleteScreenshot} />
        ),
      )}
    </div>
  );
}
