# Mall Catalog Density and Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mall 目录简化为搜索、有效分类和视图切换，默认每页展示 24 件产品，并在底部加入可提交的三语言联系表单。

**Architecture:** 数据客户端负责把目录状态收敛为 `q`、`category`、`page`、`view` 四个公开参数，并固定每页 24 件、标题升序。目录控制器继续共享 Mall 首页和产品页渲染逻辑，复用 `contact-form-sections.js` 导出的表单创建器；样式层分别约束六列网格、单行型号、紧凑列表和双栏联系区。

**Tech Stack:** 原生 ES Modules、HTML、CSS、Node.js 静态契约脚本、Docker/Nginx、Playwright CLI。

## Global Constraints

- Mall 不增加价格、购物车、支付或库存交易能力。
- 默认每页固定 24 件；桌面端六列四行。
- URL 只保留 `q`、`category`、`page` 和 `view`。
- 无有效图片产品继续从列表和搜索结果中排除。
- 联系表单提交到 `/api/contact`，字段和反馈沿用现有联系表单规则。
- 英文技术文字使用 Poppins；波斯语页面保持 RTL，型号保持 LTR。
- 本轮只更新本地维护项目和 Docker 预览，不发布生产站点。

---

### Task 1: 定义精简目录的失败契约

**Files:**
- Modify: `scripts/verify-mall-data-client.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: `parseCatalogState(searchParams)`、`serializeCatalogState(state)`、`queryProducts(index, state)`
- Produces: 固定 24 件分页、忽略旧筛选参数、单行型号、紧凑列表和 Mall 联系表单的可执行契约

- [ ] **Step 1: 为目录状态写失败测试**

在 `scripts/verify-mall-data-client.mjs` 中加入：

```js
const simplified = parseCatalogState(
  "?q=router&category=Routers&brand=Huawei&status=In%20Stock&condition=New&sort=recent&direction=desc&size=12&view=list",
);
assert.deepEqual(simplified, {
  q: "router",
  category: "Routers",
  page: 1,
  pageSize: 24,
  view: "list",
});
assert.equal(
  serializeCatalogState(simplified).toString(),
  "q=router&category=Routers&view=list",
);
```

并把现有分页断言更新为：

```js
assert.equal(result.pageSize, 24);
assert.equal(result.products.length, 24);
```

- [ ] **Step 2: 为页面结构写失败测试**

在 `scripts/verify-mall-catalog-pages.mjs` 中断言：

```js
assert.match(controller, /createContactForm/);
assert.doesNotMatch(controller, /locale\.allStatuses/);
assert.doesNotMatch(controller, /locale\.allConditions/);
assert.doesNotMatch(controller, /locale\.sortRecent/);
assert.match(controller, /pageSize:\s*24/);
assert.match(styles, /\.joto-mall__card-model[\s\S]*white-space:\s*nowrap/);
assert.match(styles, /\.joto-mall__cards--list[\s\S]*max-height:\s*112px/);
```

- [ ] **Step 3: 更新浏览器回归预期**

把 `scripts/verify-mall-browser.mjs` 的目录验证调整为：

```js
assert(homeLayout.cardCount === 24, `${label}: expected 24 catalog cards`);
assert(homeLayout.resultCount === 226, `${label}: expected 226 valid products`);
assert(homeLayout.modelWhiteSpace === "nowrap", `${label}: model wrapped`);
assert(homeLayout.modelOverflow === "visible", `${label}: model clipped`);
assert(!(await page.locator('[data-select-name="status"]').count()), `${label}: status filter remains`);
assert(!(await page.locator('[data-select-name="sort"]').count()), `${label}: sort filter remains`);
```

增加旧参数清理验证：

```js
await page.goto(`${origin}${homePath}?status=legacy&sort=recent&size=12`);
await waitForCatalog(page, "[data-joto-mall-home]");
assert(!(await searchParam(page, "status")), `${label}: legacy status remains`);
assert(!(await searchParam(page, "sort")), `${label}: legacy sort remains`);
assert(!(await searchParam(page, "size")), `${label}: legacy size remains`);
```

- [ ] **Step 4: 运行失败契约**

Run:

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL，分别指出页大小仍为 12、旧筛选控件仍存在或型号仍允许换行。

- [ ] **Step 5: 提交契约测试**

```bash
git add scripts/verify-mall-data-client.mjs scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "test: define denser Mall catalog"
```

---

### Task 2: 收敛目录状态并固定 24 件分页

**Files:**
- Modify: `assets/mall-data-client.js`
- Test: `scripts/verify-mall-data-client.mjs`

**Interfaces:**
- Produces: `parseCatalogState()` 返回 `{q, category, page, pageSize: 24, view}`
- Produces: `serializeCatalogState()` 只输出 `q`、`category`、`page`、`view`
- Produces: `queryProducts()` 只按搜索和分类过滤，并按标题升序

- [ ] **Step 1: 简化状态解析**

将页大小常量和状态解析改为：

```js
const DEFAULT_PAGE_SIZE = 24;

