import { useState } from 'react';
import type { NoteRecord } from '@/core/types';
import { formatHMS } from '@/core/time';
import { CloseIcon, EditIcon } from '@/ui/icons';
import { useToast } from '@/ui/toast/ToastContext';

interface NoteItemProps {
  note: NoteRecord;
  onEdit: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function NoteItem({ note, onEdit, onDelete }: NoteItemProps) {
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);

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
      <div className="clipinsights__note-actions">
        <button className="clipinsights__update-btn" onClick={() => setEditing(true)}>
          <EditIcon />
          <span className="clipinsights__btnTooltip">Edit</span>
        </button>
        <button className="clipinsights__delete-btn" onClick={() => note.id !== undefined && void onDelete(note.id)}>
          <CloseIcon />
          <span className="clipinsights__btnTooltip">Delete</span>
        </button>
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

      <p className="clipinsights__timestamp">{formatHMS(note.videoTimestamp)}</p>
    </div>
  );
}
