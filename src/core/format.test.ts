import { describe, expect, it } from 'vitest';
import { parseKeypoints } from './format';

describe('parseKeypoints', () => {
  it('returns an empty array for nullish input', () => {
    expect(parseKeypoints(null)).toEqual([]);
    expect(parseKeypoints(undefined)).toEqual([]);
  });

  it('passes through a real array', () => {
    expect(parseKeypoints(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('parses a JSON array string', () => {
    expect(parseKeypoints('["first", "second"]')).toEqual(['first', 'second']);
  });

  it('parses a Python-style single-quoted list', () => {
    expect(parseKeypoints("['one', 'two', 'three']")).toEqual(['one', 'two', 'three']);
  });

  it('keeps commas that are inside quotes', () => {
    expect(parseKeypoints("['a, b', 'c']")).toEqual(['a, b', 'c']);
  });

  it('drops empty entries', () => {
    expect(parseKeypoints("['a', '', 'b']")).toEqual(['a', 'b']);
  });
});
