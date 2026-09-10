# JOTO Global Blog Auto Article Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 下架当前 12 篇不符合要求的自动文章，并让以后发布的自动文章按时间倒序进入三语 Blog 的现有深色主网格，彻底消除页脚后的独立内容区并修正页面语言属性。

**Architecture:** 保留独立的静态文章发布器，但把列表增强改为渐进式 DOM 注入：集成器只加载资源，浏览器脚本等待 React Blog 网格后插入带稳定标记的卡片。渲染器负责输出完整列表数据并根据旧 manifest 清理下架路由；线上变更在新 release 中完成，验证后原子切换。

**Tech Stack:** Node.js ESM/CommonJS、原生 DOM API、静态 HTML/CSS、Node test runner、Playwright CLI、systemd 发布器、Nginx 静态发布目录。

## Global Constraints

- 不修改压缩后的 React 主程序。
- 当前 12 篇自动文章从公开列表、详情页、数据索引和 sitemap 完全下架，但删除前保留 Web 根目录之外的私有备份。
- 未来自动文章排在现有 6 篇之前，按 `publishedAt` 从新到旧排列。
- 三语 Blog 列表分别使用 `lang="en"`、`lang="zh-CN"`、`lang="fa-IR" dir="rtl"`。
- 数据加载或网格定位失败时，现有 6 篇文章和页脚必须保持可用。
- 发布工具资源版本统一更新为 `20260910-1`，避免旧缓存继续执行页脚注入逻辑。
- 保留工作区已有修改；每次只暂存本任务明确列出的文件。

---

### Task 1: 修正集成器与三语语言属性

**Files:**
- Modify: `work/jotoglobal-admin-integration-site/scripts/integrate-jotoglobal-articles.mjs`
- Modify: `work/jotoglobal-admin-integration-site/scripts/integrate-jotoglobal-articles.test.mjs`
- Modify: `work/jotoglobal-admin-integration-site/blog/index.html`
- Modify: `work/jotoglobal-admin-integration-site/zh/blog/index.html`
- Modify: `work/jotoglobal-admin-integration-site/fa/blog/index.html`

**Interfaces:**
- Consumes: 三语 Blog 静态入口 HTML。
- Produces: 仅包含 CSS/JS 资源引用、没有 `#jotoglobalArticles` 的幂等 HTML 集成结果；正确的 `lang`/`dir` 属性。

- [x] **Step 1: 写入失败测试**

将测试 fixture 改成三种错误语言属性，并断言集成后不存在独立 section、资源各出现一次、语言正确：

```js
const cases = [
  { prefix: '', html: '<html lang="zh-CN"><body><div id="root"></div></body></html>', expected: '<html lang="en">' },
  { prefix: 'zh', html: '<html lang="en"><body><div id="root"></div></body></html>', expected: '<html lang="zh-CN">' },
  { prefix: 'fa', html: '<html lang="en"><body><div id="root"></div></body></html>', expected: '<html lang="fa-IR" dir="rtl">' },
];
assert.doesNotMatch(html, /id="jotoglobalArticles"/);
assert.equal((html.match(/jotoglobal-articles\.js/g) || []).length, 1);
assert.equal((html.match(/jotoglobal-articles\.css/g) || []).length, 1);
assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
```

- [x] **Step 2: 运行测试并确认失败**

Run: `cd work/jotoglobal-admin-integration-site && node --test scripts/integrate-jotoglobal-articles.test.mjs`

Expected: FAIL，因为旧集成器仍输出 `#jotoglobalArticles`，且不修正三语属性。

- [x] **Step 3: 实现最小集成逻辑**

集成器先移除所有旧版资源和独立 section，再将 CSS 放入 `</head>` 前、JS 放入 `</body>` 前，并按路径修正根元素：

```js
const VERSION = '20260910-1';
const LOCALES = {
  'blog/index.html': '<html lang="en">',
  'zh/blog/index.html': '<html lang="zh-CN">',
  'fa/blog/index.html': '<html lang="fa-IR" dir="rtl">',
};

function cleanArticleIntegration(html) {
  return html
    .replace(/\s*<link[^>]+jotoglobal-articles\.css[^>]*>/gi, '')
    .replace(/\s*<section id="jotoglobalArticles"[^>]*><\/section>/gi, '')
    .replace(/\s*<script[^>]+jotoglobal-articles\.js[^>]*><\/script>/gi, '');
}

function setHtmlLocale(html, replacement) {
  return html.replace(/<html\b[^>]*>/i, replacement);
}
```

