import { describe, expect, it } from 'vitest';
import { formatHMS } from './time';

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
