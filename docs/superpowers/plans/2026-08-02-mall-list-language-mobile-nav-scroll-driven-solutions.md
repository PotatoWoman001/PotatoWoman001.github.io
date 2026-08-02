# 商城列表、语言入口与滚动驱动解决方案板块实施计划

> **执行说明：** 按任务顺序实施；每个行为先补失败测试，再写最小实现。完整浏览器矩阵只在主任务中统一运行一次。

**目标：** 统一商城网格/列表分页与结果标题，压缩列表行高，隐藏公开波斯语切换入口并保留浏览器语言自动识别，修复手机 Mall 导航，同时把桌面首页解决方案卡片改为不劫持滚轮的粘性横向滚动。

**架构：** 商城继续由 `mall-data-client.js` 提供唯一筛选与分页结果，`mall-catalog-pages.js` 只负责视图呈现。语言选项在现有编译入口的公开菜单集合中收窄为英文/中文，但保留 `fa-IR` 路由解析与浏览器语言判断。手机 Mall 使用现有幂等 DOM 增强器持续处理延迟挂载菜单。解决方案横向效果在现有 `solution-card-carousel.js` 上重构为“外层滚动距离 + 内层 sticky 舞台 + requestAnimationFrame transform”，窄屏和减少动态效果保持原生滚动。

**技术栈：** 静态 HTML、原生 ES modules、CSS、React 编译产物、Node.js 静态验证、Playwright 浏览器验证。

---

## 任务 1：为商城列表数量、标题和密度建立失败测试

**文件：**

- 修改：`scripts/verify-mall-catalog-pages.mjs`
- 修改：`scripts/verify-mall-data-client.mjs`

### 步骤 1：补充网格/列表同源分页断言

在 `verify-mall-data-client.mjs` 中构造 30 件带真实图片的产品，分别用 `view: "grid"` 和 `view: "list"` 查询，断言：

```js
assert.equal(gridResult.total, 30);
assert.equal(listResult.total, 30);
assert.equal(gridResult.pageSize, 24);
assert.equal(listResult.pageSize, 24);
assert.deepEqual(
  listResult.products.map(({ slug }) => slug),
  gridResult.products.map(({ slug }) => slug),
);
```

### 步骤 2：补充分类标题和行高契约

在 `verify-mall-catalog-pages.mjs` 中加入断言：

- 结果标签使用 `state.category || locale.allProductsHeading`；
- 列表模型保留单行完整值提示；
- 桌面列表卡片 `max-height: 76px`；
- 桌面媒体高度约 `74px`；
- 小屏列表高度约 `88px`；
- 删除旧 `112px` 契约。

### 步骤 3：运行测试并确认失败

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
```

预期：分页同源测试通过；标题和新行高断言失败，证明测试能捕获待实现行为。

---

## 任务 2：实现商城列表标题和高密度布局

**文件：**

- 修改：`assets/mall-catalog-pages.js`
- 修改：`assets/mall-catalog.css`

### 步骤 1：结果标题显示真实分类

把固定的 `locale.allProductsHeading` 改为：

```js
const resultLabel = state.category || locale.allProductsHeading;
const countText = `${resultLabel} · ${result.total} ${locale.results}`;
```

技术分类名称保持 `dir="ltr"`；未选分类时继续显示本地化“全部产品”。

### 步骤 2：为截断型号保留完整提示

在型号节点上设置：

```js
title: product.model || product.title,
```

链接原有 `aria-label` 保留，确保视觉省略不丢失可访问名称。

### 步骤 3：压缩桌面列表

调整 `.joto-mall__cards--list`：

- 卡片最大高度 `76px`；
- 媒体列约 `92px`，媒体高度 `74px`；
- 文案区使用 `brand/model | product type | action` 三列；
- 内边距约 `8px 14px`；
- 品牌外边距和字号同步收紧；
- 型号、产品类型单行省略；
- 列表卡片间距约 `6–8px`。

### 步骤 4：定义窄屏降级

在 `max-width: 767px` 范围：

- 卡片目标高度 `88px`；
- 图片列 `88–96px`；
- 隐藏产品类型；
- 品牌、型号和操作按钮保持一行可读；
- 无页面横向溢出。

### 步骤 5：运行商城测试

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
```

