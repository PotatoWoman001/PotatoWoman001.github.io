# 首页滚动性能与案例卡片对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让三语言首页的案例卡片对齐且 Tag 单行，并缩短、稳定 `What we deliver` 卡片与提示动画，消除纵向滚动卡顿。

**Architecture:** 保留现有 React 主包结构，在已存在的首页增强 CSS 和轮播增强脚本中增加严格的尺寸、对齐和交互覆盖。静态合约测试先描述新行为，再由 CSS/JS 最小实现满足合约，最后通过真实浏览器验证尺寸、滚动、LTR/RTL 与响应式行为。

**Tech Stack:** 静态 HTML、CSS、原生 JavaScript、Node.js 合约脚本、Docker/Nginx、Playwright

## Global Constraints

- 不修改 `assets/index-DaFvN0XI.js` 的业务组件结构。
- 解决方案卡片尺寸固定为手机 `410/320px`、平板 `430/340px`、桌面 `440/350px`（卡片/图片）。
- 提示动效使用 `72px` 最大位移和 `260/80/260ms` 三段时长。
- 任意滚轮输入都必须取消提示，横向吸附使用 `proximity`。
- 英文案例标题容器最大宽度为 `235px`，文字内部左对齐，容器与 Logo 居中对齐。
- 三个 Tag 必须单行，间距为 `4px`。
- 静态资源版本统一为 `20260729-3`。

---

### Task 1: 建立新行为的静态合约

**Files:**
- Modify: `scripts/verify-solution-card-carousel.mjs`
- Modify: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: `assets/solution-card-carousel.js`、`assets/solution-card-carousel.css`、`assets/homepage-refinements.css`
- Produces: 新尺寸、动效、滚轮取消、英文标题宽度和 Tag 单行的可执行合约

- [ ] **Step 1: 更新轮播合约**

将提示常量断言改为：

```js
assert.match(script, /HINT_MAX_DISTANCE\s*=\s*72/);
assert.match(script, /HINT_FORWARD_DURATION\s*=\s*260/);
assert.match(script, /HINT_HOLD_DURATION\s*=\s*80/);
assert.match(script, /HINT_RETURN_DURATION\s*=\s*260/);
assert.match(script, /Math\.abs\(event\.deltaY\)/);
assert.match(styles, /scroll-snap-type:\s*x proximity/);
assert.match(styles, /height:\s*440px !important/);
assert.match(styles, /height:\s*350px !important/);
```

- [ ] **Step 2: 更新案例合约**

在首页合约中增加：

```js
assert.match(homepageStyles, /html:lang\(en\) #case-studies/);
assert.match(homepageStyles, /max-width:\s*235px !important/);
assert.match(homepageStyles, /flex-wrap:\s*nowrap !important/);
assert.match(homepageStyles, /gap:\s*0\.25rem !important/);
assert.match(homepageStyles, /white-space:\s*nowrap !important/);
```

- [ ] **Step 3: 运行合约并确认失败**

Run:

```bash
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-homepage-refinements.mjs
```

Expected: 两个脚本均因旧常量或缺少新 CSS 规则而失败。

### Task 2: 实现轮播尺寸与交互性能优化

**Files:**
- Modify: `assets/solution-card-carousel.js`
- Modify: `assets/solution-card-carousel.css`

**Interfaces:**
- Consumes: `[data-solutions-scroller]`、`[data-solution-card]`、现有提示状态机
- Produces: `handleWheelInteraction(event)` 和三档固定卡片尺寸

- [ ] **Step 1: 缩短提示并扩大取消条件**

实现：

```js
const HINT_MAX_DISTANCE = 72;
const HINT_FORWARD_DURATION = 260;
const HINT_HOLD_DURATION = 80;
const HINT_RETURN_DURATION = 260;

function handleWheelInteraction(event) {
  const hasWheelInput =
    Math.abs(event.deltaX) + Math.abs(event.deltaY) > 0 || event.shiftKey;
  if (hasWheelInput) markUserInteraction();
}
```

并将 `wheel` 监听器切换到 `handleWheelInteraction`。

- [ ] **Step 2: 固定卡片与图片高度**

在轮播样式中加入：

```css
.solution-card-carousel-enhanced .solution-card-scroller {
  scroll-snap-type: x proximity !important;
  overscroll-behavior-inline: contain;
  touch-action: pan-x pan-y;
}

[data-solution-card] {
  height: 410px !important;
  contain: layout paint;
}

[data-solution-card] > div:first-child {
  height: 320px !important;
  transition-property: none !important;
}

@media (min-width: 640px) {
  [data-solution-card] { height: 430px !important; }
  [data-solution-card] > div:first-child { height: 340px !important; }
}

@media (min-width: 1280px) {
  [data-solution-card] { height: 440px !important; }
  [data-solution-card] > div:first-child { height: 350px !important; }
}
```

- [ ] **Step 3: 移除布局变化型悬停**

固定图片区和 CTA 的悬停/聚焦位置，仅保留图片 `320ms` 缩放：

```css
[data-solution-card]:hover > div:first-child,
[data-solution-card]:focus-within > div:first-child {
  height: 320px !important;
}

[data-solution-card] > a:last-child {
  transition-property: border-color, background-color, color !important;
}

[data-solution-card] img {
  transition-duration: 320ms !important;
}
```

在 `640px` 和 `1280px` 媒体查询中同步覆盖悬停/聚焦图片高度。

