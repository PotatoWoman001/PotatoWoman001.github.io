# JOTO Global Site-Wide Visual Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the four approved typography, alignment, button, and header-brand rules to all 105 static routes without pushing or deploying.

**Architecture:** All route HTML files load one shared CSS bundle and one shared JavaScript bundle, so the update will be centralized in those two assets. A small Node verification script will assert the shared bundle contract and route coverage, while Playwright will verify computed styles and responsive behavior on representative English, Chinese, and Persian pages.

**Tech Stack:** Static HTML, compiled React JavaScript bundle, Tailwind-generated CSS bundle, Node.js verification script, Playwright CLI.

## Global Constraints

- Ordinary English and Latin text uses local `Poppins` weights 400, 500, 600, 700, and 800.
- Green animated or typewriter serif text keeps `Instrument Serif`.
- English and Chinese narrative text aligns to the shared left start edge; Persian mirrors to the shared right start edge.
- Compact action buttons are exactly `96 × 36px`.
- Standard CTA buttons are exactly `280 × 48px` on desktop and `width: 100%; max-width: 280px` on mobile.
- Map pins, language selectors, menu toggles, carousel controls, and other functional controls are excluded from the action-button dimensions.
- The header subtitle is exactly two lines: `Global IT` and `Service Provider`, preserving title case.
- Do not change page copy, SEO data, images, routes, form behavior, animation timing, or deployment configuration.
- Do not push or deploy.

---

### Task 1: Add a failing shared-rule verification script

**Files:**
- Create: `scripts/verify-site-rules.mjs`
- Read: `assets/index-e49ffBFL.css`
- Read: `assets/index-DaFvN0XI.js`
- Read: all route `index.html` files

**Interfaces:**
- Consumes: the current shared CSS/JavaScript bundles and route HTML files.
- Produces: a zero-exit verification command, `node scripts/verify-site-rules.mjs`, once all approved rules are present.

- [ ] **Step 1: Create the verification script**

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "assets/index-e49ffBFL.css");
const jsPath = path.join(root, "assets/index-DaFvN0XI.js");
const css = fs.readFileSync(cssPath, "utf8");
const js = fs.readFileSync(jsPath, "utf8");

function collectIndexFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git") return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectIndexFiles(absolute);
    return entry.name === "index.html" ? [absolute] : [];
  });
}

const routeFiles = collectIndexFiles(root);
assert.equal(routeFiles.length, 105, "expected all 105 route index files");

for (const routeFile of routeFiles) {
  const html = fs.readFileSync(routeFile, "utf8");
  assert.match(html, /\/assets\/index-e49ffBFL\.css/);
  assert.match(html, /\/assets\/index-DaFvN0XI\.js/);
}

