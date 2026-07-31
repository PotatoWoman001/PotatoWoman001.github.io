# Mall 白色高密度首页实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三语言 Mall 正文改为白色主题，并让首页最近收录在桌面端以 6 列 × 2 行展示 12 个紧凑产品卡片。

**Architecture:** 保留现有 Mall 数据客户端和产品卡片 DOM 结构，在首页最近收录容器上增加专属修饰类，用 CSS 隔离首页高密度布局，避免影响产品列表页。主题颜色继续由 `assets/mall-catalog.css` 顶层变量统一控制；渲染数量和中文文案分别由 `assets/mall-catalog-pages.js` 与 `assets/mall-i18n.js` 管理。

**Tech Stack:** 静态 HTML、CSS、浏览器原生 JavaScript 模块、Node.js 断言脚本、Docker/Nginx、本地 Playwright 浏览器回归。

## Global Constraints

- Mall 正文、卡片和图片区域使用白色背景；顶部全站导航栏和底部全站页脚保持黑色。
- 首页最近收录从具有有效图片的产品中选取 12 个。
- 首页断点固定为：`>=1280px` 6 列、`768px–1279px` 3 列、`420px–767px` 2 列、`<420px` 1 列。
- 首页卡片保留品牌、标题、型号和详情动作；标题最多两行；摘要不显示。
- 产品列表页继续保留完整摘要及现有网格/列表切换，不使用首页 6 列规则。
- 中文介绍文字必须为 `浏览 JOTO 可提供的产品型号、技术资料与应用场景。`
- 联系产品区无外框、无独立背景色。
- 英文继续 Poppins；中文继续 Poppins、苹方、微软雅黑回退；波斯语继续 Poppins、Vazirmatn 和 RTL。
- 没有真实图片的产品继续被过滤；不修改抓取快照和目录发布流程。
- 不新增运行时依赖，不提交 `.playwright-cli/` 或 `.superpowers/`。

---

### Task 1: 建立白色主题与高密度首页失败契约

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: 当前 `assets/mall-catalog.css`、`assets/mall-catalog-pages.js`、`assets/mall-i18n.js` 文本内容及浏览器 DOM。
- Produces: 对 12 个产品、首页专属类名、白色主题、断点列数、间距、联系区和中文文案的可执行契约。

- [ ] **Step 1: 添加静态控制器与文案断言**

在 `scripts/verify-mall-catalog-pages.mjs` 的 Mall 控制器断言中加入：

```js
assert.match(
  pages,
  /className:\s*"joto-mall__section joto-mall__section--recent"/,
);
assert.match(
  pages,
  /className:\s*"joto-mall__cards joto-mall__cards--home"/,
);
assert.match(pages, /\.slice\(0,\s*12\)/);
assert.ok(
  i18n.includes(
    'homeIntro: "浏览 JOTO 可提供的产品型号、技术资料与应用场景。"',
  ),
  "Chinese Mall intro copy is stale",
);
```

- [ ] **Step 2: 添加静态白色主题与断点断言**

将深色主题断言替换为：

```js
for (const expected of [
  "--mall-bg: #ffffff",
  "--mall-surface: #ffffff",
  "--mall-surface-raised: #ffffff",
  "--mall-ink: #0a0f0c",
  "--mall-green: #5dd3a0",
  "color-scheme: light",
]) {
  assert.ok(styles.includes(expected), `Mall styles missing ${expected}`);
}

assert.match(
  styles,
  /\.joto-mall__cards--home\s*\{[\s\S]*grid-template-columns:\s*repeat\(6/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*1279px\)[\s\S]*\.joto-mall__cards--home[\s\S]*repeat\(3/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*767px\)[\s\S]*\.joto-mall__cards--home[\s\S]*repeat\(2/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*419px\)[\s\S]*\.joto-mall__cards--home[\s\S]*grid-template-columns:\s*1fr/,
);
assert.match(
  styles,
  /\.joto-mall__cards--home[\s\S]*\.joto-mall__card-summary\s*\{[\s\S]*display:\s*none/,
);
assert.match(
  styles,
  /\.joto-mall__contact-panel\s*\{[\s\S]*border:\s*0[\s\S]*background:\s*transparent/,
);
```

- [ ] **Step 3: 扩展浏览器布局断言**

在 `exerciseCatalog()` 的 Mall 首页加载后读取一次布局：

