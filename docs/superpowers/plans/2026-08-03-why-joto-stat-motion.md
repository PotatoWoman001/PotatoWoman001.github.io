# Why JOTO Statistics Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为三语言首页 Why JOTO 板块增加一次性滚动触发的数字递增、文字揭示和卡片错峰入场动效，同时保持现有布局与视觉样式。

**Architecture:** 在现有 `homepage-refinements.js` 中增加一个幂等、独立的 Why JOTO 动效增强单元，通过 `IntersectionObserver` 首次触发、`requestAnimationFrame` 完成数字递增，并用 section 数据属性驱动 CSS 状态。现有 HTML 和主构建包不重排；浏览器动效、reduced-motion 与三语言格式由独立静态和真实浏览器检查覆盖。

**Tech Stack:** 原生 JavaScript、CSS、IntersectionObserver、requestAnimationFrame、Node.js 静态断言、Playwright CLI。

## Global Constraints

- 保留 Why JOTO 现有左右布局、标题、说明、四张卡片、尺寸、颜色、边框、圆角和 hover 效果。
- `2010` 与 `5` 从 `0` 缓出递增；“多厂商”“全生命周期”整体遮罩上移揭示。
- 动画每次页面完整刷新只播放一次，重新滚入不重播。
- 桌面/平板卡片间隔 `100ms`，手机卡片间隔 `70ms`。
- 数值递增约 `1000ms`，卡片过渡约 `550ms`，文字揭示约 `450ms`。
- 不引入第三方动画库，不修改主构建产物，不新增公司指标或文案。
- reduced-motion 直接显示最终值，不运行递增、位移或遮罩。
- 所有变更后的浏览器资源统一使用新缓存版本 `20260803-3`。

---

### Task 1: 建立 Why JOTO 动效静态合约

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: `assets/homepage-refinements.js` 与 `assets/homepage-refinements.css` 的源文本。
- Produces: 对 `enhanceAboutStatMotion()`、`IntersectionObserver`、`requestAnimationFrame`、动效状态属性、tabular numbers 与 reduced-motion 的静态发布门禁。

- [ ] **Step 1: 写入失败的静态断言**

在现有 `homepageScript` / `homepageStyles` 断言后加入：

```js
assert.match(homepageScript, /enhanceAboutStatMotion/);
assert.match(homepageScript, /IntersectionObserver/);
assert.match(homepageScript, /requestAnimationFrame/);
assert.match(homepageScript, /aboutMotionReady/);
assert.match(homepageScript, /aboutMotionRunning/);
assert.match(homepageScript, /aboutMotionComplete/);
assert.match(homepageScript, /Intl\.NumberFormat/);
assert.match(homepageScript, /prefers-reduced-motion:\s*reduce/);
assert.match(homepageStyles, /data-about-motion-ready/);
assert.match(homepageStyles, /data-about-motion-running/);
assert.match(homepageStyles, /data-about-motion-complete/);
assert.match(homepageStyles, /font-variant-numeric:\s*tabular-nums/);
assert.match(homepageStyles, /clip-path:\s*inset/);
assert.match(
  homepageStyles,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?data-about-motion/,
);
```

- [ ] **Step 2: 运行静态检查并确认失败**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
```

Expected: FAIL，首个缺失断言指向 `enhanceAboutStatMotion`。

- [ ] **Step 3: 提交测试合约**

```bash
git add scripts/verify-homepage-refinements.mjs
git commit -m "test: define why joto motion contract"
```

### Task 2: 实现幂等的统计值准备与首次触发

**Files:**
- Modify: `assets/homepage-refinements.js`

**Interfaces:**
- Consumes: `#about`、`[data-about-stats]`、`[data-about-stat-card]`、`[data-about-stat-value]`。
- Produces: `enhanceAboutStatMotion(section): boolean`、section 状态 `data-about-motion-ready|running|complete`、卡片类型与延迟自定义属性。

- [ ] **Step 1: 增加常量和本地化数字工具**

在文件顶部加入：

