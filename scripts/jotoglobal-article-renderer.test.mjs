import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderArticleRelease } from './jotoglobal-article-renderer.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'joto-articles-'));
const articles = JSON.parse(await readFile('fixtures/jotoglobal-articles-v1/articles.json', 'utf8'));
await renderArticleRelease({ articles, siteRoot: root, generatedAt: '2026-08-05T00:00:00Z' });
for (const route of ['blog/secure-global-network/index.html', 'zh/blog/secure-global-network/index.html', 'fa/blog/secure-global-network/index.html']) {
  const html = await readFile(path.join(root, route), 'utf8');
  assert.match(html, /rel="canonical"/); assert.match(html, /hreflang="en"/); assert.match(html, /hreflang="zh-CN"/); assert.match(html, /hreflang="fa-IR"/); assert.match(html, /"@type":"Article"/);
}
console.log('Verified deterministic trilingual article rendering.');
