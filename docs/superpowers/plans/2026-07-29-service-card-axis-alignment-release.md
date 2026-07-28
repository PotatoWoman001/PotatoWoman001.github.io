# Service Card Axis Alignment Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让三语言首页六张服务卡的图标与标题同轴居中，并以可回滚的新版本发布到 `jotoglobal.com`。

**Architecture:** 保留主构建产物不动，在现有 `homepage-refinements.css` 增强层中拆分标题和正文对齐规则；用现有 Node 合约脚本覆盖回归，用 Playwright 验证真实布局。发布时从精确 Git 提交生成归档，在阿里云创建新版本目录并原子切换当前版本。

**Tech Stack:** 静态 HTML、CSS、ES Modules、Node.js 合约脚本、Docker/Nginx、Playwright、Git、Nginx/Alibaba Cloud。

## Global Constraints

- 图标与标题居中且共享垂直中轴，中心点误差不超过 2px。
- 说明文字继续使用 `text-align: start`。
- 英文、中文、波斯语及桌面、手机视口都必须通过。
- 静态资源版本固定升级为 `20260729-1`。
- 发布不得覆盖或删除旧版本。

---

### Task 1: 建立对齐合约并修正共享样式

**Files:**
- Modify: `scripts/verify-homepage-refinements.mjs`
- Modify: `assets/homepage-refinements.css`

**Interfaces:**
- Consumes: `#services [data-service-card]` 与 `[data-service-icon]`。
- Produces: 标题居中、正文起排的稳定 CSS 合约。

- [ ] **Step 1: 写入失败的静态断言**

断言首页服务卡 `h3` 使用 `text-align: center`、`justify-content: center`，并断言 `p` 使用 `text-align: start`。

- [ ] **Step 2: 运行失败测试**

Run: `node scripts/verify-homepage-refinements.mjs`

Expected: FAIL，因为当前标题仍为 `text-align: start` 与 `justify-content: flex-start`。

- [ ] **Step 3: 实现最小样式修正**

将标题与正文规则拆开：

```css
#services [data-service-card] h3 {
  text-align: center !important;
  justify-content: center;
}

#services [data-service-card] p {
  text-align: start !important;
}
```

解决方案分类页的共享卡片使用同等规则。

- [ ] **Step 4: 运行通过测试**

Run: `node scripts/verify-homepage-refinements.mjs`

Expected: PASS。

### Task 2: 升级静态资源版本并完成静态回归

**Files:**
- Modify: maintained `*.html`
- Modify: `scripts/*.mjs` 中的发布常量

**Interfaces:**
- Consumes: 当前版本 `20260728-6`。
- Produces: 全站一致版本 `20260729-1`。

- [ ] **Step 1: 机械升级版本常量**

将受维护 HTML 与集成/验证脚本中的 `20260728-6` 替换为 `20260729-1`。

- [ ] **Step 2: 运行全量静态检查**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-customer-logo-wall-preview.mjs
node --check assets/homepage-refinements.js
node --check assets/solution-card-carousel.js
git diff --check
```

Expected: 全部 PASS。

### Task 3: 本地 Docker 与三语言浏览器回归

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: `Dockerfile.local` 和新版本源代码。
- Produces: 本地 `127.0.0.1:3009` 可验证站点。

- [ ] **Step 1: 构建并启动新版本容器**

Run:

```bash
docker build -f Dockerfile.local -t jotoglobal-maintenance:20260729-1 .
docker run -d --name jotoglobal-local-20260729-v1 -p 127.0.0.1:3009:80 jotoglobal-maintenance:20260729-1
```

- [ ] **Step 2: Playwright 验证**

在英文、中文、波斯语的 1440×900 与 390×844 视口断言：六张卡片存在、图标与标题中心误差不超过 2px、标题居中、正文起排、无横向溢出、无控制台错误。并抽查 Hero、伊朗地图、轮播与详情页无回归。

### Task 4: 提交、推送与可回滚发布

**Files:**
- Create: versioned release archive from exact commit.

**Interfaces:**
- Consumes: 已验证的 Git commit。
- Produces: Git 远端提交与阿里云新版本目录。

- [ ] **Step 1: 核对并提交全部任务文件**

Run:

```bash
git status --short
git add assets/homepage-refinements.css scripts/verify-homepage-refinements.mjs docs/superpowers/specs/2026-07-29-service-card-axis-alignment-release-design.md docs/superpowers/plans/2026-07-29-service-card-axis-alignment-release.md
git add '*.html' scripts/*.mjs
git commit -m "fix: align service card icons and titles"
```

- [ ] **Step 2: 推送维护分支**

Run: `git push origin codex/jotoglobal-maintenance`

Expected: 远端分支更新到新提交。

- [ ] **Step 3: 创建并切换阿里云新版本**

从提交生成归档，在服务器现有发布根目录下创建独立版本目录，解包并进行 Nginx 配置检查；只有检查通过才原子切换当前版本并 reload。

### Task 5: 线上验收与浏览器交付

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: `https://jotoglobal.com` 新版本。
- Produces: 可访问、可回滚且已在右侧浏览器打开的生产页面。

- [ ] **Step 1: 网络与资源验证**

检查首页 HTTPS 状态、三语言路由和 HTML 中 `20260729-1` 资源版本。

- [ ] **Step 2: 生产 Playwright 回归**

重复关键桌面/手机对齐断言，确认无控制台错误与页面级横向溢出。

- [ ] **Step 3: 更新右侧浏览器**

打开 `https://jotoglobal.com/zh/?release=20260729-1#services`，确认线上信号后保留为最终交付页。
