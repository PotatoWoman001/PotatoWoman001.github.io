# Mobile Hero Flow and Juniper Logo Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让三语言首页的移动端 Hero 在 CTA 后紧接“核心能力”，并让 Juniper Networks 字标与同类横向 Logo 视觉尺寸协调。

**Architecture:** 继续使用 `homepage-refinements.css` 覆盖原 bundle 的手机端整屏高度，不修改主 bundle。Juniper 保持现有卡片与插入逻辑，仅调整本地 SVG 的 `viewBox` 使字标在同宽容器内放大。

**Tech Stack:** 静态 HTML、CSS、ES modules、SVG、Node.js 断言脚本、Playwright CLI。

## Global Constraints

- 仅修改英文、简体中文和波斯语首页，不改变桌面端 Hero。
- 手机端 Hero 内容起点继续保持在 `112px–152px`。
- CTA 后到“核心能力”仅保留 `40–56px` 间距。
- Juniper 仍为手机端第 21 个品牌，桌面端仍显示原 20 个品牌。
- 不引入第三方依赖，不修改联系表单和 Solution 页面行为。
- `320×568`、`375×812`、`390×844`、`430×932` 视口的根页面横向溢出必须为 `0`。

---

### Task 1: 建立 Hero 高度与 Juniper 尺寸静态契约

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`
- Test: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: `assets/homepage-refinements.css` 和 `assets/juniper-networks-logo.svg` 的文本内容。
- Produces: 对手机端非整屏 Hero、`40–56px` 底部间距和 Juniper `viewBox` 的回归断言。

- [ ] **Step 1: 先写会失败的断言**

```js
assert.match(
  homepageStyles,
  /\[data-home-hero-refined="true"\]\s*\{\s*min-height:\s*0\s*!important;/,
);
assert.match(
  homepageStyles,
  /\[data-home-hero-refined="true"\]\s*\[data-home-hero-stage\][\s\S]*?min-height:\s*0\s*!important;[\s\S]*?padding-bottom:\s*clamp\(40px,\s*6svh,\s*56px\)\s*!important;/,
);
assert.match(juniperLogo, /viewBox="50 0 620 150"/);
```

- [ ] **Step 2: 运行静态验证并确认失败**

Run: `node scripts/verify-homepage-refinements.mjs`

Expected: FAIL，指出 Hero `min-height: 0` 或 Juniper `viewBox` 尚未存在。

- [ ] **Step 3: 保留失败断言进入实现阶段**

不单独提交红色状态；Task 2 完成后与实现一起提交，保证分支每个提交可用。

---

### Task 2: 实现移动端 Hero 自然高度和 Juniper 字标放大

**Files:**
- Modify: `assets/homepage-refinements.css`
- Modify: `assets/juniper-networks-logo.svg`
- Modify: `scripts/integrate-homepage-refinements.mjs`
- Modify: `scripts/verify-homepage-refinements.mjs`
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`

**Interfaces:**
- Consumes: `[data-home-hero-refined="true"]`、`[data-home-hero-stage]` 和现有 Juniper SVG 资源路径。
- Produces: 内容驱动高度的手机 Hero，以及保持 `aria-label="Juniper Networks"` 的放大字标。

- [ ] **Step 1: 在手机断点取消整屏高度**

```css
@media (max-width: 1023px) {
  [data-home-hero-refined="true"] {
    min-height: 0 !important;
  }

  [data-home-hero-refined="true"] [data-home-hero-stage] {
    height: auto;
    min-height: 0 !important;
    padding-bottom: clamp(40px, 6svh, 56px) !important;
  }
}
```

- [ ] **Step 2: 放大 Juniper SVG 的可视占比**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 0 620 150" role="img" aria-label="Juniper Networks">
```

保留现有 `<title>`、两行 `<text>` 和颜色、字重设置不变。

- [ ] **Step 3: 更新首页资产版本并重新集成**

将 `scripts/integrate-homepage-refinements.mjs` 和 `scripts/verify-homepage-refinements.mjs` 中的 homepage 版本更新为 `20260809-3`，然后运行：

```bash
node scripts/integrate-homepage-refinements.mjs
```

Expected: `Integrated homepage refinement assets across 3 routes.`

- [ ] **Step 4: 运行静态验证**

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-solution-page-cleanup.mjs
```

Expected: 三个脚本全部 PASS，站点规则覆盖 114 条路由，Solution 清理覆盖 75 条路由。

- [ ] **Step 5: 提交实现**

```bash
git add assets/homepage-refinements.css assets/juniper-networks-logo.svg scripts/integrate-homepage-refinements.mjs scripts/verify-homepage-refinements.mjs index.html zh/index.html fa/index.html
git commit -m "fix: tighten mobile hero flow and logo scale"
```

---

### Task 3: 三语言手机与桌面端浏览器回归

**Files:**
- Verify: `index.html`
- Verify: `zh/index.html`
- Verify: `fa/index.html`

**Interfaces:**
- Consumes: 本地服务 `http://127.0.0.1:3009/`、`/zh/`、`/fa/`。
- Produces: Hero 收尾间距、Juniper 可视尺寸、LTR/RTL 和横向溢出的实浏证据。

- [ ] **Step 1: 测量手机 Hero 与下一板块**

对 `320×568`、`375×812`、`390×844`、`430×932` 测量：

```js
const gap = Math.round(
  hero.nextElementSibling.getBoundingClientRect().top -
  actions.getBoundingClientRect().bottom,
);
```

Expected: 根页面 `scrollWidth === clientWidth`；Hero 内容不遮挡页头；`gap` 不再出现整屏级空白。

- [ ] **Step 2: 验证三语言与 RTL**

使用 Playwright CLI 访问英文、中文、波斯语首页，Expected: 每个手机视口无横向溢出、无控制台 error，波斯语保持 `dir="rtl"`。

- [ ] **Step 3: 验证 Juniper 与桌面回归**

Expected:

- `390px` 手机端 Juniper 存在且图片可视高度大于修改前的 `19px`；
- 手机端可见品牌为 21 个；
- `1440×900` 桌面端 Juniper 隐藏，原 20 个品牌可见；
- 桌面 Hero 仍使用居中布局。

- [ ] **Step 4: 记录最终状态**

```bash
git diff --check
git status --short
git log -1 --oneline
```

Expected: 无未提交的本任务修改；仅保留已知、与本任务无关的 untracked 文件。