assert.match(css, /JOTO site-wide visual rules/);
assert.match(css, /--joto-compact-action-width:\s*96px/);
assert.match(css, /--joto-standard-cta-width:\s*280px/);
assert.match(
  css,
  /\.font-serif\.text-joto-green\s*\{\s*font-family:\s*Instrument Serif,\s*serif/,
);
assert.match(
  css,
  /\[data-hero-copy-column\]\s*\{\s*align-items:\s*flex-start/,
);
assert.match(
  css,
  /html\[dir="rtl"\] \[data-hero-copy-column\]\s*\{\s*align-items:\s*flex-end/,
);

assert.doesNotMatch(js, /children:\["Tech",f\.jsx\("br",\{\}\),"Shanghai"\]/);
assert.match(
  js,
  /children:\["Global IT",f\.jsx\("br",\{\}\),"Service Provider"\]/,
);

console.log(`Verified site-wide rules across ${routeFiles.length} routes.`);
```

- [ ] **Step 2: Run the verification script and confirm the expected failure**

Run:

```bash
node scripts/verify-site-rules.mjs
```

Expected: FAIL on `JOTO site-wide visual rules`, because the shared CSS override has not been added yet.

### Task 2: Apply centralized CSS and shared-header updates

**Files:**
- Modify: `assets/index-e49ffBFL.css`
- Modify: `assets/index-DaFvN0XI.js`
- Test: `scripts/verify-site-rules.mjs`

**Interfaces:**
- Consumes: the approved rules documented in `docs/site-modification-rules.md`.
- Produces: shared CSS custom properties and selectors used by every route, plus the updated shared header subtitle.

- [ ] **Step 1: Append the approved shared CSS override**

Append this exact block to `assets/index-e49ffBFL.css`:

```css
/* JOTO site-wide visual rules · 2026-07-27 */
:root {
  --joto-compact-action-width: 96px;
  --joto-compact-action-height: 36px;
  --joto-standard-cta-width: 280px;
  --joto-standard-cta-height: 48px;
}

:root,
html,
body,
.font-sans,
.font-display,
.font-mono {
  font-family: Poppins, Inter, sans-serif;
}

html[lang="fa-IR"] body {
  font-family: Poppins, Vazirmatn, Inter, sans-serif;
}

.font-serif {
  font-family: Poppins, Inter, sans-serif;
}

.font-serif.text-joto-green {
  font-family: Instrument Serif, serif;
}

main
  :is(h1, h2, h3, h4, h5, h6, p, li, label):not(.text-center):not(
    .text-center *
  ) {
  text-align: start;
}

[data-hero-copy-column] {
  align-items: flex-start;
}

[data-hero-copy-column] [data-hero-cta] {
  align-self: flex-start;
}

html[dir="rtl"] [data-hero-copy-column] {
  align-items: flex-end;
}

html[dir="rtl"] [data-hero-copy-column] [data-hero-cta] {
  align-self: flex-end;
}

[data-testid="header-actions"] > a[href$="/contact"],
[data-testid="header-actions"] > a[href="/contact"] {
  width: var(--joto-compact-action-width);
  height: var(--joto-compact-action-height);
  padding: 0;
  align-items: center;
  justify-content: center;
}

[data-hero-cta],
main a.inline-flex.rounded-full,
main article > a.absolute.rounded-full,
main form button[type="submit"].inline-flex.rounded-full {
  width: var(--joto-standard-cta-width);
  max-width: 100%;
  height: var(--joto-standard-cta-height);
  min-height: var(--joto-standard-cta-height);
  padding-top: 0;
  padding-bottom: 0;
  align-items: center;
  justify-content: center;
}

main article > a.absolute.rounded-full {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}

html[dir="rtl"] main :is(a, button).rounded-full {
  flex-direction: row-reverse;
}

@media (max-width: 639px) {
  [data-hero-cta],
  main a.inline-flex.rounded-full,
  main article > a.absolute.rounded-full,
  main form button[type="submit"].inline-flex.rounded-full {
    width: 100%;
    max-width: var(--joto-standard-cta-width);
  }
}
```

- [ ] **Step 2: Replace the shared header subtitle and remove uppercase transformation**

In `assets/index-DaFvN0XI.js`, replace:

```js
className:"ml-2 border-l border-white/30 pl-2 text-[9px] font-semibold uppercase leading-[1.15] tracking-[0.2em] text-white/65",children:["Tech",f.jsx("br",{}),"Shanghai"]
```

with:

```js
className:"ml-2 whitespace-nowrap border-l border-white/30 pl-2 text-[8px] font-semibold leading-[1.2] tracking-[0.08em] text-white/65",children:["Global IT",f.jsx("br",{}),"Service Provider"]
```

- [ ] **Step 3: Run static verification**

Run:

```bash
node scripts/verify-site-rules.mjs
```

Expected:

```text
Verified site-wide rules across 105 routes.
```

- [ ] **Step 4: Check file formatting and unintended changes**

Run:

```bash
git diff --check
git diff --stat
```

Expected: no whitespace errors; only the shared CSS, shared JavaScript, verification script, and implementation-plan checklist have changed.

### Task 3: Verify desktop and mobile behavior in a real browser

**Files:**
- Read: `assets/index-e49ffBFL.css`
- Read: `assets/index-DaFvN0XI.js`
- Test: representative local routes

**Interfaces:**
- Consumes: the shared bundle updates from Task 2.
- Produces: browser evidence that computed styles, dimensions, text alignment, and header content satisfy the approved rules.

- [ ] **Step 1: Start the local static server**

Run:

```bash
python3 -m http.server 3010 --bind 127.0.0.1
```

Expected: local server available at `http://127.0.0.1:3010`.

- [ ] **Step 2: Open the English homepage at desktop width**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh open http://127.0.0.1:3010 --headed
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh resize 1440 1000
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh snapshot
```

Expected: the shared header displays `Global IT` and `Service Provider`.

- [ ] **Step 3: Verify English computed styles**

Run a Playwright evaluation that returns:

```js
() => ({
  headerSubtitle: Array.from(
    document.querySelector('[aria-label="JOTO TECH home"]').children,
  ).at(-1).innerText,
  bodyFont: getComputedStyle(document.body).fontFamily,
  compactContact: (() => {
    const element = document.querySelector(
      '[data-testid="header-actions"] > a[href="/contact"]',
    );
    const rect = element.getBoundingClientRect();
    return [Math.round(rect.width), Math.round(rect.height)];
  })(),
  heroCta: (() => {
    const element = document.querySelector("[data-hero-cta]");
    const rect = element.getBoundingClientRect();
    return [Math.round(rect.width), Math.round(rect.height)];
  })(),
  heroAlignment: getComputedStyle(
    document.querySelector("[data-hero-copy-column]"),
  ).alignItems,
})
```

Expected:

```json
{
  "headerSubtitle": "Global IT\nService Provider",
  "bodyFont": "Poppins, Inter, sans-serif",
  "compactContact": [96, 36],
  "heroCta": [280, 48],
  "heroAlignment": "flex-start"
}
```

- [ ] **Step 4: Verify the green serif exception**

Evaluate the first visible `.font-serif.text-joto-green` element.

Expected: computed `fontFamily` starts with `Instrument Serif`.

- [ ] **Step 5: Verify Chinese and Persian direction**

Open `/zh/` and `/fa/`, taking a fresh snapshot after each navigation.

Expected:

- Chinese hero copy column uses `align-items: flex-start`.
- Persian hero copy column uses `align-items: flex-end`.
- Persian standard CTA uses `flex-direction: row-reverse`.
- Both locales display the same two-line English header subtitle.

- [ ] **Step 6: Verify representative route templates**

At 1440px, open:

```text
/about/
/contact/
/blog/
/blog/practical-security-response/
/solutions/network/
/solutions/network/cisco/
/404.html
```

Expected: no horizontal overflow; shared header content is correct; ordinary Latin text computes to `Poppins`; applicable CTA buttons are `280 × 48px`.

- [ ] **Step 7: Verify mobile layout**

Resize to `390 × 844` and repeat homepage, Contact, solution category, and vendor-detail checks in English and Persian.

Expected: no horizontal overflow; CTA width does not exceed 280px; header subtitle remains two lines; narrative text and CTA share the correct language start edge.

### Task 4: Record the completed first update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-site-wide-visual-rules.md`
- Stage: `assets/index-e49ffBFL.css`
- Stage: `assets/index-DaFvN0XI.js`
- Stage: `scripts/verify-site-rules.mjs`
- Stage: `docs/superpowers/plans/2026-07-27-site-wide-visual-rules.md`

**Interfaces:**
- Consumes: passing static verification and browser verification.
- Produces: one local commit containing the completed first website update.

- [ ] **Step 1: Mark every completed plan checkbox**

Change each completed `- [ ]` entry in this plan to `- [x]`.

- [ ] **Step 2: Run final verification**

Run:

```bash
node scripts/verify-site-rules.mjs
git diff --check
git status --short
```

Expected: verification passes, no whitespace errors, and only planned files are modified or untracked.

- [ ] **Step 3: Create a local commit**

Run:

```bash
git add assets/index-e49ffBFL.css assets/index-DaFvN0XI.js scripts/verify-site-rules.mjs docs/superpowers/plans/2026-07-27-site-wide-visual-rules.md
git commit -m "feat: apply site-wide visual rules"
```

Expected: local commit succeeds on `codex/jotoglobal-maintenance`; no push or deployment occurs.