```js
const homeLayout = await page.locator("[data-joto-mall-home]").evaluate((root) => {
  const cards = [...root.querySelectorAll(".joto-mall__cards--home .joto-mall__card")];
  const firstCard = cards[0];
  const grid = root.querySelector(".joto-mall__cards--home");
  const search = root.querySelector(".joto-mall__search");
  const categories = root.querySelector(".joto-mall__section--categories");
  const contact = root.querySelector(".joto-mall__contact-panel");
  const summary = firstCard?.querySelector(".joto-mall__card-summary");
  const media = firstCard?.querySelector(".joto-mall__card-media");
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");
  return {
    cardCount: cards.length,
    columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    background: getComputedStyle(root).backgroundColor,
    mediaBackground: media ? getComputedStyle(media).backgroundColor : "",
    summaryDisplay: summary ? getComputedStyle(summary).display : "missing",
    heroCategoryGap:
      categories.getBoundingClientRect().top - search.getBoundingClientRect().bottom,
    contactBorderWidth: getComputedStyle(contact).borderTopWidth,
    contactBackground: getComputedStyle(contact).backgroundColor,
    headerBackground: header ? getComputedStyle(header).backgroundColor : "",
    footerBackground: footer ? getComputedStyle(footer).backgroundColor : "",
  };
});
```

并断言：

```js
const expectedColumns =
  viewport.width >= 1280 ? 6 : viewport.width >= 768 ? 3 : viewport.width >= 420 ? 2 : 1;
assert(homeLayout.cardCount === 12, `${testCase.locale}/${viewport.name}: expected 12 home cards`);
assert(homeLayout.columns === expectedColumns, `${testCase.locale}/${viewport.name}: unexpected home columns`);
assert(homeLayout.background === "rgb(255, 255, 255)", `${testCase.locale}/${viewport.name}: Mall is not white`);
assert(homeLayout.mediaBackground === "rgb(255, 255, 255)", `${testCase.locale}/${viewport.name}: media is not white`);
assert(homeLayout.summaryDisplay === "none", `${testCase.locale}/${viewport.name}: home summary is visible`);
assert(homeLayout.heroCategoryGap <= 48, `${testCase.locale}/${viewport.name}: hero/category gap is too large`);
assert(homeLayout.contactBorderWidth === "0px", `${testCase.locale}/${viewport.name}: contact border remains`);
assert(
  homeLayout.contactBackground === "rgba(0, 0, 0, 0)"
    || homeLayout.contactBackground === "transparent",
  `${testCase.locale}/${viewport.name}: contact background remains`,
);
```

在产品列表页加载后补充：

```js
assert(
  await page.locator(".joto-mall__card-summary").first().isVisible(),
  `${testCase.locale}/${viewport.name}: product-list summaries were hidden`,
);
```

- [ ] **Step 4: 运行失败契约**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node --check scripts/verify-mall-browser.mjs
```

Expected: `verify-mall-catalog-pages.mjs` 因首页仍截取 6 个产品、深色令牌和旧中文文案而失败；浏览器脚本语法检查通过。

- [ ] **Step 5: 提交测试契约**

```bash
git add scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "test: define white dense Mall homepage"
```

---

### Task 2: 实现首页 12 个产品与中文文案

**Files:**
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-i18n.js`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `hasProductImage(product)` 和 `MALL_COPY` 现有接口。
- Produces: `.joto-mall__section--recent`、`.joto-mall__cards--home` DOM 合约及 12 个首页产品。

- [ ] **Step 1: 修改中文介绍文案**

将中文 `homeIntro` 修改为：

```js
homeIntro: "浏览 JOTO 可提供的产品型号、技术资料与应用场景。",
```

- [ ] **Step 2: 增加首页专属类名**

在 `renderHome()` 中修改最近收录元素：

```js
const recentSection = element("section", {
  className: "joto-mall__section joto-mall__section--recent",
});
recentSection.append(sectionHeading("", locale.recent));
const recentGrid = element("div", {
  className: "joto-mall__cards joto-mall__cards--home",
});
```

- [ ] **Step 3: 将首页截取数量改为 12**

保持图片过滤和排序顺序不变，仅将：

```js
.slice(0, 6)
```

改为：

```js
.slice(0, 12)
```

- [ ] **Step 4: 运行静态验证并确认此任务契约通过**

