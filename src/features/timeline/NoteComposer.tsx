import { useState } from 'react';
import { AddNoteIcon } from '@/ui/icons';
import { BtnTooltip } from '@/ui/components/BtnTooltip';
import { useToast } from '@/ui/toast/ToastContext';

interface NoteComposerProps {
  onAddNote: (text: string) => Promise<void>;
  /** Plan-based cap on note length; 0 means "not loaded yet" (no cap applied). */
  maxChars: number;
}

export function NoteComposer({ onAddNote, maxChars }: NoteComposerProps) {
  const { show } = useToast();
  const [value, setValue] = useState('');

  // Longer input (typed or pasted) is kept up to the plan limit — never
  // rejected — and the user is warned that the rest was cut.
  const acceptText = (text: string) => {
    if (maxChars > 0 && text.length > maxChars) {
      setValue(text.slice(0, maxChars));
      show(`Note trimmed to your plan's ${maxChars}-character limit.`, 'info');
      return;
    }
    setValue(text);
  };

  const submit = async () => {
    const text = value.trim();
    if (!text) {
      show('Please enter a note first.', 'info');
      return;
    }
    try {
      await onAddNote(text);
      setValue(''); // Clear only after a successful save so a failed write keeps the text.
    } catch {
      // onAddNote already surfaced the error; keep the text for a retry.
    }
  };

  return (
    <div className="clipinsights__input-container">
      <textarea
        id="clipinsights__noteInput"
        placeholder="Add a note"
        value={value}
        onChange={(e) => acceptText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <button className="clipinsights__button" id="clipinsights__addNoteBtn" onClick={() => void submit()}>
        <AddNoteIcon />
        <BtnTooltip label="Add note" shortcut="Enter" />
      </button>
    </div>
  );
}
