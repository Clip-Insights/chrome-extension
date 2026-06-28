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
