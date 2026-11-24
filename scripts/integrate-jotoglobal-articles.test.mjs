import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./integrate-jotoglobal-articles.mjs', import.meta.url));

test('文章入口与 sitemap 注入可重复执行', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'jotoglobal-integrate-'));
  const cases = [
    { prefix: '', htmlTag: '<html lang="zh-CN">', expectedTag: '<html lang="en">' },
    { prefix: 'zh', htmlTag: '<html lang="en">', expectedTag: '<html lang="zh-CN">' },
    { prefix: 'fa', htmlTag: '<html lang="en">', expectedTag: '<html lang="fa-IR" dir="rtl">' },
  ];
  for (const { prefix, htmlTag } of cases) {
    const directory = path.join(root, prefix, 'blog');
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'index.html'), `${htmlTag}<head></head><body><div id="root"></div></body></html>`);
  }
  writeFileSync(path.join(root, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  try {
    execFileSync(process.execPath, [script], { cwd: root });
    const firstPass = new Map(cases.map(({ prefix }) => {
      const file = path.join(root, prefix, 'blog/index.html');
      return [file, readFileSync(file, 'utf8')];
    }));
    execFileSync(process.execPath, [script], { cwd: root });
    for (const { prefix, expectedTag } of cases) {
      const file = path.join(root, prefix, 'blog/index.html');
      const html = readFileSync(file, 'utf8');
      assert.equal(html, firstPass.get(file), `${prefix || 'en'} integration should be byte-for-byte idempotent`);
      assert.ok(html.includes(expectedTag), `${prefix || 'en'} should use ${expectedTag}`);
      assert.doesNotMatch(html, /id="jotoglobalArticles"/);
      assert.equal((html.match(/jotoglobal-articles\.js/g) || []).length, 1);
      assert.equal((html.match(/jotoglobal-articles\.css/g) || []).length, 1);
      assert.match(html, /jotoglobal-articles\.js\?v=20261124-1/);
      assert.match(html, /jotoglobal-articles\.css\?v=20261124-1/);
      assert.ok(html.indexOf('jotoglobal-articles.css') < html.indexOf('</head>'));
      assert.ok(html.indexOf('jotoglobal-articles.js') < html.indexOf('</body>'));
    }
    const robots = readFileSync(path.join(root, 'robots.txt'), 'utf8');
    assert.equal((robots.match(/article-sitemap\.xml/g) || []).length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
