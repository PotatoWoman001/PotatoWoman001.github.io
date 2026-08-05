import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCALES = ['en', 'zh-CN', 'fa-IR'];
const PREFIX = { en: '', 'zh-CN': '/zh', 'fa-IR': '/fa' };
const LANG = { en: 'en', 'zh-CN': 'zh-CN', 'fa-IR': 'fa-IR' };

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function assertSafeContent(html) {
  if (/<\s*(script|iframe|object|embed|style)\b|\son\w+\s*=|javascript\s*:/i.test(html || '')) throw new Error('unsafe article HTML');
  return html;
}
function routeFor(locale, slug) { return `${PREFIX[locale]}/blog/${slug}` || `/blog/${slug}`; }
function fileFor(locale, slug) { return path.join(locale === 'en' ? '' : locale === 'zh-CN' ? 'zh' : 'fa', 'blog', slug, 'index.html'); }

function pageHtml(article, locale) {
  const item = article.translations[locale];
  const canonical = `https://jotoglobal.com${routeFor(locale, article.slug)}`;
  const links = LOCALES.map(code => `<link rel="alternate" hreflang="${code}" href="https://jotoglobal.com${routeFor(code, article.slug)}">`).join('\n  ');
  const structured = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: item.title, description: item.seoDescription, image: `https://jotoglobal.com${article.heroImage.url}`, datePublished: article.publishedAt || article.createdAt, inLanguage: LANG[locale], mainEntityOfPage: canonical }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="${LANG[locale]}"${locale === 'fa-IR' ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(item.seoTitle)}</title><meta name="description" content="${escapeHtml(item.seoDescription)}"><link rel="canonical" href="${canonical}">${links}<link rel="stylesheet" href="/assets/jotoglobal-articles.css?v=20260804-1"><script type="application/ld+json">${structured}</script></head><body><main class="joto-article"><a class="joto-article__back" href="${PREFIX[locale]}/blog">← Blog</a><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.excerpt)}</p><img class="joto-article__hero" src="${escapeHtml(article.heroImage.url)}" alt="${escapeHtml(article.heroImage.alt[locale])}"><article class="joto-article__body">${assertSafeContent(item.content)}</article></main><script type="module" src="/assets/jotoglobal-analytics.js?v=20260804-1"></script></body></html>\n`;
}

export async function renderArticleRelease({ articles, siteRoot, generatedAt, includePublishingId = null }) {
  const selected = articles.filter(article => article.site === 'jotoglobal' && (article.status === 'published' || article.id === includePublishingId));
  const index = [];
  const routes = [];
  for (const article of selected) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '')) throw new Error(`invalid slug: ${article.slug}`);
    for (const locale of LOCALES) if (!article.translations?.[locale]) throw new Error(`missing translation: ${locale}`);
    const translations = {};
    for (const locale of LOCALES) {
      const relative = fileFor(locale, article.slug); const target = path.join(siteRoot, relative);
      await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, pageHtml(article, locale));
      routes.push(`/${relative.replace(/index\.html$/, '')}`);
      translations[locale] = { title: article.translations[locale].title, excerpt: article.translations[locale].excerpt, url: routeFor(locale, article.slug) };
    }
    index.push({ id: article.id, slug: article.slug, publishedAt: article.publishedAt || article.createdAt, translations });
  }
  const dataDir = path.join(siteRoot, 'article-data'); await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  const sitemapEntries = routes.map(route => `  <url><loc>https://jotoglobal.com${route}</loc></url>`);
  await writeFile(path.join(siteRoot, 'article-sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join('\n')}\n</urlset>\n`);
  await writeFile(path.join(dataDir, 'manifest.json'), `${JSON.stringify({ generatedAt, articleCount: index.length, routes }, null, 2)}\n`);
  return { routes, sitemapEntries };
}