- [x] **Step 4: 运行集成器两次并验证幂等**

Run: `cd work/jotoglobal-admin-integration-site && node scripts/integrate-jotoglobal-articles.mjs && node scripts/integrate-jotoglobal-articles.mjs && node --test scripts/integrate-jotoglobal-articles.test.mjs`

Expected: PASS；三个 HTML 中无独立 section，资源引用不重复。

- [x] **Step 5: 提交该任务**

```bash
git -C work/jotoglobal-admin-integration-site add scripts/integrate-jotoglobal-articles.mjs scripts/integrate-jotoglobal-articles.test.mjs blog/index.html zh/blog/index.html fa/blog/index.html
git -C work/jotoglobal-admin-integration-site commit -m "fix: mount generated articles in blog grid"
```

### Task 2: 扩展文章索引并安全清理下架路由

**Files:**
- Modify: `work/jotoglobal-admin-integration-site/scripts/jotoglobal-article-renderer.mjs`
- Modify: `work/jotoglobal-admin-integration-site/scripts/jotoglobal-article-renderer.test.mjs`

**Interfaces:**
- Consumes: `renderArticleRelease({ articles, siteRoot, generatedAt, includePublishingId })`。
- Produces: 含 `heroImage` 的降序 `article-data/index.json`；删除旧 manifest 中存在但新 manifest 中缺失的三语文章目录。

- [x] **Step 1: 写入索引与清理失败测试**

在临时站点先写入旧 manifest 和旧文章目录，再用空文章数组重渲染：

```js
await mkdir(path.join(root, 'zh/blog/old-article'), { recursive: true });
await writeFile(path.join(root, 'zh/blog/old-article/index.html'), 'old');
await mkdir(path.join(root, 'article-data'), { recursive: true });
await writeFile(path.join(root, 'article-data/manifest.json'), JSON.stringify({
  routes: ['/zh/blog/old-article/'],
}));
await renderArticleRelease({ articles: [], siteRoot: root, generatedAt: '2026-09-10T00:00:00Z' });
await assert.rejects(readFile(path.join(root, 'zh/blog/old-article/index.html')));
```

对两篇发布时间相反的 fixture 断言排序及图片字段：

```js
assert.equal(index[0].publishedAt, '2026-09-10T00:00:00Z');
assert.deepEqual(index[0].heroImage, articles[1].heroImage);
```

- [x] **Step 2: 运行测试并确认失败**

Run: `cd work/jotoglobal-admin-integration-site && node scripts/jotoglobal-article-renderer.test.mjs`

Expected: FAIL，因为旧渲染器不清理旧路由、不输出 `heroImage`、也未显式排序。

- [x] **Step 3: 实现安全清理与排序**

新增仅接受 manifest Blog 路由的转换函数，并只删除 `siteRoot` 内解析后的文章目录：

```js
function routeDirectory(siteRoot, route) {
  if (!/^\/(?:zh\/|fa\/)?blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(route)) {
    throw new Error(`unsafe stale route: ${route}`);
  }
  const target = path.resolve(siteRoot, `.${route}`);
  const root = `${path.resolve(siteRoot)}${path.sep}`;
  if (!target.startsWith(root)) throw new Error(`unsafe stale route: ${route}`);
  return target;
}
```

读取旧 manifest，计算 `oldRoutes - newRoutes` 后使用 `rm(target, { recursive: true, force: true })`；生成列表前按日期降序排序，并输出：

```js
index.push({
  id: article.id,
  slug: article.slug,
  publishedAt: article.publishedAt || article.createdAt,
  heroImage: article.heroImage,
  translations,
});
index.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
```

- [x] **Step 4: 运行渲染测试**

Run: `cd work/jotoglobal-admin-integration-site && node scripts/jotoglobal-article-renderer.test.mjs`

Expected: 输出 `Verified deterministic trilingual article rendering.` 且退出码为 0。

- [x] **Step 5: 提交该任务**