```js
const ABOUT_SECTION_SELECTOR = "#about";
const ABOUT_STATS_SELECTOR = "[data-about-stats]";
const ABOUT_CARD_SELECTOR = "[data-about-stat-card]";
const ABOUT_VALUE_SELECTOR = "[data-about-stat-value]";
const ABOUT_COUNTER_DURATION = 1000;
const ABOUT_DESKTOP_STAGGER = 100;
const ABOUT_MOBILE_STAGGER = 70;

const LOCALIZED_DIGITS = new Map([
  ["۰", "0"], ["۱", "1"], ["۲", "2"], ["۳", "3"], ["۴", "4"],
  ["۵", "5"], ["۶", "6"], ["۷", "7"], ["۸", "8"], ["۹", "9"],
  ["٠", "0"], ["١", "1"], ["٢", "2"], ["٣", "3"], ["٤", "4"],
  ["٥", "5"], ["٦", "6"], ["٧", "7"], ["٨", "8"], ["٩", "9"],
]);

function parseLocalizedInteger(value) {
  const normalized = Array.from(value, (character) =>
    LOCALIZED_DIGITS.get(character) ?? character
  ).join("");
  if (!/^\s*\d+\s*$/.test(normalized)) return null;
  return Number.parseInt(normalized, 10);
}

function numberFormatter(finalText) {
  const usesLocalizedDigits = /[۰-۹٠-٩]/.test(finalText);
  const locale = usesLocalizedDigits
    ? document.documentElement.lang || "en"
    : "en";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: false,
  });
}
```

- [ ] **Step 2: 增加计数器和状态完成工具**

```js
function animateAboutCounter(element, target, delay, formatter) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const startedAt = performance.now();
      const frame = (timestamp) => {
        const progress = Math.min(1, (timestamp - startedAt) / ABOUT_COUNTER_DURATION);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatter.format(Math.round(target * eased));
        if (progress < 1) {
          window.requestAnimationFrame(frame);
          return;
        }
        element.textContent = formatter.format(target);
        resolve();
      };
      window.requestAnimationFrame(frame);
    }, delay);
  });
}

function completeAboutMotion(section, values) {
  values.forEach(({ element, finalText }) => {
    element.textContent = finalText;
  });
  section.dataset.aboutMotionRunning = "false";
  section.dataset.aboutMotionComplete = "true";
}
```

- [ ] **Step 3: 增加首次触发控制器**

```js
function enhanceAboutStatMotion(section) {
  if (section.dataset.aboutMotionReady === "true") return true;
  const stats = section.querySelector(ABOUT_STATS_SELECTOR);
  const cards = Array.from(stats?.querySelectorAll(ABOUT_CARD_SELECTOR) ?? []);
  if (!stats || cards.length !== 4) return false;

  const values = cards.map((card, index) => {
    const element = card.querySelector(ABOUT_VALUE_SELECTOR);
    if (!element) return null;
    const finalText = element.textContent.trim();
    const target = parseLocalizedInteger(finalText);
    const kind = target === null ? "text" : "number";
    card.style.setProperty("--joto-about-delay", `${index * ABOUT_DESKTOP_STAGGER}ms`);
    card.style.setProperty("--joto-about-delay-mobile", `${index * ABOUT_MOBILE_STAGGER}ms`);
    element.dataset.aboutValueKind = kind;
    element.dataset.aboutMotionFinal = finalText;
    element.setAttribute("aria-label", finalText);
    return { card, element, finalText, target, index, kind };
  });
  if (values.some((value) => value === null)) return false;

  section.dataset.aboutMotionReady = "true";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    completeAboutMotion(section, values);
    return true;
  }

  values.filter(({ kind }) => kind === "number").forEach(({ element, finalText }) => {
    element.textContent = numberFormatter(finalText).format(0);
  });

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.25)) return;
    observer.disconnect();
    section.dataset.aboutMotionRunning = "true";
    const stagger = window.matchMedia("(max-width: 479px)").matches
      ? ABOUT_MOBILE_STAGGER
      : ABOUT_DESKTOP_STAGGER;
    const counters = values
      .filter(({ kind }) => kind === "number")
      .map(({ element, target, index, finalText }) =>
        animateAboutCounter(
          element,
          target,
          index * stagger + 120,
          numberFormatter(finalText),
        )
      );
    Promise.all(counters).then(() => completeAboutMotion(section, values));
  }, { threshold: [0.25] });
  observer.observe(section);
  return true;
}
```

