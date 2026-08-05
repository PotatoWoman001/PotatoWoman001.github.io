const locale = document.documentElement.lang?.toLowerCase().startsWith('zh') ? 'zh-CN' : document.documentElement.lang?.toLowerCase().startsWith('fa') ? 'fa-IR' : 'en';
const labels = { en: 'Latest insights', 'zh-CN': '最新洞察', 'fa-IR': 'تازه‌ترین دیدگاه‌ها' };
const root = document.getElementById('jotoglobalArticles');
if (root) fetch('/article-data/index.json', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : []).then(articles => {
  root.replaceChildren();
  const heading = document.createElement('h2'); heading.textContent = labels[locale]; root.append(heading);
  const grid = document.createElement('div'); grid.className = 'joto-article-grid'; root.append(grid);
  for (const article of articles) {
    const item = article.translations[locale]; if (!item) continue;
    const link = document.createElement('a'); link.className = 'joto-article-card'; link.href = item.url;
    const title = document.createElement('h3'); title.textContent = item.title;
    const excerpt = document.createElement('p'); excerpt.textContent = item.excerpt;
    link.append(title, excerpt); grid.append(link);
  }
}).catch(() => root.remove());
