import DOMPurify from 'dompurify';
import { Marked, type Token, type Tokens } from 'marked';

/**
 * Markdown rendering for AI-generated content (chat answers, summaries).
 * The backend LLM emits full GitHub-flavoured markdown — bold, lists, tables,
 * code blocks, blockquotes — so we parse with `marked` and sanitize the HTML
 * with DOMPurify before it is injected into the (shadow-rooted) panel.
 */

const marked = new Marked({
  gfm: true,
  // Single newlines become <br>, matching how chat models format answers.
  breaks: true,
  async: false,
});

// External links from AI output must open in a new tab, never navigate the
// host page. Registered once; DOMPurify.isSupported is false in the node test
// environment (no DOM), where rendering is never exercised.
if (DOMPurify.isSupported) {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/** Parse markdown to HTML without sanitization. Exported for unit tests only. */
export function renderMarkdownUnsafe(md: string): string {
  return marked.parse(md) as string;
}

/** Markdown → sanitized HTML, safe to inject via dangerouslySetInnerHTML. */
export function renderMarkdown(md: string): string {
  const html = renderMarkdownUnsafe(md);
  return DOMPurify.isSupported ? DOMPurify.sanitize(html) : html;
}

/** Collect the readable text of inline tokens (bold/em/links/code…). */
function inlineText(tokens: Token[] | undefined, fallback: string): string {
  if (!tokens) return fallback;
  let out = '';
  for (const token of tokens) {
    if ('tokens' in token && token.tokens?.length) out += inlineText(token.tokens, '');
    else if ('text' in token && typeof token.text === 'string') out += token.text;
    else out += token.raw;
  }
  return out;
}

function blockText(tokens: Token[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
      case 'paragraph':
        parts.push(inlineText(token.tokens, token.text));
        break;
      case 'list':
        parts.push(
          (token as Tokens.List).items
            .map((item) => `• ${blockText(item.tokens).replace(/\n+/g, ' ')}`)
            .join('\n'),
        );
        break;
      case 'blockquote':
        parts.push(blockText((token as Tokens.Blockquote).tokens));
        break;
      case 'code':
        parts.push(token.text);
        break;
      case 'table': {
        const table = token as Tokens.Table;
        const rows = [table.header, ...table.rows].map((row) =>
          row.map((cell) => inlineText(cell.tokens, cell.text)).join('  ·  '),
        );
        parts.push(rows.join('\n'));
        break;
      }
      case 'space':
      case 'hr':
        break;
      default:
        if ('text' in token && typeof token.text === 'string') parts.push(token.text);
        break;
    }
  }
  return parts.join('\n\n');
}

/**
 * Markdown → plain text, preserving paragraph breaks and list bullets.
 * Used for the PDF, which typesets text itself and must not receive `**`
 * markers or raw table pipes.
 */
export function markdownToPlainText(md: string): string {
  return blockText(marked.lexer(md)).trim();
}
