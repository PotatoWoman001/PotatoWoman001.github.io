# Mobile Hero Vertical Raster Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三语言首页移动端 Hero 改为低对比竖向机柜光柱背景，并按确认预览重排标题、正文和 CTA 的纵向层级。

**Architecture:** 继续使用 `assets/homepage-refinements.css` 的增强层，不修改编译业务代码或标题 DOM。用 Hero 的两个伪元素叠加多组纵向 `repeating-linear-gradient` 与局部高亮渐变，动画仅改变 `transform` 和 `opacity`；通过高度媒体查询保护短屏。

**Tech Stack:** 静态 HTML、CSS 媒体查询与关键帧、Node.js 静态契约、Playwright CLI。

## Global Constraints

- “物理安防”和句末圆点保持 `#5ed29c`，其余中文标题保持白色。
- 新光柱与排版只用于 `max-width: 1023px`，桌面视频背景保持原样。
- Hero 保留 `100vh` 与 `100svh` 回退，初始首屏不显示“核心能力”。
- 覆盖英文、中文、波斯语和 RTL，不允许横向溢出。
- `prefers-reduced-motion: reduce` 下停止背景位移动画。
- 不新增图片、视频、第三方依赖或 Hero 文案。

---

### Task 1: 扩展移动端 Hero 静态契约

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`
- Test: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: `assets/homepage-refinements.css` 的 Hero 移动端媒体查询。
- Produces: 竖向光柱、标题字号、分层间距和版本号的可执行静态契约。

- [ ] **Step 1: 更新首页增强资产版本**

  将 `homepageVersion` 从 `20260809-4` 改为 `20260809-5`，让三语言 HTML 在实现前先因旧版本号而失败。

- [ ] **Step 2: 新增竖向光柱与布局断言**

  在现有 Hero 断言后加入以下契约：

  ```js
  assert.match(homepageStyles, /--joto-mobile-hero-title-size/);
  assert.match(homepageStyles, /repeating-linear-gradient\(\s*90deg/);
  assert.match(homepageStyles, /joto-mobile-hero-raster-drift/);
  assert.match(homepageStyles, /data-hero-support[\s\S]*?margin-top:\s*clamp\(/);
  assert.doesNotMatch(homepageStyles, /joto-mobile-hero-breathe/);
  ```

- [ ] **Step 3: 运行静态验证并确认失败**

  Run: `node scripts/verify-homepage-refinements.mjs`

  Expected: FAIL，首先指向 HTML 仍引用 `20260809-4` 或 CSS 尚无竖向光柱契约。

### Task 2: 实现竖向光柱和移动端内容层级

**Files:**
- Modify: `assets/homepage-refinements.css`
- Test: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: `[data-home-hero-refined="true"]`、`[data-home-hero-stage]`、`[data-hero-heading-shell]`、`[data-hero-support]`。
- Produces: 三语言共享的竖向光柱背景与普通屏/短屏排版。

- [ ] **Step 1: 用竖向光柱替换横向光带**

  将两个伪元素改为全屏覆盖层：主层使用多组 `repeating-linear-gradient(90deg, ...)` 生成宽窄错落的竖列，辅层使用透明径向渐变建立局部亮度。保留 `pointer-events: none`、`will-change: transform, opacity`，把动画统一为 `joto-mobile-hero-raster-drift`。

- [ ] **Step 2: 建立标题和正文分层变量**

  在移动端 Hero 上定义并使用：

  ```css
  --joto-mobile-hero-title-size: clamp(4.15rem, 17.2vw, 5.35rem);
  --joto-mobile-hero-title-line: 0.94;
  --joto-mobile-hero-copy-gap: clamp(44px, 7.5svh, 68px);
  ```

  对 `.hero-display-heading` 和 `[data-hero-line]` 应用标题字号与行高；对 `[data-hero-support]` 应用正文间距。现有标题子元素颜色不覆盖，因此绿色词组继续由原样式控制。

- [ ] **Step 3: 调整 stage 的纵向位置**

  普通移动端 stage 使用 `padding-top: clamp(132px, 18svh, 174px)`；内容保持 100% 宽度，标题位于上半部，正文和 CTA 通过 support 间距下移。`max-height: 700px` 时将字号和间距收紧，优先保证 CTA 完整可见。

- [ ] **Step 4: 更新 reduced-motion**

  将新光柱动画在 `prefers-reduced-motion: reduce` 中设为 `none !important`，保留静态透明度与竖向结构。

- [ ] **Step 5: 运行静态验证**

  Run: `node scripts/verify-homepage-refinements.mjs`

  Expected: 仅因三语言 HTML 尚未更新为 `20260809-5` 而失败；CSS 新契约均通过。

### Task 3: 刷新三语言资产并执行浏览器回归

**Files:**
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`
- Test: `scripts/verify-homepage-refinements.mjs`
- Test: Playwright CLI against `http://127.0.0.1:3009/`

**Interfaces:**
- Consumes: 完成的 `homepage-refinements.css` 与静态契约。
- Produces: 版本一致、可本地预览的三语言移动端 Hero。

- [ ] **Step 1: 统一更新首页增强资产版本**

  在三个首页中把以下资产查询参数从 `20260809-4` 更新为 `20260809-5`：

  ```text
  /assets/homepage-refinements.css
  /assets/homepage-refinements.js
  /assets/solution-card-carousel.css
  /assets/solution-card-carousel.js
  ```

- [ ] **Step 2: 运行静态回归**

  Run: `node scripts/verify-homepage-refinements.mjs && node scripts/verify-site-typography-mall.mjs`

  Expected: 输出 `Verified homepage interaction and content refinements.`，且字体与 Mall 检查通过。

- [ ] **Step 3: 验证移动端三语言**

  使用 320 × 568、375 × 667、390 × 844 和 430 × 932 检查 `/`、`/zh/`、`/fa/`：Hero 内容与 CTA 完整可见、视频为 `display: none`、`#solutions.top >= innerHeight`、`scrollWidth === innerWidth`。中文额外断言“物理安防”计算色为 `rgb(94, 210, 156)`。

- [ ] **Step 4: 验证动效与桌面端**

  普通移动端检查伪元素动画名包含 `joto-mobile-hero-raster-drift`；reduced-motion 下动画名为 `none`。1440 × 900 下检查 Hero video 可见、CTA 可点击、控制台无新增错误。

- [ ] **Step 5: 检查差异并提交实现**

  Run: `git diff --check && git status --short`

  Expected: 本任务只修改 CSS、验证脚本、三个 HTML 和本计划文件；已知未跟踪文件保持未触碰。

  Commit: `fix: refine mobile hero vertical raster composition`
