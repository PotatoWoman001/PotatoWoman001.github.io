# Check Point Email Security Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Check Point 中文、英文和波斯语合作伙伴详情页的总体优势区与 JOTO 服务区之间，加入独立的 Harmony Email & Collaboration 邮件与协作安全版面。

**Architecture:** 使用独立渐进增强模块识别三个 Check Point 路由，等待 React 详情页渲染后，将本地化版面插入 JOTO Check Point 服务区之前。独立 CSS 负责深色主题、Check Point 洋红色局部识别、响应式与 RTL；三个静态 HTML 入口只增加带版本的 JS/CSS 引用，不修改压缩主包。

**Tech Stack:** 静态 HTML、ES modules、DOM API、CSS Grid/Flexbox、Node.js `assert`、Playwright 本地浏览器验证。

## Global Constraints

- 只覆盖 `/solutions/security/check-point/`、`/zh/solutions/security/check-point/` 和 `/fa/solutions/security/check-point/`。
- 不新增顶级 Solution 类型、子路由、SEO 落地页或后端 API。
- 新版面位于总体优势区与 JOTO Check Point 服务区之间。
- 主 CTA 定位到现有联系表单，次 CTA 定位到紧随其后的 JOTO Check Point 服务区。
- 英文、简体中文和波斯语共用一套 DOM 结构；波斯语支持 RTL。
- 不引入 Check Point 官网截图、Gartner 图表、客户 Logo 或时效性市场数据。
- 不修改 `assets/index-DaFvN0XI.js`，不覆盖工作区中已有用户改动。

---

### Task 1: 建立邮件安全版面静态契约

**Files:**
- Create: `scripts/verify-check-point-email-security.mjs`
- Test: `scripts/verify-check-point-email-security.mjs`

**Interfaces:**
- Consumes: 三个 Check Point HTML 入口、`assets/check-point-email-security.js` 和 `assets/check-point-email-security.css`。
- Produces: `node scripts/verify-check-point-email-security.mjs` 发布前契约命令。

- [ ] **Step 1: 写入失败契约测试**

脚本使用 `node:assert/strict`、`node:fs` 和 `node:path`，定义：

```js
const routes = [
  "solutions/security/check-point/index.html",
  "zh/solutions/security/check-point/index.html",
  "fa/solutions/security/check-point/index.html",
];
const version = "20260826-1";
```

对每个 HTML 断言只引用一次：

```js
assert.equal(count(html, `/assets/check-point-email-security.js?v=${version}`), 1);
assert.equal(count(html, `/assets/check-point-email-security.css?v=${version}`), 1);
```

对 JS 断言：

```js
assert.match(script, /data-check-point-email-security/);
assert.match(script, /data-check-point-email-service-anchor/);
assert.match(script, /data-check-point-email-contact-link/);
assert.match(script, /MutationObserver/);
assert.match(script, /Microsoft 365/);
assert.match(script, /SOC 2 Type 2/);
assert.doesNotMatch(script, /Gartner|99\.9|99\.7|65K/i);
```

对 CSS 断言：

```js
assert.match(styles, /\.check-point-email-security/);
assert.match(styles, /html\[dir=["']rtl["']\]/);
assert.match(styles, /@media\s*\(max-width:\s*767px\)/);
assert.match(styles, /:focus-visible/);
```

- [ ] **Step 2: 运行契约测试并确认失败**

Run:

```bash
node scripts/verify-check-point-email-security.mjs
```

Expected: 因 `assets/check-point-email-security.js` 或 CSS 尚不存在而失败。

### Task 2: 实现三语邮件安全版面

**Files:**
- Create: `assets/check-point-email-security.js`
- Create: `assets/check-point-email-security.css`
- Test: `scripts/verify-check-point-email-security.mjs`

**Interfaces:**
- Consumes: `location.pathname`、现有 Check Point 详情页的 `h2` 服务标题和联系表单容器。
- Produces: `mountCheckPointEmailSecurity(): boolean`、`[data-check-point-email-security]`、`[data-check-point-email-service-anchor]` 和 `[data-check-point-email-contact-link]`。