预期：两项测试通过。

---

## 任务 3：隐藏公开波斯语入口并保留自动识别

**文件：**

- 新增：`scripts/verify-language-entry-policy.mjs`
- 修改：`assets/index-DaFvN0XI.js`

### 步骤 1：新增静态策略测试

测试编译入口包含：

```js
const cm=["en","zh-CN"]
```

同时必须继续包含：

- `"fa-IR":{dir:"rtl",label:"فارسی",prefix:"/fa"}`；
- `t==="fa"||t.startsWith("fa-")` 浏览器语言识别；
- `/fa` 路由解析；
- `joto:locale` 本地存储。

并断言菜单数组不再包含 `fa-IR`。

### 步骤 2：运行测试并确认失败

```bash
node scripts/verify-language-entry-policy.mjs
```

预期：因菜单仍包含波斯语而失败。

### 步骤 3：最小修改编译入口

只把公开菜单/可手动选择集合从：

```js
const cm=["en","zh-CN","fa-IR"]
```

改为：

```js
const cm=["en","zh-CN"]
```

保留 `Hs["fa-IR"]`、`sx()`、`um()` 和 `/fa/` 页面内容，避免删除路由能力。

### 步骤 4：重新运行策略测试

```bash
node scripts/verify-language-entry-policy.mjs
```

预期：通过。

---

## 任务 4：修复延迟挂载的手机 Mall 导航

**文件：**

- 修改：`scripts/verify-mall-data-client.mjs`
- 修改：`assets/mall-navigation-and-page.js`

### 步骤 1：补失败断言

验证导航增强器：

- 仍使用 `MutationObserver` 和 `requestAnimationFrame`；
- 不再使用 `setTimeout(() => observer.disconnect(), 15000)`；
- 仍按 `data-joto-mall-link` 保证幂等；
- 三语言标签和路径不变。

### 步骤 2：运行测试并确认失败

```bash
node scripts/verify-mall-data-client.mjs
```

预期：旧 15 秒断开逻辑导致失败。

### 步骤 3：保持轻量持续观察

移除 15 秒自动断开；继续用单个 `scheduled` 标记把多次 DOM 变化合并到下一帧。增强函数只扫描 Blog 链接并幂等补 Mall，不同步读取大批布局属性。

### 步骤 4：运行测试

```bash
node scripts/verify-mall-data-client.mjs
```

预期：通过。

---

## 任务 5：为粘性横向滚动建立新契约

**文件：**

- 修改：`scripts/verify-solution-card-carousel.mjs`

### 步骤 1：移除旧提示动画契约

删除对以下旧行为的要求：

- `HINT_*` 常量；
- 进入视口后先向前再回退的提示动画；
- `wheel` 监听、`preventDefault()` 和 `window.scrollBy()`；
- `solutionCarouselHint` 状态。

### 步骤 2：新增滚动驱动契约

静态测试要求：

- 使用 `matchMedia("(min-width: 1024px)")`；
- 使用 `prefers-reduced-motion: reduce`；
- 使用 `ResizeObserver`、被动 `scroll` 监听和 `requestAnimationFrame`；
- 使用 CSS 自定义属性记录舞台高度/滚动距离；
- 使用 `translate3d()` 或等效 transform；
- 不含 `wheel.preventDefault()`；
- 按钮点击通过 `window.scrollTo()` 映射到区段进度；
- RTL 有相反位移方向；
- 窄屏保留 `scrollIntoView()`。

CSS 契约要求：

- `.solution-scroll-section`；
- `.solution-scroll-stage` 使用 `position: sticky`；
- 桌面激活时区段裁切横向溢出；
- `max-width: 1023px` 和减少动态效果降级；
- 原有隐藏滚动条和按钮样式继续存在。

