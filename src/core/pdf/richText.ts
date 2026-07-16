/**
 * Unicode support for the PDF: pure text-segmentation logic.
 *
 * jsPDF's built-in fonts (Helvetica…) can only encode WinAnsi (CP-1252) — any
 * other character (emoji, arrows, CJK, combining marks, →, ✓, …) corrupts the
 * whole line's spacing. Rather than hardcoding replacements, text is split
 * into runs: CP-1252-safe runs are typeset as real (selectable) PDF text, and
 * everything else is rendered by the *browser* onto a canvas and embedded as
 * an inline image — the browser's font fallback and shaping handle every
 * script and emoji the modern web supports. The canvas glue lives in
 * `generatePdf.ts`; this module is pure and unit-tested.
 */

/**
 * Unicode code points representable in CP-1252 (what jsPDF's standard fonts
 * encode): ASCII, Latin-1, plus the 27 CP-1252 extras (€ ‚ ƒ „ … † ‡ ˆ ‰ Š ‹
 * Œ Ž ' ' " " • – — ˜ ™ š › œ ž Ÿ).
 */
const CP1252_EXTRAS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e,
  0x0178,
]);

export function isPdfSafeCodePoint(cp: number): boolean {
  return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || CP1252_EXTRAS.has(cp);
}

/** A run of characters that either can (`text`) or cannot (`glyph`) be typeset by jsPDF. */
export interface TextRun {
  kind: 'text' | 'glyph';
  value: string;
}

/** Minimal typing for `Intl.Segmenter` (absent from the configured TS lib). */
interface GraphemeSegmenter {
  segment(text: string): Iterable<{ segment: string }>;
}

const SegmenterCtor = (
  Intl as unknown as {
    Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => GraphemeSegmenter;
  }
).Segmenter;

/** Split a string into grapheme clusters (so emoji ZWJ sequences, flags and
 * combining marks stay intact), falling back to code points when
 * `Intl.Segmenter` is unavailable. */
function graphemes(text: string): string[] {
  if (SegmenterCtor) {
    const segmenter = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function isSafeCluster(cluster: string): boolean {
  for (const ch of cluster) {
    if (!isPdfSafeCodePoint(ch.codePointAt(0)!)) return false;
  }
  return true;
}

/**
 * Segment a single-line string into alternating text/glyph runs. Contiguous
 * unsupported clusters are grouped into one glyph run so multi-character
 * scripts (Arabic, Devanagari…) are rendered as a whole and keep their
 * shaping when the browser draws them.
 */
export function segmentRuns(line: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const cluster of graphemes(line)) {
    const kind: TextRun['kind'] = isSafeCluster(cluster) ? 'text' : 'glyph';
    const last = runs[runs.length - 1];
    if (last && last.kind === kind) last.value += cluster;
    else runs.push({ kind, value: cluster });
  }
  return runs;
}

/** A word (no internal spaces) as a sequence of runs; the wrapping unit. */
export interface RichWord {
  runs: TextRun[];
}

/**
 * Tokenize a paragraph into words for line wrapping. NFC-normalizes first so
 * decomposed accents (`e` + `´`) become their precomposed CP-1252 form when
 * one exists, keeping them as real text instead of images.
 */
export function tokenizeWords(paragraph: string): RichWord[] {
  return paragraph
    .normalize('NFC')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => ({ runs: segmentRuns(w) }));
}

/** Split multi-line text into paragraphs, preserving intentional line breaks. */
export function splitParagraphs(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n');
}
