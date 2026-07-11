interface BtnTooltipProps {
  label: string;
  /** Keyboard shortcut shown as a chip after the label, e.g. "Ctrl+Shift+S". */
  shortcut?: string;
}

/** Hover tooltip for action buttons; renders inside a `.clipinsights__button`. */
export function BtnTooltip({ label, shortcut }: BtnTooltipProps) {
  return (
    <span className="clipinsights__btnTooltip">
      {label}
      {shortcut && <kbd className="clipinsights__btnShortcut">{shortcut}</kbd>}
    </span>
  );
}
