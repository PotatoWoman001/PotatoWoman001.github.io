# Homepage Contact CTA and Solution Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second standard CTA to all localized homepage heroes and embed the localized `/api/contact` form in every Solution category and partner detail page.

**Architecture:** Keep the compiled React bundle unchanged and progressively enhance its rendered DOM with one focused JavaScript module and one stylesheet. An idempotent integration script adds those assets only to the three homepages and all Solution route HTML files, while a contract verifier enforces route coverage, copy, dimensions, and submission behavior.

**Tech Stack:** Static HTML, ES modules, DOM APIs, CSS, Node.js verification scripts, Playwright browser validation.

## Global Constraints

- Standard CTA dimensions are exactly `280 × 48px`.
- Compact action dimensions remain exactly `96 × 36px`.
- Homepage CTA buttons are horizontal on desktop/tablet and stack below 640px.
- Form submissions use `POST /api/contact` with `name`, `company`, `email`, `phoneOrWechat`, `message`, and `website`.
- English, Chinese, and Persian copy is localized; Persian uses RTL layout.
- Chinese Solution forms do not show “安全咨询” or “提交即表示……” copy.
- Homepage legacy Contact JOTO section, header, footer, and Contact page remain unchanged.

---

### Task 1: Lock the contact enhancement contract

**Files:**
- Create: `scripts/verify-contact-form-sections.mjs`
- Read: `docs/site-modification-rules.md`

**Interfaces:**
- Consumes: route HTML files and final asset names.
- Produces: a zero-exit verification command that reports route count and contract coverage.

- [ ] **Step 1: Write the failing verifier**

The verifier must recursively collect:

```js
const homeRoutes = ["index.html", "zh/index.html", "fa/index.html"];
const solutionRoutePattern =
  /^(?:(?:zh|fa)\/)?solutions\/[^/]+(?:\/[^/]+)?\/index\.html$/;
```

For every target HTML file, assert:

```js
assert.match(html, /\/assets\/contact-form-sections\.js/);
assert.match(html, /\/assets\/contact-form-sections\.css/);
assert.doesNotMatch(html, /contact-placement-preview/);
```

For the JavaScript and CSS assets, assert the three locales, `/api/contact`, `280px`, `48px`, `white-space: nowrap`, RTL rules, and absence of “安全咨询” and “提交即表示”.

- [ ] **Step 2: Run the verifier and confirm failure**

Run:

```bash
node scripts/verify-contact-form-sections.mjs
```

Expected: failure because final assets and complete route integration do not yet exist.

- [ ] **Step 3: Commit the failing contract with the design and plan**

```bash
git add docs/superpowers/specs/2026-07-27-homepage-contact-cta-solution-forms-design.md \
  docs/superpowers/plans/2026-07-27-homepage-contact-cta-solution-forms.md \
  scripts/verify-contact-form-sections.mjs
git commit -m "docs: specify contact forms across solution pages"
```

### Task 2: Build the shared enhancement assets

**Files:**
- Create: `assets/contact-form-sections.js`
- Create: `assets/contact-form-sections.css`
- Delete: `assets/contact-placement-preview.js`
- Delete: `assets/contact-placement-preview.css`

**Interfaces:**
- Consumes: rendered `[data-hero-cta-mobile]`, category `main[data-solution-category-page]`, and partner `section#contact`.
- Produces: `[data-home-hero-actions]`, `[data-solution-contact-form]`, localized UI, and `/api/contact` submission.

- [ ] **Step 1: Generalize route and locale detection**

Use this route contract:

```js
const LOCALES = {
  en: { prefix: "", dir: "ltr" },
  "zh-CN": { prefix: "/zh", dir: "ltr" },
  "fa-IR": { prefix: "/fa", dir: "rtl" },
};

function getRouteContext(pathname) {
  const parts = pathname.replace(/\/index\.html$/, "").split("/").filter(Boolean);
  const locale = parts[0] === "zh" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";
  const routeParts = locale === "en" ? parts : parts.slice(1);
  return { locale, routeParts };
}
```

- [ ] **Step 2: Implement the homepage CTA group**

