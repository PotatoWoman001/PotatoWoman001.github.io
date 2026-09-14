# Mall Product Mega Menu and Locale Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在商城五列大菜单中按分类展示最多 5 个真实产品详情入口，并让商城导航与页面筛选始终使用一致的五类三语显示名称。

**Architecture:** 继续以 `mall-taxonomy.js` 作为分类键与三语文案的唯一来源，以 `loadCatalogIndex()` 作为目录唯一读取入口。导航层增加纯函数完成产品筛选、去重、标签和本地化详情路由；商城页面改为直接遍历固定分类定义，不再按目录数量动态决定可见分类。

**Tech Stack:** 静态 HTML、原生 JavaScript ES modules、CSS、Node.js `assert`、Playwright CLI。

## Global Constraints

- 分类顺序固定为 `networking`、`security`、`servers-storage`、`collaboration`、`physical-security`。
- 中文、英文和波斯语分别显示对应语言的分类名称；稳定键不得出现在用户界面。
- 品牌、型号、产品系列和协议名保留官方原文。
- 桌面每列最多 5 个真实产品；移动端只显示五个一级分类。
- 产品入口必须具有有效 slug，并按 slug 与规范化“品牌 + 型号”去重。
- 目录加载失败时保留五个一级分类入口。
- 旧分类查询参数继续兼容；未知分类参数回退到全部产品。
- 不修改商城抓取和生产快照机制，不新增价格、库存、购物车、账号或推荐算法。
- 保留工作区内已有未提交改动，不暂存或提交无关文件。

---

### Task 1: Specify Product Navigation and Fixed Category Contracts

**Files:**
- Modify: `scripts/verify-mall-data-client.mjs`
- Modify: `scripts/verify-site-typography-mall.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `MALL_CATEGORIES`, `productCategoryKey(product)` and the source of `mall-navigation-and-page.js` / `mall-catalog-pages.js`.
- Produces: failing assertions for `deriveProductsByCategory(products)`, `productNavigationLabel(product)`, `localizedProductHref(locale, slug)`, maximum-five and deduplication behavior, and fixed five-category page rendering.

- [x] **Step 1: Add failing navigation helper tests**

Import the navigation helpers and add fixtures that include duplicates, incomplete products, and more than five networking products:

```js
import {
  deriveProductsByCategory,
  localizedProductHref,
  productNavigationLabel,
} from "../assets/mall-navigation-and-page.js";

const menuProducts = Array.from({ length: 7 }, (_, index) => ({
  slug: `router-${index + 1}`,
  brand: "Cisco",
  model: `C${index + 1}`,
  category_path: ["Networking", "Routers"],
}));
menuProducts.push({ ...menuProducts[0], slug: "router-duplicate" });
menuProducts.push({ slug: "missing-label", category_path: ["Networking"] });

