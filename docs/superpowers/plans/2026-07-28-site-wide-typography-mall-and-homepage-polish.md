# Site-wide Typography, Mall, and Homepage Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved balanced typography system across the maintained English, Chinese, and Persian site, add a localized Mall destination to every shared navigation, and finish the approved homepage button, alignment, and carousel-discovery refinements.

**Architecture:** Keep the compiled React bundle intact and layer narrowly scoped progressive-enhancement assets after it. A shared typography stylesheet provides the site tokens and semantic mappings; a Mall module augments React-rendered navigation and turns three static route shells into localized placeholder pages; the existing homepage enhancement assets receive the approved CTA, card-column, and carousel-hint changes. One deterministic integrator generates the Mall route shells, injects the two new assets into every maintained HTML route, bumps browser asset URLs to `20260728-4`, and updates the sitemap.

**Tech Stack:** Static HTML, CSS custom properties, browser DOM APIs, `MutationObserver`, `IntersectionObserver`, Node.js ES modules, Docker/Nginx, Playwright.

## Global Constraints

- English ordinary Latin text uses `Poppins`; Chinese uses `Poppins`, then Chinese system fallbacks; Persian uses `Poppins`, then `Vazirmatn`.
- Only green italic brand words retain `Instrument Serif`.
- Typography exposes five heading levels (`T0`–`T4`) and five body/auxiliary levels (`B1`–`M1`), with desktop, tablet, and mobile values from the approved Design MD.
- Ordinary readable copy must not render below `11px`; purely decorative telemetry is exempt.
- The two homepage Hero CTAs are equal in width and height within each locale and may wrap as a pair on narrow screens without wrapping their labels.
- Lifecycle-service and selected-experience cards keep start-aligned copy, but the icon/logo and text column share the same horizontal center.
- The core-capability carousel runs one immediate, one-time forward-and-return discovery motion at 25% visibility, mirrors in RTL, respects reduced motion, and yields immediately to user input.
- `Mall`, `商城`, and `فروشگاه` appear after Blog in all desktop and mobile navigations and link to localized Mall routes.
- The three Mall pages include localized visible copy, canonical URLs, Open Graph metadata, `hreflang`, and sitemap entries.
- All 108 formal route indexes plus `404.html` load the approved shared assets with `?v=20260728-4`.
- Existing contact forms, solution carousel controls, logo wall, detail routes, RTL behavior, and `/api/contact` integration must not regress.
- `.playwright-cli/` and `.superpowers/` are local artifacts and must not be staged.
- This task updates the local Docker preview only; production deployment requires separate authorization.

---

### Task 1: Lock the site-wide implementation contract

**Files:**
- Create: `scripts/verify-site-typography-mall.mjs`
- Modify: `scripts/verify-site-rules.mjs`
- Modify: `scripts/verify-homepage-refinements.mjs`
- Modify: `scripts/verify-solution-card-carousel.mjs`

**Interfaces:**
- Consumes: all formal route HTML files, shared styles/scripts, sitemap, and homepage enhancement assets.
- Produces: deterministic assertions for route count, asset version, typography tokens, font exceptions, Mall navigation/pages/SEO, CTA equality, card centering, and discovery motion.

- [ ] **Step 1: Create the new verifier**

Create `scripts/verify-site-typography-mall.mjs` and assert:

```js
const version = "20260728-4";
const routeCount = 108;
const locales = [
  { route: "mall/index.html", nav: "Mall", lang: "en" },
  { route: "zh/mall/index.html", nav: "商城", lang: "zh-CN" },
  { route: "fa/mall/index.html", nav: "فروشگاه", lang: "fa" },
];
```

The verifier must:

- collect exactly 108 formal route indexes;
- require `/assets/site-typography-system.css?v=20260728-4` and `/assets/mall-navigation-and-page.js?v=20260728-4` on all routes and `404.html`;
- require the three Mall route shells and their localized SEO seeds;
- require the three Mall sitemap URLs;
- inspect CSS for all approved typography tokens and breakpoints;
- require `Poppins` as the leading ordinary Latin family and `Instrument Serif` only on the green italic brand selector;
- reject a global `Instrument Serif` assignment to ordinary headings, buttons, or navigation;
- require localized Mall labels and paths in the enhancement module.

- [ ] **Step 2: Update existing route/version contracts**

Change the formal route count from `105` to `108` and the asset version from `20260728-3` to `20260728-4` wherever the existing integration and verification scripts encode those release constants.

- [ ] **Step 3: Strengthen homepage assertions**

Update the homepage verifier to require:

