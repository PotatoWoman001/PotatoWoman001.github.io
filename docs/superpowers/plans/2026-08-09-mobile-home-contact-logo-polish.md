# Mobile Homepage, Contact Form, and Logo Wall Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化三语言移动端首页 Hero、补齐 Juniper Networks 技术品牌 Logo，并统一联系表单提示层级和提交按钮 SVG 图标。

**Architecture:** 延续现有静态站点的增强资产模式，不重构压缩后的 React bundle。由 `homepage-refinements` 在首页 DOM 就绪后幂等补充品牌卡片并用 CSS 调整手机 Hero；由 `contact-form-sections` 直接输出稳定的内联 SVG，并通过共享样式统一首页与 Solution 表单。

**Tech Stack:** 静态 HTML、原生 JavaScript、CSS、Node.js 合约验证、Playwright 浏览器验证

## Global Constraints

- 覆盖英文、简体中文和波斯语首页；波斯语保持 RTL。
- 手机 Hero 只在小于 `1024px` 的视口上移，不改变桌面端布局。
- 技术品牌墙加入 Juniper Networks 后总数为 21，手机端三列无空格。
- Juniper Networks 使用本地透明 SVG，不依赖运行时外部资源。
- placeholder 和必填辅助提示降低字号与对比度，字段标签、输入值和错误信息保持现有层级。
- 提交按钮不得继续使用 Unicode `↗`，必须使用 `aria-hidden="true"` 的内联 SVG。
- 不修改表单字段、校验、`/api/contact` 提交接口或文案内容。
- 不触碰现有无关未跟踪文件。

---

### Task 1: 扩展静态合约验证

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`
- Modify: `scripts/verify-contact-form-sections.mjs`

**Interfaces:**
- Consumes: `assets/homepage-refinements.js`、`assets/homepage-refinements.css`、`assets/contact-form-sections.js`、`assets/contact-form-sections.css`
- Produces: 对 Juniper 补位、手机 Hero 位移、placeholder 层级和 SVG 图标的确定性断言

- [ ] **Step 1: 为首页新增失败断言**

在 `scripts/verify-homepage-refinements.mjs` 中读取 `/assets/juniper-networks-logo.svg`，并加入以下断言：

```js
const juniperLogo = readFileSync(
  path.join(root, "assets/juniper-networks-logo.svg"),
  "utf8",
);