### 步骤 3：运行测试并确认失败

```bash
node scripts/verify-solution-card-carousel.mjs
```

预期：旧实现缺少 sticky/progress 契约并包含 wheel 拦截，测试失败。

---

## 任务 6：实现桌面滚动驱动的横向解决方案板块

**文件：**

- 修改：`assets/solution-card-carousel.js`
- 修改：`assets/solution-card-carousel.css`

### 步骤 1：保留基础轮播增强

继续复用：

- 三语言按钮标签；
- 卡片和边缘状态计算；
- 左右控制按钮；
- 窄屏原生横向滚动；
- MutationObserver 等待 React 挂载。

删除旧“一次提示滑动”状态机及所有非被动 `wheel` 监听。

### 步骤 2：建立区段和舞台引用

从 scroller 定位：

```js
const section = scroller.closest("section");
const stage = scroller.parentElement;
```

增强后添加：

```js
section.classList.add("solution-scroll-section");
stage.classList.add("solution-scroll-stage");
```

仅在宽度 `>= 1024px` 且未启用减少动态效果时增加 active 状态。

### 步骤 3：测量滚动距离

在 `measure()` 中：

- 暂停 transform；
- 读取 `scroller.scrollWidth - scroller.clientWidth`；
- 读取舞台实际高度；
- 把两者写入 CSS 自定义属性；
- 将外层区段高度设为“舞台高度 + 横向距离”；
- 记录区段文档起点和有效进度范围。

所有测量由 `ResizeObserver` 和窗口尺寸变化触发，并合并到动画帧。

### 步骤 4：映射滚动进度

被动监听 `window.scroll`，每帧计算一次：

```js
progress = clamp((scrollY - sectionStart) / scrollDistance, 0, 1);
offset = progress * horizontalTravel * (rtl ? 1 : -1);
```

写入：

```js
scroller.style.transform = `translate3d(${offset}px, 0, 0)`;
```

同步当前卡片索引和首尾按钮状态。

### 步骤 5：同步按钮

桌面 active 状态下，按钮将目标卡片索引换算为纵向进度并调用：

```js
window.scrollTo({ top: targetScrollY, behavior });
```

窄屏和减少动态效果下仍对目标卡片执行 `scrollIntoView()`。

### 步骤 6：实现 CSS sticky 舞台

在桌面 active 状态：

- 外层区段 `position: relative; overflow: clip;`；
- 舞台 `position: sticky; top: 76px;`；
- scroller 允许横向内容在区段内移动；
- 卡片高度沿用现有已优化值，不重新放大；
- 不增加图片缩放、阴影或模糊动画。

窄屏/减少动态效果下清除 sticky、高度和 transform，恢复原生横向滑动。

### 步骤 7：运行静态测试

```bash
node scripts/verify-solution-card-carousel.mjs
```

预期：通过。

---

## 任务 7：统一静态资源版本并更新验证常量

**文件：**

- 修改：`scripts/integrate-static-asset-version.mjs`
- 修改：引用旧版本 `20260731-3` 的相关验证脚本
- 修改：114 个正式路由 `index.html` 和 `404.html`（由集成脚本机械更新）

### 步骤 1：设定新版本

使用：

```js
const staticAssetVersion = "20260802-1";
```

扩展集成器，使 HTML 中本项目 `/assets/*.js` 和 `/assets/*.css` 的查询版本统一更新，而不改变文件名、页面内容或外部 URL。

### 步骤 2：运行集成器

```bash
node scripts/integrate-static-asset-version.mjs
```

预期：114 个正式路由和 `404.html` 中共享资源版本一致。

### 步骤 3：更新验证脚本版本常量

把相关脚本中的旧版本改为 `20260802-1`，避免测试与页面契约不一致。

### 步骤 4：检查机械改动

```bash
git diff --check
rg -n "20260731-3" --glob '*.html' --glob '*.mjs'
```

