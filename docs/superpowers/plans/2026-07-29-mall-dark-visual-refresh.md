# JOTO Mall Dark Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将英文、中文和波斯语 Mall 统一为 JOTO Global 官网深色视觉体系，删除所有可见来源标注，缩小字号并稳定使用本地 Poppins 字体。

**Architecture:** 保持现有静态 Mall 数据客户端、首页/列表控制器和详情控制器边界不变，只在共享 Mall CSS、国际化文案、详情渲染器和验证脚本中实施视觉与内容修正。九个 Mall HTML 壳继续共用版本化资源；本地 Docker 和阿里云生产环境使用同一构建状态，发布时创建新版本目录并原子切换，不覆盖历史版本。

**Tech Stack:** 静态 HTML/CSS/JavaScript、Node.js ESM 契约脚本、Nginx 1.27、Docker、Playwright CLI、SSH/rsync。

## Global Constraints

- 采用 A 方案“官网深色延续”。
- Mall 不使用绿色 Instrument Serif 斜衬体例外。
- 英文与拉丁字符使用本地 `Poppins`。
- 中文字体栈为 `Poppins, "PingFang SC", "Microsoft YaHei", sans-serif`。
- 波斯语字体栈为 `Poppins, Vazirmatn, sans-serif`。
- 产品详情页不得显示来源标题、来源 URL、原网页标注或来源外链。
- `source_url` 继续保留在快照数据中，但 Mall 前端不得读取或渲染。
- 不改变搜索、筛选、排序、分页、历史记录、SEO Product JSON-LD 和联系表单预填逻辑。
- 所有浏览器资源版本从 `20260729-4` 更新为 `20260729-5`。
- 新发布必须创建新的线上版本目录，不覆盖任何历史目录。
- 不提交 `.playwright-cli/`、`.superpowers/` 或爬虫仓库中与本任务无关的用户改动。

---

### Task 1: 建立深色视觉与来源删除的失败契约

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: `assets/mall-catalog.css`、`assets/mall-product-page.js`、`assets/mall-i18n.js`。
- Produces: 静态契约和浏览器断言，后续 CSS/JS 修改必须满足。

- [ ] **Step 1: 修改静态契约以表达新规则**

在 `scripts/verify-mall-catalog-pages.mjs` 中：

```js
assert.doesNotMatch(product, /product\.source_url|locale\.source/);
assert.doesNotMatch(i18n, /^\s*source:\s*/m);
for (const expected of [
  "--mall-bg: #050a08",
  "--mall-surface: #08110d",
  "--mall-green: #5dd3a0",
  'html[lang^="en"] [data-joto-mall]',
  'html[lang^="zh"] [data-joto-mall]',
  'html[lang^="fa"] [data-joto-mall]',
  "font-family: Poppins, sans-serif",
  'font-family: Poppins, "PingFang SC", "Microsoft YaHei", sans-serif',
  "font-family: Poppins, Vazirmatn, sans-serif",
]) {
  assert.ok(styles.includes(expected), `Mall styles missing ${expected}`);
}
assert.doesNotMatch(styles, /background-size:\s*32px 32px/);
assert.match(styles, /\.joto-mall__hero-title[\s\S]*font-size:\s*clamp\(34px,\s*5vw,\s*56px\)/);
assert.match(styles, /\.joto-mall__card-title[\s\S]*font-size:\s*18px/);
```

同时把脚本的期望资源版本改为 `20260729-5`。

- [ ] **Step 2: 修改浏览器验证以检查真实计算样式**

在 `scripts/verify-mall-browser.mjs` 的页面基础断言中收集并检查：

```js
const mallStyles = await page.locator("[data-joto-mall]").evaluate((node) => {
  const style = getComputedStyle(node);
  const title = node.querySelector(".joto-mall__hero-title, .joto-mall__list-header h1, .joto-mall__product-summary h1");
  return {
    backgroundColor: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    fontFamily: style.fontFamily,
    titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
  };
});
assert(
  mallStyles.backgroundColor === "rgb(5, 10, 8)",
  `${testCase.locale}/${viewport.name}: Mall background is not dark`,
);
assert(
  mallStyles.backgroundImage === "none",
  `${testCase.locale}/${viewport.name}: Mall grid background remains`,
);
assert(
  mallStyles.fontFamily.startsWith("Poppins"),
  `${testCase.locale}/${viewport.name}: Mall font is not Poppins-first`,
);
```

在详情页断言中加入：

