import { jsPDF } from 'jspdf';
import { LOGO_SVG, WEB_STORE_URL } from '@/assets/logo';
import type { TimelineItem } from '@/core/types';
import { formatHMS } from '@/core/time';
import { markdownToPlainText } from '@/core/markdown';
import { segmentRuns, splitParagraphs, tokenizeWords, type TextRun } from './richText';

export interface PdfInput {
  title: string;
  contentUrl: string;
  /** Notes + screenshots, already sorted by timestamp. */
  timeline: TimelineItem[];
  summary: string | null;
  keypoints: string[];
}

export interface PdfOutput {
  blob: Blob;
  fileName: string;
}

type RGB = [number, number, number];

/** One brand-aligned palette, used for every element so the document reads as a set. */
const C = {
  accent: [66, 85, 255] as RGB, // #4255ff
  accentSoft: [237, 239, 255] as RGB, // #edefff
  ink: [38, 40, 59] as RGB, // headings
  body: [71, 74, 99] as RGB, // paragraph text
  muted: [142, 145, 163] as RGB, // captions / meta
  line: [228, 230, 240] as RGB, // hairlines
};

/** One type scale (all Helvetica) so sizing is consistent throughout. */
const T = { brand: 15, title: 15, section: 9.5, body: 10, lead: 10.5, caption: 8 };

const PAGE = { margin: 18, footer: 16 };
const LEADING = 5.2; // body line height in mm
const PT_TO_MM = 25.4 / 72;

/**
 * Font stack the browser uses to draw characters jsPDF's standard fonts can't
 * encode (emoji, CJK, arrows, any non-CP-1252 script). The generic families at
 * the end let the OS fall back to whatever covers the script.
 */
const GLYPH_FONT_STACK =
  '"Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif';

/** Oversampling factor for glyph images so they stay crisp in the PDF. */
const GLYPH_SCALE = 4;

interface GlyphImage {
  dataUrl: string;
  widthMm: number;
  heightMm: number;
  /** Distance from the image top to the text baseline, in mm. */
  ascentMm: number;
}

/**
 * Renders non-CP-1252 runs (emoji, other scripts, symbols) to small PNGs via
 * a canvas, letting the browser's text stack do shaping and font fallback.
 * Results are cached per (value, size, color) — repeated emoji cost one render.
 */
class GlyphRenderer {
  private measureCtx = document.createElement('canvas').getContext('2d')!;
  private cache = new Map<string, GlyphImage>();

  measureWidthMm(value: string, sizePt: number): number {
    this.measureCtx.font = `${sizePt}px ${GLYPH_FONT_STACK}`;
    return this.measureCtx.measureText(value).width * PT_TO_MM;
  }

  render(value: string, sizePt: number, color: RGB): GlyphImage {
    const key = `${sizePt}|${color.join(',')}|${value}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const px = sizePt * GLYPH_SCALE;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${px}px ${GLYPH_FONT_STACK}`;
    const metrics = ctx.measureText(value);
    // Fall back to em-box fractions when actual bounds are missing (rare).
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent || px * 0.8);
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || px * 0.25);
    const pad = Math.ceil(px * 0.05);
    canvas.width = Math.max(1, Math.ceil(metrics.width) + pad * 2);
    canvas.height = Math.max(1, ascent + descent + pad * 2);

    // Setting canvas dimensions resets context state; set the font again.
    ctx.font = `${px}px ${GLYPH_FONT_STACK}`;
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, pad, ascent + pad);

    const toMm = (v: number) => (v / GLYPH_SCALE) * PT_TO_MM;
    const image: GlyphImage = {
      dataUrl: canvas.toDataURL('image/png'),
      widthMm: toMm(canvas.width),
      heightMm: toMm(canvas.height),
      ascentMm: toMm(ascent + pad),
    };
    this.cache.set(key, image);
    return image;
  }
}

/** One measured segment of a laid-out line. */
interface RichSeg {
  run: TextRun;
  width: number;
}

interface RichLine {
  segs: RichSeg[];
  width: number;
}

/** Render an SVG string to a high-DPI PNG data URL. */
function svgToPng(svg: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const scale = 4;
    canvas.width = size * scale;
    canvas.height = size * scale;
    const img = new Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  });
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

/** Load an image and return its JPEG data plus natural dimensions (for aspect-correct placement). */
function loadImage(url: string): Promise<LoadedImage> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: img.width, height: img.height });
    };
    img.src = url;
  });
}

/** Strip leading `(n)` and trailing `- YouTube` from a tab title. */
function cleanTitle(title: string): string {
  return title.replace(/^\(\d+\)\s*/, '').replace(/\s*-\s*YouTube$/, '');
}

