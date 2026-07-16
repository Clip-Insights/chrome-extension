import { describe, expect, it } from 'vitest';
import { markdownToPlainText, renderMarkdownUnsafe } from './markdown';

describe('renderMarkdownUnsafe', () => {
  it('renders bold, lists and inline code', () => {
    const html = renderMarkdownUnsafe('**bold** and `code`\n\n- one\n- two');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<li>one</li>');
  });

  it('renders GFM tables', () => {
    const html = renderMarkdownUnsafe('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders fenced code blocks', () => {
    const html = renderMarkdownUnsafe('```js\nconst x = 1;\n```');
    expect(html).toContain('<pre><code');
    expect(html).toContain('const x = 1;');
  });

  it('converts single newlines to line breaks (chat style)', () => {
    expect(renderMarkdownUnsafe('line one\nline two')).toContain('<br>');
  });

  it('renders blockquotes', () => {
    expect(renderMarkdownUnsafe('> quoted')).toContain('<blockquote>');
  });
});

describe('markdownToPlainText', () => {
  it('strips inline formatting', () => {
    expect(markdownToPlainText('This is **bold** and _em_ and `code`.')).toBe('This is bold and em and code.');
  });

  it('turns list items into bullets', () => {
    expect(markdownToPlainText('- first\n- second')).toBe('• first\n• second');
  });

  it('keeps paragraph breaks', () => {
    expect(markdownToPlainText('para one\n\npara two')).toBe('para one\n\npara two');
  });

  it('flattens headings and tables to readable text', () => {
    const text = markdownToPlainText('## Title\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(text).toContain('Title');
    expect(text).toContain('a  ·  b');
    expect(text).toContain('1  ·  2');
    expect(text).not.toContain('|');
    expect(text).not.toContain('#');
  });

  it('passes plain text through unchanged', () => {
    expect(markdownToPlainText('just a sentence.')).toBe('just a sentence.');
  });
});
