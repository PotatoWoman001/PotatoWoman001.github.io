# Cisco Certification Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Cisco 英文、中文和波斯语详情页中加入由五张官方证书图片组成的连续滑动条和页内放大灯箱。

**Architecture:** 使用独立渐进增强模块识别 Cisco 路由，并在 `#customer-logo-wall` 前插入证书区。证书 PDF 只在本地转换为 PNG；生产资源不包含 PDF。独立 CSS 负责连续动画、响应式尺寸、减少动态效果和灯箱布局。

**Tech Stack:** 静态 HTML、ES modules、DOM API、CSS animations、macOS PDFKit (`sips`)、Node.js `assert` 验证脚本、浏览器本地预览。

## Global Constraints

- 仅覆盖 `/solutions/network/cisco/`、`/zh/solutions/network/cisco/` 和 `/fa/solutions/network/cisco/`。
- 证书区位于 Cisco 专业能力介绍之后、`#customer-logo-wall` 之前。
- 生产站只发布图片，不发布 PDF、PDF 链接或下载按钮。
- 五张证书均保留 Cisco 官方英文原文。
- 自动滑动在悬停、键盘聚焦、灯箱打开和 `prefers-reduced-motion: reduce` 时暂停。
- 灯箱支持关闭按钮、遮罩和 `Esc`，关闭后焦点返回触发卡片。
- 不修改压缩后的 `assets/index-DaFvN0XI.js`。

---

### Task 1: 生成证书图片资源

**Files:**
- Create: `assets/cisco-certifications/cloud-ai-infrastructure-partner.png`
- Create: `assets/cisco-certifications/preferred-collaboration-partner.png`
- Create: `assets/cisco-certifications/preferred-networking-partner.png`
- Create: `assets/cisco-certifications/preferred-security-partner.png`
- Create: `assets/cisco-certifications/services-partner.png`

**Interfaces:**
- Consumes: 用户提供的五份单页 PDF。
- Produces: `CERTIFICATES` 数据可引用的五个稳定 PNG URL，横向证书保持完整页面比例。

- [ ] **Step 1: 创建目标目录并转换五份 PDF**

使用 `sips -s format png`，分别输出到上述五个路径。Security 证书必须使用 PDFKit 渲染结果，避免 Poppler 对该文件的错误裁切。

Run:

```bash
sips -s format png "/Users/cuihua/Desktop/jotoglobal - cisco 资质添加/JOTO_TECH_CO.,LTD_Cisco_Cloud_and_AI_Infrastructure_Partner_2026_1_26.pdf" --out assets/cisco-certifications/cloud-ai-infrastructure-partner.png
sips -s format png "/Users/cuihua/Desktop/jotoglobal - cisco 资质添加/JOTO_TECH_CO.,LTD_Cisco_Preferred_Collaboration_Partner_2026_8_7.pdf" --out assets/cisco-certifications/preferred-collaboration-partner.png
sips -s format png "/Users/cuihua/Desktop/jotoglobal - cisco 资质添加/JOTO_TECH_CO.,LTD_Cisco_Preferred_Networking_Partner_2026_1_26 (1).pdf" --out assets/cisco-certifications/preferred-networking-partner.png
sips -s format png "/Users/cuihua/Desktop/jotoglobal - cisco 资质添加/JOTO_TECH_CO.,LTD_Cisco_Preferred_Security_Partner_2026_1_26.pdf" --out assets/cisco-certifications/preferred-security-partner.png
sips -s format png "/Users/cuihua/Desktop/jotoglobal - cisco 资质添加/JOTO_TECH_CO.,LTD_Cisco_Services_Partner_2026_1_26.pdf" --out assets/cisco-certifications/services-partner.png
```

Expected: 五条命令均以目标 PNG 路径结束且无错误。

- [ ] **Step 2: 检查输出尺寸和格式**

Run:

```bash
sips -g format -g pixelWidth -g pixelHeight assets/cisco-certifications/*.png
```

Expected: 五个文件均为 PNG、横向尺寸，且 `pixelWidth >= 792`、`pixelHeight >= 595`。

- [ ] **Step 3: 逐张查看图片**

使用本地图片查看工具检查五张图，要求标题、公司名、国家、有效期和 Cisco Partner 标志均完整可见，无裁切、黑块或模糊文字。

- [ ] **Step 4: 确认仓库中没有新增 PDF**

Run:

```bash
find assets/cisco-certifications -type f ! -name '*.png'
```

Expected: 无输出。

### Task 2: 编写证书模块契约测试

**Files:**
- Create: `scripts/verify-cisco-certification-carousel.mjs`

**Interfaces:**
- Consumes: 三个 Cisco HTML 入口、五张 PNG、后续创建的 JS/CSS。
- Produces: `node scripts/verify-cisco-certification-carousel.mjs` 发布前验证命令。

- [ ] **Step 1: 写入失败的静态契约测试**

