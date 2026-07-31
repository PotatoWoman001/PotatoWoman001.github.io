# Mall Complete Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三语言 Mall 首页改成带搜索、筛选和分页的完整产品目录，并用轻技术网格背景与统一高密度产品卡片呈现所有有效产品。

**Architecture:** 继续使用静态 Mall 数据快照和浏览器端查询，不新增后端服务。将现有列表页的查询状态、筛选、产品网格和分页提取为首页与旧列表地址共享的目录渲染路径；产品卡片只消费规范化的品牌、型号、产品类型、图片和详情链接。

**Tech Stack:** 原生 ES Modules、DOM API、CSS Grid、静态 HTML 集成脚本、Node.js 契约测试、Docker/Nginx、本地 Playwright 浏览器回归。

## Global Constraints

- 页头和页脚继续使用全站统一黑色背景。
- Mall 正文使用白色基底、极淡绿色技术网格和 Hero 右上方低对比度绿色柔光。
- 首页删除“最近收录”，直接显示完整产品目录。
- 默认每页固定 12 个产品；桌面 6 列、平板 3 列、手机 2 列、窄于 420px 时 1 列。
- 产品卡片顺序固定为图片、品牌、完整型号、一行产品类型、查看详情。
- 产品型号不允许省略号或行数截断。
- 只展示具有真实产品图片的产品。
- 常用分类固定为产品数量最多的 5 个，数量相同时按分类名称升序排列；其余分类进入“更多分类”。
- `/mall/products/`、`/zh/mall/products/`、`/fa/mall/products/` 必须继续可用并与首页复用同一目录引擎。
- 英文、中文和波斯语功能一致；波斯语保持 RTL，品牌和型号保持 LTR。
- 不新增购物车、支付、无限滚动或新的后端依赖。

---

### Task 1: 定义完整目录契约

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: 现有静态入口、`queryProducts()` 和 Playwright 本地目录夹具。
- Produces: 首页完整目录、共享渲染、完整型号、分页和背景样式的失败契约。

- [ ] **Step 1: 将静态契约从“最近 12 个”改为“共享完整目录”**

在 `scripts/verify-mall-catalog-pages.mjs` 中删除对 `.joto-mall__section--recent`、`.joto-mall__cards--home` 和 `.slice(0, 12)` 的正向断言，增加以下契约：

```js
assert.doesNotMatch(pages, /joto-mall__section--recent/);
assert.doesNotMatch(pages, /\.slice\(0,\s*12\)/);
assert.match(pages, /function renderCatalog\(/);
assert.match(pages, /renderCatalog\(mount,\s*index,\s*\{\s*mode:\s*"home"/);
assert.match(pages, /renderCatalog\(mount,\s*index,\s*\{\s*mode:\s*"list"/);
assert.match(pages, /className:\s*"joto-mall__card-type"/);
assert.match(css, /\.joto-mall__card-model[\s\S]*overflow-wrap:\s*anywhere/);
assert.doesNotMatch(css, /\.joto-mall__card-model[\s\S]{0,240}-webkit-line-clamp/);
assert.match(css, /radial-gradient\([\s\S]*linear-gradient\(/);
```

- [ ] **Step 2: 扩充浏览器契约**

在 `scripts/verify-mall-browser.mjs` 的首页验证中增加：

```js
assert(homeLayout.cardCount === 12, `${label}: expected 12 catalog cards`);
assert(homeLayout.resultCount > 12, `${label}: home did not expose the full catalog`);
assert(homeLayout.paginationVisible, `${label}: pagination is missing`);
assert(homeLayout.modelOverflow === "visible", `${label}: model is clipped`);
assert(!homeLayout.modelText.includes("…"), `${label}: model uses ellipsis`);
assert(homeLayout.backgroundHasGrid, `${label}: technical grid is missing`);
```

并验证首页分类、品牌、搜索、页码和浏览器前进后退；旧 `/mall/products/` 地址必须产生相同的卡片结构。

