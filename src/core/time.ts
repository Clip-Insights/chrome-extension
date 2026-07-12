/**
 * Format a duration in seconds as `HH:MM:SS` / `MM:SS` / `SS`.
 * Hours and minutes are only shown when non-zero; seconds are always shown.
 */
export function formatHMS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => String(n).padStart(2, '0');

  let result = '';
  if (hours > 0) result += `${pad(hours)}:`;
  if (hours > 0 || minutes > 0) result += `${pad(minutes)}:`;
  result += pad(seconds);
  return result;
}

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Phrase for when a plan limit next resets, in the viewer's local timezone
 * (the backend sends a UTC ISO timestamp; `Date` converts on parse).
 * Relative within 24 hours — "in about 25 minutes" / "in about 3 hours" —
 * otherwise the local date and time: "on Jul 14, 5:30 PM".
 */
export function formatResetTime(resetsAt: Date, nowMs: number = Date.now()): string {
  const diffMs = resetsAt.getTime() - nowMs;
  if (diffMs <= 0) return 'any moment now';
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (diffMs < ONE_DAY_MS) {
    const hours = Math.round(diffMs / 3_600_000);
    return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `on ${resetsAt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}
