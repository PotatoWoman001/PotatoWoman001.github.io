# Solution 页面装饰编号清理与页脚统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除三语言全部 Solution 页面中的纯装饰编号，并让合作伙伴详情页复用首页完整页脚。

**Architecture:** 新增一个只面向当前共享 React bundle 的确定性集成脚本，以精确锚点和匹配计数改写分类页及合作伙伴详情组件；新增独立静态合约脚本锁定 75 个 Solution 路由、装饰编号清理、业务数字保留和共享页脚复用。完成后统一提升静态资源版本，并用 Playwright 覆盖三语言、LTR/RTL、桌面和手机页面。

**Tech Stack:** 静态 HTML、React 构建产物、Node.js ESM、原生断言、Playwright。

## Global Constraints

- 只修改英文、简体中文和波斯语的 Solution 分类页与合作伙伴详情页行为。
- 分类页保留本地化章节文字，例如 `[ Overview ]`，只删除 `/ 01` 一类后缀。
- 合作伙伴详情页删除 Hero、章节、卡片和联系区的纯装饰编号。
- 年份、产品型号、端口数量、容量、速率、联系方式和正文业务数字必须保留。
- 合作伙伴详情页必须复用首页完整页脚组件 `qn`，每页只保留一个页脚 landmark。
- 不使用 CSS 隐藏或运行时 DOM 修补。
- 转换脚本必须具备精确匹配计数、失败关闭和幂等行为。
- 不修改首页、Blog、Mall 或其他非 Solution 页面的编号。
- 本计划只完成本地代码、验证和提交，不包含线上部署。

---

### Task 1: 建立 Solution 清理失败合约

**Files:**
- Create: `scripts/verify-solution-page-cleanup.mjs`

**Interfaces:**
- Consumes: `index.html`、`zh/index.html`、`fa/index.html` 所指向的共享 JavaScript bundle，以及所有 `solutions/**/index.html` 页面壳。
- Produces: `collectSolutionRoutes(root): string[]`、`resolveSharedBundle(root): string` 和一组可独立运行的静态断言。

- [x] **Step 1: 编写路由与 bundle 解析逻辑**

在新脚本中使用 `node:assert/strict`、`node:fs` 和 `node:path`，递归收集以下目录中的 `index.html`：

```js
const localeRoots = ["solutions", "zh/solutions", "fa/solutions"];

function collectIndexFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectIndexFiles(absolute);
    return entry.name === "index.html" ? [absolute] : [];
  });
}

const routeFiles = localeRoots.flatMap((directory) =>
  collectIndexFiles(path.join(root, directory)),
);
assert.equal(routeFiles.length, 75, "expected all 75 Solution route indexes");
```

从每个页面的模块脚本标签解析 `/assets/index-*.js`，断言 75 个页面使用同一个 bundle，并读取其源码。

- [x] **Step 2: 添加装饰编号和页脚失败断言**

加入以下结构契约：

```js
assert.doesNotMatch(bundle, /children:"01 \/ 05"/);
assert.doesNotMatch(bundle, /index:"0[234]"/);
assert.doesNotMatch(bundle, /children:\["0",s\+1\]/);
assert.doesNotMatch(bundle, /children:\["05 \/ ",e\("Start a project"\)\]/);
assert.doesNotMatch(
  bundle,
  /String\(t\.solutions\.categories\.indexOf\(s\)\+1\)\.padStart\(2,"0"\)/,
);
assert.match(bundle, /children:\["\[ ",i\.overview," \]"\]/);
assert.match(bundle, /function Lk\(\{detail:n\}\)[\s\S]*?f\.jsx\(qn,\{\}\)/);
assert.doesNotMatch(
  bundle,
  /children:\["JOTO"," ",n\.partnerName," ",e\("solutions · designed, delivered and supported by JOTO"\)\]/,
);
```

同时断言 `foundingDate:"2010"` 和 Cisco 详情中的已知技术内容仍存在，证明规则没有宽泛删除业务数字。

- [x] **Step 3: 运行验证确认当前产物失败**

Run:

```bash
node scripts/verify-solution-page-cleanup.mjs
```

Expected: FAIL，首先命中当前 bundle 中仍存在的 `01 / 05` 或分类页序号表达式。

