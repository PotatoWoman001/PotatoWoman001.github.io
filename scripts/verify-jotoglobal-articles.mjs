import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
for (const file of ['blog/index.html', 'zh/blog/index.html', 'fa/blog/index.html']) {
  const html = await readFile(file, 'utf8'); assert.match(html, /id="jotoglobalArticles"/); assert.match(html, /jotoglobal-articles\.js/);
}
const robots = await readFile('robots.txt', 'utf8'); assert.match(robots, /article-sitemap\.xml/);
console.log('Verified JOTO Global article shells and sitemap discovery.');