测试必须读取三个 Cisco HTML、`assets/cisco-certifications.js`、`assets/cisco-certifications.css` 和五张 PNG，并断言：

```js
const routes = [
  "solutions/network/cisco/index.html",
  "zh/solutions/network/cisco/index.html",
  "fa/solutions/network/cisco/index.html",
];
const version = "20260817-1";

for (const route of routes) {
  const html = readFileSync(path.join(root, route), "utf8");
  assert.match(html, new RegExp(`/assets/cisco-certifications\\.js\\?v=${version}`));
  assert.match(html, new RegExp(`/assets/cisco-certifications\\.css\\?v=${version}`));
}

assert.match(script, /data-cisco-certifications/);
assert.match(script, /customer-logo-wall/);
assert.match(script, /role", "dialog"/);
assert.match(script, /aria-modal/);
assert.match(script, /Escape/);
assert.doesNotMatch(script, /\.pdf|download=/i);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);
assert.match(styles, /animation-play-state:\s*paused/);
```

同时验证五张 PNG 存在，并验证 `assets/cisco-certifications/` 下不存在 `.pdf` 文件。

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
node scripts/verify-cisco-certification-carousel.mjs
```

Expected: 因 JS/CSS 或 HTML 引用尚不存在而失败。

### Task 3: 实现 Cisco 证书区与灯箱

**Files:**
- Create: `assets/cisco-certifications.js`
- Create: `assets/cisco-certifications.css`
- Test: `scripts/verify-cisco-certification-carousel.mjs`

**Interfaces:**
- Consumes: `#customer-logo-wall`、`[data-partner-lockup-logo][alt="Cisco logo"]` 和五个 PNG URL。
- Produces: `mountCiscoCertificationCarousel(): void`，以及页面中的 `[data-cisco-certifications]`、`[data-cisco-certification-track]` 和 `[data-cisco-certification-dialog]`。

- [ ] **Step 1: 定义证书数据和三语言界面文案**

在 JS 中定义：

```js
const CERTIFICATES = [
  ["cloud-ai-infrastructure-partner.png", "Cisco Cloud and AI Infrastructure Partner"],
  ["preferred-collaboration-partner.png", "Cisco Preferred Collaboration Partner"],
  ["preferred-networking-partner.png", "Cisco Preferred Networking Partner"],
  ["preferred-security-partner.png", "Cisco Preferred Security Partner"],
  ["services-partner.png", "Cisco Services Partner"],
];

const COPY = {
  en: { eyebrow: "Cisco certifications", title: "Certified expertise across the Cisco portfolio.", description: "JOTO maintains current Cisco partner qualifications across infrastructure, networking, security, collaboration and services.", close: "Close certificate", view: "Enlarge" },
  zh: { eyebrow: "Cisco 资质认证", title: "覆盖 Cisco 全产品组合的专业资质。", description: "JOTO 持有涵盖基础设施、网络、安全、协作与服务的 Cisco 合作伙伴资质。", close: "关闭证书", view: "放大查看" },
  fa: { eyebrow: "گواهینامه‌های سیسکو", title: "تخصص تأییدشده در سراسر مجموعه سیسکو.", description: "JOTO دارای صلاحیت‌های همکاری سیسکو در زیرساخت، شبکه، امنیت، همکاری و خدمات است.", close: "بستن گواهینامه", view: "نمایش بزرگ" },
};
```

- [ ] **Step 2: 创建主轨道和隐藏副本**

实现 `createCard(certificate, copy, duplicate)`：主卡片使用 `<button type="button">`，图片 `loading="lazy"`，并设置本地化 `aria-label`；副本设置 `aria-hidden="true"`、`tabIndex = -1`。将两组五张卡片放入同一轨道，实现无缝循环。

- [ ] **Step 3: 创建灯箱控制器**

实现 `openLightbox(src, title, trigger)` 和 `closeLightbox()`：灯箱使用 `role="dialog"`、`aria-modal="true"`；打开时保存触发按钮、设置 `document.documentElement.dataset.ciscoCertificateOpen` 并聚焦关闭按钮；关闭时移除状态并恢复焦点。注册遮罩点击和 `Escape` 键处理。

- [ ] **Step 4: 在客户 Logo 墙前挂载一次**

实现：

```js
function mountCiscoCertificationCarousel() {
  if (!/\/(?:zh\/|fa\/)?solutions\/network\/cisco\/?$/.test(location.pathname)) return;
  if (document.querySelector("[data-cisco-certifications]")) return;
  if (!document.querySelector('[data-partner-lockup-logo][alt="Cisco logo"]')) return;
  const wall = document.querySelector("#customer-logo-wall");
  if (!wall) return;
  wall.before(createCertificationSection());
}
```

使用 `MutationObserver` 等待 React 内容出现，挂载成功后断开观察。

- [ ] **Step 5: 编写响应式样式**

CSS 必须包含：

