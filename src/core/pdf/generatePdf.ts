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

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  text: [33, 33, 33] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  mediumGray: [156, 163, 175] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  badge: [219, 234, 254] as [number, number, number],
};
const FONTS = { h1: 18, h2: 14, body: 11, small: 9 };
const MARGIN = { left: 15, right: 15, top: 15, bottom: 25 };

/** Render an SVG string to a high-DPI PNG data URL. */
function svgToPng(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const scale = 4;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const img = new Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  });
}

function imageToJpegDataUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.src = url;
  });
}

/** Strip leading `(n)` and trailing `- YouTube` from a tab title. */
function cleanTitle(title: string): string {
  return title.replace(/^\(\d+\)\s*/, '').replace(/\s*-\s*YouTube$/, '');
}

export async function generatePdf(input: PdfInput): Promise<PdfOutput> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const contentBottom = doc.internal.pageSize.height - MARGIN.bottom;
  const logoPng = await svgToPng(LOGO_SVG, 28, 28);

  let y = MARGIN.top;
  let page = 1;

  const footer = (pageNum: number) => {
    const ph = doc.internal.pageSize.height;
    doc.addImage(logoPng, 'PNG', MARGIN.left, ph - 12, 4, 4);
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, MARGIN.left + 7, ph - 10);
    const pageText = `Page ${pageNum}`;
    doc.text(pageText, pageWidth - MARGIN.right - doc.getTextWidth(pageText), ph - 10);
    doc.setTextColor(...COLORS.text);
  };

  const pageBreakIfNeeded = (needed: number) => {
    if (y + needed > contentBottom) {
      footer(page);
      doc.addPage();
      page += 1;
      y = MARGIN.top;
    }
  };

  const sectionHeader = (text: string) => {
    doc.setFillColor(...COLORS.lightGray);
    doc.rect(MARGIN.left - 2, y - 6, pageWidth - MARGIN.left - MARGIN.right + 4, 10, 'F');
    doc.setFontSize(FONTS.h2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(text, MARGIN.left, y);
    y += 10;
  };

  const timestampBadge = (seconds: number) => {
    const label = formatHMS(seconds);
    doc.setFontSize(FONTS.small);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(...COLORS.badge);
    doc.roundedRect(MARGIN.left, y - 4, doc.getTextWidth(label) + 6, 6, 1, 1, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.textWithLink(label, MARGIN.left + 3, y, { url: `${input.contentUrl}&t=${Math.floor(seconds)}s` });
  };

  // --- Title block -------------------------------------------------------
  doc.setFontSize(FONTS.h1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  const brand = 'Clip Insights';
  const brandWidth = doc.getTextWidth(brand);
  const startX = (pageWidth - (10 + 4 + brandWidth)) / 2;
  doc.addImage(logoPng, 'PNG', startX, y - 7, 10, 10);
  const titleX = startX + 14;
  doc.textWithLink(brand, titleX, y, { url: WEB_STORE_URL });
  y += 3;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(titleX, y, titleX + brandWidth, y);
  doc.setLineWidth(0.1);
  y += 12;

  const videoTitle = cleanTitle(input.title);
  doc.setFontSize(FONTS.h2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  const titleLines = doc.splitTextToSize(videoTitle, pageWidth - MARGIN.left - MARGIN.right);
  titleLines.forEach((line: string, i: number) => {
    doc.textWithLink(line, MARGIN.left, y, { url: input.contentUrl });
    y += i < titleLines.length - 1 ? 6 : 8;
  });
  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN.left, y, pageWidth - MARGIN.right, y);
  y += 10;

  // --- Key points --------------------------------------------------------
  if (input.keypoints.length > 0) {
    pageBreakIfNeeded(25);
    sectionHeader('Key Points');
    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    input.keypoints.forEach((point, index) => {
      const wrapped = doc.splitTextToSize(`${index + 1}. ${point}`, pageWidth - MARGIN.left - MARGIN.right - 5);
      wrapped.forEach((line: string, lineIndex: number) => {
        pageBreakIfNeeded(8);
        if (lineIndex === 0) {
          doc.setDrawColor(...COLORS.primary);
          doc.setLineWidth(1);
          doc.line(MARGIN.left, y - 3, MARGIN.left, y + 3);
          doc.setDrawColor(...COLORS.border);
          doc.setLineWidth(0.1);
        }
        doc.text(line, MARGIN.left + 3, y);
        y += 5.5;
      });
      y += 2;
    });
    y += 10;
  }

  // --- Screenshots & notes (interleaved) --------------------------------
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Screenshots & Notes', 10, y);
  y += 3;
  doc.line(10, y, 200, y);
  y += 10;

  for (const item of input.timeline) {
    if (item.type === 'note') {
      pageBreakIfNeeded(21);
      timestampBadge(item.data.videoTimestamp);
      y += 8;

      doc.setFontSize(FONTS.body);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const lines = doc.splitTextToSize(item.data.text, pageWidth - MARGIN.left - MARGIN.right - 8);
      const noteStartY = y;
      for (const line of lines) {
        if (y + 6 > contentBottom) {
          doc.setDrawColor(...COLORS.primary);
          doc.setLineWidth(1);
          doc.line(MARGIN.left, noteStartY - 2, MARGIN.left, y - 2);
          footer(page);
          doc.addPage();
          page += 1;
          y = MARGIN.top;
        }
        doc.text(line, MARGIN.left + 5, y);
        y += 6;
      }
      doc.setDrawColor(...COLORS.primary);
      doc.setLineWidth(1);
      doc.line(MARGIN.left, noteStartY - 2, MARGIN.left, y - 2);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.1);

      y += 3;
      pageBreakIfNeeded(5);
      doc.line(MARGIN.left, y, pageWidth - MARGIN.right, y);
      y += 8;
    } else {
      const imageHeight = 100;
      const imageWidth = pageWidth - MARGIN.left - MARGIN.right;
      pageBreakIfNeeded(imageHeight + 20);
      const dataUrl = await imageToJpegDataUrl(item.data.url);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.5);
      doc.rect(MARGIN.left, y, imageWidth, imageHeight);
      doc.addImage(dataUrl, 'JPEG', MARGIN.left, y, imageWidth, imageHeight);
      y += imageHeight + 5;
      timestampBadge(item.data.videoTimestamp);
      y += 5;
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.1);
      doc.line(MARGIN.left, y, pageWidth - MARGIN.right, y);
      doc.setTextColor(...COLORS.text);
      y += 8;
    }
  }
  if (input.timeline.length > 0) footer(page);

  // --- Summary (last page) ----------------------------------------------
  if (input.summary) {
    doc.addPage();
    page += 1;
    y = MARGIN.top;
    sectionHeader('Video Summary');
    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(input.summary.replace(/\s+/g, ' ').trim(), pageWidth - MARGIN.left - MARGIN.right);
    for (const line of lines) {
      pageBreakIfNeeded(6);
      doc.text(line, MARGIN.left, y);
      y += 6;
    }
    footer(page);
  } else if (input.timeline.length === 0 && input.keypoints.length === 0) {
    footer(1);
  }

  return { blob: doc.output('blob'), fileName: `${cleanTitle(input.title)}.pdf` };
}
