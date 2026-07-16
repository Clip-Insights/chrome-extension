import { useEffect, useRef, useState } from 'react';
import type { NoteRecord } from '@/core/types';
import { formatHMS } from '@/core/time';
import { MoreIcon } from '@/ui/icons';
import { useToast } from '@/ui/toast/ToastContext';

interface NoteItemProps {
  note: NoteRecord;
  onEdit: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSeek: (seconds: number) => void;
}

export function NoteItem({ note, onEdit, onDelete, onSeek }: NoteItemProps) {
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the options menu on an outside click. `composedPath` is used so the
  // check works across the panel's shadow DOM boundary.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !event.composedPath().includes(menuRef.current)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const save = async () => {
    const text = draft.trim();
    if (!text) {
      show('A note cannot be empty.', 'info');
      return;
    }
    if (note.id !== undefined) await onEdit(note.id, text);
    setEditing(false);
  };

  return (
    <div className="clipinsights__screenshot-note">
      <div className="clipinsights__note-menu" ref={menuRef}>
        <button
          className="clipinsights__note-menu-btn"
          aria-label="Note options"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreIcon />
        </button>
        {menuOpen && (
          <div className="clipinsights__note-menu-dropdown">
            <button
              onClick={() => {
                setDraft(note.text);
                setEditing(true);
                setMenuOpen(false);
              }}
            >
              Edit
            </button>
            <button
              className="clipinsights__note-menu-danger"
              onClick={() => {
                setMenuOpen(false);
                if (note.id !== undefined) void onDelete(note.id);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          className="clipinsights__note-edit"
          rows={2}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void save();
            } else if (e.key === 'Escape') {
              setDraft(note.text);
              setEditing(false);
            }
          }}
          onBlur={() => void save()}
        />
      ) : (
        <p className="clipinsights__note">{note.text}</p>
      )}

      <button
        className="clipinsights__timestamp"
        onClick={() => onSeek(note.videoTimestamp)}
        aria-label="Jump video to this time"
      >
        {formatHMS(note.videoTimestamp)}
      </button>
    </div>
  );
}
