# Mall 产品详情页响应式侧边距 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 为三语言 Mall 产品详情页增加独立的桌面、平板和手机侧边距，同时保持目录页产品密度不变。

**Architecture:** 保留现有产品详情 DOM 和渲染逻辑，只在共享 `assets/mall-catalog.css` 中把详情页根容器从通用 Mall 容器规则中分离，并用逻辑尺寸建立流体桌面留白和固定手机留白。静态断言锁定选择器和关键尺寸，浏览器验证测量真实左右留白、RTL 对称性和目录页回归。

**Tech Stack:** 静态 HTML、CSS、原生 JavaScript、Node.js 断言脚本、Playwright。

## Global Constraints

- 只修改 `[data-joto-mall-product]` 根容器，不修改产品目录、筛选区或产品卡片网格。
- 保持现有平面白色详情页，不新增桌面端圆角外框。
- 桌面端详情容器最大宽度为 `1280px`，`1440px` 视口单侧留白目标约 `80px`。
- 平板端单侧留白目标约 `32–48px`。
- 手机端外层面板单侧留白由 `14px` 提高到 `20px`。
- 英文、中文和波斯语使用逻辑尺寸；不得用固定 `left` / `right` 外边距。
- 三语言详情页和 Mall 目录页均不得产生横向页面溢出。
- 本计划不包含线上部署。

---

