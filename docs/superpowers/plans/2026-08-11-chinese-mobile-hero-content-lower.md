# 中文移动端首屏内容整体下移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将中文移动端首页 Hero 的标题、说明和 CTA 整体下移到用户标注位置，同时保持短屏完整可见。

**Architecture:** 在 `assets/homepage-refinements.css` 现有移动端变量体系中增加中文专属的内容组偏移变量，并由短屏媒体查询回收偏移。静态测试验证规则作用域，浏览器几何测试验证四种移动端尺寸。

**Tech Stack:** HTML、CSS 自定义属性、Node.js 静态契约测试、Playwright 浏览器验证。

## Global Constraints

- 仅中文移动端改变；英文、波斯语和桌面端保持现状。
- 标题、正文和两个 CTA 作为整体移动。
- 不修改字号、行距、按钮尺寸、文字、链接和背景动画。
- 320×568 下两个 CTA 必须完整显示，页面不得产生水平溢出。

---

### Task 1: 中文移动端内容组偏移

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`
- Modify: `assets/homepage-refinements.css`
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`

**Interfaces:**
- Consumes: `[data-home-hero-refined="true"]`、`[data-home-hero-content]`。
- Produces: `--joto-mobile-hero-content-shift` 及中文移动端计算后的 `translateY()`。

- [ ] **Step 1: 写入失败的静态契约**

在 `scripts/verify-homepage-refinements.mjs` 增加断言，要求中文移动端定义常规屏偏移，并在 `max-height: 700px` 与 `max-width: 359px` 中提供回收值。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node scripts/verify-homepage-refinements.mjs`

Expected: FAIL，提示缺少 `--joto-mobile-hero-content-shift`。

- [ ] **Step 3: 实现最小 CSS 调整**

常规中文移动端使用：

```css
html:lang(zh) [data-home-hero-refined="true"] {
  --joto-mobile-hero-content-shift: clamp(42px, 7svh, 68px);
}

html:lang(zh)
  [data-home-hero-refined="true"]
  [data-home-hero-content] {
  margin-top: var(--joto-mobile-hero-content-shift);
}
```

在 `max-height: 700px` 使用 `18px`，在 `max-width: 359px` 使用 `10px`。更新首页增强 CSS 的版本参数，避免线上缓存旧样式。

- [ ] **Step 4: 运行静态验证**

Run: `node scripts/verify-homepage-refinements.mjs && node scripts/verify-site-typography-mall.mjs`

Expected: PASS。

- [ ] **Step 5: 执行四种手机尺寸几何验证**

检查标题顶部、CTA 底部、下一节顶部和水平溢出：

```js
({
  contentTop: Math.round(document.querySelector('[data-home-hero-content]').getBoundingClientRect().top),
  actionsBottom: Math.round(document.querySelector('[data-home-hero-actions]').getBoundingClientRect().bottom),
  solutionsTop: Math.round(document.querySelector('#solutions').getBoundingClientRect().top),
  overflow: document.documentElement.scrollWidth - innerWidth,
})
```

Expected: 内容组较现状下移；`actionsBottom <= innerHeight`、`solutionsTop >= innerHeight`、`overflow === 0`。英文与波斯语无新增偏移。

- [ ] **Step 6: 发布并线上复核**

创建新发布目录、切换 `/var/www/jotoglobal/current`，检查 Nginx 配置，再用线上中文首页验证计算样式和邮箱地址均无回归。
