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
  return (
    <Line>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

export function SendIcon(): JSX.Element {
  return (
    <Line size={16}>
      <path d="m3 3 18 9-18 9 4-9-4-9Z" />
      <path d="M7 12h14" />
    </Line>
  );
}

export function SettingsIcon(): JSX.Element {
  return (
    <Line>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </Line>
  );
}

export function RefreshIcon(): JSX.Element {
  return (
    <Line size={13}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </Line>
  );
}

export function SparklesIcon(): JSX.Element {
  return (
    <Line>
      <path d="M12 3v2.5M12 18.5V21M4.2 4.2l1.8 1.8M18 18l1.8 1.8M3 12h2.5M18.5 12H21M4.2 19.8 6 18M18 6l1.8-1.8" />
      <circle cx="12" cy="12" r="3.5" />
    </Line>
  );
}

export function LogoutIcon(): JSX.Element {
  return (
    <Line size={14}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Line>
  );
}

/** Official multicolor Google "G" mark for the sign-in button. */
export function GoogleGIcon({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
