/**
 * Inline SVG icon set. Clean single-weight line icons on a 24x24 grid that
 * inherit `currentColor`, so every icon takes its button's text color and
 * recolors with it on hover (e.g. ink -> accent) instead of being a fixed hue.
 * Pure presentational components.
 */
import type { JSX, ReactNode, SVGProps } from 'react';

/**
 * Shared base for the stroke icons: 24x24 grid, currentColor strokes, rounded
 * caps and joins. Size defaults to 18px and is overridden per-icon or by CSS.
 */
function Line({
  children,
  size = 18,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode; size?: number }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SnapshotIcon(): JSX.Element {
  return (
    <Line>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.4" />
    </Line>
  );
}

export function SummaryIcon(): JSX.Element {
  return (
    <Line>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h5" />
    </Line>
  );
}

export function KeyPointsIcon(): JSX.Element {
  return (
    <Line>
      <path d="M11 6h9" />
      <path d="M11 12h9" />
      <path d="M11 18h9" />
      <path d="m3 6 1.4 1.4L7 4.8" />
      <path d="m3 12 1.4 1.4L7 10.8" />
      <path d="m3 18 1.4 1.4L7 16.8" />
    </Line>
  );
}

export function ChatIcon(): JSX.Element {
  return (
    <Line>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.4-.7L3 21l1.4-4.6A8.4 8.4 0 0 1 3.6 11a8.4 8.4 0 0 1 8.4-8 8.4 8.4 0 0 1 9 8.5Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
    </Line>
  );
}

export function AddNoteIcon(): JSX.Element {
  // Same pen glyph as EditIcon (just larger), so "write a note" and "edit a
  // note" read as one family instead of the old boxed pencil-square.
  return (
    <Line>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Line>
  );
}

export function EyeIcon(): JSX.Element {
  return (
    <Line size={15}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.1 7.36 5 12 5s8.58 3.1 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.9 16.64 19 12 19s-8.58-3.1-9.94-6.65Z" />
      <circle cx="12" cy="12" r="3" />
    </Line>
  );
}

export function EyeOffIcon(): JSX.Element {
  return (
    <Line size={15}>
      <path d="M10.7 5.17A9.8 9.8 0 0 1 12 5c4.64 0 8.58 3.1 9.94 6.65a1 1 0 0 1 0 .7 10.66 10.66 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A10.6 10.6 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.42 15.9 7.36 19 12 19a9.9 9.9 0 0 0 5.39-1.61" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="m3 3 18 18" />
    </Line>
  );
}

export function LoginIcon(): JSX.Element {
  return (
    <Line>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </Line>
  );
}

export function DownloadIcon(): JSX.Element {
  return (
    <Line>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Line>
  );
}

export function UploadIcon(): JSX.Element {
  return (
    <Line>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </Line>
  );
}

export function TranscriptIcon(): JSX.Element {
  return (
    <Line>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 11h3" />
      <path d="M7 15h2" />
      <path d="M14 11h3" />
      <path d="M13 15h4" />
    </Line>
  );
}

export function ClearIcon(): JSX.Element {
  return (
    <Line>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-.8 13a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Line>
  );
}

export function InfoIcon(): JSX.Element {
  return (
    <Line size={12} strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Line>
  );
}

export function BoltIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4.5 13.2a.6.6 0 0 0 .5.9H11l-1 7.9 8.5-11.9a.6.6 0 0 0-.5-1H13l1-7.1Z" />
    </svg>
  );
}

export function EditIcon(): JSX.Element {
  return (
    <Line size={11} strokeWidth={2}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Line>
  );
}

export function MoreIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export function CloseIcon(): JSX.Element {
  return (
    <Line size={12} strokeWidth={2}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Line>
  );
}
