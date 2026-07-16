import type { ReactNode } from 'react';
import { CloseIcon } from '@/ui/icons';

interface ViewHeaderActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}

/** Small icon button for a view header (regenerate, clear, …) with a tooltip. */
export function ViewHeaderAction({ label, onClick, disabled, danger, children }: ViewHeaderActionProps) {
  return (
    <button
      className={`clipinsights__iconBtn${danger ? ' clipinsights__iconBtn--danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {children}
      <span className="clipinsights__btnTooltip">{label}</span>
    </button>
  );
}

interface ViewHeaderProps {
  icon: ReactNode;
  title: string;
  /** Extra icon actions rendered before the close button. */
  actions?: ReactNode;
  onClose: () => void;
}

/**
 * Compact header shared by the summary / key points / chat / settings views:
 * a small accent icon chip, the title, and right-aligned icon actions. Kept
 * low so the scrollable content region below gets the panel's height.
 */
export function ViewHeader({ icon, title, actions, onClose }: ViewHeaderProps) {
  return (
    <div className="clipinsights__viewHeader">
      <span className="clipinsights__viewIcon">{icon}</span>
      <h2 className="clipinsights__viewTitle">{title}</h2>
      <div className="clipinsights__viewActions">
        {actions}
        <ViewHeaderAction label="Close" onClick={onClose}>
          <CloseIcon />
        </ViewHeaderAction>
      </div>
    </div>
  );
}
