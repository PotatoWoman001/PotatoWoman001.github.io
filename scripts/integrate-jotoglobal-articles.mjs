import { readFile, writeFile } from 'node:fs/promises';

const block = '<link rel="stylesheet" href="/assets/jotoglobal-articles.css?v=20260804-1">\n  <section id="jotoglobalArticles" class="joto-articles"></section>\n  <script type="module" src="/assets/jotoglobal-articles.js?v=20260804-1"></script>';
for (const file of ['blog/index.html', 'zh/blog/index.html', 'fa/blog/index.html']) {
  const original = await readFile(file, 'utf8');
  const clean = original.replace(/\s*<link[^>]+jotoglobal-articles\.css[^>]*>\s*<section id="jotoglobalArticles"[^>]*><\/section>\s*<script[^>]+jotoglobal-articles\.js[^>]*><\/script>/g, '');
  const next = clean.replace(/<\/body>/i, `  ${block}\n</body>`);
  if (next !== original) await writeFile(file, next);
}