- [ ] **Step 1: 定义路由、本地化文案和定位数据**

JS 定义三个匹配路由与 `COPY`。每个语言对象包含 `eyebrow`、`title`、`description`、`primaryCta`、`secondaryCta`、`serviceHeading`、`threatTitle`、`threatDescription`、`protectedStatus`、`capabilities`、`platformTitle`、`complianceTitle`。核心数据为：

```js
const CAPABILITY_KEYS = ["phishing", "account", "inline", "dlp"];
const PLATFORMS = ["Microsoft 365", "Gmail", "Teams", "Slack", "OneDrive", "SharePoint", "Google Drive"];
const COMPLIANCE = ["SOC 2 Type 2", "ISO 27001", "GDPR", "HIPAA"];
```

语言通过 `pathname.startsWith("/zh/")`、`pathname.startsWith("/fa/")` 或默认英文确定。

- [ ] **Step 2: 建立语义化版面 DOM**

实现 `createSection(copy)`，返回：

```html
<section class="check-point-email-security" data-check-point-email-security>
  <div class="check-point-email-security__inner">
    <div class="check-point-email-security__hero">...</div>
    <div class="check-point-email-security__capabilities">...</div>
    <div class="check-point-email-security__proof">...</div>
  </div>
</section>
```

标题使用 `h2`，四张能力卡使用 `article` 与 `h3`，平台和合规使用列表。抽象邮件威胁视觉使用可阅读 DOM 文本和 CSS，不使用外部图片。

- [ ] **Step 3: 建立页内 CTA 和安全定位**

为 JOTO 服务区设置 `id="check-point-services"` 与 `data-check-point-email-service-anchor`。主 CTA 使用 `href="#contact"` 并添加 `data-check-point-email-contact-link`；如实际联系容器不是 `#contact`，挂载时检测 `[data-joto-contact-form]`、`form[action="/api/contact"]` 或页面最后一个联系表单所在 section，为它设置稳定 `id="contact"`。次 CTA 使用 `href="#check-point-services"`。

- [ ] **Step 4: 只在 Check Point 页面挂载一次**

实现：

```js
function mountCheckPointEmailSecurity() {
  if (!/^\/(?:zh\/|fa\/)?solutions\/security\/check-point\/?$/.test(location.pathname)) return false;
  if (document.querySelector("[data-check-point-email-security]")) return true;
  const copy = getCopy(location.pathname);
  const serviceHeading = [...document.querySelectorAll("h2")]
    .find((heading) => heading.textContent.trim() === copy.serviceHeading);
  const serviceSection = serviceHeading?.closest("section");
  if (!serviceSection) return false;
  serviceSection.dataset.checkPointEmailServiceAnchor = "";
  serviceSection.id ||= "check-point-services";
  ensureContactAnchor();
  serviceSection.before(createSection(copy));
  return true;
}
```

页面就绪时先直接尝试；失败则启用 `MutationObserver`，挂载成功后立即断开。

- [ ] **Step 5: 实现深色洋红响应式样式**

CSS 使用页面现有容器宽度感知的 `min(1180px, calc(100% - 48px))`，桌面双栏、四张能力卡、平台/合规双栏；小于 `767px` 转单列。关键样式包含：

```css
.check-point-email-security { background: #070b0a; padding: clamp(72px, 9vw, 124px) 0; }
.check-point-email-security__panel { background: radial-gradient(circle at 88% 16%, rgba(237,10,92,.22), transparent 28%), linear-gradient(135deg,#211018 0%,#101513 62%,#0c110f 100%); }
.check-point-email-security__hero { display: grid; grid-template-columns: minmax(0,1.08fr) minmax(320px,.92fr); }
.check-point-email-security__capabilities { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); }
.check-point-email-security a:focus-visible { outline: 3px solid #ff5a92; outline-offset: 4px; }
html[dir="rtl"] .check-point-email-security { direction: rtl; }
@media (max-width: 767px) {
  .check-point-email-security__hero,
  .check-point-email-security__capabilities,
  .check-point-email-security__proof { grid-template-columns: 1fr; }
}
```