- [ ] **Step 4: 运行轮播合约**

Run:

```bash
node scripts/verify-solution-card-carousel.mjs
```

Expected: PASS，输出 `Verified solution carousel enhancement assets and homepage integration.`

### Task 3: 实现英文案例对齐与 Tag 单行

**Files:**
- Modify: `assets/homepage-refinements.css`

**Interfaces:**
- Consumes: `#case-studies .group > .flex-1` 卡片内容结构
- Produces: 英文 `235px` 标题文本框和全语言单行 Tag

- [ ] **Step 1: 居中英文标题文本框**

增加：

```css
html:lang(en) #case-studies .group > .flex-1 h3 {
  width: 100%;
  max-width: 235px !important;
  margin-inline: auto !important;
  text-align: start !important;
}
```

- [ ] **Step 2: 强制 Tag 单行**

增加：

```css
#case-studies .group > .flex-1 ul {
  display: flex;
  width: 100%;
  max-width: none !important;
  flex-wrap: nowrap !important;
  justify-content: center;
  gap: 0.25rem !important;
}

#case-studies .group > .flex-1 ul > li {
  flex: 0 0 auto;
  white-space: nowrap !important;
  word-break: normal !important;
}
```

- [ ] **Step 3: 运行首页合约**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
```

Expected: PASS，输出 `Verified homepage interaction and content refinements.`

### Task 4: 更新缓存版本并完成静态回归

**Files:**
- Modify: 所有维护路由的 `index.html`
- Modify: `scripts/*.mjs` 中的静态资源版本常量

**Interfaces:**
- Consumes: 当前版本 `20260729-1`
- Produces: 全站一致的新版本 `20260729-3`

- [ ] **Step 1: 机械升级版本**

对 HTML 与集成/验证脚本执行精确替换：

```text
20260729-1 → 20260729-3
```

- [ ] **Step 2: 验证版本唯一性**

Run:

```bash
rg -l '20260729-1' --glob '*.html' --glob 'scripts/*.mjs'
rg -l '20260729-3' --glob '*.html' --glob 'scripts/*.mjs' | wc -l
```

Expected: 第一条无输出；第二条包含所有维护 HTML 与相关脚本。

- [ ] **Step 3: 运行静态检查**

Run:

```bash
node --check assets/solution-card-carousel.js
node --check assets/homepage-refinements.js
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-customer-logo-wall-homepage.mjs
```

Expected: 所有命令退出码为 `0`。

### Task 5: Docker 与三语言浏览器回归

**Files:**
- Test: `index.html`
- Test: `zh/index.html`
- Test: `fa/index.html`

**Interfaces:**
- Consumes: 本地 Docker 地址 `http://127.0.0.1:3009`
- Produces: 桌面/手机、LTR/RTL、滚动与卡片布局验证证据

- [ ] **Step 1: 构建并启动新本地版本**

Run:

```bash
docker build -t jotoglobal-maintenance:20260729-3 .
docker run -d --name jotoglobal-local-20260729-v2 -p 3009:80 jotoglobal-maintenance:20260729-3
```

Expected: `http://127.0.0.1:3009/` 返回 `200`。

- [ ] **Step 2: 验证三语言桌面布局**

使用 Playwright 在 `1440×900` 打开 `/`、`/zh/`、`/fa/`，断言：

```text
解决方案卡片高度 = 440px
图片区高度 = 350px
英文 Logo 与标题容器中心差 ≤ 2px
每张案例卡片 Tag top 值唯一
document.scrollWidth = document.clientWidth
控制台错误 = 0
```

- [ ] **Step 3: 验证三语言手机布局**

使用 Playwright 在 `390×844` 重复打开三语言首页，断言：

```text
解决方案卡片高度 = 410px
图片区高度 = 320px
所有 Tag 单行
波斯语 dir = rtl
页面无横向溢出
```

- [ ] **Step 4: 验证滚动与控制**

通过真实 `mouse.wheel` 和按钮点击断言：

```text
进入区块后提示最大位移 ≤ 72px
提示总时长约 600ms
纵向 wheel 后页面 scrollY 增加且提示状态转为 cancelled/user
左右按钮逐卡移动
首尾按钮禁用状态正确
```

### Task 6: 提交并发布新版本

**Files:**
- Stage: 本计划所列 CSS、JS、测试、HTML、设计与计划文档

**Interfaces:**
- Consumes: 已验证的工作树
- Produces: 可回滚的 Git 提交与阿里云时间戳版本目录

- [ ] **Step 1: 核对差异**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: 无空白错误；只包含本任务文件和既有未跟踪工具目录。

- [ ] **Step 2: 创建提交**

Run:

```bash
git add assets/solution-card-carousel.js assets/solution-card-carousel.css assets/homepage-refinements.css scripts docs index.html zh fa
git commit -m "fix: smooth homepage delivery carousel"
```

Expected: 新提交创建成功。

- [ ] **Step 3: 创建服务器新版本**

将当前提交归档上传至 `/var/www/jotoglobal/releases/<timestamp>-<sha>`，更新：

```text
/var/www/jotoglobal/current → 新版本目录
```

保留上一版本目录，不覆盖旧版本。

- [ ] **Step 4: 验证生产页面**

在 `https://jotoglobal.com/`、`/zh/`、`/fa/` 重复 Task 5 的关键桌面/手机断言，并确认响应中引用 `v=20260729-3`。
