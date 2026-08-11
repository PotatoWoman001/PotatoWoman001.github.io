# JOTO Global Sales Email and Lead Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 JOTO Global 的公开销售邮箱统一为 `sales@jotoglobal.com`，可靠记录表单及邮件入口来源，并通过阿里企业邮箱把每条 Lead 同时转发给四位固定收件人。

**Architecture:** 前端新增一个由主 ES Module 引入的 Lead 路由模块，统一规范 `mailto:`、补充表单 `sourceContext` 与流量来源；后台仅对 `jotoglobal` 站点使用专属销售邮箱和来源格式，并通过 `Reply-To` 支持直接回复客户。所有通知先进入公共邮箱，再由阿里企业邮箱保留副本并转发，避免后台群发与邮箱转发产生重复邮件。

**Tech Stack:** 静态 HTML、原生 ES Modules、Node.js 验证脚本、Express、Resend、Node.js test runner、阿里企业邮箱。

## Global Constraints

- 网站只公开 `sales@jotoglobal.com`，不得把四位内部收件人写入前端资源或客户端请求。
- 表单通知只投递到 `sales@jotoglobal.com`，四位收件人由阿里企业邮箱转发规则维护。
- 仅 `siteId === "jotoglobal"` 使用专属路由，其他站点继续使用现有全局收件配置。
- 表单来源由服务端白名单映射；用户输入不得直接进入邮件标题。
- 直接邮件主题只提供辅助归因，客户删除主题时降级为“直接邮件”。
- 保留公共邮箱原邮件，四位收件人每封各收到一份且不得重复。
- 表单数据先持久化，通知失败不得丢失 Contact 记录。
- 保留现有 Honeypot、Nginx 限流和其他站点验证码行为。

---

### Task 1: 前端 Lead 来源模块与公开邮箱统一

**Files:**
- Create: `assets/jotoglobal-lead-routing.js`
- Create: `scripts/verify-jotoglobal-lead-routing.mjs`
- Modify: `assets/index-DaFvN0XI.js`
- Modify: `assets/contact-form-sections.js`
- Modify: `.github/workflows/publish-jotoglobal.yml`

**Interfaces:**
- Produces: `classifyLeadSource(locationLike) -> { sourceKey, locale, pagePath, entry, objectSlug }`
- Produces: `buildTrafficSource(locationLike, referrer) -> { source, medium, campaign, keyword, utm_content, referrer }`
- Produces: `buildSalesMailto(locationLike) -> string`
- Produces: automatic enrichment of JSON `POST /api/contact` requests with `sourceContext` and `trafficSource`
- Produces: automatic normalization of public sales `mailto:` links to `sales@jotoglobal.com` with an encoded source subject

- [ ] **Step 1: Write the failing frontend verifier**

Create `scripts/verify-jotoglobal-lead-routing.mjs` with assertions that import the three pure helpers and verify:

```js
assert.deepEqual(
  classifyLeadSource(new URL("https://jotoglobal.com/zh/")),
  { sourceKey: "home-contact-form", locale: "zh-CN", pagePath: "/zh/", entry: "", objectSlug: "" },
);
assert.equal(
  classifyLeadSource(new URL("https://jotoglobal.com/fa/contact?product=c881-k9")).sourceKey,
  "mall-product-inquiry",
);
assert.equal(
  classifyLeadSource(new URL("https://jotoglobal.com/solutions/network/cisco")).sourceKey,
  "solution-contact-form",
);
assert.match(
  buildSalesMailto(new URL("https://jotoglobal.com/zh/contact")),
  /^mailto:sales@jotoglobal\.com\?subject=/,
);
assert.deepEqual(
  buildTrafficSource(
    new URL("https://jotoglobal.com/contact?utm_source=google&utm_medium=cpc&utm_campaign=china"),
    "https://google.com/",
  ),
  {
    source: "google",
    medium: "cpc",
    campaign: "china",
    keyword: "",
    utm_content: "",
    referrer: "https://google.com/",
  },
);
```