- [x] **Step 4: 提交失败合约**

```bash
git add scripts/verify-solution-page-cleanup.mjs
git commit -m "test: define solution page cleanup contract"
```

---

### Task 2: 实现确定性 bundle 转换

**Files:**
- Create: `scripts/integrate-solution-page-cleanup.mjs`
- Modify: `assets/index-DaFvN0XI.js`
- Test: `scripts/verify-solution-page-cleanup.mjs`

**Interfaces:**
- Consumes: Task 1 解析出的活动 bundle 以及当前 `_k` 分类组件、`Lk` 合作伙伴详情组件和 `qn` 共享页脚组件。
- Produces: `replaceExactly(source, before, after, expectedCount, label): string` 与完成清理的共享 bundle。

- [x] **Step 1: 编写精确替换工具和失败关闭逻辑**

新脚本从三个语言首页解析同一个共享 bundle，并定义：

```js
function replaceExactly(source, before, after, expectedCount, label) {
  const actualCount = source.split(before).length - 1;
  if (actualCount === 0 && source.includes(after)) return source;
  if (actualCount !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} source matches, found ${actualCount}`);
  }
  return source.split(before).join(after);
}
```

所有替换先在内存字符串中完成；只有全部前置计数与写后断言通过后才调用一次 `writeFile()`。

- [x] **Step 2: 转换分类页章节标签**

将 `_k` 中：

```js
children:["[ ",i.overview," / ",String(t.solutions.categories.indexOf(s)+1).padStart(2,"0")," ]"]
```

精确替换为：

```js
children:["[ ",i.overview," ]"]
```

预期匹配数为 `1`。

- [x] **Step 3: 删除合作伙伴页的装饰编号节点**

使用完整的 JSX 片段锚点完成这些精确转换：

```js
// Hero：删除只输出 01 / 05 的 <p>，保留 eyebrow 与分隔线。
// Kn 调用：删除 relationship、services、cases 三处 index:"02|03|04" 属性。
// reasons/services/cases 卡片：删除三处 children:["0",s+1] 的纯编号元素。
// 联系区：把 children:["05 / ",e("Start a project")] 改为 children:e("Start a project")。
```

每个锚点分别声明预期匹配数；不使用匹配任意数字正文的正则替换。

- [x] **Step 4: 用共享页脚替换详情页简化页脚**

以 `function Lk({detail:n})` 组件尾部完整的旧 `<footer>` JSX 作为单一锚点，将其替换为：

```js
f.jsx(qn,{})
```

预期匹配数为 `1`。写入前确认 `function qn()` 已存在；写入后确认旧合作伙伴页脚专属文字表达式已消失。

- [x] **Step 5: 运行集成和静态合约**

Run:

```bash
node scripts/integrate-solution-page-cleanup.mjs
node scripts/verify-solution-page-cleanup.mjs
node scripts/integrate-solution-page-cleanup.mjs
git diff --check
```

Expected: 第一次集成报告 bundle 已修改；静态合约 PASS；第二次集成报告 `0 files changed` 或等价幂等结果；`git diff --check` 无输出。

- [x] **Step 6: 提交实现**

```bash
git add scripts/integrate-solution-page-cleanup.mjs assets/index-DaFvN0XI.js
git commit -m "fix: clean solution page numbering and footer"
```

---

### Task 3: 统一静态资源版本与站点规则

**Files:**
- Modify: `scripts/integrate-static-asset-version.mjs`
- Modify: `scripts/verify-site-rules.mjs`
- Modify: `scripts/integrate-homepage-refinements.mjs`
- Modify only where the previous version is asserted: other tracked integration or verification scripts returned by `rg '20260804-1' scripts`
- Modify: 114 formal route `index.html` files and `404.html` through the version integration script
- Test: `scripts/verify-site-rules.mjs`

**Interfaces:**
- Consumes: Task 2 的已修改共享 bundle。
- Produces: 全站统一的 `20260805-1` 静态资源查询版本，避免浏览器继续使用旧 Solution bundle 缓存。

- [x] **Step 1: 更新版本常量**

把相关集成和验证脚本中的静态资源版本从：

```js
const staticAssetVersion = "20260804-1";
```

或同用途的 `version` 常量更新为：

```js
const staticAssetVersion = "20260805-1";
```

更新 `scriptPattern`、`stylePattern` 等包含旧版本的精确断言，使输入可以从 `20260804-1` 迁移，输出统一为 `20260805-1`。

- [x] **Step 2: 运行统一版本集成**

Run:

```bash
node scripts/integrate-static-asset-version.mjs
```

Expected: 114 个正式页面和 `404.html` 均引用 `?v=20260805-1`。

- [x] **Step 3: 运行站点静态回归**

Run:

```bash
node scripts/verify-solution-page-cleanup.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected: 全部 PASS；首页轮播、联系表单、Logo wall 与全站字体规则无回归。