- [ ] **Step 3: 运行失败测试**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node --check scripts/verify-mall-browser.mjs
```

Expected: `verify-mall-catalog-pages.mjs` 因仍存在最近收录渲染路径、缺少共享 `renderCatalog()` 和技术网格契约而失败；浏览器脚本语法检查通过。

- [ ] **Step 4: 提交失败契约**

```bash
git add scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "test: define complete Mall catalog"
```

### Task 2: 规范化产品类型和分类优先级

**Files:**
- Modify: `assets/mall-data-client.js`
- Modify: `scripts/verify-mall-data-client.mjs`

**Interfaces:**
- Consumes: `product.title`, `product.model`, `product.brand`, `product.category_path`, `index.products`.
- Produces:
  - `productTypeFor(product): string`
  - `rankedCategories(products): Array<{ name: string, count: number }>`
  - `queryProducts()` 返回的产品新增 `productType: string`

- [ ] **Step 1: 为产品类型和分类排序写失败测试**

在 `scripts/verify-mall-data-client.mjs` 中加入：

```js
assert.equal(
  productTypeFor({
    title: "AR1220C-S, Huawei AR1220C Router, 8GE LAN",
    model: "AR1220C-S",
    brand: "Huawei",
    category_path: ["Routers", "Enterprise Routers"],
  }),
  "Enterprise Routers",
);

assert.equal(
  productTypeFor({
    title: "ASA5525-K8, Cisco ASA 5500 Firewall, 8GE",
    model: "ASA5525-K8",
    brand: "Cisco",
    category_path: [],
  }),
  "ASA 5500 Firewall",
);