```js
assert(
  (await page.locator('a[href^="http"]').filter({ hasText: /https?:\/\// }).count()) === 0,
  `${testCase.locale}/${viewport.name}: visible source URL remains`,
);
assert(
  !/^(Source|来源|منبع)$/m.test(await page.locator("[data-joto-mall-product]").innerText()),
  `${testCase.locale}/${viewport.name}: visible source label remains`,
);
```

- [ ] **Step 3: 运行契约并确认按预期失败**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL，首先报告旧的 `product.source_url` 渲染或缺少 `--mall-bg`。

- [ ] **Step 4: 检查验证脚本语法**

Run:

```bash
node --check scripts/verify-mall-catalog-pages.mjs
node --check scripts/verify-mall-browser.mjs
```

Expected: 两条命令均退出码 `0`。

---

### Task 2: 删除可见来源模块和三语言来源文案

**Files:**
- Modify: `assets/mall-product-page.js`
- Modify: `assets/mall-i18n.js`

**Interfaces:**
- Consumes: 产品快照中的 `source_url` 仍由数据客户端保留。
- Produces: 不读取 `source_url` 的详情渲染器，以及不含 `source` 显示文案的语言资源。

- [ ] **Step 1: 删除详情页来源渲染分支**

从 `renderProduct()` 中完整删除：

```js
if (product.source_url) {
  details.append(element("section", { className: "joto-mall__detail-section", dir: "ltr" }, [
    element("h2", { text: locale.source }),
    element("a", {
      href: product.source_url,
      target: "_blank",
      rel: "noopener noreferrer",
      text: product.source_url,
    }),
  ]));
}
```

- [ ] **Step 2: 删除三语言 `source` 文案**

从 `MALL_COPY.en`、`MALL_COPY.zh` 和 `MALL_COPY.fa` 中分别删除：

```js
source: "Source",
source: "来源",
source: "منبع",
```

- [ ] **Step 3: 运行语法与来源契约**

Run:

```bash
node --check assets/mall-product-page.js
node --check assets/mall-i18n.js
node scripts/verify-mall-catalog-pages.mjs
```

Expected: 两个语法检查通过；契约继续因旧视觉 CSS 或旧资源版本失败，但不再报告来源渲染。

- [ ] **Step 4: 提交来源删除**

```bash
git add assets/mall-product-page.js assets/mall-i18n.js scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "fix: remove visible Mall source attribution"
```

Expected: 只提交上述四个文件。

---

### Task 3: 实施官网深色 Mall 视觉与统一字号

**Files:**
- Modify: `assets/mall-catalog.css`

**Interfaces:**
- Consumes: 现有 `.joto-mall__*` DOM 类名和全站本地字体文件。
- Produces: 九个 Mall 壳共用的深色响应式视觉。

- [ ] **Step 1: 定义深色语义变量和三语言字体栈**

将 `[data-joto-mall]` 根变量改为：

```css
[data-joto-mall] {
  --mall-bg: #050a08;
  --mall-surface: #08110d;
  --mall-surface-raised: #0c1712;
  --mall-ink: #f4f7f5;
  --mall-muted: rgba(244, 247, 245, 0.62);
  --mall-green: #5dd3a0;
  --mall-line: rgba(146, 170, 159, 0.22);
  background: var(--mall-bg);
  color: var(--mall-ink);
}

html[lang^="en"] [data-joto-mall] {
  font-family: Poppins, sans-serif;
}

html[lang^="zh"] [data-joto-mall] {
  font-family: Poppins, "PingFang SC", "Microsoft YaHei", sans-serif;
}

html[lang^="fa"] [data-joto-mall] {
  font-family: Poppins, Vazirmatn, sans-serif;
}
```

按钮、输入框、选择器和文本域继续使用 `font: inherit`。

- [ ] **Step 2: 删除网格背景并重做 Hero**

将 `.joto-mall__grid-field` 改为无背景图，并设置：

```css
[data-joto-mall] .joto-mall__grid-field {
  background: none;
}

[data-joto-mall] .joto-mall__hero {
  padding-block: clamp(84px, 10vw, 136px) clamp(56px, 7vw, 88px);
  background:
    radial-gradient(circle at 74% 14%, rgba(39, 112, 80, 0.28), transparent 38%);
}

[data-joto-mall] .joto-mall__hero-title {
  max-width: 760px;
  font-size: clamp(34px, 5vw, 56px);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.035em;
}

[data-joto-mall] .joto-mall__hero-intro,
[data-joto-mall] .joto-mall__lead {
  font-size: clamp(15px, 1.4vw, 16px);
  line-height: 1.75;
}
```