export function parseCatalogState(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams);
  return {
    q: (params.get("q") || "").normalize("NFKC").trim().slice(0, 200),
    category: (params.get("category") || "").trim(),
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    pageSize: DEFAULT_PAGE_SIZE,
    view: params.get("view") === "list" ? "list" : "grid",
  };
}
```

- [ ] **Step 2: 简化 URL 序列化**

实现：

```js
export function serializeCatalogState(state) {
  const normalized = parseCatalogState(
    new URLSearchParams({
      q: state.q || "",
      category: state.category || "",
      page: String(state.page || 1),
      view: state.view || "grid",
    }),
  );
  const params = new URLSearchParams();
  if (normalized.q) params.set("q", normalized.q);
  if (normalized.category) params.set("category", normalized.category);
  if (normalized.page !== 1) params.set("page", String(normalized.page));
  if (normalized.view !== "grid") params.set("view", normalized.view);
  return params;
}
```

- [ ] **Step 3: 简化查询**

`queryProducts()` 只保留以下过滤和排序：

```js
return (
  (!query || haystack.includes(query)) &&
  (!state.category || productCategory(product).includes(state.category))
);
```

```js
const sorted = [...filtered].sort(
  (left, right) =>
    compareText(left.title, right.title) || compareText(left.slug, right.slug),
);
```

`facets` 只返回：

```js
facets: {
  categories: uniqueValues(filtered, (product) => productCategory(product)[0]),
},
```

- [ ] **Step 4: 运行数据客户端验证**

Run:

```bash
node scripts/verify-mall-data-client.mjs
```

Expected: `Verified Mall navigation, locale copy, and catalog data client.`

- [ ] **Step 5: 提交数据状态修改**

```bash
git add assets/mall-data-client.js scripts/verify-mall-data-client.mjs
git commit -m "feat: simplify Mall catalog state"
```

---

### Task 3: 精简目录控制器并复用联系表单

**Files:**
- Modify: `assets/contact-form-sections.js`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `scripts/verify-contact-form-sections.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Produces: `createContactForm(locale, idPrefix, formKind)` 命名导出
- Consumes: Mall 控制器调用 `createContactForm(localeCode, "mall-contact-…", "solution")`

- [ ] **Step 1: 导出表单创建器**

在 `assets/contact-form-sections.js` 中把函数声明改为：

```js
export function createContactForm(locale, idPrefix, formKind) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = contactFormMarkup(locale, idPrefix, formKind);
  const form = wrapper.firstElementChild;
  bindContactForm(form, COPY[locale]);
  return form;
}
```

在 `scripts/verify-contact-form-sections.mjs` 中增加：

```js
assert.match(script, /export function createContactForm/);
```

- [ ] **Step 2: 在目录控制器中导入表单**

在 `assets/mall-catalog-pages.js` 顶部加入：

```js
import { createContactForm } from "./contact-form-sections.js?v=20260731-3";
```

把 `contactPanel()` 改为：

```js
function contactPanel() {
  const panel = element("section", { className: "joto-mall__contact-panel" });
  const copy = element("div", { className: "joto-mall__contact-copy" }, [
    element("h2", { text: locale.contactTitle }),
    element("p", { text: locale.contactBody }),
  ]);
  const formSlot = element("div", { className: "joto-mall__contact-form" });
  formSlot.append(
    createContactForm(
      locale.lang,
      `mall-contact-${locale.lang.toLowerCase()}`,
      "solution",
    ),
  );
  panel.append(copy, formSlot);
  return panel;
}
```

- [ ] **Step 3: 删除无用筛选渲染**

从 `renderCatalog()` 删除品牌、状态、成色、排序和方向控件及对应事件分支。`paint()` 只执行：