- [ ] **Step 6: 运行契约测试并确认剩余失败只来自 HTML 引用**

Run:

```bash
node scripts/verify-check-point-email-security.mjs
```

Expected: JS/CSS 内容契约通过，只因三个 HTML 尚未引用资源而失败。

### Task 3: 接入三语 Check Point 入口并完成回归验证

**Files:**
- Modify: `solutions/security/check-point/index.html`
- Modify: `zh/solutions/security/check-point/index.html`
- Modify: `fa/solutions/security/check-point/index.html`
- Test: `scripts/verify-check-point-email-security.mjs`
- Verify: `scripts/verify-site-rules.mjs`
- Verify: `scripts/verify-site-typography-mall.mjs`

**Interfaces:**
- Consumes: `/assets/check-point-email-security.js?v=20260826-1` 和 `/assets/check-point-email-security.css?v=20260826-1`。
- Produces: 三语 Check Point 入口各加载一次邮件安全渐进增强资源。

- [ ] **Step 1: 在三个 HTML 的 `</head>` 前增加带版本的资源引用**

```html
<script type="module" src="/assets/check-point-email-security.js?v=20260826-1"></script>
<link rel="stylesheet" href="/assets/check-point-email-security.css?v=20260826-1">
```

使用精确补丁保留三个 HTML 中已有的其他用户改动。

- [ ] **Step 2: 运行邮件安全契约测试**

Run:

```bash
node scripts/verify-check-point-email-security.mjs
```

Expected: `Verified Check Point email security section across three localized routes.`

- [ ] **Step 3: 运行现有静态回归验证**

Run:

```bash
node scripts/verify-site-rules.mjs
node scripts/verify-site-typography-mall.mjs
git diff --check
```

Expected: 两个脚本成功，`git diff --check` 无输出。

### Task 4: 本地浏览器布局与交互验证

**Files:**
- Verify: `http://127.0.0.1:3009/zh/solutions/security/check-point/`
- Verify: `http://127.0.0.1:3009/solutions/security/check-point/`
- Verify: `http://127.0.0.1:3009/fa/solutions/security/check-point/`

**Interfaces:**
- Consumes: 完整本地实现与现有静态站点。
- Produces: 三语、桌面/手机、RTL 与 CTA 的可视验证结果。

- [ ] **Step 1: 检查并复用本地 3009 服务，不存在时才启动**

Run:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3009/zh/solutions/security/check-point/
python3 -m http.server 3009 --bind 127.0.0.1
```

Expected: 页面返回 `200`；如第一条已返回 `200`，不执行第二条。

- [ ] **Step 2: 验证三语 DOM 和插入位置**

对三个路由断言：`[data-check-point-email-security]` 数量为 1；它的下一个 section 含 `[data-check-point-email-service-anchor]`；四张能力卡、七个平台标签和四个合规标签完整；其他合作伙页面不存在该版面。

- [ ] **Step 3: 验证 CTA 与键盘可用性**

点击次 CTA，确认 `#check-point-services` 进入视口；点击主 CTA，确认 `#contact` 进入视口且未被固定页头遮挡。使用 `Tab` 确认两个 CTA 都有清晰聚焦态。

- [ ] **Step 4: 验证响应式与 RTL**

在 `1440×900`、`768×1024` 和 `390×844` 视口检查中文页，并在 `1440×900` 和 `390×844` 检查波斯语页。要求无横向溢出、文字裁切、卡片重叠和 CTA 换行破坏；波斯语文本、栅格和按钮顺序符合 RTL。

- [ ] **Step 5: 目视检查并保留中文预览**

检查洋红色局部识别、双栏层级、邮件威胁视觉、四张能力卡、平台与合规标签；将应用内浏览器停留在中文 Check Point 新版面供用户审核。
