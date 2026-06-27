/**
 * Normalize the AI backend's key-points payload into a clean `string[]`.
 * The backend may return a real array, a JSON array string, or a Python-style
 * list string (single quotes, escaped chars) — all are handled here. This
 * replaces v3's duplicated `parseList` + `formatKeypoints` parsing.
 */
export function parseKeypoints(input: unknown): string[] {
  if (input == null) return [];
  if (Array.isArray(input)) return input.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim());

  let str = String(input).trim();

  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === 'string' && p.trim()).map((p: string) => p.trim());
  } catch {
    // fall through to manual parsing
  }

  str = str.replace(/^\[|\]$/g, '').trim();

  const items: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar: string | null = null;

  for (let i = 0; i < str.length; i += 1) {
    const char = str[i];
    if ((char === '"' || char === "'") && str[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = null;
      }
    }
    if (char === ',' && !inQuotes) {
      items.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) items.push(current.trim());

  return items
    .map((item) =>
      item
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\/g, '')
        .replace(/^[•-]\s/, '')
        .trim(),
    )
    .filter((item) => item.length > 0);
}

/**
 * Convert the AI summary's lightweight markdown (`**bold**`, newlines, `- ` bullets)
 * to HTML for rendering inside the (sandboxed) shadow root.
 */
export function formatSummaryToHtml(summaryText: string): string {
  let html = summaryText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/-\s(.*?)<br>/g, '<li>$1</li>');
  html = html.replace(/<br>\*\*Key Themes:\*\*<br>/g, '<br><strong>Key Themes:</strong><ul>');
  html = html.replace(/<\/li><br>/g, '</li>');
  html += '</ul>';
  return html;
}
