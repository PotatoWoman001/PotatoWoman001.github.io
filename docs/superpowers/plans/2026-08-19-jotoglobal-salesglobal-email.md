# JOTO Global 公开销售邮箱更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 JOTO Global 网站公开邮箱及其专属表单通知收件地址统一更新为 `salesglobal@jototech.cn` 并部署上线。

**Architecture:** 前端继续由 `assets/jotoglobal-lead-routing.js` 统一规范公开邮件链接，主运行时和联系表单脚本同步替换显示地址与结构化数据。后端只修改 JOTO Global 站点专属收件地址；通过版本参数规避缓存，并使用不可变发布目录部署。

**Tech Stack:** JavaScript ES modules、Node.js `node:test`、静态 HTML、Nginx、PM2、Playwright。

## Global Constraints

- 新公开邮箱固定为 `salesglobal@jototech.cn`。
- 中文、英文、波斯语所有公开入口必须一致。
- 保留邮件来源主题、表单来源字段、Reply-To 和其他站点收件逻辑。
- 不修改布局、文字、表单字段和 Cisco 认证轮播文件。
- 线上发布必须可回滚。

---

### Task 1: 前端邮箱常量与运行时替换

**Files:**
- Modify: `scripts/verify-jotoglobal-lead-routing.mjs`
- Modify: `assets/jotoglobal-lead-routing.js`
- Modify: `assets/contact-form-sections.js`
- Modify: `assets/index-DaFvN0XI.js`
- Modify: runtime `.html` files referencing `assets/index-DaFvN0XI.js`

**Interfaces:**
- Consumes: `SALES_EMAIL` and `buildSalesMailto(locationLike, placement)`.
- Produces: all public text, JSON-LD and `mailto:` destinations using `salesglobal@jototech.cn`.

- [ ] **Step 1: Update the failing static contract**

Change the expected `mailto:` prefix to:

```js
/^mailto:salesglobal@jototech\.cn\?subject=/
```

Add runtime assertions:

```js
assert.doesNotMatch(runtimeSource, /sales@jotoglobal\.com|sales@jototech\.cn/);
assert.match(runtimeSource, /salesglobal@jototech\.cn/);
```

- [ ] **Step 2: Run the contract and verify failure**

Run: `node scripts/verify-jotoglobal-lead-routing.mjs`

Expected: FAIL because runtime resources still contain `sales@jotoglobal.com`.

- [ ] **Step 3: Implement the frontend replacement**

Set:

```js
export const SALES_EMAIL = "salesglobal@jototech.cn";
```

Update `isSalesMailto()` to recognize the new address, replace remaining runtime occurrences of `sales@jotoglobal.com`, and change the lead-routing import version to `20260819-1`. Change all HTML main-bundle references to `index-DaFvN0XI.js?v=20260819-1`.

- [ ] **Step 4: Run frontend regression tests**

Run:

```bash
node scripts/verify-jotoglobal-lead-routing.mjs
node scripts/verify-contact-forms.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
```

Expected: all checks pass.

### Task 2: JOTO Global backend recipient

**Files:**
- Modify: `work/jotoglobal-admin-integration-admin/sites/audit/backend/jotoglobal-contact-routing.test.js`
- Modify: `work/jotoglobal-admin-integration-admin/sites/audit/backend/jotoglobal-contact-routing.js`

**Interfaces:**
- Consumes: `contactRecipientForSite(siteId, fallbackRecipient)`.
- Produces: `salesglobal@jototech.cn` for only `jotoglobal.com` and `www.jotoglobal.com`.

- [ ] **Step 1: Update the backend failing test**

Set the expected constant to:

```js
assert.equal(JOTOGLOBAL_SALES_EMAIL, 'salesglobal@jototech.cn');
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test sites/audit/backend/jotoglobal-contact-routing.test.js`

Expected: FAIL because the implementation still returns `sales@jotoglobal.com`.

- [ ] **Step 3: Update the dedicated recipient**

Set:

```js
const JOTOGLOBAL_SALES_EMAIL = 'salesglobal@jototech.cn';
```

- [ ] **Step 4: Run backend regression tests**

Run:

```bash
node --test sites/audit/backend/jotoglobal-contact-routing.test.js sites/audit/backend/contact-email-format.test.js
node --check sites/audit/backend/index.js
```

Expected: all tests and syntax checks pass.

### Task 3: Commit, deploy and verify production

**Files:**
- Deploy frontend files changed by Task 1.
- Deploy backend files changed by Task 2.

**Interfaces:**
- Consumes: verified frontend and backend artifacts.
- Produces: production JOTO Global pages and form route using `salesglobal@jototech.cn`.

- [ ] **Step 1: Commit only scoped files**

Commit frontend and backend changes in their respective repositories without staging Cisco carousel work or unrelated untracked files.

- [ ] **Step 2: Deploy frontend to an immutable release directory**

Copy the current release, overlay verified frontend artifacts, confirm the new bundle version and email, run `nginx -t`, then switch `/var/www/jotoglobal/current`.

- [ ] **Step 3: Deploy backend with backup and restart**

Back up the current routing files, upload the verified replacements, run server-side focused tests, restart `joto-admin-backend`, and wait for the health endpoint to return success.

- [ ] **Step 4: Perform production browser verification**

Check `/`, `/contact/`, `/zh/`, `/zh/contact/`, `/fa/`, `/fa/contact/`, one Solution page and one Mall page. Expected for every page: `salesglobal@jototech.cn` is present where a public email appears; `sales@jotoglobal.com` and `sales@jototech.cn` are absent; mail links retain source subjects.

- [ ] **Step 5: Verify form routing contract on production**

Submit only a honeypot health payload or inspect the deployed routing constant; do not generate an unsolicited real lead email. Confirm the deployed backend constant is `salesglobal@jototech.cn` and the health endpoint is successful.