```js
controls.replaceChildren(categoryNavigation);
```

清空操作只重置：

```js
update({ q: "", category: "", page: 1 });
```

`catalogState()` 改为：

```js
const catalogState = () => parseCatalogState(window.location.search);
```

首次渲染前清理旧参数：

```js
const normalizedParams = serializeCatalogState(state);
history.replaceState(
  {},
  "",
  `${window.location.pathname}${normalizedParams.size ? `?${normalizedParams}` : ""}`,
);
```

- [ ] **Step 4: 为型号增加完整单行属性**

在 `productCard()` 中写入：

```js
const model = product.model || "\u00a0";
copy.append(
  element("p", {
    className: "joto-mall__card-model",
    text: model,
    title: model.trim() || undefined,
    dataset: {
      length: String(model.trim().length),
    },
  }),
);
```

长度超过 28 和 38 时分别加入 `joto-mall__card-model--small`、`joto-mall__card-model--xsmall`。

- [ ] **Step 5: 运行控制器和联系表单静态验证**

Run:

```bash
node scripts/verify-contact-form-sections.mjs
node scripts/verify-mall-catalog-pages.mjs
```

Expected: 两项均通过。

- [ ] **Step 6: 提交控制器修改**

```bash
git add assets/contact-form-sections.js assets/mall-catalog-pages.js scripts/verify-contact-form-sections.mjs scripts/verify-mall-catalog-pages.mjs
git commit -m "feat: simplify Mall catalog controls"
```

---

### Task 4: 压缩网格、列表和联系区样式

**Files:**
- Modify: `assets/mall-catalog.css`
- Modify: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `.joto-mall__card-model--small`、`.joto-mall__card-model--xsmall`
- Produces: 六列四行网格、单行型号、最大 112px 列表行、双栏表单

- [ ] **Step 1: 压缩筛选区**

实现：

```css
[data-joto-mall] .joto-mall__filters {
  display: block;
  margin-bottom: 12px;
}

[data-joto-mall] .joto-mall__view-controls {
  margin-block: 10px 18px;
}
```

- [ ] **Step 2: 设置单行型号**

实现：

```css
[data-joto-mall] .joto-mall__card-model {
  margin: 0;
  overflow: visible;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: clip;
  white-space: nowrap;
}

[data-joto-mall] .joto-mall__card-model--small {
  font-size: 0.6875rem;
  letter-spacing: -0.015em;
}

[data-joto-mall] .joto-mall__card-model--xsmall {
  font-size: 0.625rem;
  letter-spacing: -0.025em;
}
```

- [ ] **Step 3: 压缩卡片高度**

把媒体和正文留白调整为：

```css
[data-joto-mall] .joto-mall__card-media {
  aspect-ratio: 1.32 / 1;
  padding: 10px;
}

[data-joto-mall] .joto-mall__card-copy {
  padding: 12px;
}

[data-joto-mall] .joto-mall__card-action {
  margin-top: 10px;
}
```

- [ ] **Step 4: 实现紧凑列表**

实现：

```css
[data-joto-mall] .joto-mall__cards--list .joto-mall__card {
  max-height: 112px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-link {
  grid-template-columns: 132px minmax(0, 1fr);
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-media {
  min-height: 110px;
  aspect-ratio: auto;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-copy {
  grid-template-columns: minmax(180px, 0.8fr) minmax(240px, 1fr) auto;
  grid-template-rows: auto auto;
  column-gap: 24px;
  align-content: center;
}
```

- [ ] **Step 5: 实现 Mall 联系表单双栏**

实现：

```css
[data-joto-mall] .joto-mall__contact-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(520px, 1.2fr);
  align-items: start;
  gap: clamp(40px, 7vw, 96px);
}

[data-joto-mall] .joto-mall__contact-form .joto-solution-contact__form {
  background: #07110d;
}
```

在 900px 以下改为单列：

```css
@media (max-width: 900px) {
  [data-joto-mall] .joto-mall__contact-panel {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: 运行样式契约**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
git diff --check
```

Expected: PASS。

- [ ] **Step 7: 提交样式**

```bash
git add assets/mall-catalog.css scripts/verify-mall-catalog-pages.mjs
git commit -m "style: increase Mall product density"
```

---

### Task 5: 集成联系表单资源并更新版本