```css
.cisco-certifications__viewport { overflow: hidden; }
.cisco-certifications__track { --certificate-gap: 24px; display: flex; width: max-content; gap: var(--certificate-gap); animation: cisco-certifications-scroll 52s linear infinite; }
.cisco-certifications__sequence { display: flex; gap: var(--certificate-gap); }
.cisco-certifications__card { width: clamp(280px, 40vw, 560px); aspect-ratio: 841.89 / 595.28; }
.cisco-certifications__track:hover,
.cisco-certifications__track:focus-within,
[data-cisco-certificate-paused="true"] .cisco-certifications__track { animation-play-state: paused; }
@keyframes cisco-certifications-scroll { to { transform: translate3d(calc(-50% - var(--certificate-gap) / 2), 0, 0); } }
html[data-cisco-certificate-open="true"] { overflow: hidden; }
.cisco-certifications__dialog[hidden] { display: none; }
.cisco-certifications__dialog { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px; background: rgba(2, 6, 5, 0.9); }
.cisco-certifications__dialog img { max-width: min(1200px, 94vw); max-height: 86vh; object-fit: contain; }
html[dir="rtl"] .cisco-certifications__heading { text-align: right; }
@media (max-width: 767px) {
  .cisco-certifications__viewport { overflow-x: auto; scroll-snap-type: x proximity; }
  .cisco-certifications__track { animation: none; }
  [data-cisco-certificate-duplicate] { display: none; }
  .cisco-certifications__card { width: 82vw; scroll-snap-align: start; }
}
@media (prefers-reduced-motion: reduce) {
  .cisco-certifications__viewport { overflow-x: auto; }
  .cisco-certifications__track { animation: none; }
  [data-cisco-certificate-duplicate] { display: none; }
}
```

关闭按钮固定在灯箱右上方，使用至少 `44px` 的点击区域；波斯语页面将关闭按钮放在左上方。灯箱打开状态由 `html[data-cisco-certificate-open="true"]` 锁定页面滚动。

- [ ] **Step 6: 运行契约测试**

Run:

```bash
node scripts/verify-cisco-certification-carousel.mjs
```

Expected: 仍因三个 HTML 未引用资源而失败，其余资源断言通过。

### Task 4: 接入三语言 Cisco 页面

**Files:**
- Modify: `solutions/network/cisco/index.html`
- Modify: `zh/solutions/network/cisco/index.html`
- Modify: `fa/solutions/network/cisco/index.html`
- Test: `scripts/verify-cisco-certification-carousel.mjs`

**Interfaces:**
- Consumes: `/assets/cisco-certifications.js?v=20260817-1` 和 `/assets/cisco-certifications.css?v=20260817-1`。
- Produces: 三个语言入口均加载一次证书增强模块。

- [ ] **Step 1: 在三个页面的 `</head>` 前加入资源引用**

```html
<script type="module" src="/assets/cisco-certifications.js?v=20260817-1"></script>
<link rel="stylesheet" href="/assets/cisco-certifications.css?v=20260817-1">
```

- [ ] **Step 2: 运行契约测试并确认通过**

Run:

```bash
node scripts/verify-cisco-certification-carousel.mjs
```

Expected: `Verified Cisco certification carousel across three localized routes.`

- [ ] **Step 3: 运行现有回归测试**

Run:

```bash
node scripts/verify-site-rules.mjs
node scripts/verify-site-typography-mall.mjs
git diff --check
```

Expected: 三条命令全部成功。

### Task 5: 本地浏览器预览与交互验证

**Files:**
- Verify: `http://127.0.0.1:3009/zh/solutions/network/cisco/`

**Interfaces:**
- Consumes: 完整本地实现。
- Produces: 保留在应用内浏览器中的用户可查看预览。

- [ ] **Step 1: 复用或启动本地静态服务器**

Run:

```bash
python3 -m http.server 3009 --bind 127.0.0.1
```

Expected: Cisco 中文详情页可访问。

- [ ] **Step 2: 验证三语言 DOM 和布局**

对英文、中文和波斯语 Cisco 页面断言：证书区数量为 1、主证书卡为 5、副本为 5、位置紧邻 `#customer-logo-wall` 之前、无页面级横向溢出。

- [ ] **Step 3: 验证灯箱**

点击第一张证书，确认灯箱可见、图片完整、页面滚动锁定；按 `Esc` 后灯箱关闭且焦点返回第一张证书。

- [ ] **Step 4: 验证响应式与减少动态效果**

使用浏览器视口能力检查 1440px、820px 和 390px。分别确认约 2.5、1.8、1.15 张证书的视觉密度；在减少动态效果模式下确认动画关闭且轨道可横向滚动。

- [ ] **Step 5: 保留中文本地预览供用户审核**

导航到 `http://127.0.0.1:3009/zh/solutions/network/cisco/`，滚动至证书区，并将该标签页标记为可交付预览。