export async function generatePdf(input: PdfInput): Promise<PdfOutput> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const left = PAGE.margin;
  const right = pageW - PAGE.margin;
  const contentW = right - left;
  const bottomLimit = pageH - PAGE.footer;
  const logoPng = await svgToPng(LOGO_SVG, 24);
  const glyphs = new GlyphRenderer();

  let y = PAGE.margin;
  let page = 1;

  const setText = (size: number, color: RGB, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const footer = () => {
    const fy = pageH - 9;
    doc.addImage(logoPng, 'PNG', left, fy - 3, 3.4, 3.4);
    setText(T.caption, C.muted, 'bold');
    doc.textWithLink('Clip Insights', left + 4.6, fy, { url: WEB_STORE_URL });
    setText(T.caption, C.muted, 'normal');
    const label = `Page ${page}`;
    doc.text(label, right - doc.getTextWidth(label), fy);
  };

  const newPage = () => {
    footer();
    doc.addPage();
    page += 1;
    y = PAGE.margin;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) newPage();
  };

  // --- Unicode-safe rich text -------------------------------------------
  // CP-1252 runs are typeset as real PDF text; anything else (emoji, other
  // scripts, symbols) is browser-rendered via GlyphRenderer and embedded as an
  // inline image, so no character can corrupt the line (see richText.ts).

  const measureRun = (run: TextRun, sizePt: number): number =>
    run.kind === 'text' ? doc.getTextWidth(run.value) : glyphs.measureWidthMm(run.value, sizePt);

  /** Wrap `text` into lines of measured segments that fit `maxWidth`. */
  const layoutRich = (text: string, maxWidth: number, sizePt: number, style: 'normal' | 'bold'): RichLine[] => {
    setText(sizePt, C.body, style); // font must be current for getTextWidth
    const lines: RichLine[] = [];
    const spaceW = doc.getTextWidth(' ');

    for (const paragraph of splitParagraphs(text)) {
      let cur: RichLine = { segs: [], width: 0 };
      const flush = () => {
        lines.push(cur);
        cur = { segs: [], width: 0 };
      };
      const append = (seg: RichSeg) => {
        if (cur.width > 0 && cur.width + seg.width > maxWidth) flush();
        cur.segs.push(seg);
        cur.width += seg.width;
      };

      const words = tokenizeWords(paragraph);
      for (const word of words) {
        const segs: RichSeg[] = word.runs.map((run) => ({ run, width: measureRun(run, sizePt) }));
        const wordW = segs.reduce((sum, s) => sum + s.width, 0);

        if (wordW > maxWidth) {
          // A word wider than the column (URL, long emoji chain): break by cluster.
          if (cur.width > 0) append({ run: { kind: 'text', value: ' ' }, width: spaceW });
          for (const seg of segs) {
            for (const cluster of segmentRuns(seg.run.value)) {
              append({ run: { kind: seg.run.kind, value: cluster.value }, width: measureRun(cluster, sizePt) });
            }
          }
          continue;
        }
        if (cur.width > 0 && cur.width + spaceW + wordW > maxWidth) flush();
        if (cur.width > 0) {
          cur.segs.push({ run: { kind: 'text', value: ' ' }, width: spaceW });
          cur.width += spaceW;
        }
        for (const seg of segs) {
          cur.segs.push(seg);
          cur.width += seg.width;
        }
      }
      // Keep blank paragraphs as empty lines so intentional breaks survive.
      if (cur.segs.length > 0 || words.length === 0) lines.push(cur);
    }
    return lines;
  };

  /**
   * Draw laid-out lines, re-applying the text style on every line. This is
   * deliberate: a mid-block page break runs footer(), which leaves the font at
   * the small grey caption style — without re-applying here, text that spills
   * onto the next page would render in the wrong size/colour.
   */
  const drawRichLines = (
    lines: RichLine[],
    x: number,
    sizePt: number,
    color: RGB,
    style: 'normal' | 'bold' = 'normal',
    opts: { link?: string; leading?: number } = {},
  ) => {
    const leading = opts.leading ?? LEADING;
    for (const line of lines) {
      ensureSpace(leading);
      setText(sizePt, color, style);
      let cx = x;
      for (const seg of line.segs) {
        if (seg.run.kind === 'text') {
          doc.text(seg.run.value, cx, y);
        } else {
          const image = glyphs.render(seg.run.value, sizePt, color);
          doc.addImage(image.dataUrl, 'PNG', cx, y - image.ascentMm, image.widthMm, image.heightMm);
        }
        cx += seg.width;
      }
      if (opts.link && line.width > 0) {
        const textH = sizePt * PT_TO_MM;
        doc.link(x, y - textH, line.width, textH + 1, { url: opts.link });
      }
      y += leading;
    }
  };

  const richParagraph = (
    text: string,
    sizePt = T.body,
    color = C.body,
    opts: { x?: number; width?: number; style?: 'normal' | 'bold'; link?: string; leading?: number } = {},
  ) => {
    const x = opts.x ?? left;
    const width = opts.width ?? right - x;
    const style = opts.style ?? 'normal';
    drawRichLines(layoutRich(text, width, sizePt, style), x, sizePt, color, style, opts);
  };

  const sectionHeader = (label: string) => {
    ensureSpace(14);
    setText(T.section, C.accent, 'bold');
    doc.text(label.toUpperCase(), left, y, { charSpace: 0.6 });
    y += 2.4;
    doc.setDrawColor(C.line[0], C.line[1], C.line[2]);
    doc.setLineWidth(0.3);
    doc.line(left, y, right, y);
    y += 6.5;
  };

  const timestampPill = (seconds: number) => {
    const label = formatHMS(seconds);
    setText(T.caption, C.accent, 'bold');
    const w = doc.getTextWidth(label) + 6;
    doc.setFillColor(C.accentSoft[0], C.accentSoft[1], C.accentSoft[2]);
    doc.roundedRect(left, y - 3.6, w, 5.2, 1.3, 1.3, 'F');
    doc.textWithLink(label, left + 3, y, { url: `${input.contentUrl}&t=${Math.floor(seconds)}s` });
  };

  // --- Brand + title block ----------------------------------------------
  doc.addImage(logoPng, 'PNG', left, y - 0.5, 7, 7);
  setText(T.brand, C.ink, 'bold');
  doc.textWithLink('Clip Insights', left + 9, y + 4.6, { url: WEB_STORE_URL });
  y += 9;
  doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
  doc.setLineWidth(0.8);
  doc.line(left, y, right, y);
  y += 9;

  richParagraph(cleanTitle(input.title), T.title, C.ink, {
    style: 'bold',
    link: input.contentUrl,
    leading: 6.4,
  });
  y += 1;
  richParagraph(
    `Generated ${new Date().toLocaleDateString()}  ·  AI notes, summary & key points`,
    T.caption,
    C.muted,
  );
  y += 4;

  // --- Summary -----------------------------------------------------------
  if (input.summary) {
    sectionHeader('Summary');
    // The AI summary is markdown; the PDF typesets plain text, so convert
    // (bullets survive, `**`/pipes don't). Paragraph breaks are preserved.
    richParagraph(markdownToPlainText(input.summary), T.lead, C.body);
    y += 7;
  }

  // --- Key points (hanging indent so wrapped lines align under the text) -
  if (input.keypoints.length > 0) {
    sectionHeader('Key Points');
    const indent = 6;
    input.keypoints.forEach((point) => {
      const lines = layoutRich(markdownToPlainText(point), contentW - indent, T.body, 'normal');
      ensureSpace(Math.min(lines.length, 2) * LEADING + 2);
      doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.circle(left + 1.4, y - 1.4, 1.1, 'F');
      drawRichLines(lines, left + indent, T.body, C.body);
      y += 2.6;
    });
    y += 6;
  }

  // --- Notes & screenshots ----------------------------------------------
  if (input.timeline.length > 0) {
    sectionHeader('Notes & Screenshots');

    for (const item of input.timeline) {
      if (item.type === 'note') {
        ensureSpace(12);
        timestampPill(item.data.videoTimestamp);
        y += 7.5;
        const startY = y - 4;
        const startPage = page;
        // User notes keep their intentional line breaks (Shift+Enter).
        richParagraph(item.data.text, T.body, C.body, { x: left + 5, width: contentW - 5 });
        // Thin accent rail spanning the note body (only when it stays on one page).
        if (page === startPage) {
          doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
          doc.setLineWidth(1);
          doc.line(left + 0.6, startY, left + 0.6, y - 3.5);
        }
        y += 6;
      } else {
        const img = await loadImage(item.data.url);
        const imgH = Math.min(contentW * (img.height / img.width), 150);
        const imgW = imgH * (img.width / img.height);
        ensureSpace(imgH + 11);
        doc.setDrawColor(C.line[0], C.line[1], C.line[2]);
        doc.setLineWidth(0.4);
        doc.roundedRect(left, y, imgW, imgH, 2, 2);
        doc.addImage(img.dataUrl, 'JPEG', left, y, imgW, imgH);
        y += imgH + 5.5;
        timestampPill(item.data.videoTimestamp);
        y += 9;
      }
    }
  }

  footer();
  return { blob: doc.output('blob'), fileName: `${cleanTitle(input.title)}.pdf` };
}