**Files:**
- Modify: `scripts/integrate-static-asset-version.mjs`
- Modify: `scripts/integrate-site-typography-mall.mjs`
- Modify: `scripts/verify-site-typography-mall.mjs`
- Modify: `scripts/verify-site-rules.mjs`
- Modify: `scripts/verify-contact-form-sections.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `mall/index.html`
- Modify: `zh/mall/index.html`
- Modify: `fa/mall/index.html`
- Modify: all generated localized routes containing versioned shared assets

**Interfaces:**
- Produces: 静态资源版本 `20260731-3`
- Produces: 九个 Mall shell 页面加载 `contact-form-sections.css`

- [ ] **Step 1: 更新资源版本常量**

把维护脚本和验证脚本中的 `20260731-2` 更新为：

```js
const ASSET_VERSION = "20260731-3";
```

并更新 ES Module import 查询参数为 `?v=20260731-3`。

- [ ] **Step 2: 为 Mall shell 集成表单样式**

在 Mall shell 生成规则中加入：

```html
<link rel="stylesheet" href="/assets/contact-form-sections.css?v=20260731-3">
```

验证脚本要求英文、中文、波斯语的首页、产品列表和产品详情九个 shell 都含该样式。

- [ ] **Step 3: 运行集成器**

Run:

```bash
node scripts/integrate-static-asset-version.mjs
node scripts/integrate-contact-form-sections.mjs
node scripts/integrate-site-typography-mall.mjs
node scripts/integrate-homepage-refinements.mjs
```

Expected: 版本化资源和 114 条静态路由完成更新。

- [ ] **Step 4: 运行全量静态检查**

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
node --test scripts/publish-mall-snapshot.test.mjs
git diff --check
```

Expected: 全部通过。

- [ ] **Step 5: 提交资源集成**

```bash
git add -u
git commit -m "chore: version denser Mall catalog"
```

---

### Task 6: Docker 与三语言浏览器回归

**Files:**
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: `/private/tmp/joto-live-catalog.74gwfh/20260731T020808Z-run-18-partial`
- Produces: 英文、中文、波斯语在 1440、768、390 视口的验证证据

- [ ] **Step 1: 构建并启动 Docker**

Run:

```bash
docker stop jotoglobal-mall-complete-20260731-2
docker build -f Dockerfile.local -t jotoglobal-mall-density:20260731-3 .
docker run --rm -d \
  --name jotoglobal-mall-density-20260731-3 \
  -p 127.0.0.1:3009:80 \
  -v '/private/tmp/joto-live-catalog.74gwfh/20260731T020808Z-run-18-partial:/usr/share/nginx/html/mall-data:ro' \
  jotoglobal-mall-density:20260731-3
```

Expected: `http://127.0.0.1:3009/zh/mall/` 返回 200，目录索引包含 229 条原始产品。

- [ ] **Step 2: 验证默认目录**

浏览器断言：

```js
assert(cardCount === 24);
assert(total === 226);
assert(columns === 6);
assert(totalPages === 10);
assert(!location.search.includes("status="));
```

- [ ] **Step 3: 验证交互**

覆盖：

```text
搜索 → 保留 q
分类 → 只保留 category，Routers/Firewalls 均不得为空
网格/列表 → URL 保留 view
下一页 → page=2
前进/后退 → 状态恢复
旧 status/sort/size URL → 自动清理并恢复 226 件
```

- [ ] **Step 4: 验证视觉与表单**

每个语言和视口断言：

```text
型号 white-space 为 nowrap
网格型号无省略号
桌面列表行高 ≤ 112px
页面无横向溢出
Mall 联系表单包含 5 个业务字段
提交请求命中 /api/contact
成功状态可见
波斯语页面 dir=rtl，型号 dir=ltr
控制台 0 error / 0 warning
```

- [ ] **Step 5: 运行 Playwright CLI**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  open 'http://127.0.0.1:3009/zh/mall/?preview=20260731-3'
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  run-code --filename scripts/verify-mall-browser.mjs
```

Expected: 无错误输出。

- [ ] **Step 6: 提交浏览器验证**

```bash
git add scripts/verify-mall-browser.mjs
git commit -m "test: verify denser Mall catalog"
```

- [ ] **Step 7: 完成最终核对**

Run:

```bash
git status --short
git log -8 --oneline
```

Expected: 仅保留 `.playwright-cli/` 与 `.superpowers/` 临时目录未跟踪，所有维护文件已提交。