The verifier must also recursively scan runtime HTML/JS outside `docs/`, `work/`, `output/`, `.git/`, `.superpowers/` and assert:

```js
assert.doesNotMatch(runtimeSource, /sales@jototech\.cn/);
assert.doesNotMatch(runtimeSource, /tomi@jototech\.cn|amy\.geng@jototech\.cn|shuting\.wang@jototech\.cn|jungleqiu@icloud\.com/);
assert.match(mainBundle, /import"\.\/jotoglobal-lead-routing\.js\?v=20260811-1"/);
```

- [ ] **Step 2: Run the verifier and confirm failure**

Run:

```bash
node scripts/verify-jotoglobal-lead-routing.mjs
```

Expected: FAIL because `assets/jotoglobal-lead-routing.js` does not exist.

- [ ] **Step 3: Implement the pure source and mail helpers**

Create `assets/jotoglobal-lead-routing.js` with:

```js
export const SALES_EMAIL = "sales@jotoglobal.com";

export function classifyLeadSource(locationLike) {
  const url = locationLike instanceof URL ? locationLike : new URL(locationLike.href);
  const parts = url.pathname.split("/").filter(Boolean);
  const locale = parts[0] === "zh" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";
  const route = locale === "en" ? parts : parts.slice(1);
  const pagePath = `${url.pathname}${url.search}`.slice(0, 500);
  const product = url.searchParams.get("product") || "";
  const entry = (url.searchParams.get("entry") || "").slice(0, 80);
  if (product) return { sourceKey: "mall-product-inquiry", locale, pagePath, entry, objectSlug: product.slice(0, 160) };
  if (route[0] === "contact") return { sourceKey: "contact-page-form", locale, pagePath, entry, objectSlug: "" };
  if (route[0] === "solutions") return { sourceKey: "solution-contact-form", locale, pagePath, entry, objectSlug: route.slice(1).join("/").slice(0, 160) };
  return { sourceKey: "home-contact-form", locale, pagePath, entry, objectSlug: "" };
}

export function buildTrafficSource(locationLike, referrer = "") {
  const url = locationLike instanceof URL ? locationLike : new URL(locationLike.href);
  return {
    source: (url.searchParams.get("utm_source") || "").slice(0, 100),
    medium: (url.searchParams.get("utm_medium") || "").slice(0, 100),
    campaign: (url.searchParams.get("utm_campaign") || "").slice(0, 160),
    keyword: (url.searchParams.get("utm_term") || "").slice(0, 160),
    utm_content: (url.searchParams.get("utm_content") || "").slice(0, 160),
    referrer: String(referrer || "").slice(0, 500),
  };
}
```

Add a controlled label map for `home-contact-form`, `contact-page-form`, `solution-contact-form`, and `mall-product-inquiry`; `buildSalesMailto()` must encode a subject using the current page type, locale, and sanitized object slug.

- [ ] **Step 4: Add runtime request enrichment and mail-link normalization**

In the same module, guard browser-only behavior with `if (typeof window !== "undefined")`. Wrap `window.fetch` only when all conditions match:

```js
const isContactPost =
  method === "POST" &&
  new URL(requestUrl, window.location.origin).origin === window.location.origin &&
  new URL(requestUrl, window.location.origin).pathname === "/api/contact" &&
  typeof init?.body === "string";
```

Parse a JSON object, preserve all existing keys, then add `sourceContext` and add `trafficSource` only when absent. If parsing fails, call the original `fetch` unchanged. Normalize matching sales links on initial load and through a `MutationObserver`; update `href` only for the public sales address and never expose the four forwarding recipients.

- [ ] **Step 5: Replace the runtime public email and load the module**

Mechanically replace all runtime occurrences of `sales@jototech.cn` in `assets/index-DaFvN0XI.js` and `assets/contact-form-sections.js` with `sales@jotoglobal.com`. Prefix the main bundle once with:

```js
import"./jotoglobal-lead-routing.js?v=20260811-1";
```

This keeps the feature available on every route that loads the shared bundle without editing hundreds of HTML files.

- [ ] **Step 6: Add the verifier to release gates**

Add this command to both pre-upload and server-side validation blocks in `.github/workflows/publish-jotoglobal.yml`:

```bash
node scripts/verify-jotoglobal-lead-routing.mjs
```

- [ ] **Step 7: Run frontend verification**

Run:

```bash
node scripts/verify-jotoglobal-lead-routing.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-mall-catalog-pages.mjs
```

Expected: all commands exit `0`; the new verifier reports the tested source mappings and zero legacy runtime emails.

- [ ] **Step 8: Commit the frontend deliverable**

```bash
git add assets/jotoglobal-lead-routing.js assets/index-DaFvN0XI.js assets/contact-form-sections.js scripts/verify-jotoglobal-lead-routing.mjs .github/workflows/publish-jotoglobal.yml
git commit -m "feat: route JOTO Global sales leads"
```

### Task 2: 后台来源验证、专属收件地址与 Reply-To

**Files:**
- Create: `work/jotoglobal-admin-integration-admin/sites/audit/backend/jotoglobal-contact-routing.js`
- Create: `work/jotoglobal-admin-integration-admin/sites/audit/backend/jotoglobal-contact-routing.test.js`
- Modify: `work/jotoglobal-admin-integration-admin/sites/audit/backend/contact-email-format.js`
- Modify: `work/jotoglobal-admin-integration-admin/sites/audit/backend/contact-email-format.test.js`
- Modify: `work/jotoglobal-admin-integration-admin/sites/audit/backend/index.js`

**Interfaces:**
- Consumes: frontend `sourceContext` object and request `Referer`
- Produces: `normalizeJotoglobalSourceContext(input, referer) -> { sourceKey, sourceLabel, localeLabel, pagePath, entry, objectSlug }`
- Produces: `jotoglobalNotificationSubject(context) -> string`
- Produces: `sendEmail(to, subject, html, { replyTo } = {}) -> Promise<boolean>`

- [ ] **Step 1: Write failing routing tests**

Create tests using `node:test` that cover the four allowed keys, an unknown key, unsafe paths, overlong values, locale fallback, and Referer fallback:

```js
test("normalizes a solution lead", () => {
  assert.deepEqual(
    normalizeJotoglobalSourceContext({
      sourceKey: "solution-contact-form",
      locale: "en",
      pagePath: "/solutions/network/cisco",
      objectSlug: "network/cisco",
    }),
    {
      sourceKey: "solution-contact-form",
      sourceLabel: "解决方案表单",
      localeLabel: "英文",
      pagePath: "/solutions/network/cisco",
      entry: "",
      objectSlug: "network/cisco",
    },
  );
});

test("rejects an untrusted source key", () => {
  assert.equal(normalizeJotoglobalSourceContext({ sourceKey: "<script>" }).sourceKey, "other-form");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run from `work/jotoglobal-admin-integration-admin/sites/audit/backend`:

```bash
node --test jotoglobal-contact-routing.test.js contact-email-format.test.js
```

Expected: FAIL because `jotoglobal-contact-routing.js` does not exist.

- [ ] **Step 3: Implement the routing module**

Define the exact allowlist:

```js
const SOURCE_LABELS = Object.freeze({
  "home-contact-form": "首页表单",
  "contact-page-form": "联系页表单",
  "solution-contact-form": "解决方案表单",
  "mall-product-inquiry": "产品咨询",
  "other-form": "其他表单",
});
const LOCALE_LABELS = Object.freeze({ en: "英文", "zh-CN": "中文", "fa-IR": "波斯语" });
const JOTOGLOBAL_SALES_EMAIL = "sales@jotoglobal.com";
```

Allow only `/`, ASCII letters, digits, `_`, `-`, and `.` in `pagePath`, `entry`, and `objectSlug`; strip query strings from Referer fallback except the controlled `product` and `entry` values. Limit each returned field to the lengths in the design spec. Build subjects only from normalized output:

```js
function jotoglobalNotificationSubject(context) {
  const object = context.objectSlug ? `[${context.objectSlug}]` : "";
  return `[JOTO Global][${context.sourceLabel}][${context.localeLabel}]${object} 新线索`;
}
```

- [ ] **Step 4: Extend contact email metadata tests and implementation**

Add a `JOTO Global` override in `contact-email-format.js` with host `jotoglobal.com` and source labels matching the routing module. Extend `formatContactEmailMeta()` to accept a normalized `sourceContext`; prefer its label and page path for JOTO Global while retaining existing ChatBI, AI Hub and joto.ai behavior unchanged.

- [ ] **Step 5: Add JOTO Global-only recipient routing**

In `notifyNewContact()`, derive the recipient without changing other sites:

```js
const recipient = siteHost === "jotoglobal.com" || siteHost === "www.jotoglobal.com"
  ? JOTOGLOBAL_SALES_EMAIL
  : globalCfg.email || globalCfg.emailConfig?.adminEmail;