```bash
git -C work/jotoglobal-admin-integration-site add scripts/jotoglobal-article-renderer.mjs scripts/jotoglobal-article-renderer.test.mjs
git -C work/jotoglobal-admin-integration-site commit -m "fix: prune unpublished JOTO Global article routes"
```

### Task 3: 将自动文章注入现有深色网格

**Files:**
- Modify: `work/jotoglobal-admin-integration-site/assets/jotoglobal-articles.js`
- Modify: `work/jotoglobal-admin-integration-site/assets/jotoglobal-articles.css`
- Create: `work/jotoglobal-admin-integration-site/scripts/verify-jotoglobal-blog-grid.mjs`

**Interfaces:**
- Consumes: `/article-data/index.json` 中按时间倒序的 `{ id, slug, publishedAt, heroImage, translations }[]`。
- Produces: 插在现有 Blog 网格最前面的 `<article data-joto-admin-article>`；不创建独立 section。

- [x] **Step 1: 写入静态失败验证器**

验证器读取 JS/CSS 与三语 HTML，强制检查关键约束：

```js
assert.doesNotMatch(script, /getElementById\(['"]jotoglobalArticles/);
assert.match(script, /data-joto-admin-article/);
assert.match(script, /querySelectorAll\(['"]article['"]\)/);
assert.match(script, /insertBefore/);
assert.match(script, /publishedAt/);
assert.doesNotMatch(css, /\.joto-article-card[^}]*background:\s*#fff/);
for (const html of pages) assert.doesNotMatch(html, /id="jotoglobalArticles"/);
```

- [x] **Step 2: 运行验证器并确认失败**

Run: `cd work/jotoglobal-admin-integration-site && node scripts/verify-jotoglobal-blog-grid.mjs`

Expected: FAIL，因为旧 JS 依赖 `#jotoglobalArticles` 并创建白色卡片。

- [x] **Step 3: 实现网格定位、幂等插入与本地化**

脚本从 URL 路径判断语言，等待含固定文章的主网格，清除旧自动卡片后按倒序插入：

```js
const locale = location.pathname.startsWith('/zh/') ? 'zh-CN'
  : location.pathname.startsWith('/fa/') ? 'fa-IR'
    : 'en';

function findBlogGrid() {
  return [...document.querySelectorAll('#root main section')]
    .map(section => section.querySelector(':scope > div > div'))
    .find(grid => grid && grid.querySelectorAll(':scope > article').length >= 1) || null;
}

function renderArticles(grid, articles) {
  grid.querySelectorAll('[data-joto-admin-article]').forEach(node => node.remove());
  const anchor = grid.firstElementChild;
  for (const article of [...articles].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))) {
    const card = createArticleCard(article, locale);
    grid.insertBefore(card, anchor);
  }
}
```

`createArticleCard()` 只通过 `textContent`、`href`、`src` 和 `dateTime` 设置外部数据，不使用 `innerHTML`。日期用 `Intl.DateTimeFormat` 本地化；图片缺失时跳过该条文章，避免破坏卡片结构。

- [x] **Step 4: 实现匹配现有页面的深色卡片 CSS**

自动卡片使用 `.joto-admin-card` 命名空间，覆盖图片比例、边框、标题、摘要、元信息和 hover；不修改 `.joto-article` 详情页规则。关键颜色固定为：背景 `#070b0a`、边框 `rgba(255,255,255,.18)`、正文 `rgba(255,255,255,.52)`、强调色 `#5ed29c`。

- [x] **Step 5: 运行网格静态验证**

Run: `cd work/jotoglobal-admin-integration-site && node scripts/verify-jotoglobal-blog-grid.mjs`

Expected: 命令退出码 0；HTML 无独立 section，脚本包含幂等网格注入。

- [x] **Step 6: 提交该任务**

```bash
git -C work/jotoglobal-admin-integration-site add assets/jotoglobal-articles.js assets/jotoglobal-articles.css scripts/verify-jotoglobal-blog-grid.mjs
git -C work/jotoglobal-admin-integration-site commit -m "feat: blend generated articles into blog grid"
```

### Task 4: 回归发布器与完整本地验证

**Files:**
- Modify: `work/jotoglobal-admin-github/sites/audit/backend/jotoglobal-publisher.test.js`
- Modify: `work/jotoglobal-admin-integration-site/scripts/verify-jotoglobal-articles.mjs`

