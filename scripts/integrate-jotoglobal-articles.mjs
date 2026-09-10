import { readFile, writeFile } from 'node:fs/promises';

const VERSION = '20260910-1';
const pages = {
  'blog/index.html': '<html lang="en">',
  'zh/blog/index.html': '<html lang="zh-CN">',
  'fa/blog/index.html': '<html lang="fa-IR" dir="rtl">',
};

function cleanArticleIntegration(html) {
  return html
    .replace(/<link[^>]+jotoglobal-articles\.css[^>]*>/gi, '')
    .replace(/<section id="jotoglobalArticles"[^>]*><\/section>/gi, '')
    .replace(/<script[^>]+jotoglobal-articles\.js[^>]*><\/script>/gi, '');
}

function setHtmlLocale(html, replacement) {
  return html.replace(/<html\b[^>]*>/i, replacement);
}

for (const [file, htmlTag] of Object.entries(pages)) {
  const original = await readFile(file, 'utf8');
  const clean = setHtmlLocale(cleanArticleIntegration(original), htmlTag);
  const withStyles = clean.replace(
    /\s*<\/head>/i,
    `\n    <link rel="stylesheet" href="/assets/jotoglobal-articles.css?v=${VERSION}">\n  </head>`,
  );
  const next = withStyles.replace(
    /\s*<\/body>/i,
    `\n  <script type="module" src="/assets/jotoglobal-articles.js?v=${VERSION}"></script>\n</body>`,
  );
  if (next !== original) await writeFile(file, next);
}

const robotsPath = 'robots.txt';
const robots = await readFile(robotsPath, 'utf8');
if (!/article-sitemap\.xml/.test(robots)) {
  await writeFile(robotsPath, `${robots.trimEnd()}\nSitemap: https://jotoglobal.com/article-sitemap.xml\n`);
}