assert.deepEqual(
  rankedCategories([
    { category_path: ["Routers"] },
    { category_path: ["Firewalls"] },
    { category_path: ["Routers"] },
  ]),
  [
    { name: "Routers", count: 2 },
    { name: "Firewalls", count: 1 },
  ],
);
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node scripts/verify-mall-data-client.mjs
```

Expected: FAIL，因为 `productTypeFor` 和 `rankedCategories` 尚未导出。

- [ ] **Step 3: 实现规范化函数**

在 `assets/mall-data-client.js` 中实现：

```js
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function productTypeFor(product) {
  const categories = productCategory(product).filter(Boolean);
  if (categories.length) return String(categories.at(-1)).trim();

  const segments = String(product?.title || "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length < 2) return "";

  const model = String(product?.model || "").trim();
  const brand = String(product?.brand || "").trim();
  return segments[1]
    .replace(model, "")
    .replace(new RegExp(`^${escapeRegExp(brand)}\\s*`, "i"), "")
    .trim();
}

export function rankedCategories(products) {
  const counts = new Map();
  products.filter(hasProductImage).forEach((product) => {
    const name = productCategory(product)[0];
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) =>
      right.count - left.count || compareText(left.name, right.name),
    );
}
```

更新 `queryProducts()` 当前页映射：

```js
const products = sorted.slice(start, start + state.pageSize).map((product) => ({
  ...product,
  productType: productTypeFor(product),
  category_path: [...productCategory(product)],
  images: [...(product.images || [])],
  demand_tags: [...(product.demand_tags || [])],
}));
```

- [ ] **Step 4: 运行数据客户端验证**

Run:

```bash
node scripts/verify-mall-data-client.mjs
```

Expected: PASS，并确认图片占位产品仍被过滤。

- [ ] **Step 5: 提交数据规范化**

```bash
git add assets/mall-data-client.js scripts/verify-mall-data-client.mjs
git commit -m "feat: normalize Mall catalog metadata"
```

### Task 3: 将首页与旧列表页统一为单一目录引擎

**Files:**
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-i18n.js`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes:
  - `queryProducts(index, state)`
  - `rankedCategories(index.products)`
  - `serializeCatalogState(state)`
- Produces:
  - `renderCatalog(mount, index, { mode: "home" | "list" }): void`
  - 首页和旧列表地址一致的筛选、产品网格与分页行为。

- [ ] **Step 1: 导入分类排序并简化卡片内容**

在 `assets/mall-catalog-pages.js` 顶部加入：

```js
import {
  hasProductImage,
  loadCatalogIndex,
  parseCatalogState,
  queryProducts,
  rankedCategories,
  serializeCatalogState,
} from "./mall-data-client.js?v=20260731-2";
```

将 `productCard(product)` 的文字区改为：

```js
if (product.brand) {
  copy.append(element("p", {
    className: "joto-mall__card-brand",
    text: product.brand,
  }));
}
copy.append(element("p", {
  className: "joto-mall__card-model",
  text: product.model || "\u00a0",
}));
copy.append(element("p", {
  className: "joto-mall__card-type",
  text: product.productType || "\u00a0",
}));
copy.append(element("span", {
  className: "joto-mall__card-action",
  text: locale.viewDetails,
}));
```

目录卡片不再创建 `.joto-mall__card-title` 或 `.joto-mall__card-summary`。

- [ ] **Step 2: 创建共享目录渲染入口**

先将 `renderSearch(target, compact)` 改为可注入同页提交行为：

```js
function renderSearch(target, { compact = false, onSubmit } = {}) {
  const form = element("form", {
    className: compact
      ? "joto-mall__search joto-mall__search--compact"
      : "joto-mall__search",
    role: "search",
  });
  const input = element("input", {
    id: compact ? "mall-list-search" : "mall-home-search",
    type: "search",
    name: "q",
    placeholder: locale.search,
    maxLength: 200,
  });
  const label = element("label", {
    className: "joto-mall__sr-only",
    htmlFor: input.id,
    text: locale.search,
  });
  const submit = element("button", {
    type: "submit",
    className: "joto-mall__button",
    text: locale.search,
  });
  form.append(label, input, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = input.value.normalize("NFKC").trim();
    if (onSubmit) onSubmit(q);
    else {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      window.location.href =
        `${localizedPath("/mall/products/")}${params.size ? `?${params}` : ""}`;
    }
  });
  target.append(form);
  return input;
}
```

将现有 `renderList(mount, index)` 重命名为 `renderCatalog(mount, index, { mode })`。函数开头用以下代码替换原来的 `header` 初始化：

```js
function renderCatalog(mount, index, { mode }) {
  const isHome = mode === "home";
  const catalogState = () => ({
    ...parseCatalogState(window.location.search),
    pageSize: 12,
    view: "grid",
  });
  let state = catalogState();

  const header = isHome
    ? element(
        "section",
        {
          className: "joto-mall__hero joto-mall__grid-field",
          "aria-labelledby": "joto-mall-home-title",
        },
        [
          element("div", { className: "joto-mall__inner" }, [
            element("p", {
              className: "joto-mall__eyebrow",
              text: locale.eyebrow,
            }),
            element("h1", {
              id: "joto-mall-home-title",
              className: "joto-mall__hero-title",
              text: locale.homeTitle,
            }),
            element("p", {
              className: "joto-mall__hero-intro",
              text: locale.homeIntro,
            }),
          ]),
        ],
      )
    : element("header", { className: "joto-mall__list-header" }, [
        element("p", {
          className: "joto-mall__eyebrow",
          text: locale.eyebrow,
        }),
        element("h1", { text: locale.products }),
      ]);

  const catalog = element("section", {
    className: `joto-mall__catalog joto-mall__catalog--${mode}`,
  });
  const searchSlot = element("div", {
    className: "joto-mall__catalog-search",
  });
  const searchInput = renderSearch(searchSlot, {
    compact: true,
    onSubmit: (q) => update({ q, page: 1 }),
  });
  searchInput.value = state.q;
```

保留原 `renderList()` 内的 `controls`、`resultsHeading`、`live`、`resultGrid`、`pagination`、`viewControls`、自定义列表框事件和 `paint()/update()`。将最终挂载逻辑替换为：

```js
catalog.append(
  searchSlot,
  controls,
  viewControls,
  resultsHeading,
  live,
  resultGrid,
  pagination,
);
mount.replaceChildren(header, catalog);
if (isHome) mount.append(contactPanel());
mount.setAttribute("aria-busy", "false");
paint();
installCatalogSeo(isHome ? "home" : "products");
```

将原首页联系区域提取为完整函数：

```js
function contactPanel() {
  return element("section", { className: "joto-mall__contact-panel" }, [
    element("div", {}, [
      element("h2", { text: locale.contactTitle }),
      element("p", { text: locale.contactBody }),
    ]),
    element("a", {
      href: localizedPath("/contact/"),
      className: "joto-mall__button",
      text: locale.contact,
    }),
  ]);
}
```

`paint()` 必须继续调用 `queryProducts(index, state)`，并在所有筛选变化时使用：

```js
update({ [select.name]: select.value, page: 1 });
```

删除原来额外注册在 `searchSlot.querySelector("form")` 上的提交监听；`popstate` 必须恢复固定 12 个产品和网格视图：

```js
window.addEventListener("popstate", () => {
  state = catalogState();
  paint();
});
```

- [ ] **Step 3: 构建首页常用分类与更多分类**

在 `renderCatalog()` 内根据 `rankedCategories(index.products)` 生成，并创建稳定的分类导航节点：

```js
const ranked = rankedCategories(index.products || []);
const primaryCategories = ranked.slice(0, 5);
const additionalCategories = ranked.slice(5);
const categoryNavigation = element("div", {
  className: "joto-mall__category-navigation",
  "aria-label": locale.categories,
});

function categoryButton(value, label, selected) {
  return element("button", {
    type: "button",
    className: selected
      ? "joto-mall__category joto-mall__category--active"
      : "joto-mall__category",
    text: label,
    dataset: { category: value },
    "aria-pressed": String(selected),
  });
}

function paintCategories(selected) {
  const items = [
    categoryButton("", locale.allProducts, !selected),
    ...primaryCategories.map(({ name }) =>
      categoryButton(name, name, selected === name),
    ),
  ];
  if (additionalCategories.length) {
    const additionalValues = additionalCategories.map(({ name }) => name);
    items.push(
      selectControl(
        locale.category,
        "category",
        [
          { value: "", label: locale.moreCategories },
          ...additionalValues.map((value) => ({
            value,
            label: value,
            dir: "ltr",
          })),
        ],
        additionalValues.includes(selected) ? selected : "",
      ),
    );
  }
  categoryNavigation.replaceChildren(...items);
}
```

在 `paint()` 中先调用 `paintCategories(state.category)`，并让 `controls.replaceChildren()` 的第一个子节点固定为 `categoryNavigation`，取代原来的完整分类 `selectControl()`：

```js
paintCategories(state.category);
const remainingFilterControls = [];
if (result.facets.brands.length) {
  remainingFilterControls.push(
    selectControl(
      locale.brand,
      "brand",
      filterOptions(locale.allBrands, result.facets.brands),
      state.brand,
    ),
  );
}
if (result.facets.statuses.length) {
  remainingFilterControls.push(
    selectControl(
      locale.status,
      "status",
      filterOptions(locale.allStatuses, result.facets.statuses),
      state.status,
    ),
  );
}
if (result.facets.conditions.length) {
  remainingFilterControls.push(
    selectControl(
      locale.condition,
      "condition",
      filterOptions(locale.allConditions, result.facets.conditions),
      state.condition,
    ),
  );
}
remainingFilterControls.push(
  selectControl(
    locale.sort,
    "sort",
    [
      { value: "title", label: locale.sortTitle },
      { value: "brand", label: locale.sortBrand },
      { value: "recent", label: locale.sortRecent },
    ],
    state.sort,
  ),
  selectControl(
    "",
    "direction",
    [
      { value: "asc", label: locale.ascending },
      { value: "desc", label: locale.descending },
    ],
    state.direction,
  ),
);
controls.replaceChildren(
  categoryNavigation,
  ...remainingFilterControls,
);
```

在 `controls` 的现有点击委托最前面加入：

```js
const category = event.target.closest("[data-category]");
if (category) {
  update({ category: category.dataset.category, page: 1 });
  return;
}
```

“更多分类”继续使用现有 `select` 变更委托，因此非常用分类选中后会直接更新结果并在触发按钮中显示。

- [ ] **Step 4: 实现编号分页**

新增纯函数：

```js
function paginationItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const ordered = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const items = [];
  ordered.forEach((value, index) => {
    if (index && value - ordered[index - 1] > 1) items.push("ellipsis");
    items.push(value);
  });
  return items;
}
```

在 `paint()` 中用以下结构替换原来的三段式分页：

```js
pagination.replaceChildren();
const previous = element("button", {
  type: "button",
  text: locale.previous,
  disabled: result.page <= 1,
});
previous.addEventListener("click", () =>
  update({ page: result.page - 1 }, { scroll: true }),
);
pagination.append(previous);

paginationItems(result.page, result.totalPages).forEach((item) => {
  if (item === "ellipsis") {
    pagination.append(
      element("span", {
        className: "joto-mall__pagination-ellipsis",
        text: "…",
        "aria-hidden": "true",
      }),
    );
    return;
  }
  const pageButton = element("button", {
    type: "button",
    className: "joto-mall__pagination-page",
    text: String(item),
    "aria-current": item === result.page ? "page" : undefined,
    "aria-label": `${locale.page} ${item}`,
  });
  pageButton.addEventListener("click", () =>
    update({ page: item }, { scroll: true }),
  );
  pagination.append(pageButton);
});

pagination.append(
  element("span", {
    className: "joto-mall__pagination-mobile-current",
    text: `${locale.page} ${result.page} / ${result.totalPages}`,
  }),
);
const next = element("button", {
  type: "button",
  text: locale.next,
  disabled: result.page >= result.totalPages,
});
next.addEventListener("click", () =>
  update({ page: result.page + 1 }, { scroll: true }),
);
pagination.append(next);
```

CSS 在移动端隐藏编号页码和省略号，只显示 `.joto-mall__pagination-mobile-current`；桌面端反向隐藏移动当前页文本。

- [ ] **Step 5: 添加可清除筛选的空状态**

将 `paint()` 的空结果分支替换为：

```js
if (!result.products.length) {
  const empty = element("div", { className: "joto-mall__empty" }, [
    element("p", { text: locale.noResults }),
  ]);
  const clear = element("button", {
    type: "button",
    className: "joto-mall__button",
    text: locale.clearFilters,
  });
  clear.addEventListener("click", () =>
    update({
      q: "",
      category: "",
      brand: "",
      status: "",
      condition: "",
      sort: "title",
      direction: "asc",
      page: 1,
    }),
  );
  empty.append(clear);
  resultGrid.append(empty);
} else {
  result.products.forEach((product) =>
    resultGrid.append(productCard(product)),
  );
}
```

- [ ] **Step 6: 更新三个入口调用**

首页加载成功后：

```js
renderCatalog(mount, index, { mode: "home" });
```

旧列表页加载成功后：

```js
renderCatalog(mount, index, { mode: "list" });
```

删除 `renderHome()` 中最近收录、场景列表和独立产品截取逻辑。无边框联系区域仅在首页目录末尾渲染。

- [ ] **Step 7: 更新国际化文本**

在 `assets/mall-i18n.js` 为三语言补齐共享目录需要的键：

```js
allProductsHeading
moreCategories
clearFilters
```

中文使用“全部产品”“更多分类”“清除筛选”；英文和波斯语提供对应译文。

- [ ] **Step 8: 运行静态目录验证**

Run:

```bash
node --check assets/mall-catalog-pages.js
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
```

Expected: PASS，首页不再包含最近收录路径，首页和旧列表页均调用 `renderCatalog()`。

- [ ] **Step 9: 提交共享目录引擎**

```bash
git add assets/mall-catalog-pages.js assets/mall-i18n.js scripts/verify-mall-catalog-pages.mjs
git commit -m "feat: turn Mall home into full catalog"
```

### Task 4: 实现轻技术网格与统一高密度卡片

**Files:**
- Modify: `assets/mall-catalog.css`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `.joto-mall__catalog--home`、`.joto-mall__cards--grid`、`.joto-mall__card-model`、`.joto-mall__card-type` 和编号分页 DOM。
- Produces: A 方案背景、6×2 桌面网格和响应式目录视觉。

- [ ] **Step 1: 添加轻技术网格背景**

为首页目录壳层加入：

```css
[data-joto-mall][data-joto-mall-home] {
  background-color: #f8fbf9;
  background-image:
    radial-gradient(circle at 82% 10%, rgb(89 210 161 / 15%), transparent 28%),
    linear-gradient(rgb(31 115 83 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(31 115 83 / 5%) 1px, transparent 1px);
  background-size: auto, 36px 36px, 36px 36px;
}
```

产品目录容器使用半透明白色或纯白表面，保证背景网格只作为低对比度层次。

- [ ] **Step 2: 统一卡片网格**

```css
[data-joto-mall] .joto-mall__cards--grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

[data-joto-mall] .joto-mall__card {
  min-width: 0;
  height: 100%;
  background: #fff;
}

[data-joto-mall] .joto-mall__card-media {
  aspect-ratio: 4 / 3;
  background: #fff;
}
```

- [ ] **Step 3: 完整显示型号并固定信息层级**

```css
[data-joto-mall] .joto-mall__card-model {
  margin: 0;
  color: var(--mall-ink);
  font-size: clamp(0.75rem, 0.65rem + 0.18vw, 0.875rem);
  font-weight: 600;
  line-height: 1.4;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

[data-joto-mall] .joto-mall__card-type {
  min-height: 1.5em;
  overflow: hidden;
  color: var(--mall-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

`.joto-mall__card-copy` 使用网格行 `auto auto auto 1fr auto`，保证“查看详情”在卡片底部对齐。

- [ ] **Step 4: 实现响应式列数与移动分页**

```css
@media (max-width: 1279px) {
  [data-joto-mall] .joto-mall__cards--grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  [data-joto-mall] .joto-mall__cards--grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 419px) {
  [data-joto-mall] .joto-mall__cards--grid {
    grid-template-columns: 1fr;
  }
}
```

在移动端隐藏非当前页的编号按钮与省略号，同时保留上一页、当前页/总页数和下一页。

- [ ] **Step 5: 运行静态样式验证**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
git diff --check
```

Expected: PASS，并检测到技术网格、6/3/2/1 列断点、完整型号和白色图片区域。

- [ ] **Step 6: 提交样式**

```bash
git add assets/mall-catalog.css scripts/verify-mall-catalog-pages.mjs
git commit -m "style: refine complete Mall catalog"
```

### Task 5: 升级资源版本并完成全量静态集成

**Files:**
- Modify: `assets/contact-form-sections.js`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-product-page.js`
- Modify: `scripts/integrate-static-asset-version.mjs`
- Modify: all localized HTML files updated by integration scripts

**Interfaces:**
- Consumes: 已验证的 Mall JS/CSS。
- Produces: 所有现有静态入口引用 `20260731-2` 的一致资源版本。

- [ ] **Step 1: 将 Mall 资源版本升级为 `20260731-2`**

将 Mall 模块导入和集成脚本中的 `20260731-1` 更新为 `20260731-2`，包括：

```js
const ASSET_VERSION = "20260731-2";
```

- [ ] **Step 2: 运行静态页面集成**

Run:

```bash
node scripts/integrate-static-asset-version.mjs
node scripts/integrate-contact-form-sections.mjs
node scripts/integrate-homepage-refinements.mjs
node scripts/integrate-site-typography-mall.mjs
```

Expected: 所有现有三语言入口被更新，但不改变静态路由数量。

- [ ] **Step 3: 运行全量静态验证**

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
node --test scripts/test-publish-mall-catalog.mjs scripts/test-publish-mall-snapshot.mjs
git diff --check
```

Expected: 所有命令退出码为 0；站点规则继续覆盖 114 个路由。

- [ ] **Step 4: 提交版本集成**

```bash
git add assets scripts index.html zh fa solutions services about blog contact mall
git commit -m "chore: version complete Mall catalog"
```

提交前使用 `git status --short` 确认 `.playwright-cli/` 和 `.superpowers/` 未被暂存。

### Task 6: Docker 与三语言浏览器回归

**Files:**
- Modify: `scripts/verify-mall-browser.mjs`
- No production deployment in this task.

**Interfaces:**
- Consumes: 本地 Docker 站点和本地 Mall 数据快照。
- Produces: 英文、中文、波斯语及响应式完整目录的浏览器验证证据。

- [ ] **Step 1: 构建新的本地镜像**

Run:

```bash
docker build -t jotoglobal-mall-complete:20260731-2 .
```

Expected: 镜像构建成功。

- [ ] **Step 2: 启动精确版本的本地容器**

Run:

```bash
docker run --rm -d \
  --name jotoglobal-mall-complete-20260731-2 \
  -p 127.0.0.1:3009:80 \
  -v "/private/tmp/joto-live-catalog.74gwfh/20260731T020808Z-run-18-partial:/usr/share/nginx/html/mall-data:ro" \
  jotoglobal-mall-complete:20260731-2
```

Expected:

```text
http://127.0.0.1:3009/zh/mall/?preview=20260731-2
```

返回 HTTP 200，`/mall-data/manifest.json` 返回 JSON，目录索引包含 229 个产品。

- [ ] **Step 3: 运行浏览器矩阵**

Run:

```bash
node scripts/verify-mall-browser.mjs http://127.0.0.1:3009
```

覆盖：

```text
en: desktop/tablet/mobile
zh: desktop/tablet/mobile
fa: desktop/tablet/mobile/RTL/reduced-motion
```

Expected: 所有场景通过，控制台错误和页面错误均为空。

- [ ] **Step 4: 验证关键交互**

浏览器测试必须验证：

```text
首页默认 12 个有效产品
桌面 6×2
常用分类筛选
更多分类筛选
品牌筛选
搜索
排序和方向
编号分页首尾状态
筛选后 page=1
URL 刷新恢复
浏览器前进后退恢复
完整型号无省略号
旧 /mall/products/ 地址兼容
无横向溢出
```

- [ ] **Step 5: 修复发现的问题并重跑**

每次修改后重新运行：

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-browser.mjs http://127.0.0.1:3009
git diff --check
```

Expected: 全部通过。

- [ ] **Step 6: 提交浏览器验证**

```bash
git add scripts/verify-mall-browser.mjs
git commit -m "test: verify complete Mall catalog"
```

- [ ] **Step 7: 最终核对**

Run:

```bash
git status --short
git log -7 --oneline
```

Expected: 只剩用户已有的未跟踪本地工具目录；本任务代码与计划均已提交。

## Completion Evidence

最终交付必须报告：

- 设计文档和实施计划路径；
- 本任务提交列表；
- 全量静态测试结果；
- 三语言浏览器矩阵结果；
- 本地 Docker 预览 URL；
- 明确说明生产站是否部署。
