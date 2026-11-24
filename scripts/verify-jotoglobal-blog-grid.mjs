import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const script = await readFile('assets/jotoglobal-articles.js', 'utf8');
const css = await readFile('assets/jotoglobal-articles.css', 'utf8');
const pages = await Promise.all([
  readFile('blog/index.html', 'utf8'),
  readFile('zh/blog/index.html', 'utf8'),
  readFile('fa/blog/index.html', 'utf8'),
]);

assert.doesNotMatch(script, /getElementById\(['"]jotoglobalArticles/);
assert.match(script, /data-joto-admin-article/);
assert.match(script, /querySelectorAll\(['"]:scope > article['"]\)/);
assert.match(script, /insertBefore/);
assert.match(script, /publishedAt/);
assert.match(script, /heroImage/);
assert.doesNotMatch(script, /innerHTML/);
assert.doesNotMatch(css, /\.joto-article-card[^}]*background:\s*#fff/);
for (const html of pages) {
  assert.doesNotMatch(html, /id="jotoglobalArticles"/);
  assert.equal((html.match(/jotoglobal-articles\.js\?v=20260910-1/g) || []).length, 1);
  assert.equal((html.match(/jotoglobal-articles\.css\?v=20260910-1/g) || []).length, 1);
}
assert.match(pages[0], /<html lang="en">/);
assert.match(pages[1], /<html lang="zh-CN">/);
assert.match(pages[2], /<html lang="fa-IR" dir="rtl">/);

console.log('Verified generated articles target the existing localized Blog grid.');
