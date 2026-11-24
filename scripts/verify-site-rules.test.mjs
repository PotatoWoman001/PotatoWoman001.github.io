import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./verify-site-rules.mjs', import.meta.url));
const styleUrl = '/assets/index-e49ffBFL.css?v=20260804-1';
const scriptUrl = '/assets/index-DaFvN0XI.js?v=20260804-1';

test('动态文章路由不改变 114 个基础路由合约', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'jotoglobal-site-rules-'));
  mkdirSync(path.join(root, 'assets'), { recursive: true });
  const sourceRoot = path.resolve(path.dirname(script), '..');
  for (const file of ['index-e49ffBFL.css', 'index-DaFvN0XI.js']) {
    writeFileSync(path.join(root, 'assets', file), readFileSync(path.join(sourceRoot, 'assets', file)));
  }
  const baseHtml = `<link rel="stylesheet" href="${styleUrl}"><script src="${scriptUrl}"></script>`;
  for (let index = 0; index < 114; index += 1) {
    const directory = path.join(root, `base-${index}`); mkdirSync(directory); writeFileSync(path.join(directory, 'index.html'), baseHtml);
  }
  writeFileSync(path.join(root, '404.html'), baseHtml);
  const routes = ['/blog/example/', '/zh/blog/example/', '/fa/blog/example/'];
  for (const route of routes) {
    const directory = path.join(root, route); mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'index.html'), '<link rel="stylesheet" href="/assets/jotoglobal-articles.css?v=20260804-1"><script src="/assets/jotoglobal-analytics.js?v=20260804-1"></script>');
  }
  mkdirSync(path.join(root, 'article-data')); writeFileSync(path.join(root, 'article-data/manifest.json'), JSON.stringify({ routes }));
  const output = execFileSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.match(output, /114 base routes and 3 generated article routes/);
});