预期：无空白错误；维护页面与测试不再引用旧版本。

---

## 任务 8：运行静态回归

**文件：** 无新增业务改动

### 步骤 1：运行定向验证

```bash
node scripts/verify-language-entry-policy.mjs
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-solution-card-carousel.mjs
```

### 步骤 2：运行站点级验证

```bash
node scripts/verify-site-rules.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-mall-browser.mjs
```

若 `verify-mall-browser.mjs` 自己启动浏览器，则放到任务 9 与本地服务一起运行；静态部分先完成。

---

## 任务 9：三语言与响应式浏览器验证

**文件：**

- 必要时修改：`scripts/verify-mall-browser.mjs`
- 必要时新增：`scripts/verify-homepage-solution-scroll-browser.mjs`

### 步骤 1：复用本地服务

先检查 `127.0.0.1:3009`；已有兼容服务则复用，否则启动项目既有本地预览方式，不重复启动 Docker 或监听器。

### 步骤 2：验证商城

覆盖 `/mall/`、`/zh/mall/`、`/fa/mall/`：

- `1440 × 900`：全部产品网格和列表均为每页 24 件；同一筛选下 slug 顺序一致；列表行高约 76px；分类标题正确；
- `390 × 844`：列表行高约 88px；无横向溢出；手机菜单打开后 Mall 只出现一次且可导航；
- Storages：两种视图均显示 2 件，标题显示 `Storages` 而不是 `All products`。

### 步骤 3：验证语言入口

- 英文和中文语言菜单仅有 `EN`、`中文`；
- 波斯语页面菜单不提供波斯语切换项；
- 新浏览器上下文设置 `locale: "fa-IR"`、清空 `joto:locale` 后访问 `/`，自动进入 `/fa/`；
- 直接访问 `/fa/` 仍正常 RTL；
- 显式选择英文/中文后本地存储生效。

### 步骤 4：验证滚动驱动板块

三语言 `1440 × 900` 与 `1024 × 768`：

- 进入区段前页面正常纵向滚动；
- 区段中点舞台顶部保持在固定页头下方；
- 起点、中点、终点的 transform 单调变化；
- 最后一张在终点完整可见；
- 继续滚动后页面进入下一板块；
- 按钮点击改变纵向进度并同步当前索引；
- 波斯语位移方向相反且卡片顺序正确；
- 无页面横向溢出。

手机 `390 × 844`：

- 区段不 sticky；
- 卡片可原生左右滑动；
- 页面纵向滚动不被锁定。

减少动态效果：

- 区段不 sticky；
- transform 为 `none`；
- 按钮仍可用。

### 步骤 5：控制台和网络错误

每个代表页面收集：

- console errors = 0；
- page errors = 0；
- 关键本地资源请求无 4xx/5xx；
- `document.documentElement.scrollWidth <= clientWidth + 1`。

---

## 任务 10：最终审查与实现提交

**文件：** 本任务所有改动

### 步骤 1：审查差异

```bash
git diff --check
git status --short
git diff --stat
git diff -- assets/mall-catalog-pages.js assets/mall-catalog.css assets/mall-navigation-and-page.js assets/solution-card-carousel.js assets/solution-card-carousel.css assets/index-DaFvN0XI.js
```

确认不包含 `.playwright-cli/`、`.superpowers/` 或其他临时文件。

### 步骤 2：重新运行关键验证

```bash
node scripts/verify-language-entry-policy.mjs
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-site-rules.mjs
```

### 步骤 3：提交实现

只暂存本任务文件，创建实现提交：

```bash
git commit -m "feat: refine mall list and solution scrolling"
```

### 步骤 4：交付

最终说明包含：

- 商城列表实际数量规则和行高；
- 波斯语入口与自动识别行为；
- 手机 Mall 导航修复；
- 粘性横向滚动及降级策略；
- 静态测试和三语言浏览器矩阵结果；
- 提交号；
- 是否尚未发布线上（本计划默认不发布）。
