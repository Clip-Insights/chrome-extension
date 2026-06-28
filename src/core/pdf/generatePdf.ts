import { jsPDF } from 'jspdf';
import { LOGO_SVG, WEB_STORE_URL } from '@/assets/logo';
import type { TimelineItem } from '@/core/types';
import { formatHMS } from '@/core/time';

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

  /**
   * Draw pre-wrapped lines, re-applying the text style on every line. This is
   * deliberate: a mid-block page break runs footer(), which leaves the font at
   * the small grey caption style — without re-applying here, text that spills
   * onto the next page would render in the wrong size/colour.
   */
  const drawLines = (lines: string[], x: number, size: number, color: RGB, style: 'normal' | 'bold' = 'normal') => {
    for (const line of lines) {
      ensureSpace(LEADING);
      setText(size, color, style);
      doc.text(line, x, y);
      y += LEADING;
    }
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

  const paragraph = (text: string, size = T.body, color = C.body) => {
    drawLines(doc.splitTextToSize(text, contentW) as string[], left, size, color);
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

  setText(T.title, C.ink, 'bold');
  const titleLines = doc.splitTextToSize(cleanTitle(input.title), contentW) as string[];
  titleLines.forEach((line) => {
    doc.textWithLink(line, left, y, { url: input.contentUrl });
    y += 6.4;
  });
  y += 1;
  setText(T.caption, C.muted, 'normal');
  doc.text(`Generated ${new Date().toLocaleDateString()}  ·  AI notes, summary & key points`, left, y);
  y += 9;

  // --- Summary -----------------------------------------------------------
  if (input.summary) {
    sectionHeader('Summary');
    paragraph(input.summary.replace(/\s+/g, ' ').trim(), T.lead, C.body);
    y += 7;
  }

  // --- Key points (hanging indent so wrapped lines align under the text) -
  if (input.keypoints.length > 0) {
    sectionHeader('Key Points');
    const indent = 6;
    input.keypoints.forEach((point) => {
      const lines = doc.splitTextToSize(point, contentW - indent) as string[];
      ensureSpace(lines.length * LEADING + 2);
      doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.circle(left + 1.4, y - 1.4, 1.1, 'F');
      drawLines(lines, left + indent, T.body, C.body);
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
        const lines = doc.splitTextToSize(item.data.text, contentW - 5) as string[];
        const startY = y - 4;
        const startPage = page;
        drawLines(lines, left + 5, T.body, C.body);
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