- [x] **Step 4: 提交缓存版本更新**

```bash
git add scripts/integrate-static-asset-version.mjs scripts/verify-site-rules.mjs scripts/integrate-homepage-refinements.mjs 404.html index.html zh/index.html fa/index.html about contact blog mall solutions zh fa
git commit -m "chore: refresh solution asset cache version"
```

提交前用 `git diff --cached --name-only` 确认没有暂存 `.playwright-cli/`、`.superpowers/`、`work/` 或其他不相关的未跟踪计划。

---

### Task 4: 三语言浏览器回归与最终提交核对

**Files:**
- Create: `scripts/verify-solution-page-cleanup-browser.mjs`
- Modify only if a verified defect is found: `scripts/integrate-solution-page-cleanup.mjs`
- Modify only if a verified defect is found: `assets/index-DaFvN0XI.js`

**Interfaces:**
- Consumes: 本地 `http://127.0.0.1:3009` 预览服务、三语言分类页和 Cisco 详情页。
- Produces: 桌面/手机、LTR/RTL、页脚、装饰编号、业务数字与控制台状态的真实浏览器证据。

- [x] **Step 1: 编写 Playwright 矩阵脚本**

导出 `async (page) => { ... }`，测试矩阵为：

```js
const cases = [
  { locale: "en", prefix: "", dir: "ltr" },
  { locale: "zh", prefix: "/zh", dir: "ltr" },
  { locale: "fa", prefix: "/fa", dir: "rtl" },
];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
```

每组访问 `${prefix}/solutions/network/` 和 `${prefix}/solutions/network/cisco/`，并断言：

```js
const bodyText = await page.locator("body").innerText();
assert(!/01\s*\/\s*05/.test(bodyText), `${label}: hero index remains`);
assert((await page.locator("footer").count()) === 1, `${label}: expected one footer`);
assert(await page.locator("footer").innerText().then((text) => text.includes("JOTO")));
assert((await page.evaluate(() => document.documentElement.dir)) === testCase.dir);
assert(await page.locator("body").innerText().then((text) => text.includes("2010")));
```

在分类页检查本地化 overview 文字存在、`/ 01` 不存在；收集 `console.error`、`pageerror` 和横向溢出。

- [x] **Step 2: 复用或启动本地静态服务**

Run:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/zh/solutions/network/cisco/
```

Expected: `200`。若不可用，启动：

```bash
python3 -m http.server 3009 --bind 127.0.0.1
```

- [x] **Step 3: 运行浏览器验证**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh run-code scripts/verify-solution-page-cleanup-browser.mjs
```

Expected: 12 个页面/视口组合全部 PASS；装饰编号为零、每页一个完整页脚、业务数字存在、RTL 正确、无横向溢出、控制台零错误。

- [x] **Step 4: 运行最终静态回归与核对工作树**

Run:

```bash
node scripts/verify-solution-page-cleanup.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-customer-logo-wall-preview.mjs
git diff --check
git status --short
```

Expected: 全部验证 PASS；工作树中只剩本任务应提交文件以及原有不相关未跟踪文件。

- [x] **Step 5: 提交浏览器验证脚本与必要修复**

```bash
git add scripts/verify-solution-page-cleanup-browser.mjs
git commit -m "test: cover solution cleanup in browser"
git status --short
git log -4 --oneline
```

Expected: 本任务提交完整，未暂存或提交用户及其他任务文件；不执行线上部署。
