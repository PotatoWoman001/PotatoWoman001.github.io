# Homepage Hero, Motion, and Iran Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已确认预览重排三语言首页 Hero，统一中文标题行距，优化核心能力卡片提示动效，并仅在波斯语首页地图加入伊朗与德黑兰。

**Architecture:** 保留现有 React 压缩包不动，通过首页增强层 `homepage-refinements.css/js` 完成 Hero 与地图的渐进增强；通过 `site-typography-system.css` 的语言作用域变量统一中文标题行距；重写 `solution-card-carousel.js` 的提示动效为浏览器原生平滑滚动。所有增强都以现有 `data-*`、区块 ID 和语言/路径为边界，确保英文、中文、波斯语互不串扰。

**Tech Stack:** 静态 HTML、CSS、原生 JavaScript、Node.js 静态合约脚本、Docker/Nginx、Playwright。

---

## Task 1: 扩充静态合约，先锁定新需求

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`
- Modify: `scripts/verify-solution-card-carousel.mjs`
- Modify: `scripts/verify-site-typography-mall.mjs`

- [ ] **Step 1: 为 Hero 与波斯语地图补充失败断言**

在 `verify-homepage-refinements.mjs` 中断言：

```js
assert.match(homepageScript, /removeHeroEyebrow/);
assert.match(homepageScript, /removeHeroProofCard/);
assert.match(homepageScript, /enhancePersianIranPresence/);
assert.match(homepageScript, /ایران/);
assert.match(homepageScript, /تهران/);
assert.match(homepageScript, /35\.71219607/);
assert.match(homepageScript, /51\.36844735/);
assert.match(homepageStyles, /data-home-hero-refined/);
assert.match(homepageStyles, /data-iran-presence/);
```

- [ ] **Step 2: 为原生轮播提示补充失败断言**

在 `verify-solution-card-carousel.mjs` 中把旧参数替换为：

```js
assert.match(script, /HINT_INTERSECTION_RATIO\s*=\s*0\.32/);
assert.match(script, /HINT_DISTANCE_RATIO\s*=\s*0\.3/);
assert.match(script, /HINT_MAX_DISTANCE\s*=\s*120/);
assert.match(script, /scrollTo\(\{/);
assert.match(script, /behavior:\s*"smooth"/);
assert.doesNotMatch(script, /scroller\.scrollLeft\s*=/);
```

同时断言垂直滚轮不会取消、水平或 Shift 滚轮会取消：

```js
assert.match(script, /Math\.abs\(event\.deltaX\)/);
assert.match(script, /event\.shiftKey/);
```

- [ ] **Step 3: 为中文标题行距补充失败断言**

在 `verify-site-typography-mall.mjs` 中断言：

```js
assert.match(typographyCss, /html:lang\(zh\)/);
assert.match(typographyCss, /--joto-type-t0-line:\s*1\.2/);
assert.match(typographyCss, /--joto-type-t1-line:\s*1\.2/);
assert.match(typographyCss, /--joto-type-t2-line:\s*1\.2/);
```

- [ ] **Step 4: 运行合约并确认按预期失败**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-site-typography-mall.mjs
```

Expected: 三个脚本至少各有一个新断言失败，证明测试覆盖的是尚未实现的行为。

## Task 2: 实施三语言 Hero 重排与中文标题行距

**Files:**
- Modify: `assets/homepage-refinements.js`
- Modify: `assets/homepage-refinements.css`
- Modify: `assets/site-typography-system.css`

- [ ] **Step 1: 在首页增强脚本中标记并清理 Hero 元素**

增加按语言匹配的 Hero 眉题和右上角证明卡内容，找到首页 Hero 后：

```js
function refineHomepageHero(hero) {
  removeHeroEyebrow(hero);
  removeHeroProofCard(hero);
  hero.dataset.homeHeroRefined = "true";
}
```

删除眉题节点与整个 `[始于 2010]` / `[ SINCE 2010 ]` / 波斯语对应卡片容器，不留下空边框。

- [ ] **Step 2: 用增强 CSS 将桌面 Hero 内容整体居中**

在 `@media (min-width: 1024px)` 内：

```css
[data-home-hero-refined="true"] [data-hero-copy-column] {
  inset-inline-start: 50%;
  top: 47%;
  width: min(56vw, 760px);
  transform: translate(-50%, -50%);
}
```

波斯语使用等价 RTL 定位。标题、说明和按钮组共享同一内容宽度；标题扩大并保持流体尺寸；按钮保留现有同尺寸规范。小于 `1024px` 时恢复安全的流式布局。

- [ ] **Step 3: 统一中文标题层级行距**

在 `site-typography-system.css` 中增加：

```css
html:lang(zh) {
  --joto-type-t0-line: 1.2;
  --joto-type-t1-line: 1.2;
  --joto-type-t2-line: 1.2;
}
```

不修改英文、波斯语，也不影响正文、按钮和标签。

- [ ] **Step 4: 运行静态合约**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-typography-mall.mjs
```

Expected: Hero、地图以外的新断言与中文行距断言通过。

## Task 3: 将核心能力提示动效改为原生平滑滚动

**Files:**
- Modify: `assets/solution-card-carousel.js`
- Modify: `assets/solution-card-carousel.css`

- [ ] **Step 1: 更新触发与位移常量**

```js
const HINT_INTERSECTION_RATIO = 0.32;
const HINT_DISTANCE_RATIO = 0.3;
const HINT_MAX_DISTANCE = 120;
const HINT_FORWARD_DURATION = 520;
const HINT_HOLD_DURATION = 260;
const HINT_RETURN_DURATION = 520;
```

- [ ] **Step 2: 删除逐帧写入 scrollLeft 的动画器**

移除 `animateScrollLeft()` 及相关 `hintAnimationFrame` 状态，用：

```js
scroller.scrollTo({ left: target, behavior: "smooth" });
```

配合 `scrollend`（以及超时兜底）等待前进和回程完成，避免主线程逐帧更新导致页面纵向滚动卡顿。

- [ ] **Step 3: 精确区分滚轮意图**

仅在以下情形取消提示：

```js
function handleWheelIntent(event) {
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
    markUserInteraction();
  }
}
```

保留 pointer、touch、键盘和左右按钮取消逻辑；普通纵向滚轮不取消提示。

- [ ] **Step 4: 保证每次完整刷新只播放一次**

每个页面生命周期只允许 `hintStarted` 从 `false` 变为 `true` 一次；完成或取消后不重新注册观察器。若减少动态效果开启则直接标为 `reduced`。

- [ ] **Step 5: 运行轮播静态合约**

Run:

```bash
node scripts/verify-solution-card-carousel.mjs
```

Expected: 通过，且脚本中不存在 `scroller.scrollLeft =`。

## Task 4: 仅在波斯语首页加入伊朗地图数据

**Files:**
- Modify: `assets/homepage-refinements.js`
- Modify: `assets/homepage-refinements.css`

- [ ] **Step 1: 语言和路由双重限制**

```js
function isPersianHomepage() {
  const language = document.documentElement.lang.toLowerCase();
  return language.startsWith("fa") || location.pathname.startsWith("/fa");
}
```

只有波斯语首页才能执行注入函数；英文、中文 DOM 中不出现伊朗卡片或德黑兰标记。

- [ ] **Step 2: 注入德黑兰路线与地图点**

以德黑兰 `35.71219607, 51.36844735` 投影结果 `left: 64.27%`、`top: 38.93%` 创建：

- 从上海/长三角中心到德黑兰的 SVG 曲线路径；
- `data-marker-id="tehran"` 的地图点；
- 可访问名称 `تهران، ایران`。

- [ ] **Step 3: 注入第七张国家卡**

创建 `data-region-key="Iran"`、`data-iran-presence` 卡片，显示：

```text
ایران
تهران
```

复用现有卡片的视觉结构和焦点/悬停状态；桌面端波斯语国家列表调整为七行。

- [ ] **Step 4: 运行首页静态合约**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
```

Expected: 通过。

## Task 5: 生成新静态资源版本并跑完整静态回归

**Files:**
- Modify: all generated route `index.html` asset query versions
- Modify: verifier version constants

- [ ] **Step 1: 检查版本集成脚本参数**

Run:

```bash
sed -n '1,240p' scripts/integrate-static-asset-version.mjs
```

确认脚本只机械更新站内静态资源查询参数和对应合约后，将版本从 `20260728-4` 更新为 `20260728-5`。

- [ ] **Step 2: 执行全站版本更新**

Run:

```bash
node scripts/integrate-static-asset-version.mjs 20260728-5
```

若脚本不接受参数，则仅用 `apply_patch` 更新脚本配置，再运行脚本。不得只更新三个首页，避免详情页资源版本不一致。

- [ ] **Step 3: 运行完整静态检查**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected: 全部通过，站点规则仍覆盖全部正式路由。

## Task 6: Docker 与 Playwright 三语言回归

**Files:**
- Test: `index.html`
- Test: `zh/index.html`
- Test: `fa/index.html`

- [ ] **Step 1: 构建并启动新的本地 Docker 版本**

Run:

```bash
docker build -f Dockerfile.local -t jotoglobal-maintenance:20260728-5 .
docker rm -f jotoglobal-local-20260728-v5
docker run -d --name jotoglobal-local-20260728-v5 -p 127.0.0.1:3009:80 jotoglobal-maintenance:20260728-5
```

若基础镜像网络超时，使用已有容器并只复制本任务精确变更文件；不操作其他容器。

- [ ] **Step 2: 桌面端验证 Hero**

用 Playwright 在 `1440×900` 验证 `/`、`/zh/`、`/fa/`：

- 眉题和顶部证明卡不存在；
- 内容组水平视觉居中且略高于垂直中线；
- 标题、说明和按钮组边界协调；
- 两个 Hero 按钮宽高一致；
- 中文标题计算行高不低于字体大小的 `1.2` 倍；
- 波斯语保持 RTL。

- [ ] **Step 3: 验证轮播提示与性能**

每个语言独立刷新后滚动到 `#solutions`：

- 提示只运行一次；
- 位移不超过 `120px`，回到开头；
- 普通纵向滚轮不会取消；
- 横向滚轮或 Shift 滚轮会取消；
- `prefers-reduced-motion: reduce` 下不播放；
- 页面滚动过程中无控制台错误、无明显长任务和横向溢出。

- [ ] **Step 4: 验证波斯语伊朗地图**

在 `/fa/` 验证：

- 出现 `ایران`、`تهران`；
- marker 位于约 `64.27% / 38.93%`；
- 国家卡片共七张；
- 悬停/聚焦卡片与地图点状态同步。

在 `/`、`/zh/` 验证没有 `data-iran-presence`，国家卡仍为六张。

- [ ] **Step 5: 移动端与关键详情页回归**

在 `390×844` 验证三个首页无横向溢出、Hero 仍可读、按钮不折行、轮播可操作；抽检：

```text
/zh/solutions/network/cisco/
/solutions/network/cisco/
/fa/solutions/network/cisco/
/zh/about/
```

确认导航、背景、动效资源和正文加载正常。

## Task 7: 自审、提交与刷新右侧预览

**Files:**
- Review: all task changes

- [ ] **Step 1: 检查差异与非任务文件**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

不得暂存 `.playwright-cli/`、`.superpowers/` 或其他用户文件。

- [ ] **Step 2: 提交实现**

Run:

```bash
git add assets scripts index.html zh fa 404.html
git commit -m "feat: refine homepage hero motion and Iran map"
```

- [ ] **Step 3: 核对最终状态**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: 仅保留既有未跟踪工具目录；最新提交为本任务实现。

- [ ] **Step 4: 刷新右侧正式本地网页**

将应用内浏览器打开到：

```text
http://127.0.0.1:3009/zh/#top
```

并在最终说明中提供提交、静态检查、三语言浏览器验证和本地预览地址。