Run:

```bash
node --check assets/mall-catalog-pages.js
node --check assets/mall-i18n.js
node scripts/verify-mall-catalog-pages.mjs
```

Expected: JavaScript 语法检查通过；静态验证只可能继续因 Task 3 尚未实现的白色 CSS 契约而失败，不再因 DOM、数量或中文文案失败。

- [ ] **Step 5: 提交渲染和文案**

```bash
git add assets/mall-catalog-pages.js assets/mall-i18n.js
git commit -m "feat: expand Mall home recommendations"
```

---

### Task 3: 实现白色主题、紧凑卡片和响应式网格

**Files:**
- Modify: `assets/mall-catalog.css`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: Task 2 生成的 `.joto-mall__section--recent` 与 `.joto-mall__cards--home`。
- Produces: 三语言共用的白色 Mall 主题和首页 6/3/2/1 列响应式布局。

- [ ] **Step 1: 切换 Mall 主题令牌**

将顶层令牌改为：

```css
[data-joto-mall] {
  --mall-bg: #ffffff;
  --mall-surface: #ffffff;
  --mall-surface-raised: #ffffff;
  --mall-ink: #0a0f0c;
  --mall-muted: rgba(10, 15, 12, 0.64);
  --mall-green: #5dd3a0;
  --mall-line: rgba(10, 15, 12, 0.16);
  color-scheme: light;
}
```

将搜索框、自定义下拉菜单、选项文字等现有硬编码深色值改为对应主题变量；保留绿色按钮上的深色文字。移除 Hero 径向深色渐变：

```css
[data-joto-mall] .joto-mall__hero {
  padding-block: clamp(84px, 10vw, 136px) 24px;
  background: var(--mall-bg);
}
```

- [ ] **Step 2: 去掉 Hero 与分类之间的大面积空白**

```css
[data-joto-mall] .joto-mall__section--categories {
  padding-block: 0 32px;
  border-top: 0;
}
```

移动端 Hero 同样使用 `padding-block: 104px 24px`，确保搜索框到分类标题的实际间距不超过 48px。

- [ ] **Step 3: 增加桌面 6 列首页网格**

```css
[data-joto-mall] .joto-mall__cards--home {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}
```

- [ ] **Step 4: 压缩首页卡片并隐藏摘要**

```css
[data-joto-mall] .joto-mall__cards--home .joto-mall__card-media {
  aspect-ratio: 4 / 3;
  background: #ffffff;
}

[data-joto-mall] .joto-mall__cards--home .joto-mall__card-copy {
  padding: 16px;
}

[data-joto-mall] .joto-mall__cards--home .joto-mall__card-brand,
[data-joto-mall] .joto-mall__cards--home .joto-mall__card-model {
  margin-bottom: 7px;
  font-size: 10px;
}

[data-joto-mall] .joto-mall__cards--home .joto-mall__card-title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

[data-joto-mall] .joto-mall__cards--home .joto-mall__card-summary {
  display: none;
}

[data-joto-mall] .joto-mall__cards--home .joto-mall__card-action {
  padding-top: 14px;
  font-size: 12px;
}
```

- [ ] **Step 5: 添加首页专属断点**

将这些规则放在对应媒体查询中，并置于通用 `.joto-mall__cards` 规则之后：

```css
@media (max-width: 1279px) {
  [data-joto-mall] .joto-mall__cards--home {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  [data-joto-mall] .joto-mall__cards--home {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 419px) {
  [data-joto-mall] .joto-mall__cards--home {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: 移除联系产品区外框和底色**

保留现有 Flex、宽度和响应式方向，仅修改：

```css
[data-joto-mall] .joto-mall__contact-panel {
  border: 0;
  background: transparent;
  padding-inline: 0;
}
```

- [ ] **Step 7: 运行静态验证**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
git diff --check
```

Expected: 三项全部通过。

- [ ] **Step 8: 提交样式实现**

```bash
git add assets/mall-catalog.css
git commit -m "style: add white dense Mall layout"
```

---

### Task 4: 更新资源版本并完成静态回归

