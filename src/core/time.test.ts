import { describe, expect, it } from 'vitest';
import { formatHMS, formatResetTime } from './time';

describe('formatHMS', () => {
  it('shows only seconds under a minute', () => {
    expect(formatHMS(5)).toBe('05');
    expect(formatHMS(45)).toBe('45');
  });

  it('shows minutes and seconds under an hour', () => {
    expect(formatHMS(65)).toBe('01:05');
    expect(formatHMS(599)).toBe('09:59');
  });

  it('shows hours, minutes and seconds past an hour', () => {
    expect(formatHMS(3661)).toBe('01:01:01');
  });

  it('floors fractional seconds', () => {
    expect(formatHMS(90.9)).toBe('01:30');
  });
});

describe('formatResetTime', () => {
  const NOW = Date.UTC(2026, 6, 12, 10, 0, 0);
  const at = (ms: number) => new Date(NOW + ms);

  it('uses minutes under an hour, rounding up', () => {
    expect(formatResetTime(at(25 * 60_000), NOW)).toBe('in about 25 minutes');
    expect(formatResetTime(at(30_000), NOW)).toBe('in about 1 minute');
  });

  it('uses hours within 24 hours', () => {
    expect(formatResetTime(at(3 * 3_600_000), NOW)).toBe('in about 3 hours');
    expect(formatResetTime(at(61 * 60_000), NOW)).toBe('in about 1 hour');
  });

  it('shows the local date beyond 24 hours', () => {
    // Exact rendering is locale/timezone dependent; pin the shape only.
    expect(formatResetTime(at(30 * 3_600_000), NOW)).toMatch(/^on .*\d/);
  });

  it('handles already-elapsed timestamps defensively', () => {
    expect(formatResetTime(at(-1000), NOW)).toBe('any moment now');
  });
});