```

Pass the normalized `sourceContext` into the formatter, use `jotoglobalNotificationSubject()` only for JOTO Global, and append entrance, language, page path, entry, and object fields to the JOTO Global email body. Escape every Contact and source value before interpolating it into HTML.

- [ ] **Step 6: Add optional Reply-To support**

Change the sender signature to:

```js
async function sendEmail(to, subject, html, options = {})
```

Build the Resend payload with the existing fields, then add `replyTo` only when `options.replyTo` passes the existing ASCII email validation. Call JOTO Global form notifications with:

```js
await sendEmail(recipient, subject, emailHtml, { replyTo: contact.email });
```

Existing callers continue working because `options` defaults to an empty object.

- [ ] **Step 7: Pass source context from the contact route**

Before `buildStoredContact()`, normalize `contactData.sourceContext` with `req.headers.referer`. Store the normalized object on the Contact record and pass it to `notifyNewContact()`. Delete or ignore arbitrary raw source fields after normalization; do not trust a client-supplied display label.

- [ ] **Step 8: Run focused backend tests**

Run:

```bash
node --test jotoglobal-contact-routing.test.js contact-email-format.test.js contact-ingestion.test.js
node --check index.js
```

Expected: all tests pass and `node --check` exits `0`.

- [ ] **Step 9: Commit the backend deliverable in its own repository**

From `work/jotoglobal-admin-integration-admin`:

```bash
git add sites/audit/backend/jotoglobal-contact-routing.js sites/audit/backend/jotoglobal-contact-routing.test.js sites/audit/backend/contact-email-format.js sites/audit/backend/contact-email-format.test.js sites/audit/backend/index.js
git commit -m "feat: route JOTO Global contact leads"
```

### Task 3: 联调、发布与生产验证

**Files:**
- Modify only if verification finds a defect: files already listed in Task 1 or Task 2

**Interfaces:**
- Consumes: frontend source payload and backend routing module
- Produces: a deployed website and backend in which a test Lead reaches `sales@jotoglobal.com` once with a correct source title

- [ ] **Step 1: Run the complete local release gate**

From the website repository root, run:

```bash
node scripts/verify-jotoglobal-lead-routing.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
```

From the backend repository, rerun:

```bash
node --test sites/audit/backend/jotoglobal-contact-routing.test.js sites/audit/backend/contact-email-format.test.js sites/audit/backend/contact-ingestion.test.js
node --check sites/audit/backend/index.js
```

Expected: every command exits `0`.

- [ ] **Step 2: Verify the rendered browser behavior locally**

Reuse an existing compatible local server, or start one with:

```bash
python3 -m http.server 3009
```

Check `/`, `/zh/contact`, `/fa/solutions/network/cisco`, and `/zh/mall/product/?product=c881-k9`. Confirm visible email text, encoded `mailto:` subject, no console error, and an intercepted `/api/contact` request body containing normalized `sourceContext` and `trafficSource`.

- [ ] **Step 3: Push the verified website and backend branches**

Push only after both repositories are clean for the files in scope:

```bash
git push origin codex/jotoglobal-maintenance
git -C work/jotoglobal-admin-integration-admin push github codex/jotoglobal-admin-integration
```

- [ ] **Step 4: Deploy website and backend through their established release paths**

Run the existing JOTO Global GitHub Actions workflow or the established atomic release path for the website. Deploy the backend commit using its existing server/service procedure, then confirm the Node service is healthy and Nginx still routes `/api/contact` to it.

- [ ] **Step 5: Run production smoke checks**

Verify HTTPS status and public email on `/`, `/contact`, `/zh/contact`, `/fa/contact`, one Solution page and one Mall product page. Submit one controlled test form with a unique marker and verify the backend Contact record plus the single notification retained in `sales@jotoglobal.com`.

### Task 4: 阿里企业邮箱自动转发与最终收件验证

**Files:**
- No repository files; this task changes only the authenticated Aliyun Enterprise Mail account configuration.

**Interfaces:**
- Consumes: messages arriving at `sales@jotoglobal.com`
- Produces: one retained mailbox copy and one forwarded copy to each of the four approved recipients

- [ ] **Step 1: Configure forwarding while retaining the original**

In the authenticated `sales@jotoglobal.com` mailbox, create an incoming-mail rule that retains the original and forwards to:

```text
tomi@jototech.cn
amy.geng@jototech.cn
shuting.wang@jototech.cn
jungleqiu@icloud.com
```

If the interface permits only one destination per rule, create four rules with identical match conditions. Do not include `sales@jotoglobal.com` as a target.

- [ ] **Step 2: Send a direct-mail probe**

Send one uniquely titled message to `sales@jotoglobal.com` and verify:

```text
Public mailbox retained copies: 1
tomi@jototech.cn copies: 1
amy.geng@jototech.cn copies: 1
shuting.wang@jototech.cn copies: 1
jungleqiu@icloud.com copies: 1
```

- [ ] **Step 3: Send a website-form probe**

Submit a controlled Lead from a page with a known source. Verify the title contains the correct JOTO Global source label, all four recipients receive one copy, `sales@jotoglobal.com` retains one copy, and Reply directs to the submitted test email.

- [ ] **Step 4: Check iCloud deliverability and duplicate protection**

Inspect inbox and junk folders for `jungleqiu@icloud.com`; confirm only one copy was delivered. If classified as junk, mark the sender as trusted and repeat with a new unique marker. Do not weaken SPF, DKIM or DMARC settings as a workaround.

### Task 5: Final audit and handoff

**Files:**
- Modify only if an audit finds a defect: files already listed above

**Interfaces:**
- Consumes: deployed frontend, deployed backend, mailbox forwarding rules
- Produces: evidence-backed final handoff for user inspection

- [ ] **Step 1: Audit the production email surface**

Search downloaded production HTML and JavaScript for `sales@jototech.cn`; expected count is `0`. Search for the four internal recipients in public assets; expected count is `0`.

- [ ] **Step 2: Audit source categories**

Confirm at least one representative for homepage, Contact, Solution, Mall product inquiry and footer direct email. Record the received subject and whether all five mailbox copies match the expected one-plus-four pattern.

- [ ] **Step 3: Verify repository state and commits**

Run `git status --short --branch` in both repositories and report only task-related commits. Preserve all unrelated pre-existing untracked files.

- [ ] **Step 4: Deliver inspection links and limitations**

Provide the production pages to inspect, the frontend and backend commit IDs, test results, mailbox forwarding result, and the documented limitation that manually composed direct emails cannot reveal the original page when the customer removes the prefilled subject.