**Files:**
- Modify: `assets/contact-form-sections.js`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-product-page.js`
- Modify: `scripts/integrate-contact-form-sections.mjs`
- Modify: `scripts/integrate-static-asset-version.mjs`
- Modify: `scripts/integrate-homepage-refinements.mjs`
- Modify: `scripts/integrate-site-typography-mall.mjs`
- Modify: `scripts/verify-contact-form-sections.mjs`
- Modify: `scripts/verify-homepage-refinements.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-site-rules.mjs`
- Modify: `scripts/verify-site-typography-mall.mjs`
- Modify: `scripts/verify-solution-card-carousel.mjs`
- Modify: `404.html`
- Modify: all 114 maintained `index.html` files generated by the four integration scripts

**Interfaces:**
- Consumes: Task 2–3 的新 CSS/JS 资源。
- Produces: 全站一致的 `20260731-1` 缓存版本，保证浏览器不复用旧 Mall 样式。

- [ ] **Step 1: 将脚本与模块的受控资源版本统一改为 `20260731-1`**

将本任务文件列表中 13 个 `assets/*.js` 与 `scripts/*.mjs` 文件里的
`20260730-1` 全部更新为 `20260731-1`。同时将
`scripts/integrate-static-asset-version.mjs` 的正式路由数量断言从 `108`
更新为 `114`，与当前验证脚本和实际路由数一致。

- [ ] **Step 2: 运行资源集成**

Run:

```bash
node scripts/integrate-static-asset-version.mjs
node scripts/integrate-contact-form-sections.mjs
node scripts/integrate-homepage-refinements.mjs
node scripts/integrate-site-typography-mall.mjs
```

Expected: 所有受维护正式路由使用 `20260731-1`，脚本没有路由数量或缺失资源错误。

- [ ] **Step 3: 运行完整静态回归**

Run:

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-mall-snapshot.mjs fixtures/mall-snapshot-v1
node --test scripts/verify-mall-snapshot.test.mjs scripts/publish-mall-snapshot.test.mjs
git diff --check
```

Expected: 所有命令退出码为 `0`。

- [ ] **Step 4: 提交版本与集成结果**

```bash
git add assets scripts 404.html \
  index.html zh fa mall solutions about blog contact
git commit -m "chore: version white dense Mall assets"
```

---

### Task 5: Docker 与三语言浏览器验证

**Files:**
- Modify: `scripts/verify-mall-browser.mjs`
- Read: `Dockerfile.local`
- Read: `deploy/local/nginx.conf`

**Interfaces:**
- Consumes: `20260731-1` 的完整站点和本地 Mall 数据快照。
- Produces: 英文/中文/波斯语、桌面/平板/手机的可复现浏览器验证结果与本地预览。

- [ ] **Step 1: 构建本地 Docker 镜像**

Run:

```bash
docker build -f Dockerfile.local -t jotoglobal-mall-white-dense:20260731-1 .
```

Expected: 镜像构建成功。

- [ ] **Step 2: 启动本地预览**

使用明确命名的新容器，并将当前有效 Mall 数据快照只读挂载到 `/usr/share/nginx/html/mall-data`：

```bash
docker run --name jotoglobal-mall-white-dense-20260731-1 --rm -d \
  -p 127.0.0.1:3009:80 \
  -v "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/20260729T033844Z-run-8:/usr/share/nginx/html/mall-data:ro" \
  jotoglobal-mall-white-dense:20260731-1
```

Expected: `http://127.0.0.1:3009/zh/mall/` 返回 Mall 首页。

- [ ] **Step 3: 运行 Playwright 三语言矩阵**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  open "http://127.0.0.1:3009/zh/mall/?preview=20260731-1"

/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  run-code "$(cat scripts/verify-mall-browser.mjs)"
```

Expected:

- en/zh/fa × 1440×900、768×1024、390×844 全部通过。
- 桌面首页为 12 张卡片、6 列；平板为 3 列；390px 为 1 列。
- Mall 正文与产品图片区域为白色，导航和页脚仍为黑色。
- Hero 到分类间距不超过 48px。
- 联系产品区无边框、无独立背景。
- 产品列表摘要仍可见。
- 波斯语为 RTL。
- 无横向溢出、控制台错误或警告。

- [ ] **Step 4: 在右侧浏览器展示中文预览**

打开：

```text
http://127.0.0.1:3009/zh/mall/?preview=20260731-1
```

保留该标签供用户检查，不发布到线上服务器。

- [ ] **Step 5: 核对提交与工作树**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: 只保留用户原有未跟踪的 `.playwright-cli/` 与 `.superpowers/`；本任务实现均已提交。
