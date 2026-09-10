import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderArticleRelease } from './jotoglobal-article-renderer.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'joto-articles-'));
try {
  const articles = JSON.parse(await readFile('fixtures/jotoglobal-articles-v1/articles.json', 'utf8'));
  const newer = {
    ...structuredClone(articles[0]),
    id: 'fixture-article-2',
    slug: 'newer-secure-global-network',
    publishedAt: '2026-09-10T00:00:00.000Z',
    heroImage: {
      url: '/assets/hero-CCTtH425.jpg',
      alt: { en: 'New network', 'zh-CN': '新网络', 'fa-IR': 'شبکه جدید' },
    },
  };
  await renderArticleRelease({ articles: [articles[0], newer], siteRoot: root, generatedAt: '2026-09-10T00:00:00Z' });
  for (const route of ['blog/secure-global-network/index.html', 'zh/blog/secure-global-network/index.html', 'fa/blog/secure-global-network/index.html']) {
    const html = await readFile(path.join(root, route), 'utf8');
    assert.match(html, /rel="canonical"/); assert.match(html, /hreflang="en"/); assert.match(html, /hreflang="zh-CN"/); assert.match(html, /hreflang="fa-IR"/); assert.match(html, /"@type":"Article"/);
  }
  const index = JSON.parse(await readFile(path.join(root, 'article-data/index.json'), 'utf8'));
  assert.deepEqual(index.map(article => article.id), ['fixture-article-2', 'fixture-article-1']);
  assert.deepEqual(index[0].heroImage, newer.heroImage);

  const staleDirectory = path.join(root, 'zh/blog/old-article');
  await mkdir(staleDirectory, { recursive: true });
  await writeFile(path.join(staleDirectory, 'index.html'), 'old');
  const manifestPath = path.join(root, 'article-data/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.routes.push('/zh/blog/old-article/');
  await writeFile(manifestPath, JSON.stringify(manifest));

  await renderArticleRelease({ articles: [], siteRoot: root, generatedAt: '2026-09-10T01:00:00Z' });
  for (const route of [...manifest.routes]) {
    await assert.rejects(readFile(path.join(root, `.${route}`, 'index.html')), error => error.code === 'ENOENT');
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
console.log('Verified deterministic trilingual article rendering.');
