# 中文移动端 Hero 行距与位置精调 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩大中文移动端 Hero 两行标题的行距，并将正文与 CTA 组下移到用户标注位置，同时保持短屏完整可见和其他语言无回归。

**Architecture:** 继续沿用 `assets/homepage-refinements.css` 的移动端 CSS 变量体系，增加仅对 `html:lang(zh)` 生效的行高与正文间距覆盖；短屏媒体查询单独回收数值。静态验证锁定语言作用域和短屏覆盖，Playwright 验证实际几何位置与溢出。

**Tech Stack:** HTML、CSS 自定义属性、Node.js 静态契约测试、Playwright 浏览器验证。

## Global Constraints

- 仅中文移动端改变；英文、波斯语和桌面端保持现状。
- 中文常规手机标题行高约为 `1.06`。
- 430 × 932 下正文顶部相对上一版下移约 45–55px。
- 320 × 568 下两个 CTA 必须完整显示在首屏内。
- 不修改标题字号、文字、颜色、按钮尺寸、链接或竖向光柱动效。

---

### Task 1: 中文移动端行距与正文位置

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs:105-125`
- Modify: `assets/homepage-refinements.css:259-431`

**Interfaces:**
- Consumes: `[data-home-hero-refined="true"]`、`--joto-mobile-hero-title-line`、`--joto-mobile-hero-copy-gap`。
- Produces: `html:lang(zh)` 范围内的中文移动端行高与正文间距覆盖，以及 `max-height: 700px` / `max-width: 359px` 的短屏回收值。

- [ ] **Step 1: 写入失败的静态契约**

在 `scripts/verify-homepage-refinements.mjs` 增加以下断言：

```js
assert.match(
  homepageStyles,
  /html:lang\(zh\)[\s\S]*?--joto-mobile-hero-title-line:\s*1\.06/,
);
assert.match(
  homepageStyles,
  /html:lang\(zh\)[\s\S]*?--joto-mobile-hero-copy-gap:\s*clamp\(78px,\s*10\.5svh,\s*98px\)/,
);
assert.match(
  homepageStyles,
  /max-height:\s*700px[\s\S]*?html:lang\(zh\)[\s\S]*?--joto-mobile-hero-copy-gap:/,
);
```

- [ ] **Step 2: 运行静态验证并确认失败**

Run: `node scripts/verify-homepage-refinements.mjs`

Expected: FAIL，提示未找到中文语言作用域的 `1.06` 行高或新正文间距。

- [ ] **Step 3: 实现中文常规屏与短屏覆盖**

在 `assets/homepage-refinements.css` 的移动端媒体查询内加入：

```css
html:lang(zh) [data-home-hero-refined="true"] {
  --joto-mobile-hero-copy-gap: clamp(78px, 10.5svh, 98px);
  --joto-mobile-hero-title-line: 1.06;
}
```

在 `max-height: 700px` 内加入：

```css
html:lang(zh) [data-home-hero-refined="true"] {
  --joto-mobile-hero-copy-gap: clamp(32px, 6svh, 42px);
  --joto-mobile-hero-title-line: 1;
}
```

在 `max-width: 359px` 内加入：

```css
html:lang(zh) [data-home-hero-refined="true"] {
  --joto-mobile-hero-copy-gap: 24px;
  --joto-mobile-hero-title-line: 1;
}
```

- [ ] **Step 4: 运行静态验证并确认通过**

Run: `node scripts/verify-homepage-refinements.mjs && node scripts/verify-site-typography-mall.mjs`

Expected: 两项验证均通过，114 条本地化路由无回归。

- [ ] **Step 5: 执行浏览器几何回归**

在中文 430 × 932、390 × 844、375 × 667、320 × 568 下检查：

```js
({
  titleLineHeight: getComputedStyle(document.querySelector('[data-hero-line]')).lineHeight,
  supportTop: Math.round(document.querySelector('[data-hero-support]').getBoundingClientRect().top),
  actionsBottom: Math.round(document.querySelector('[data-home-hero-actions]').getBoundingClientRect().bottom),
  solutionsTop: Math.round(document.querySelector('#solutions').getBoundingClientRect().top),
  overflow: document.documentElement.scrollWidth - innerWidth,
})
```

Expected: 430 × 932 标题行高约 78px、正文顶部约 420–435px；所有尺寸 `actionsBottom <= innerHeight`、`solutionsTop >= innerHeight`、`overflow === 0`。英文与波斯语各抽查 430 × 932，行高保持原值。

- [ ] **Step 6: 检查并提交**

Run: `git diff --check && git status --short`

提交文件：

```bash
git add assets/homepage-refinements.css scripts/verify-homepage-refinements.mjs
git commit -m "fix: refine Chinese mobile hero spacing"
```

