import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
for (const file of ['blog/index.html', 'zh/blog/index.html', 'fa/blog/index.html']) {
  const html = await readFile(file, 'utf8'); assert.match(html, /id="jotoglobalArticles"/); assert.match(html, /jotoglobal-articles\.js/);
}
const robots = await readFile('robots.txt', 'utf8'); assert.match(robots, /article-sitemap\.xml/);
const manifestPath = 'article-data/manifest.json';
const requireRendered = process.argv.includes('--require-rendered');
assert.ok(!requireRendered || existsSync(manifestPath), 'rendered article manifest is required');
const manifest = existsSync(manifestPath)
  ? JSON.parse(await readFile(manifestPath, 'utf8'))
  : { articleCount: 0, routes: [] };
assert.equal(manifest.articleCount * 3, manifest.routes.length);
for (const route of manifest.routes) {
  assert.match(route, /^\/(?:zh\/|fa\/)?blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/);
  const html = await readFile(path.join(`.${route}`, 'index.html'), 'utf8');
  assert.match(html, /rel="canonical"/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="zh-CN"/);
  assert.match(html, /hreflang="fa-IR"/);
  assert.match(html, /jotoglobal-articles\.css/);
  assert.match(html, /jotoglobal-analytics\.js/);
  assert.doesNotMatch(html, /<\s*(iframe|object|embed)\b|javascript\s*:/i);
}
console.log(`Verified JOTO Global article shells, sitemap discovery and ${manifest.routes.length} generated routes.`);