**Interfaces:**
- Consumes: Task 1–3 的集成器、渲染器、资源文件。
- Produces: 发布器仍以 integrate → render → verify 顺序构建新版本，并复制全部修复资源。

- [x] **Step 1: 加强发布器与发布产物断言**

在发布器测试中断言三个 runner 调用的脚本顺序：

```js
assert.deepEqual(calls.map(([, args]) => path.basename(args[0])), [
  'integrate-jotoglobal-articles.mjs',
  'render-jotoglobal-articles.mjs',
  'verify-jotoglobal-articles.mjs',
]);
```

在产物验证器中断言三语 HTML 的正确语言属性、不包含 `#jotoglobalArticles`，并加载 `20260910-1` 资源。

- [x] **Step 2: 运行最小发布器测试**

Run: `cd work/jotoglobal-admin-github/sites/audit/backend && node --test jotoglobal-publisher.test.js jotoglobal-article-contract.test.js jotoglobal-publish-retry.test.js`

Expected: 所有 JOTO Global 发布器测试 PASS。

- [x] **Step 3: 运行站点完整相关验证**

Run:

```bash
cd work/jotoglobal-admin-integration-site
node --test scripts/integrate-jotoglobal-articles.test.mjs
node scripts/jotoglobal-article-renderer.test.mjs
node scripts/integrate-jotoglobal-articles.mjs
node scripts/integrate-jotoglobal-articles.mjs
node scripts/verify-jotoglobal-blog-grid.mjs
node scripts/verify-jotoglobal-articles.mjs
git diff --check
```

Expected: 所有命令退出码 0；第二次集成器执行不产生新增差异。

- [x] **Step 4: 提交验证变更**

```bash
git -C work/jotoglobal-admin-github add sites/audit/backend/jotoglobal-publisher.test.js
git -C work/jotoglobal-admin-github commit -m "test: preserve JOTO Global publishing pipeline order"
git -C work/jotoglobal-admin-integration-site add scripts/verify-jotoglobal-articles.mjs
git -C work/jotoglobal-admin-integration-site commit -m "test: verify blog grid article integration"
```

### Task 5: 私有备份、完全下架并原子部署

**Files:**
- Remote backup directory: `/var/lib/jotoglobal-article-publisher/backups/`
- Remote modify: `/var/www/audit/backend/data/sites/jotoglobal/articles.json`
- Remote update: `/var/www/audit/backend/jotoglobal-site-tools/`
- Remote release directory: `/var/www/jotoglobal/releases/`
- Remote symlink switch: `/var/www/jotoglobal/current`
- Remote modify with backup: `/etc/nginx/snippets/jotoglobal-locations.conf`

**Interfaces:**
- Consumes: 已通过测试的 Task 1–4 文件与线上当前 release。
- Produces: 无当前 12 篇文章、支持未来正确注入的新线上 release。

- [x] **Step 1: 只读核对线上精确目标**

Run: `ssh -i /Users/cuihua/.ssh/joto-mall-publisher root@139.224.51.172 'readlink -f /var/www/jotoglobal/current; jq length /var/www/audit/backend/data/sites/jotoglobal/articles.json; jq -r ".[].slug" /var/www/audit/backend/data/sites/jotoglobal/articles.json'`

Expected: 输出当前 release 路径、文章数 `12` 及与线上 `article-data/index.json` 一致的 12 个 slug。若数量或 slug 不一致，停止删除并重新核对。

- [x] **Step 2: 创建服务器私有备份**

Run: 在远端 shell 中先定义以下运行标识，再备份并校验：

```bash
release_id="$(date -u +%Y%m%dT%H%M%SZ)-blog-grid-fix"
backup_path="/var/lib/jotoglobal-article-publisher/backups/articles-${release_id}.json"
staging_articles="/var/lib/jotoglobal-article-publisher/articles-${release_id}.json"
release_path="/var/www/jotoglobal/releases/${release_id}"
mkdir -p /var/lib/jotoglobal-article-publisher/backups
cp /var/www/audit/backend/data/sites/jotoglobal/articles.json "$backup_path"
chmod 0640 "$backup_path"
sha256sum /var/www/audit/backend/data/sites/jotoglobal/articles.json "$backup_path"
```