assert.match(homepageScript, /enhanceTechnologyPortfolio/);
assert.match(homepageScript, /Juniper Networks/);
assert.match(homepageScript, /juniper-networks-logo\.svg/);
assert.match(homepageStyles, /@media \(max-width:\s*1023px\)/);
assert.match(homepageStyles, /translateY\(-/);
assert.match(juniperLogo, /<svg/);
assert.match(juniperLogo, /aria-label="Juniper Networks"/);
```

- [ ] **Step 2: 为联系表单新增失败断言**

在 `scripts/verify-contact-form-sections.mjs` 中加入：

```js
assert.doesNotMatch(script, />↗<\/span>/);
assert.match(script, /joto-solution-contact__submit-icon-svg/);
assert.match(script, /viewBox="0 0 24 24"/);
assert.match(styles, /::placeholder/);
assert.match(styles, /joto-solution-contact__form-header p/);
assert.match(styles, /joto-solution-contact__submit-icon-svg/);
```

- [ ] **Step 3: 运行验证并确认失败**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-contact-form-sections.mjs
```

Expected: 首页验证因 Juniper 资产或增强函数缺失失败；表单验证因 Unicode 箭头仍存在而失败。

### Task 2: 实现首页 Hero 与技术品牌墙优化

**Files:**
- Create: `assets/juniper-networks-logo.svg`
- Modify: `assets/homepage-refinements.js`
- Modify: `assets/homepage-refinements.css`
- Modify: `scripts/integrate-homepage-refinements.mjs`
- Test: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: 首页现有技术品牌墙中 `img[alt="AppDynamics"]` 与其卡片/网格结构
- Produces: `enhanceTechnologyPortfolio(): boolean`，以及唯一的 `[data-juniper-networks-partner]` 品牌卡片

- [ ] **Step 1: 新增本地 Juniper Networks SVG**

创建 `assets/juniper-networks-logo.svg`，使用透明背景、黑色字标和 `viewBox`，根节点包含：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 150" role="img" aria-label="Juniper Networks">
  <title>Juniper Networks</title>
  <text x="360" y="74" text-anchor="middle" fill="#111916" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="700" letter-spacing="7">JUNIPER</text>
  <text x="360" y="119" text-anchor="middle" fill="#111916" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" letter-spacing="13">NETWORKS</text>
</svg>
```

资产不得引用外部字体、图片或 URL。

- [ ] **Step 2: 在首页增强脚本中幂等补充品牌卡片**

在 `assets/homepage-refinements.js` 中加入：

```js
const TECHNOLOGY_PORTFOLIO_LAST_LOGO_SELECTOR = 'img[alt="AppDynamics"]';

function enhanceTechnologyPortfolio() {
  if (document.querySelector("[data-juniper-networks-partner]")) return true;

  const lastLogo = document.querySelector(TECHNOLOGY_PORTFOLIO_LAST_LOGO_SELECTOR);
  const lastCard = lastLogo?.closest("li, [data-partner-card], div");
  const grid = lastCard?.parentElement;
  if (!lastLogo || !lastCard || !grid) return false;

  const card = lastCard.cloneNode(true);
  const image = card.querySelector("img");
  if (!image) return false;

  card.dataset.juniperNetworksPartner = "";
  image.src = "/assets/juniper-networks-logo.svg";
  image.alt = "Juniper Networks";
  image.removeAttribute("srcset");
  grid.append(card);
  return true;
}
```

实现时须根据浏览器实际 DOM 将 `closest` 精确到不会误选标题容器的卡片节点；`applyHomepageRefinements()` 的完成条件要包含该函数结果。

- [ ] **Step 3: 添加手机 Hero 上移规则**

在 `assets/homepage-refinements.css` 加入仅手机/平板生效的规则：

```css
@media (max-width: 1023px) {
  [data-home-hero-refined="true"] [data-home-hero-content] {
    transform: translateY(clamp(-96px, -10vh, -56px));
  }
}
```

若 390px 和 430px 实测遮挡导航，则仅调整 clamp 数值；不得添加滚动事件或绝对定位。

- [ ] **Step 4: 同步集成脚本版本与资产合约**

更新 `scripts/integrate-homepage-refinements.mjs`，让首页三语言入口继续以单一版本号加载更新后的 CSS/JS；集成逻辑必须重复执行安全，并校验 Juniper SVG 存在。

- [ ] **Step 5: 运行首页静态验证**

Run:

```bash
node scripts/integrate-homepage-refinements.mjs
node scripts/verify-homepage-refinements.mjs
```

Expected: 两条命令均退出码 `0`，验证输出 `Verified homepage interaction and content refinements.`。

### Task 3: 实现联系表单提示层级与 SVG 箭头

**Files:**
- Modify: `assets/contact-form-sections.js`
- Modify: `assets/contact-form-sections.css`
- Modify: `scripts/integrate-contact-form-sections.mjs`
- Test: `scripts/verify-contact-form-sections.mjs`

**Interfaces:**
- Consumes: `contactFormMarkup(locale, idPrefix, formKind)`
- Produces: `.joto-solution-contact__submit-icon-svg` 内联 SVG，以及共享 placeholder/辅助提示样式

- [ ] **Step 1: 将 Unicode 箭头替换为内联 SVG**

在 `contactFormMarkup()` 内替换图标节点：

```html
<span class="joto-solution-contact__submit-icon" aria-hidden="true">
  <svg class="joto-solution-contact__submit-icon-svg" viewBox="0 0 24 24" fill="none">
    <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</span>
```

- [ ] **Step 2: 添加提示文字和图标样式**

在 `assets/contact-form-sections.css` 中加入：

```css
.joto-solution-contact__field :is(input, textarea)::placeholder {
  color: rgba(255, 255, 255, 0.38);
  font-size: 0.88em;
  font-weight: 400;
  opacity: 1;
}

.joto-solution-contact__form-header p {
  color: rgba(255, 255, 255, 0.42);
  font-size: 12px;
  line-height: 1.6;
}

.joto-solution-contact__submit-icon-svg {
  width: 16px;
  height: 16px;
  display: block;
}
```

实际选择器需与现有 `.joto-solution-contact__field` 结构一致；不得降低用户输入值或验证错误的对比度。

- [ ] **Step 3: 同步联系表单集成版本**

更新 `scripts/integrate-contact-form-sections.mjs`，使三语言首页、Contact 和 75 个 Solution 路由继续引用同一新版 CSS/JS 查询参数；重复运行不得生成重复标签。

- [ ] **Step 4: 运行表单静态验证**

Run:

```bash
node scripts/integrate-contact-form-sections.mjs
node scripts/verify-contact-form-sections.mjs
```

Expected: 验证覆盖 81 个路由并输出 `Verified homepage, Contact prefill, and Solution forms across 81 routes.`。

### Task 4: 三语言浏览器回归与提交

**Files:**
- Verify: `index.html`
- Verify: `zh/index.html`
- Verify: `fa/index.html`
- Verify: `zh/solutions/network/cisco/index.html`
- Verify: `fa/solutions/network/cisco/index.html`
- Verify: `solutions/network/cisco/index.html`

**Interfaces:**
- Consumes: 本地 `http://127.0.0.1:3009`
- Produces: 三语言、LTR/RTL、桌面/手机的浏览器验证证据

- [ ] **Step 1: 复用或启动本地服务**

Run:

```bash
curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:3009/zh/
python3 -m http.server 3009 --bind 127.0.0.1
```

Expected: 若首条返回 `200` 则复用现有服务；否则启动静态服务。

- [ ] **Step 2: 验证三语言手机首页**

使用 Playwright 分别打开 `/`、`/zh/`、`/fa/`，视口 `390 × 844` 与 `430 × 932`，断言：

```js
document.querySelectorAll('[data-juniper-networks-partner]').length === 1
document.querySelector('img[alt="Juniper Networks"]').complete === true
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

同时目视确认 Hero 主内容上移但不遮挡导航、品牌墙最后一行完整，并检查波斯语 `document.dir === "rtl"`。

- [ ] **Step 3: 验证桌面首页与联系表单**

在 `1440 × 900` 下打开三语言首页，确认桌面 Hero 位置没有回归；滚动到 `#contact`，读取计算样式并确认 placeholder 字号小于字段标签，提交按钮 SVG 为 `16 × 16` 且圆形底存在。

- [ ] **Step 4: 验证 Solution 表单与控制台**

打开三语言 Cisco Solution 页的 `#contact`，确认同一 SVG 和提示层级生效；收集 `console.error`、`pageerror`，预期均为 `0`。

- [ ] **Step 5: 运行完整相关静态检查**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-contact-form-sections.mjs
```

Expected: 两项全部通过。

- [ ] **Step 6: 核对差异并创建实现提交**

Run:

```bash
git diff --check
git status --short
git diff -- assets/homepage-refinements.js assets/homepage-refinements.css assets/contact-form-sections.js assets/contact-form-sections.css scripts assets/juniper-networks-logo.svg index.html zh/index.html fa/index.html
git add assets/homepage-refinements.js assets/homepage-refinements.css assets/contact-form-sections.js assets/contact-form-sections.css assets/juniper-networks-logo.svg scripts/integrate-homepage-refinements.mjs scripts/verify-homepage-refinements.mjs scripts/integrate-contact-form-sections.mjs scripts/verify-contact-form-sections.mjs index.html zh/index.html fa/index.html contact/index.html zh/contact/index.html fa/contact/index.html solutions zh/solutions fa/solutions docs/superpowers/plans/2026-08-09-mobile-home-contact-logo-polish.md
git commit -m "feat: polish mobile homepage and contact forms"
```

Expected: 仅提交本任务文件，保留 `.playwright-cli/`、`.superpowers/`、`work/` 及既有无关未跟踪计划文件。