```text
--joto-home-hero-action-width
max-width: 300px
HINT_INTERSECTION_RATIO = 0.25
HINT_DISTANCE_RATIO = 0.42
HINT_MAX_DISTANCE = 180
HINT_DELAY = 0
HINT_FORWARD_DURATION = 700
HINT_HOLD_DURATION = 500
HINT_RETURN_DURATION = 650
```

Retain cancellation, RTL, reduced-motion, form, logo-wall, and no-overflow assertions.

- [ ] **Step 4: Run the new verifier and confirm the expected failure**

```bash
node scripts/verify-site-typography-mall.mjs
```

Expected: non-zero exit because the new assets and Mall routes do not exist yet.

---

### Task 2: Implement the approved typography system

**Files:**
- Create: `assets/site-typography-system.css`
- Modify: `assets/index-e49ffBFL.css`
- Modify: `docs/site-modification-rules.md`

**Interfaces:**
- Consumes: existing semantic headings, utility classes, route/page data attributes, shared header/footer/form markup, and locale attributes.
- Produces: consistent `T0`–`T4`, `B1`–`M1` computed typography while preserving language-specific fallbacks and the single brand-serif exception.

- [ ] **Step 1: Define typography tokens**

Add custom properties for the approved balanced scale:

```css
:root {
  --joto-type-t0-size: 96px;
  --joto-type-t0-line: 0.92;
  --joto-type-t1-size: 72px;
  --joto-type-t1-line: 1;
  --joto-type-t2-size: 56px;
  --joto-type-t2-line: 1.08;
  --joto-type-t3-size: 28px;
  --joto-type-t3-line: 1.2;
  --joto-type-t4-size: 20px;
  --joto-type-t4-line: 1.3;
  --joto-type-b1-size: 18px;
  --joto-type-b1-line: 30px;
  --joto-type-b2-size: 16px;
  --joto-type-b2-line: 28px;
  --joto-type-b3-size: 14px;
  --joto-type-b3-line: 22px;
  --joto-type-l1-size: 12px;
  --joto-type-l1-line: 18px;
  --joto-type-m1-size: 11px;
  --joto-type-m1-line: 16px;
}
```

Override title and body tokens at `1279px` and `767px` exactly as approved in the Design MD.

- [ ] **Step 2: Apply locale-aware font families**

Set ordinary English/Latin text to `Poppins`, Chinese to `Poppins, "PingFang SC", "Microsoft YaHei", sans-serif`, and Persian to `Poppins, Vazirmatn, sans-serif`. Explicitly scope:

```css
.font-serif.text-joto-green,
[data-brand-serif="true"] {
  font-family: "Instrument Serif", serif;
  font-style: italic;
}
```

Ensure navigation, buttons, form controls, headings, footer text, and English fragments inside localized pages inherit `Poppins`.

- [ ] **Step 3: Map semantic page content to tokens**

Use page/section data attributes and semantic descendants to map:

- homepage Hero title → `T0`;
- primary page/detail titles → `T1`;
- major section titles → `T2`;
- card/feature titles → `T3` or `T4`;
- Hero summaries → `B1`;
- ordinary body copy → `B2`;
- card descriptions and control labels → `B3`;
- eyebrow/footer auxiliary copy → `L1`;
- decorative status labels → `M1`.

Header navigation is `14px/500` on desktop and `16px/500` in the mobile menu. Buttons are `14px/600`, inputs are `14px`, footer links are `14px`, and footer auxiliary copy is `12px/20px`.

- [ ] **Step 4: Record the durable rules**

Update `docs/site-modification-rules.md` with the token table, locale font stacks, brand-serif exception, responsive breakpoints, and the “no ordinary copy under 11px” rule.

- [ ] **Step 5: Run syntax and contract checks**

```bash
node --check scripts/verify-site-typography-mall.mjs
node scripts/verify-site-typography-mall.mjs
```

Expected: typography assertions pass; Mall/integration assertions may still fail until the next task.

---

### Task 3: Add localized Mall navigation and placeholder pages

**Files:**
- Create: `assets/mall-navigation-and-page.js`
- Create: `scripts/integrate-site-typography-mall.mjs`
- Create through integrator: `mall/index.html`
- Create through integrator: `zh/mall/index.html`
- Create through integrator: `fa/mall/index.html`
- Modify through integrator: all maintained route HTML files
- Modify: `sitemap.xml`

**Interfaces:**
- Consumes: React-rendered desktop/mobile navigation, locale path prefix, the route shell’s header/footer, and the existing main bundle.
- Produces: one idempotent Mall link after Blog in every navigation and localized, indexable Mall placeholder content at three routes.

- [ ] **Step 1: Implement locale configuration**

Define a single locale map with:

