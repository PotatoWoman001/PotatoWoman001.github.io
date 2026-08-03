# Mall 手机端均衡紧凑版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把三语言 Mall 的手机产品网格固定为紧凑双列，压缩列表行高，并把产品详情页改为带页面边距的白色圆角内容面板。

**Architecture:** 保留现有 `mall-catalog-pages.js` 和 `mall-product-page.js` 的数据与渲染结构，只在共享 `mall-catalog.css` 中增加移动端密度和详情页表面规则。静态测试负责锁定断点与关键尺寸，Playwright 验证三语言真实布局、可见文案和无溢出。

**Tech Stack:** 静态 HTML、原生 JavaScript、CSS、Node.js 断言脚本、Playwright。

## Global Constraints

- 手机端网格在 `390px` 视口必须为两列。
- 每张网格卡必须保留品牌、完整型号和“查看详情”。
- 手机列表与网格继续共用 `24` 件/页的筛选结果。
- 手机列表行高不超过约 `70px`。
- 产品详情页使用浅绿色网格背景、白色圆角面板和至少 `14px` 左右边距。
- 正文“联系我们”保留；手机端重复粘性按钮不得遮挡正文。
- 英文、中文、波斯语均不得产生横向页面溢出。

---

### Task 1: 建立手机端密度和详情面板失败契约

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: 现有 `.joto-mall__cards--grid`、`.joto-mall__cards--list`、`[data-joto-mall-product]` 和 `.joto-mall__sticky-contact` 选择器。
- Produces: 手机双列、`68px` 列表行和白色详情面板的可执行契约。

- [x] **Step 1: 把静态断言从手机单列改为手机双列**

在 `verify-mall-catalog-pages.mjs` 中删除 `max-width: 419px` 单列要求，改为断言该断点仍包含：

```js
assert.match(
  styles,
  /@media\s*\(max-width:\s*419px\)[\s\S]*\.joto-mall__cards--grid[\s\S]*repeat\(2/,
);
```

- [x] **Step 2: 加入移动列表和详情表面断言**

要求 CSS 包含：

```js
assert.match(styles, /max-height:\s*68px/);
assert.match(styles, /height:\s*66px/);
assert.match(styles, /#root:has\(\[data-joto-mall-product\]\)/);
assert.match(styles, /border-radius:\s*18px/);
assert.match(styles, /font-size:\s*26px\s*!important/);
```

并断言手机 `.joto-mall__sticky-contact` 不再使用 `position: sticky`。

- [x] **Step 3: 加入浏览器布局度量**

在 `verify-mall-browser.mjs` 中把 `390px` 的期望列数改为 `2`；在手机视口断言网格卡可见“查看详情”，切换列表后首行高度 `<= 70.5px`。进入详情后读取面板左右边距、背景色、圆角、主图高度、标题字号、正常 CTA 和粘性 CTA 显示状态。

- [x] **Step 4: 运行测试并确认旧实现失败**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL，原因是旧 CSS 在 `419px` 以下仍为单列，且缺少新的详情表面与 `68px` 列表契约。

---

### Task 2: 实现共享手机端紧凑样式

**Files:**
- Modify: `assets/mall-catalog.css`

**Interfaces:**
- Consumes: Task 1 的选择器与尺寸契约。
- Produces: 三语言共用的网格、列表和产品详情移动端样式。

- [x] **Step 1: 保持最窄手机双列**

把 `@media (max-width: 419px)` 中的网格规则改为：

```css
[data-joto-mall] .joto-mall__cards--grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

- [x] **Step 2: 压缩手机网格卡片**

在 `max-width: 639px` 内设置 `8px` 网格间距、较扁图片比例、`6–8px` 文案内边距、小号品牌/型号/操作字号，隐藏 `.joto-mall__card-type`，但保留 `.joto-mall__card-action`。

- [x] **Step 3: 把手机列表压缩到约 68px**

设置：

```css
.joto-mall__cards--list .joto-mall__card { max-height: 68px; }
.joto-mall__cards--list .joto-mall__card-link { grid-template-columns: 72px minmax(0, 1fr); }
.joto-mall__cards--list .joto-mall__card-media { height: 66px; min-height: 66px; }
```

同时缩小文案内边距并保持“查看详情”可见。

- [x] **Step 4: 增加产品详情背景和面板**

在手机断点下为 `#root:has([data-joto-mall-product])` 添加与 Mall 首页一致的浅绿色网格；给 `[data-joto-mall-product]` 设置 `14px` 外边距、白色背景、`18px` 圆角、细边框和轻阴影。

- [x] **Step 5: 压缩产品详情内容**

把面包屑、主图、缩略图、标题、摘要、元数据和详情分段间距按设计规格缩小；正常 `.joto-mall__button` 在手机端保持可见，`.joto-mall__sticky-contact` 保持隐藏。

- [x] **Step 6: 运行静态测试**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-data-client.mjs
```

Expected: 两项均 PASS。

---

### Task 3: 三语言浏览器回归与发布准备

**Files:**
- Modify only if a regression is found: `assets/mall-catalog.css`
- Verify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: Task 2 的最终 CSS。
- Produces: 可供用户检查和后续发布的三语言移动端实现。

- [x] **Step 1: 复用或启动本地静态服务**

Run:

使用支持 Mall 动态详情路由和 `.runtime/mall-data/` 快照映射的本地预览服务。

Expected: `http://127.0.0.1:3010/zh/mall/` 和本地化产品详情路由均可访问。

- [x] **Step 2: 运行 Playwright 三语言矩阵**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh run-code scripts/verify-mall-browser.mjs
```

Expected: 英文、中文、波斯语的 `1440×900`、`768×1024`、`390×844` 全部通过；控制台 `0` 错误、`0` 警告。

- [x] **Step 3: 目视检查中文手机页面**

检查 `/zh/mall/` 的双列卡片和 `/zh/mall/products/<slug>/` 的详情面板，确认“查看详情”可见、详情按钮不遮挡正文、无横向滚动。

- [x] **Step 4: 运行完整静态回归**

Run:

```bash
node scripts/verify-site-rules.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-data-client.mjs
```

Expected: 全部 PASS。

- [x] **Step 5: 核对工作区**

Run:

```bash
git diff --check
git status --short
```

Expected: 只有本任务的 CSS、验证脚本和设计/计划文档发生变化；`.playwright-cli/` 与 `.superpowers/` 保持未跟踪且不纳入提交。
