import { describe, expect, it } from 'vitest';

import { extractFullPageText, extractPageText, normalizeText } from './extractors';

describe('extractors', () => {
  it('normalizes whitespace', () => {
    expect(normalizeText('  Hello   world \n test  ')).toBe('Hello world test');
  });

  it('prefers article and returns meaningful page text', () => {
    document.body.innerHTML = `
      <main>short text</main>
      <article>
        这是一个足够长的正文内容，用来验证整页抓取逻辑会优先选择文章主体，而不是退回到页面其他位置。
      </article>
    `;

    expect(extractPageText(document)).toContain('这是一个足够长的正文内容');
  });

  it('returns the full page text when the user wants the whole page', () => {
    document.body.innerHTML = `
      <header>页面头部导航</header>
      <main>
        <article>这是页面正文的主体内容。</article>
      </main>
      <footer>页面底部补充说明</footer>
    `;

    expect(extractFullPageText(document)).toContain('页面头部导航');
    expect(extractFullPageText(document)).toContain('这是页面正文的主体内容。');
    expect(extractFullPageText(document)).toContain('页面底部补充说明');
  });
});