### Task 1: 建立详情页侧边距失败契约

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs:206-230`
- Modify: `scripts/verify-mall-browser.mjs:311-350`

**Interfaces:**
- Consumes: `[data-joto-mall-product]`、`[data-joto-mall-products]` 和现有 `verifyMallBrowser()` 视口矩阵。
- Produces: `1280px` 最大宽度、手机 `20px` 外层留白、桌面/手机真实布局度量和 RTL 对称性契约。

- [x] **Step 1: 添加静态 CSS 契约**

在 `scripts/verify-mall-catalog-pages.mjs` 的产品详情样式断言旁加入：

```js
assert.match(
  styles,
  /\[data-joto-mall\]\[data-joto-mall-product\]\s*\{[\s\S]*?max-width:\s*1280px/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*639px\)[\s\S]*?\[data-joto-mall\]\[data-joto-mall-product\]\s*\{[\s\S]*?width:\s*min\(100%\s*-\s*40px,\s*1280px\)/,
);
assert.doesNotMatch(
  styles,
  /\[data-joto-mall\]\[data-joto-mall-product\][\s\S]{0,240}(?:margin-left|margin-right):/,
);
```

- [x] **Step 2: 扩展浏览器详情页测量**

把 `scripts/verify-mall-browser.mjs` 中的详情度量移出仅手机执行的分支，并增加容器宽度、左右边距和目录容器宽度：

```js
const detailMetrics = await page.locator("[data-joto-mall-product]").evaluate((root) => {
  const rect = root.getBoundingClientRect();
  return {
    width: rect.width,
    left: rect.left,
    right: window.innerWidth - rect.right,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
});

assert(
  Math.abs(detailMetrics.left - detailMetrics.right) <= 1.5,
  `${label}: detail gutters are asymmetric`,
);
assert(detailMetrics.overflow <= 1, `${label}: detail page overflows horizontally`);

if (viewport.name === "desktop") {
  assert(detailMetrics.width <= 1280.5, `${label}: detail container is too wide`);
  assert(detailMetrics.left >= 79, `${label}: desktop detail gutter is too narrow`);
}

if (viewport.name === "mobile") {
  assert(detailMetrics.left >= 19.5, `${label}: mobile detail gutter is too narrow`);
  assert(detailMetrics.right >= 19.5, `${label}: mobile detail gutter is too narrow`);
}
```

保留现有手机详情白底、圆角、图库高度、标题字号和 CTA 断言。

- [x] **Step 3: 运行测试确认旧样式失败**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL，原因是旧详情容器仍与目录共用 `1380px` 最大宽度，手机外层面板仍使用 `100% - 28px`。

- [x] **Step 4: 提交失败契约**

```bash
git add scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "test: define mall product detail gutters"
```

---

### Task 2: 实现详情页专属响应式容器

**Files:**
- Modify: `assets/mall-catalog.css:66-80`
- Modify: `assets/mall-catalog.css:965-990`

**Interfaces:**
- Consumes: Task 1 的详情页宽度和真实浏览器边距契约。
- Produces: 三语言共用的详情页流体桌面留白、平板留白和 `20px` 手机外层留白。

- [x] **Step 1: 从通用 Mall 容器组中分离详情页**

把顶部通用规则保留给目录相关容器：

```css
[data-joto-mall] .joto-mall__inner,
[data-joto-mall] .joto-mall__section,
[data-joto-mall] .joto-mall__catalog,
[data-joto-mall] .joto-mall__list-header,
[data-joto-mall][data-joto-mall-products] {
  width: min(100% - 40px, 1380px);
  margin-inline: auto;
}
```

紧接其后增加详情页专属规则：

```css
[data-joto-mall][data-joto-mall-product] {
  width: calc(100% - clamp(64px, 10vw, 160px));
  max-width: 1280px;
  margin-inline: auto;
}
```

该计算在 `1440px` 视口受 `1280px` 最大宽度限制，形成约 `80px` 单侧留白；在较窄桌面和平板上由 `clamp()` 提供流体留白。

- [x] **Step 2: 修改手机外层面板宽度**

在 `@media (max-width: 639px)` 的通用手机容器组中移除 `[data-joto-mall][data-joto-mall-product]`，并把详情页面板规则改为：

```css
[data-joto-mall][data-joto-mall-product] {
  width: min(100% - 40px, 1280px);
  min-height: 0;
  margin: 96px auto 28px;
  border: 1px solid rgb(10 15 12 / 10%);
  border-radius: 18px;
  background: #ffffff;
  padding: 16px 14px 48px;
  box-shadow: 0 18px 52px rgb(8 19 15 / 7%);
}
```

保持现有手机内边距、圆角、网格背景和紧凑详情内容尺寸不变。

- [x] **Step 3: 运行静态契约**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-data-client.mjs
```

Expected: 两项均 PASS。

- [x] **Step 4: 提交样式实现**

```bash
git add assets/mall-catalog.css
git commit -m "fix: widen mall product detail gutters"
```

---

### Task 3: 三语言响应式与目录页回归验证

**Files:**
- Modify only if a regression is found: `assets/mall-catalog.css`
- Modify only if a contract defect is found: `scripts/verify-mall-catalog-pages.mjs`
- Modify only if a contract defect is found: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: Task 2 的最终 CSS 和 Task 1 的验证矩阵。
- Produces: 可供用户本地预览、但尚未线上部署的已验证实现。

- [x] **Step 1: 复用现有本地预览服务**

Run:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/zh/mall/
```

Expected: `200`。若现有服务不可用，使用项目既有本地预览方式启动一个支持 `/mall-data/` 映射的服务，不重复启动兼容实例。

- [x] **Step 2: 运行三语言浏览器矩阵**

Run:

```bash
node scripts/verify-mall-browser.mjs
```

Expected: 英文、中文、波斯语的 `1440×900`、`768×1024`、`390×844` 全部通过；详情页桌面单侧留白约 `80px`、手机单侧留白至少 `20px`、RTL 左右对称、页面无横向溢出。

- [x] **Step 3: 目视检查中文桌面与手机详情页**

检查首个可访问产品详情路由：

- `1440×900`：图库和摘要两栏均位于 `1280px` 内容容器内；
- `390×844`：白色详情面板与屏幕左右各保留 `20px`；
- 面包屑、图库、缩略图、标题和详情正文沿既有内容轴对齐；
- “联系我们”按钮可见且不遮挡正文。

- [x] **Step 4: 抽查 Mall 目录页无回归**

分别打开英文、中文和波斯语 Mall 目录页，确认：

- 桌面端仍为 6 列高密度产品网格；
- 手机端仍为 2 列网格；
- 分页、分类和网格/列表切换正常；
- 目录外层容器仍使用原有 `1380px` 最大宽度。

- [x] **Step 5: 运行完整静态回归**

Run:

```bash
node scripts/verify-site-rules.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-data-client.mjs
git diff --check
```

Expected: 全部 PASS，`git diff --check` 无输出。

- [x] **Step 6: 核对并提交验证调整**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: 只包含本任务的 CSS、验证脚本和计划文档；`.playwright-cli/` 与 `.superpowers/` 保持未跟踪且不纳入提交。若浏览器验证修正了本任务文件，使用：

```bash
git add assets/mall-catalog.css scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "test: verify mall product detail gutters"
```
