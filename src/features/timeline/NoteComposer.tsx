import { useState } from 'react';
import { AddNoteIcon } from '@/ui/icons';
import { useToast } from '@/ui/toast/ToastContext';

interface NoteComposerProps {
  onAddNote: (text: string) => Promise<void>;
}

export function NoteComposer({ onAddNote }: NoteComposerProps) {
  const { show } = useToast();
  const [value, setValue] = useState('');

  const submit = async () => {
    const text = value.trim();
    if (!text) {
      show('Please enter a note first.', 'info');
      return;
    }
    await onAddNote(text);
    setValue('');
  };

  return (
    <div className="clipinsights__input-container">
      <textarea
        id="clipinsights__noteInput"
        placeholder="Add a note"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <button className="clipinsights__button" id="clipinsights__addNoteBtn" onClick={() => void submit()}>
        <AddNoteIcon />
        <span className="clipinsights__btnTooltip">Add note</span>
      </button>
    </div>
  );
}
