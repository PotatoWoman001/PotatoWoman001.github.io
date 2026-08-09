# Mobile Hero Motion and First Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移动端保留轻量动效并消除原生视频播放按钮，同时让 Hero 占满首屏且不提前露出“核心能力”。

**Architecture:** 使用现有 `homepage-refinements` 增强层完成改动，不修改编译业务代码。移动端隐藏 Hero `<video>`，由 CSS 伪元素使用只触发合成的 `transform` 和 `opacity` 动画生成光带动效；Hero stage 使用完整视口高度和短屏保护规则。

**Tech Stack:** 静态 HTML、原生 JavaScript、CSS 媒体查询与关键帧、Node.js 静态验证脚本、Playwright CLI。

## Global Constraints

- 移动端保留可见动效，但不显示可见 `<video>` 和原生播放层。
- Hero 在移动端至少为 `100svh`，并提供 `100vh` 回退。
- 初始视口不得露出 `#solutions`，标题、正文和 CTA 必须完整可见。
- 不修改桌面端视频背景、文案、CTA 链接和后续板块结构。
- 覆盖英文、中文、波斯语及 320、375、390、430px 宽度，不得横向溢出。
- `prefers-reduced-motion: reduce` 下停止位移动画。

---

### Task 1: 建立移动端 Hero 静态契约

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`
- Test: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: `assets/homepage-refinements.css` 中的 `[data-home-hero-refined="true"]`、`[data-home-hero-stage]` 和 Hero video 选择器。
- Produces: 对移动端视频隐藏、`100svh` 首屏、光带动画、短屏保护和 reduced-motion 的可执行契约。

- [ ] **Step 1: 把旧的内容高度断言替换为新首屏契约**

  断言 CSS 包含 `min-height: 100vh`、`min-height: 100svh`、移动端 video `display: none`、两个光带伪元素、`@keyframes joto-mobile-hero-drift`、短屏 `max-height: 700px` 规则与 reduced-motion 停止动画规则。

- [ ] **Step 2: 运行静态契约并确认失败**

  Run: `node scripts/verify-homepage-refinements.mjs`

  Expected: FAIL，错误指向尚未实现的移动端 Hero 首屏或动效规则。

### Task 2: 实现移动端 CSS 动效与完整首屏

**Files:**
- Modify: `assets/homepage-refinements.css`
- Test: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: 已由 `assets/homepage-refinements.js` 设置的 `data-home-hero-refined`、`data-home-hero-stage` 和 `data-home-hero-content`。
- Produces: 移动端 Hero 静态背景动效、完整首屏布局及短屏适配。

- [ ] **Step 1: 隐藏移动端视频并创建动效层**

  在 `@media (max-width: 1023px)` 内隐藏 `[data-testid="hero-background-video"]`，并让 Hero 的 `::before` / `::after` 伪元素使用模糊径向渐变、`pointer-events: none`、`will-change: transform, opacity` 和错开的缓慢循环动画。

- [ ] **Step 2: 恢复一屏 Hero 并调整内容位置**

  Hero 与 stage 先声明 `min-height: 100vh`，再声明 `min-height: 100svh`。stage 使用居中对齐与顶部导航安全留白，content 轻微向上偏移，使其比现在的 `135px` 更低但不贴近屏幕底部。

- [ ] **Step 3: 增加短屏和减少动效保护**

  在 `@media (max-width: 1023px) and (max-height: 700px)` 中减小留白和位移；在 `prefers-reduced-motion: reduce` 中将伪元素的 `animation` 设为 `none`。

- [ ] **Step 4: 运行静态契约并确认通过**

  Run: `node scripts/verify-homepage-refinements.mjs`

  Expected: PASS，输出 `Homepage refinement checks passed.`

### Task 3: 更新资产版本并执行多语言浏览器回归

**Files:**
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`
- Test: `scripts/verify-homepage-refinements.mjs`
- Test: Playwright CLI against `http://127.0.0.1:3009/`

**Interfaces:**
- Consumes: 完成的 `assets/homepage-refinements.css`。
- Produces: 三语言首页同步的新资产版本与已验证的移动端首屏。

- [ ] **Step 1: 统一更新三个首页的增强资产版本**

  将 `homepage-refinements.css` 和相关增强资产的查询版本更新为同一新值，避免移动浏览器继续使用旧缓存。

- [ ] **Step 2: 运行项目静态回归**

  Run: `node scripts/verify-homepage-refinements.mjs && node scripts/verify-site-typography-mall.mjs`

  Expected: 两个脚本均 PASS。

- [ ] **Step 3: 验证四组移动端视口**

  对 `/`、`/zh/`和 `/fa/` 在 320 × 568、375 × 667、390 × 844、430 × 932 下逐页检查：Hero 底部大于或等于视口高度、`#solutions.top >= innerHeight`、Hero 内容完整可见、视频 `display: none`、页面无横向溢出。

- [ ] **Step 4: 验证 reduced-motion 与桌面端**

  在 reduced-motion 模式下检查伪元素动画为 `none`；在 1440 × 900 下检查 Hero video 仍然显示、CTA 可点击、控制台无新错误。

- [ ] **Step 5: 检查 Git 差异并提交**

  Run: `git diff --check && git status --short`

  Expected: 只有本任务的 CSS、验证脚本、三个 HTML 与计划文档发生改动，已知未跟踪文件保持未触碰。

  Commit: `fix: stabilize mobile hero motion and first screen`
