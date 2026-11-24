import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
const listPages = [
  ['blog/index.html', /<html lang="en">/],
  ['zh/blog/index.html', /<html lang="zh-CN">/],
  ['fa/blog/index.html', /<html lang="fa-IR" dir="rtl">/],
];
for (const [file, localePattern] of listPages) {
  const html = await readFile(file, 'utf8');
  assert.match(html, localePattern);
  assert.doesNotMatch(html, /id="jotoglobalArticles"/);
  assert.equal((html.match(/jotoglobal-articles\.js\?v=20261124-1/g) || []).length, 1);
  assert.equal((html.match(/jotoglobal-articles\.css\?v=20261124-1/g) || []).length, 1);
}
const robots = await readFile('robots.txt', 'utf8'); assert.match(robots, /article-sitemap\.xml/);
const manifestPath = 'article-data/manifest.json';
const requireRendered = process.argv.includes('--require-rendered');
assert.ok(!requireRendered || existsSync(manifestPath), 'rendered article manifest is required');
const manifest = existsSync(manifestPath)
  ? JSON.parse(await readFile(manifestPath, 'utf8'))
  : { articleCount: 0, routes: [] };
assert.equal(manifest.articleCount * 3, manifest.routes.length);
const indexPath = 'article-data/index.json';
const index = existsSync(indexPath) ? JSON.parse(await readFile(indexPath, 'utf8')) : [];
assert.equal(index.length, manifest.articleCount);
for (let position = 1; position < index.length; position += 1) {
  assert.ok(Date.parse(index[position - 1].publishedAt) >= Date.parse(index[position].publishedAt));
}
for (const article of index) {
  assert.match(article.heroImage?.url || '', /^\/(?:assets|article-data)\/[A-Za-z0-9._/-]+$/);
  for (const locale of ['en', 'zh-CN', 'fa-IR']) assert.ok(article.heroImage?.alt?.[locale]);
}
for (const route of manifest.routes) {
  assert.match(route, /^\/(?:zh\/|fa\/)?blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/);
  const html = await readFile(path.join(`.${route}`, 'index.html'), 'utf8');
  assert.match(html, /rel="canonical"/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="zh-CN"/);
  assert.match(html, /hreflang="fa-IR"/);
  // Generated pages come from the server-side article publisher, which versions its own stylesheet.
  assert.match(html, /jotoglobal-articles\.css\?v=\d{8}-\d+/);
  assert.match(html, /jotoglobal-analytics\.js/);
  assert.doesNotMatch(html, /<\s*(iframe|object|embed)\b|javascript\s*:/i);
}
console.log(`Verified JOTO Global article shells, sitemap discovery and ${manifest.routes.length} generated routes.`);