- [ ] **Step 4: 接入现有幂等增强入口**

在 `applyHomepageRefinements()` 中获取 section 并调用：

```js
const aboutSection = document.querySelector(ABOUT_SECTION_SELECTOR);
const aboutMotionComplete = aboutSection
  ? enhanceAboutStatMotion(aboutSection)
  : false;

return Boolean(copy && heroComplete && iranComplete && aboutMotionComplete);
```

- [ ] **Step 5: 运行静态检查，确认 JavaScript 合约只剩 CSS 断言失败**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
```

Expected: FAIL 于首个尚未实现的 CSS 状态断言。

### Task 3: 实现卡片错峰、文字遮罩与 reduced-motion

**Files:**
- Modify: `assets/homepage-refinements.css`

**Interfaces:**
- Consumes: Task 2 产生的 section 数据属性、`data-about-value-kind` 和两组延迟变量。
- Produces: 无布局跳动的卡片/文字动画，以及 reduced-motion 静态最终态。

- [ ] **Step 1: 增加默认与运行态样式**

在现有 `#about` 样式后加入：

```css
#about[data-about-motion-ready="true"] [data-about-stat-card] {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
  will-change: opacity, transform;
}

#about[data-about-motion-running="true"] [data-about-stat-card],
#about[data-about-motion-complete="true"] [data-about-stat-card] {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition:
    opacity 550ms ease-out var(--joto-about-delay),
    transform 550ms ease-out var(--joto-about-delay),
    background-color 300ms ease,
    color 300ms ease,
    border-color 300ms ease;
}

#about [data-about-stat-value] {
  font-variant-numeric: tabular-nums;
}

#about[data-about-motion-ready="true"]
  [data-about-stat-value][data-about-value-kind="text"] {
  opacity: 0;
  clip-path: inset(0 0 100% 0);
  transform: translate3d(0, 0.35em, 0);
}

#about[data-about-motion-running="true"]
  [data-about-stat-value][data-about-value-kind="text"],
#about[data-about-motion-complete="true"]
  [data-about-stat-value][data-about-value-kind="text"] {
  opacity: 1;
  clip-path: inset(0 0 0 0);
  transform: translate3d(0, 0, 0);
  transition:
    opacity 450ms ease-out var(--joto-about-delay),
    clip-path 450ms ease-out var(--joto-about-delay),
    transform 450ms ease-out var(--joto-about-delay);
}
```

- [ ] **Step 2: 增加手机错峰覆盖**

在 `@media (max-width: 479px)` 中加入：

```css
#about[data-about-motion-running="true"] [data-about-stat-card],
#about[data-about-motion-complete="true"] [data-about-stat-card],
#about[data-about-motion-running="true"] [data-about-stat-value][data-about-value-kind="text"],
#about[data-about-motion-complete="true"] [data-about-stat-value][data-about-value-kind="text"] {
  transition-delay: var(--joto-about-delay-mobile);
}
```

- [ ] **Step 3: 增加 reduced-motion 静态规则**

在现有 reduced-motion 媒体查询中加入：

```css
#about[data-about-motion-ready="true"] [data-about-stat-card],
#about[data-about-motion-ready="true"] [data-about-stat-value] {
  opacity: 1 !important;
  clip-path: none !important;
  transform: none !important;
  transition: none !important;
  will-change: auto;
}
```