```js
const locales = {
  en: {
    label: "Mall",
    path: "/mall/",
    eyebrow: "JOTO TECH / MALL",
    title: "JOTO Mall",
    body: "Product models and product categories are being prepared. Please check back soon.",
  },
  zh: {
    label: "商城",
    path: "/zh/mall/",
    eyebrow: "JOTO TECH / 商城",
    title: "JOTO 产品商城",
    body: "产品型号与产品分类内容正在整理中，敬请期待。",
  },
  fa: {
    label: "فروشگاه",
    path: "/fa/mall/",
    eyebrow: "JOTO TECH / فروشگاه",
    title: "فروشگاه محصولات JOTO",
    body: "مدل‌ها و دسته‌بندی‌های محصولات در حال آماده‌سازی هستند. به‌زودی دوباره مراجعه کنید.",
  },
};
```

Include localized Home, Solutions, and Contact link labels.

- [ ] **Step 2: Inject Mall after Blog**

Use a bounded `MutationObserver` to find both desktop and dynamically mounted mobile navigation links. Clone the Blog link’s structural classes, change only `href` and text, mark it with `data-joto-mall-link`, and set `aria-current="page"` on Mall routes. Keep the function idempotent.

- [ ] **Step 3: Render Mall route content**

On the three Mall routes, wait for the shared bundle to render the page shell, preserve header/footer, and replace the Not Found middle section with a semantic Mall Hero. Add localized links to Home, Solutions, and Contact and set `data-mall-page`.

- [ ] **Step 4: Install correct runtime SEO**

After the bundle’s Not Found effect, remove temporary `[data-joto-seo]` nodes and install:

- localized `<title>` and description;
- `robots=index,follow`;
- canonical URL;
- Open Graph title, description, URL, type;
- English, Chinese, Persian, and `x-default` `hreflang` links.

- [ ] **Step 5: Build the idempotent integrator**

`scripts/integrate-site-typography-mall.mjs` must:

- copy locale-matched About shells to the three Mall paths;
- seed locale-specific `<html lang>`/`dir`, title, description, canonical, OG, and `hreflang`;
- inject the typography CSS and Mall module after shared assets on all 108 routes plus `404.html`;
- normalize all maintained browser asset query strings to `20260728-4`;
- add the three Mall URLs to `sitemap.xml` exactly once;
- fail if route count or required shared bundle tags differ from the expected contract;
- be idempotent on two consecutive executions.

- [ ] **Step 6: Run integration twice**

```bash
node scripts/integrate-site-typography-mall.mjs
node scripts/integrate-site-typography-mall.mjs
git diff --check
```

Expected: the second run reports no content changes.

---

### Task 4: Finish homepage CTA, card alignment, and discovery motion

**Files:**
- Modify: `assets/contact-form-sections.css`
- Modify: `assets/homepage-refinements.css`
- Modify: `assets/solution-card-carousel.js`
- Modify: `assets/solution-card-carousel.css`

**Interfaces:**
- Consumes: `[data-home-hero-actions]`, service/case card content, carousel item width, locale direction, and user-input events.
- Produces: equal Hero CTAs, centered card columns, and an obvious but non-blocking discovery gesture.

- [ ] **Step 1: Equalize the homepage Hero CTAs**

Define one locale-responsive shared width on the Hero action group and apply it to both links:

```css
[data-home-hero-actions] {
  --joto-home-hero-action-width: max-content;
}

[data-home-hero-actions] > a {
  width: var(--joto-home-hero-action-width);
  min-width: var(--joto-home-hero-action-width);
  height: 48px;
  white-space: nowrap;
}
```

Resolve the group’s width from its longer localized label so both actions measure identically, while allowing the pair to wrap on small screens.

- [ ] **Step 2: Center card columns under icons/logos**

Set the lifecycle-service and selected-experience text wrappers to `width: 100%; max-width: 300px; margin-inline: auto`, preserve `text-align: start`, and ensure the icon/logo wrapper shares the card center line.

- [ ] **Step 3: Upgrade discovery-motion constants**

Apply:

```js
const HINT_INTERSECTION_RATIO = 0.25;
const HINT_DISTANCE_RATIO = 0.42;
const HINT_MAX_DISTANCE = 180;
const HINT_DELAY = 0;
const HINT_FORWARD_DURATION = 700;
const HINT_HOLD_DURATION = 500;
const HINT_RETURN_DURATION = 650;
```

Keep one-time execution, RTL mirroring, reduced-motion disablement, and cancellation on pointer, touch, wheel, keyboard, or arrow-control interaction. If cancelled, do not force the track back over the user’s chosen position.