const grouped = deriveProductsByCategory(menuProducts);
assert.equal(grouped.get("networking").length, 5);
assert.deepEqual(grouped.get("networking").map(({ slug }) => slug), [
  "router-1", "router-2", "router-3", "router-4", "router-5",
]);
assert.equal(productNavigationLabel(menuProducts[0]), "Cisco C1");
assert.equal(localizedProductHref({ key: "zh" }, "router-1"), "/zh/mall/products/router-1/");
assert.equal(localizedProductHref({ key: "fa" }, "router-1"), "/fa/mall/products/router-1/");
assert.equal(localizedProductHref({ key: "en" }, "router-1"), "/mall/products/router-1/");
```

- [x] **Step 2: Add failing fixed-category source contracts**

Require navigation and catalog rendering to consume `MALL_CATEGORIES` directly and reject the old dynamic ranking path:

```js
assert.match(navigation, /deriveProductsByCategory/);
assert.match(navigation, /localizedProductHref/);
assert.match(navigation, /productNavigationLabel/);
assert.match(pages, /MALL_CATEGORIES/);
assert.doesNotMatch(pages, /rankedCategories\(index\.products/);
```

- [x] **Step 3: Run focused checks and confirm failure**

Run:

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL because the product-navigation helpers are not exported and `mall-catalog-pages.js` still calls `rankedCategories(index.products || [])`.

- [x] **Step 4: Commit the contract changes**

```bash
git add scripts/verify-mall-data-client.mjs scripts/verify-site-typography-mall.mjs scripts/verify-mall-catalog-pages.mjs
git commit -m "test: specify Mall product navigation"
```

---

### Task 2: Render Real Products and a Fixed Localized Category Strip

**Files:**
- Modify: `assets/mall-navigation-and-page.js`
- Modify: `assets/mall-catalog-pages.js`
- Test: `scripts/verify-mall-data-client.mjs`
- Test: `scripts/verify-site-typography-mall.mjs`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `MALL_CATEGORIES`, `productCategoryKey(product)`, `localizedCategoryLabel(key, locale)`, `loadCatalogIndex()`.
- Produces: `productNavigationLabel(product): string`, `localizedProductHref(locale, slug): string`, and `deriveProductsByCategory(products): Map<string, Product[]>`.

- [x] **Step 1: Implement product label and localized detail paths**

Add pure exported helpers:

```js
const normalizedProductIdentity = (value) =>
  String(value || "").normalize("NFKC").trim().toLocaleLowerCase();

export function productNavigationLabel(product) {
  const brand = String(product?.brand || "").normalize("NFKC").trim();
  const model = String(product?.model || "").normalize("NFKC").trim();
  if (brand && model && normalizedProductIdentity(model).startsWith(`${normalizedProductIdentity(brand)} `)) {
    return model;
  }
  return [brand, model].filter(Boolean).join(" ");
}

export function localizedProductHref(locale, slug) {
  const prefix = locale.key === "zh" ? "/zh" : locale.key === "fa" ? "/fa" : "";
  return `${prefix}/mall/products/${encodeURIComponent(slug)}/`;
}
```

- [x] **Step 2: Implement ordered maximum-five grouping with deduplication**

```js
export function deriveProductsByCategory(items = []) {
  const result = new Map(MALL_CATEGORIES.map(({ key }) => [key, []]));
  const seenSlugs = new Set();
  const seenLabels = new Map(MALL_CATEGORIES.map(({ key }) => [key, new Set()]));
  items.forEach((product) => {
    const categoryKey = productCategoryKey(product);
    const bucket = result.get(categoryKey);
    const slug = String(product?.slug || "").trim();
    const label = productNavigationLabel(product);
    const identity = normalizedProductIdentity(label);
    if (!bucket || bucket.length >= 5 || !/^[a-z0-9-]{1,500}$/.test(slug) || !identity) return;
    if (seenSlugs.has(slug) || seenLabels.get(categoryKey).has(identity)) return;
    seenSlugs.add(slug);
    seenLabels.get(categoryKey).add(identity);
    bucket.push(product);
  });
  return result;
}
```

- [x] **Step 3: Replace type links with product detail links**

Change `renderMegaColumns` so each child link is generated from a product:

```js
(productsByCategory.get(category.key) || []).forEach((product) => {
  const link = document.createElement("a");
  link.href = localizedProductHref(locale, product.slug);
  link.textContent = productNavigationLabel(product);
  link.dir = "auto";
  children.append(link);
});
```

After `loadCatalogIndex()` resolves, call `renderMegaColumns(panel, locale, deriveProductsByCategory(index?.products))`; on failure render headings with empty buckets.

- [x] **Step 4: Render the page category strip from the fixed taxonomy**

Import `MALL_CATEGORIES`, remove the `rankedCategories` import and dynamic ranking variables, then paint all five localized categories:

```js
categoryTrack.replaceChildren(
  categoryButton("", locale.allProducts, !selected),
  ...MALL_CATEGORIES.map(({ key }) =>
    categoryButton(key, localizedCategoryLabel(key, locale), selected === key),
  ),
);
categoryMore.hidden = true;
categoryPopover.replaceChildren();
```

Retain the existing selection, URL serialization, result count and empty state behavior.

- [x] **Step 5: Run syntax and focused checks**

Run:

```bash
node --check assets/mall-navigation-and-page.js
node --check assets/mall-catalog-pages.js
node scripts/verify-mall-data-client.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
```

Expected: all commands PASS.

- [x] **Step 6: Commit the implementation**

```bash
git add assets/mall-navigation-and-page.js assets/mall-catalog-pages.js scripts/verify-mall-data-client.mjs scripts/verify-site-typography-mall.mjs scripts/verify-mall-catalog-pages.mjs
git commit -m "feat: show products in Mall navigation"
```

---

### Task 3: Version and Verify the Three-Locale Experience

**Files:**
- Modify: all formal HTML routes that load `assets/mall-navigation-and-page.js`
- Modify: `mall/index.html`
- Modify: `zh/mall/index.html`
- Modify: `fa/mall/index.html`
- Modify: six localized Mall list/detail shell files
- Modify: `assets/mall-navigation-and-page.js`
- Modify: `assets/mall-data-client.js`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-product-page.js`
- Modify: `scripts/verify-site-typography-mall.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Test: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: the completed product menu and fixed five-category strip.
- Produces: cache version `20260914-1` across every changed browser entry and three-locale browser evidence.

- [ ] **Step 1: Update affected asset versions mechanically**

Replace `20260824-1` with `20260914-1` only in Mall navigation/catalog module imports, formal HTML route tags, and the two static verification constants. Do not change unrelated asset versions.

- [ ] **Step 2: Run the complete relevant static suite**

Run:

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-snapshot.test.mjs
git diff --check
```

Expected: all verification scripts PASS and `git diff --check` returns no output.

- [ ] **Step 3: Serve the site and run focused browser verification**

Reuse an existing compatible local server when available; otherwise start:

```bash
python3 -m http.server 3009
```

Use the available Mall fixture or production-compatible snapshot and inspect `/mall/`, `/zh/mall/`, and `/fa/mall/` at desktop width. Assert five columns, 0–5 product links per column, localized category headings, valid localized detail hrefs, and no visible stable keys. At mobile width assert only five top-level category links and no desktop mega menu.

- [ ] **Step 4: Record exact browser measurements**

Capture for each locale: column count, child-link count per category, first product href, visible category labels, horizontal overflow status, and console errors. Any locale mismatch or invalid route blocks completion.

- [ ] **Step 5: Commit only relevant versioned files**

```bash
git diff -- '*.html'
git add -u -- '*.html'
git add assets/mall-taxonomy.js assets/mall-navigation-and-page.js assets/mall-data-client.js assets/mall-catalog-pages.js assets/mall-product-page.js scripts/verify-mall-data-client.mjs scripts/verify-site-typography-mall.mjs scripts/verify-mall-catalog-pages.mjs
git commit -m "feat: unify Mall product navigation across locales"
```

Only stage the HTML files after confirming their diff is limited to the required Mall asset version update. Before committing, inspect `git diff --cached --name-only` and unstage any file unrelated to the Mall taxonomy, navigation, localized Mall shells or required shared route version updates.