Expected: 两个 SHA-256 完全一致，备份路径不位于 `/var/www/jotoglobal/current`。

- [x] **Step 3: 上传修复后的发布工具**

上传 `integrate-jotoglobal-articles.mjs`、`render-jotoglobal-articles.mjs`、`jotoglobal-article-renderer.mjs`、`verify-jotoglobal-articles.mjs`、`verify-jotoglobal-blog-grid.mjs`、`jotoglobal-articles.js` 与 `jotoglobal-articles.css` 到服务器临时目录；校验后原子替换 `/var/www/audit/backend/jotoglobal-site-tools/` 中对应文件。

Expected: 服务器工具文件的 SHA-256 与本地一致。

- [x] **Step 4: 在临时数据文件中移除当前 12 篇**

将 `[]` 写入 `$staging_articles`；不要先覆盖正式数据。

Expected: `jq length "$staging_articles"` 输出 `0`。

- [x] **Step 5: 构建并验证新 release**

复制当前 release 到新的明确目录，在新目录运行：

```bash
cp -a "$(readlink -f /var/www/jotoglobal/current)" "$release_path"
cd "$release_path"
node /var/www/audit/backend/jotoglobal-site-tools/integrate-jotoglobal-articles.mjs
node /var/www/audit/backend/jotoglobal-site-tools/render-jotoglobal-articles.mjs --articles "$staging_articles" --site-root "$release_path"
node /var/www/audit/backend/jotoglobal-site-tools/verify-jotoglobal-articles.mjs
```

再断言旧 manifest 中的 36 个三语文章 URL 已从新 release 删除，`article-data/index.json` 长度为 0，`article-sitemap.xml` 不含旧 slug。

- [x] **Step 6: 原子切换数据和站点**

先将 `$staging_articles` 原子重命名为正式 `articles.json`，再创建 `/var/www/jotoglobal/current.next.${release_id}` 符号链接并原子重命名为 `/var/www/jotoglobal/current`。

Expected: `readlink -f /var/www/jotoglobal/current` 指向新 release；正式文章数据长度为 0。

- [x] **Step 7: 阻止已删除 Blog 详情回退到 SPA**

在 Nginx 的通用 `location /` 前增加三个严格静态 Blog location：

```nginx
location ^~ /blog/ {
    try_files $uri $uri/ =404;
    add_header Cache-Control "no-cache" always;
    include /etc/nginx/snippets/jotoglobal-security-headers.conf;
}
```

对 `/zh/blog/` 与 `/fa/blog/` 使用同样规则。替换前备份原 snippet，运行 `nginx -t`，成功后 reload；失败则恢复备份。

Expected: 已删除详情路径返回 HTTP 404，现有 6 篇和未来真实生成的静态详情仍返回 HTTP 200。

- [x] **Step 8: 执行线上 HTTP 与浏览器验收**

检查 `/blog/`、`/zh/blog/`、`/fa/blog/`：HTTP 200、只有现有 6 篇、页脚后无可见内容、无 `#jotoglobalArticles`、语言属性正确。检查 12 个 slug 的三语详情 URL（含有无尾斜杠），预期全部返回 HTTP 404；检查 `article-data/index.json` 为 `[]`，sitemap 无旧 slug。

使用 Playwright 分别保存桌面和移动截图到 `output/playwright/jotoglobal-blog-grid-fix/`，并检查控制台无错误。

- [x] **Step 9: 记录恢复方式**

记录旧 release 绝对路径、备份文件绝对路径和新 release ID。若上线验证失败，将 `current` 原子切回旧 release，并用备份恢复文章数据。

Expected: 最终交付中明确列出上线 release、备份位置、验证结果与回滚入口。

---

## Plan Self-Review

- 规格覆盖：包含页脚注入、主网格排序、深色视觉、三语属性、当前文章完全下架、旧路由清理、Blog 硬 404、失败降级、幂等、发布器工具同步和原子上线。
- 占位符检查：所有实现任务包含明确文件、代码形态、命令和预期结果；部署运行标识由 Step 2 的固定命令生成。
- 类型一致性：索引字段统一为 `id`、`slug`、`publishedAt`、`heroImage`、`translations`；浏览器脚本与渲染器使用相同字段。
