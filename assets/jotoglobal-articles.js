const locale = location.pathname.startsWith('/zh/')
  ? 'zh-CN'
  : location.pathname.startsWith('/fa/')
    ? 'fa-IR'
    : 'en';

const labels = {
  en: { category: 'Enterprise IT', read: 'Read article', aria: 'Read article' },
  'zh-CN': { category: '企业 IT', read: '阅读文章', aria: '阅读文章' },
  'fa-IR': { category: 'فناوری اطلاعات سازمانی', read: 'مطالعه مقاله', aria: 'مطالعه مقاله' },
};

function findBlogGrid() {
  return [...document.querySelectorAll('#root main section div')].find(element => {
    const articles = element.querySelectorAll(':scope > article');
    return articles.length > 0 && articles.length === element.children.length;
  }) || null;
}

function waitForBlogGrid(timeoutMs = 10000) {
  const existing = findBlogGrid();
  if (existing) return Promise.resolve(existing);
  return new Promise(resolve => {
    const root = document.getElementById('root');
    if (!root) return resolve(null);
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(value);
    };
    const observer = new MutationObserver(() => {
      const grid = findBlogGrid();
      if (grid) finish(grid);
    });
    const timer = setTimeout(() => finish(null), timeoutMs);
    observer.observe(root, { childList: true, subtree: true });
  });
}

function localizedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: locale === 'en' ? 'short' : 'numeric',
    day: 'numeric',
  }).format(date);
}

function createArticleCard(template, article) {
  const item = article?.translations?.[locale];
  const image = article?.heroImage;
  if (!item || !image?.url || !image?.alt?.[locale]) return null;
  if (!/^\/(?:zh\/|fa\/)?blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.url || '')) return null;
  if (!/^\/(?:assets|article-data)\/[A-Za-z0-9._/-]+$/.test(image.url)) return null;

  const card = template.cloneNode(true);
  card.setAttribute('data-joto-admin-article', String(article.id));
  const cardImage = card.querySelector('img');
  const body = card.lastElementChild;
  const meta = body?.firstElementChild;
  const category = meta?.firstElementChild;
  const time = meta?.querySelector('time');
  const title = body?.querySelector('h2');
  const excerpt = body?.querySelector('p');
  const link = body?.querySelector('a');
  const linkLabel = link?.querySelector('span');
  if (!cardImage || !category || !time || !title || !excerpt || !link || !linkLabel) return null;

  cardImage.src = image.url;
  cardImage.alt = image.alt[locale];
  cardImage.loading = 'lazy';
  category.textContent = labels[locale].category;
  time.dateTime = String(article.publishedAt || '').slice(0, 10);
  time.textContent = localizedDate(article.publishedAt);
  title.textContent = item.title;
  excerpt.textContent = item.excerpt;
  link.href = item.url;
  link.setAttribute('aria-label', `${labels[locale].aria}: ${item.title}`);
  linkLabel.textContent = labels[locale].read;
  return card;
}

async function injectArticles() {
  const response = await fetch('/article-data/index.json', { credentials: 'same-origin' });
  if (!response.ok) return;
  const articles = await response.json();
  if (!Array.isArray(articles)) return;
  const grid = await waitForBlogGrid();
  if (!grid) return;

  grid.querySelectorAll('[data-joto-admin-article]').forEach(node => node.remove());
  const template = grid.querySelector(':scope > article');
  const anchor = grid.firstElementChild;
  if (!template || !anchor) return;
  const sorted = [...articles].sort((a, b) => {
    const dateDifference = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    return dateDifference || String(a.id).localeCompare(String(b.id));
  });
  for (const article of sorted) {
    const card = createArticleCard(template, article);
    if (card) grid.insertBefore(card, anchor);
  }
}

injectArticles().catch(() => {});