- [ ] **Step 3: 深色化搜索、按钮和分类**

搜索框使用 `--mall-surface` 与胶囊边框，按钮使用 `--mall-green` 深色文字。
分类卡片使用 `--mall-surface`，标题 `18px / 1.35`。所有 hover、focus 和
disabled 状态在深色背景上保持可读。

- [ ] **Step 4: 深色化产品卡片、筛选和分页**

产品卡片、图片区域、筛选选择器、视图切换、分页和空状态分别使用
`--mall-surface`、`--mall-surface-raised` 与 `--mall-line`。产品标题固定
`18px / 1.35`，摘要 `14px / 1.65`，品牌和型号 `11–12px`。

- [ ] **Step 5: 深色化产品详情**

画廊、缩略图、元数据、详情小节、规格表、下载列表、相关产品和移动端
联系入口统一使用深色组件。详情主标题使用桌面 `48px`、平板 `40px`、
手机 `32px`；详情小节标题使用桌面 `28px`、平板 `26px`、手机 `22px`。

- [ ] **Step 6: 完成响应式和 reduced-motion 规则**

保持现有三列、两列和一列断点；平板与手机覆盖表中字号；RTL 继续镜像文本
方向；`prefers-reduced-motion: reduce` 继续将非必要动画缩短到 `0.01ms`。

- [ ] **Step 7: 运行 CSS 契约**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: 只因资源版本仍为 `20260729-4` 而失败，深色、字体、字号和来源断言均通过。

- [ ] **Step 8: 提交深色样式**

```bash
git add assets/mall-catalog.css
git commit -m "feat: align Mall with JOTO dark visual system"
```

Expected: 只提交 `assets/mall-catalog.css`。

---

### Task 4: 更新浏览器资源版本与集成契约

**Files:**
- Modify: `mall/index.html`
- Modify: `mall/products/index.html`
- Modify: `mall/product/index.html`
- Modify: `zh/mall/index.html`
- Modify: `zh/mall/products/index.html`
- Modify: `zh/mall/product/index.html`
- Modify: `fa/mall/index.html`
- Modify: `fa/mall/products/index.html`
- Modify: `fa/mall/product/index.html`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-product-page.js`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-site-typography-mall.mjs`
- Modify: all integration and verification scripts that contain the exact literal `20260729-4`

**Interfaces:**
- Consumes: 完成的深色 CSS、详情渲染器和国际化资源。
- Produces: 缓存隔离的 `20260729-5` 浏览器资源图。

- [ ] **Step 1: 枚举旧版本引用**

Run:

```bash
rg -l "20260729-4" --glob '!docs/**' --glob '!.git/**' --glob '!.playwright-cli/**' --glob '!.superpowers/**'
```

Expected: 只返回正式 HTML、Mall 控制器和集成/验证脚本。

- [ ] **Step 2: 将所有正式引用机械更新为 `20260729-5`**

对 Step 1 返回的文件做精确字面量替换：

```text
20260729-4 → 20260729-5
```

不得修改设计文档、历史计划或已发布目录记录。

- [ ] **Step 3: 确认没有正式旧版本引用**

Run:

```bash
rg -n "20260729-4" --glob '!docs/**' --glob '!.git/**' --glob '!.playwright-cli/**' --glob '!.superpowers/**'
```

Expected: 无输出，退出码 `1`。

- [ ] **Step 4: 运行全部 Mall 静态回归**

Run:

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-site-rules.mjs
node scripts/publish-mall-snapshot.test.mjs
node scripts/verify-mall-snapshot.mjs "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/20260729T033844Z-run-8"
git diff --check
```

Expected: 所有脚本退出码 `0`；快照报告 `16 products`；站点规则报告 `114 routes`。

- [ ] **Step 5: 提交版本更新**

```bash
git add assets mall zh/mall fa/mall scripts
git commit -m "chore: version Mall dark visual assets"
```

Expected: 不包含 `.playwright-cli/`、`.superpowers/` 或其他目录。

---

### Task 5: 构建本地 Docker 并完成三语言浏览器回归

**Files:**
- Test: `scripts/verify-mall-browser.mjs`
- Artifact only: `.playwright-cli/`，不得提交。

**Interfaces:**
- Consumes: 当前 Git 工作树、有效快照 `20260729T033844Z-run-8`。
- Produces: 本地 `127.0.0.1:3009` 三语言桌面/平板/手机回归证据。

- [ ] **Step 1: 构建新 Docker 镜像**

Run:

```bash
docker build -t jotoglobal-mall:20260729-5 .
```

Expected: 镜像构建成功。

- [ ] **Step 2: 以新容器替换本地预览容器**

Run:

```bash
docker rm -f jotoglobal-mall-20260729-5
docker run -d --name jotoglobal-mall-20260729-5 \
  -p 127.0.0.1:3009:80 \
  -v "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/20260729T033844Z-run-8:/usr/share/nginx/html/mall-data:ro" \
  jotoglobal-mall:20260729-5
