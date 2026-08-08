import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./integrate-jotoglobal-articles.mjs', import.meta.url));

test('文章入口与 sitemap 注入可重复执行', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'jotoglobal-integrate-'));
  for (const prefix of ['', 'zh', 'fa']) {
    const directory = path.join(root, prefix, 'blog');
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'index.html'), '<html><body><main>Blog</main></body></html>');
  }
  writeFileSync(path.join(root, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  execFileSync(process.execPath, [script], { cwd: root });
  execFileSync(process.execPath, [script], { cwd: root });
  const html = readFileSync(path.join(root, 'blog/index.html'), 'utf8');
  const robots = readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.equal((html.match(/id="jotoglobalArticles"/g) || []).length, 1);
  assert.equal((robots.match(/article-sitemap\.xml/g) || []).length, 1);
});