- [ ] **Step 4: Validate the homepage contract**

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
```

Expected: both pass.

---

### Task 5: Run the complete static suite and rebuild local Docker

**Files:**
- Modify as needed: `scripts/integrate-static-asset-version.mjs`
- Modify as needed: existing integration/verifier scripts
- Rebuild only: Docker image/container

- [ ] **Step 1: Validate script syntax**

```bash
node --check assets/mall-navigation-and-page.js
node --check assets/solution-card-carousel.js
node --check scripts/integrate-site-typography-mall.mjs
node --check scripts/verify-site-typography-mall.mjs
```

- [ ] **Step 2: Run all static contracts**

```bash
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-customer-logo-wall-preview.mjs
git diff --check
```

Expected: all pass, with 108 formal routes plus `404.html`.

- [ ] **Step 3: Rebuild and replace the local preview**

Build `jotoglobal-maintenance:20260728-4`, stop only the prior named JOTO local-preview container if it exists, then start `jotoglobal-local-20260728-v4` on `127.0.0.1:3009`.

- [ ] **Step 4: Smoke-test representative URLs**

Require HTTP 200 for:

```text
/
/zh/
/fa/
/mall/
/zh/mall/
/fa/mall/
/zh/solutions/network/
```

---

### Task 6: Perform Playwright browser regression

**Files:**
- No tracked files unless a defect requires a fix.
- Local evidence only: `.playwright-cli/`

**Viewports and locales:**
- Desktop: English and Chinese at `1440 × 1000`
- Mobile: English and Chinese at `390 × 844`
- RTL: Persian at `1440 × 1000` and `390 × 844`
- Tablet spot check: Chinese at `768 × 1024`

- [ ] **Step 1: Verify typography and fonts**

For representative homepage, detail, Blog, Contact, and Mall pages:

- computed ordinary Latin `font-family` starts with `Poppins`;
- green italic brand words use `Instrument Serif`;
- no ordinary readable element computes below `11px`;
- representative `T0`–`T4` and `B1`–`B3` elements match the intended viewport values;
- no visible title, button, navigation, or paragraph clips or unexpectedly wraps.

- [ ] **Step 2: Verify Hero CTA equality**

On all three homepages at desktop and mobile widths:

- View Solutions and Contact have equal width and height within a 1px tolerance;
- both labels remain on one line;
- the action group wraps cleanly where necessary;
- no title-adjacent legacy CTA is visible.

- [ ] **Step 3: Verify card alignment**

Measure service and selected-experience icon/logo center against the corresponding text-column center. Require an offset of at most 2px, while description text remains start aligned.

- [ ] **Step 4: Verify discovery motion**

Reload each homepage, scroll the core-capability section into 25% visibility, and confirm:

- the first card moves toward the next card without a click;
- the travel is visibly stronger than the prior implementation and is capped at 180px;
- the track returns to the starting card;
- the hint runs only once;
- RTL direction is mirrored;
- reduced motion produces no automatic movement;
- pointer/wheel/arrow interaction cancels the hint and hands control to the user.

- [ ] **Step 5: Verify Mall navigation and pages**

On desktop and mobile:

- Mall follows Blog in English, Chinese, and Persian;
- the localized link opens the matching localized Mall route;
- the Mall route retains the shared header/footer;
- visible copy, links, `lang`, `dir`, title, canonical, description, OG, `hreflang`, and `aria-current` are correct;
- browser console has zero errors and zero warnings.

- [ ] **Step 6: Verify responsive and RTL safety**

For every required viewport:

- `document.documentElement.scrollWidth <= window.innerWidth`;
- no fixed overlay blocks controls;
- mobile menu opens and contains Mall;
- Persian layout, controls, arrows, form fields, and text alignment remain correct.

- [ ] **Step 7: Fix and rerun until clean**

Any failure must be fixed in the narrowest responsible asset, followed by the affected static verifier and the full browser scenario.

---

### Task 7: Final review and commit

**Files:**
- All tracked implementation files from Tasks 1–6
- Exclude: `.playwright-cli/`, `.superpowers/`

- [ ] **Step 1: Review the complete change**

```bash
git diff --stat
git diff --check
git status --short
```

Confirm no unrelated files, credentials, browser artifacts, or generated local evidence are staged.

- [ ] **Step 2: Commit the implementation**

```bash
git add assets scripts docs/site-modification-rules.md sitemap.xml \
  404.html index.html about blog contact solutions mall zh fa
git commit -m "feat: unify site typography and add mall navigation"
```

- [ ] **Step 3: Verify final repository state**

```bash
git status --short
git log -2 --oneline
```

Expected: only the pre-existing untracked `.playwright-cli/` and `.superpowers/` directories remain, the latest commit contains the implementation, and the local Docker preview is available at `http://127.0.0.1:3009/zh/`.