```

Expected: 容器启动；如果端口被旧容器占用，先停止精确识别的旧 JOTO
预览容器，再重试，不删除镜像或其他容器。

- [ ] **Step 3: 打开本地 Mall 并运行完整 Playwright 矩阵**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dark-local open \
  "http://127.0.0.1:3009/zh/mall/?release=20260729-5"
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dark-local run-code \
  --filename scripts/verify-mall-browser.mjs
```

Expected:

```json
{
  "matrixCases": 10,
  "consoleProblems": [],
  "pageErrors": []
}
```

- [ ] **Step 4: 人工截图核对**

在同一会话分别截图中文 Mall 首页、英文产品列表、波斯语产品详情的
`1440 × 900` 与 `390 × 844` 视口。确认背景深色、字号克制、Poppins
字形、无来源板块、无横向溢出。

- [ ] **Step 5: 修复发现的问题并重跑**

任何静态或浏览器失败都回到对应 Task 修改，重新运行 Task 4 Step 4 和
本 Task Step 3；只有完整矩阵再次为 10/10 才进入发布。

---

### Task 6: 创建最终提交并发布阿里云新版本

**Files:**
- Verify only: all task files from Tasks 1–5。
- Server release: 由本任务 Step 2 生成的精确 `$mall_release_path`。

**Interfaces:**
- Consumes: 本地全部验证通过的精确 Git 状态。
- Produces: 新的不可变线上版本、原子切换后的 `jotoglobal.com`。

- [ ] **Step 1: 核对 Git 状态和提交**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: 只允许 `.playwright-cli/` 与 `.superpowers/` 未跟踪；所有任务
文件已提交。

- [ ] **Step 2: 创建新的服务器版本目录**

在本地解析精确版本名：

```bash
mall_release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
mall_release_path="/var/www/jotoglobal/releases/$mall_release_id"
printf '%s\n' "$mall_release_path"
```

把输出的完整 `$mall_release_path` 用于后续所有服务器命令。从当前线上
release 复制到该新目录，同步当前仓库正式站点文件，排除 `.git/`、
`.playwright-cli/`、
`.superpowers/`、本地日志和测试输出。不得覆盖现有 release。

- [ ] **Step 3: 在新目录运行服务器静态验证**

Run in the new release:

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
nginx -t
```

Expected: Mall 契约、字体规则和 `114 routes` 均通过；Nginx 配置语法成功。

- [ ] **Step 4: 原子切换并重载 Nginx**

将 `/var/www/jotoglobal/current` 原子切换到新 release，执行：

```bash
nginx -t
systemctl reload nginx
```

Expected: Nginx 测试通过并重载成功；历史 release 仍存在。

- [ ] **Step 5: 运行生产环境 Playwright 矩阵**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dark-live open \
  "https://jotoglobal.com/zh/mall/?release=20260729-5"
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dark-live run-code \
  --filename scripts/verify-mall-browser.mjs
```

Expected: 线上 `matrixCases` 为 `10`，`consoleProblems` 和 `pageErrors`
均为空；最终页面 URL 仍属于 `https://jotoglobal.com`。

- [ ] **Step 6: 核对最终线上内容**

检查：

```text
https://jotoglobal.com/mall/
https://jotoglobal.com/zh/mall/
https://jotoglobal.com/fa/mall/
https://jotoglobal.com/mall-data/manifest.json
```

Expected: 三语言均加载深色 Mall；清单 schema 为 `joto-mall-v1`、
`crawl_run_id` 为 `8`，产品数为 `16`。

- [ ] **Step 7: 推送维护分支**

在用户明确授权将当前分支全部待推送提交（包括部署/运维脚本和文档）导出
到 GitHub 后执行：

```bash
git push origin codex/jotoglobal-maintenance
```

Expected: 非强制推送成功；如果安全审批或远端权限拒绝，停止并如实报告，
不得绕过。