Wait for `[data-hero-cta-mobile]`, move it into `[data-home-hero-actions]`, clone its visual class for the localized Contact link, and preserve `data-hero-cta` so the shared `280 × 48px` rule continues to apply.

- [ ] **Step 3: Implement the localized Solution form**

Detect category routes with two route parts after `solutions` and partner routes with three. Replace only the bottom contact section. Render native labeled fields, honeypot, centered standard CTA, `aria-live` status, and `fetch("/api/contact", ...)` using the exact six-field payload.

- [ ] **Step 4: Implement responsive and RTL CSS**

The stylesheet must include:

```css
[data-home-hero-actions] [data-hero-cta],
[data-solution-contact-submit] {
  width: 280px;
  max-width: 100%;
  height: 48px;
  min-height: 48px;
  white-space: nowrap;
}

html[dir="rtl"] [data-home-hero-actions] {
  flex-direction: row-reverse;
}

@media (max-width: 639px) {
  [data-home-hero-actions] {
    flex-direction: column;
  }
}
```

- [ ] **Step 5: Run the JavaScript syntax check**

Run:

```bash
node --check assets/contact-form-sections.js
```

Expected: exit code `0`.

### Task 3: Integrate all home and Solution routes

**Files:**
- Create: `scripts/integrate-contact-form-sections.mjs`
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`
- Modify: all 75 matching Solution route `index.html` files

**Interfaces:**
- Consumes: final asset filenames and the route pattern from Task 1.
- Produces: idempotent route integration with no preview asset references.

- [ ] **Step 1: Write the idempotent integration script**

For each target HTML file:

```js
html = html.replace(/^\s*<script[^>]+contact-placement-preview\.js[^>]*><\/script>\s*$/gm, "");
html = html.replace(/^\s*<link[^>]+contact-placement-preview\.css[^>]*>\s*$/gm, "");
```

Insert the final module after `index-DaFvN0XI.js` and the final stylesheet after `index-e49ffBFL.css` only when absent.

- [ ] **Step 2: Run the integration script**

Run:

```bash
node scripts/integrate-contact-form-sections.mjs
```

Expected: exactly 78 target route files integrated on the first run.

- [ ] **Step 3: Confirm idempotence**

Run the integration script again.

Expected: `0 files changed`.

- [ ] **Step 4: Run the contract verifier**

Run:

```bash
node scripts/verify-contact-form-sections.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-solution-card-carousel.mjs
git diff --check
```

Expected: all commands pass.

### Task 4: Browser regression and final commit

**Files:**
- Verify: English, Chinese, and Persian homepages.
- Verify: one category and one partner page in each locale.
- Verify: desktop `1440px`, tablet `768px`, and mobile `390px`.

**Interfaces:**
- Consumes: integrated static routes served locally.
- Produces: evidence for layout, RTL, deep links, button dimensions, and absence of regressions.

- [ ] **Step 1: Verify homepage CTA geometry**

For each locale and viewport, assert:

```js
{
  primary: { width: 280, height: 48, whiteSpace: "nowrap" },
  contact: { width: 280, height: 48, whiteSpace: "nowrap" }
}
```

At `390px`, assert both widths are at most `280px` and their vertical positions differ. At desktop/tablet, assert their vertical centers match.

- [ ] **Step 2: Verify category and partner forms**

Assert one `[data-solution-contact-form]`, one centered `[data-solution-contact-submit]`, correct localized title, no privacy or “secure enquiry” copy, and no horizontal overflow.

- [ ] **Step 3: Verify deep link and console**

Open each representative page with `#contact`; assert the contact section is aligned at the viewport start after rendering. Confirm zero console errors and warnings.

- [ ] **Step 4: Review the final diff**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Exclude `.superpowers/` session files from staging.

- [ ] **Step 5: Commit the implementation**

```bash
git add assets/contact-form-sections.js assets/contact-form-sections.css \
  scripts/integrate-contact-form-sections.mjs scripts/verify-contact-form-sections.mjs \
  index.html zh/index.html fa/index.html solutions zh/solutions fa/solutions
git commit -m "feat: add contact forms across solution pages"
```