- [ ] **Step 4: 运行静态检查并确认通过**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
```

Expected: `Verified homepage interaction and content refinements.`

- [ ] **Step 5: 提交动效实现**

```bash
git add assets/homepage-refinements.js assets/homepage-refinements.css scripts/verify-homepage-refinements.mjs
git commit -m "feat: animate why joto statistics"
```

### Task 4: 增加真实浏览器回归脚本

**Files:**
- Create: `scripts/verify-why-joto-motion-browser.mjs`

**Interfaces:**
- Consumes: 已打开页面的 Playwright `page` 和页面实际 `window.location.origin`。
- Produces: 英文、中文、波斯语桌面/手机、once-per-refresh 与 reduced-motion 的结构化验证结果。

- [ ] **Step 1: 创建浏览器验证脚本**

脚本使用与现有 `scripts/verify-mall-browser.mjs` 相同的 Playwright CLI `run-code` 包装形式，并实现以下核心断言：

```js
async (page) => {
  const origin = await page.evaluate(() => window.location.origin);
  const cases = [
    { locale: "en", path: "/" },
    { locale: "zh", path: "/zh/" },
    { locale: "fa", path: "/fa/" },
  ];
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ];
  const completed = [];

  for (const testCase of cases) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(`${origin}${testCase.path}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('#about[data-about-motion-ready="true"]');
      const section = page.locator("#about");
      await section.scrollIntoViewIfNeeded();
      await page.waitForSelector('#about[data-about-motion-running="true"], #about[data-about-motion-complete="true"]');
      await page.waitForSelector('#about[data-about-motion-complete="true"]');
      const values = await page.locator("#about [data-about-stat-value]").evaluateAll((nodes) =>
        nodes.map((node) => ({
          current: node.textContent.trim(),
          final: node.dataset.aboutMotionFinal,
        })),
      );
      if (values.some(({ current, final }) => current !== final)) {
        throw new Error(`${testCase.locale}/${viewport.name}: wrong final values ${JSON.stringify(values)}`);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const replayed = await page.locator("#about").getAttribute("data-about-motion-running");
      if (replayed === "true") throw new Error(`${testCase.locale}/${viewport.name}: replayed`);
      completed.push(`${testCase.locale}/${viewport.name}`);
    }
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${origin}/zh/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#about[data-about-motion-complete="true"]');
  completed.push("zh/mobile/reduced-motion");
  return { completed, count: completed.length };
}
```

实现时同时记录 `pageerror`、控制台 `error`/`warning`，并检查横向溢出；任何场景出现错误、警告或溢出都判定失败。

- [ ] **Step 2: 在本地站点运行浏览器脚本**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  -s=why-joto-motion open http://127.0.0.1:3009/zh/

verification_code="$(<scripts/verify-why-joto-motion-browser.mjs)"
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  -s=why-joto-motion run-code "$verification_code"
```

Expected: 7 个场景通过，控制台无新增错误或警告。

- [ ] **Step 3: 提交浏览器验证脚本**

```bash
git add scripts/verify-why-joto-motion-browser.mjs
git commit -m "test: verify why joto motion in browser"
```

### Task 5: 统一提升浏览器资源版本并执行全量回归

**Files:**
- Modify: `404.html`
- Modify: all 114 maintained route `index.html` files
- Modify: `assets/contact-form-sections.js`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-product-page.js`
- Modify: relevant `scripts/*.mjs` version constants

**Interfaces:**
- Consumes: 当前统一缓存版本 `20260803-2`。
- Produces: 所有正式路由和验证脚本统一使用 `20260803-3`。

- [ ] **Step 1: 批量更新统一缓存版本**

Run:

```bash
rg -l -0 "20260803-2" \
  --glob '*.html' \
  --glob 'scripts/*.mjs' \
  --glob 'assets/*.{js,css}' \
  | xargs -0 perl -pi -e 's/20260803-2/20260803-3/g'
```

Expected: 114 条正式路由、`404.html`、相关资源与验证脚本全部统一为 `20260803-3`。

- [ ] **Step 2: 运行静态全量回归**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-mall-data-client.mjs
git diff --check
```

Expected: 所有命令退出码为 0；站点规则报告 114 条路由。

- [ ] **Step 3: 重跑 Why JOTO 浏览器矩阵**

使用 Task 4 的 Playwright CLI 命令，确认 7 个场景全部通过，同时检查：

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
```

Expected: 三语言桌面/手机与 reduced-motion 全部通过；控制台 0 错误、0 警告。

- [ ] **Step 4: 核对修改范围并提交发布版本**

```bash
git status --short
git diff --stat
git add -u
git add scripts/verify-why-joto-motion-browser.mjs
git commit -m "chore: version why joto motion assets"
git status --short
git log -3 --oneline
```

Expected: 仅保留用户已有的 `.playwright-cli/` 与 `.superpowers/` 未跟踪目录；正式文件全部提交。

## 最终交付边界

本计划完成后只生成已提交、已验证的本地新版本，不自动切换 `jotoglobal.com`。线上发布属于外部状态变更，应在用户明确要求部署时复用现有不可变版本与原子切换流程。
