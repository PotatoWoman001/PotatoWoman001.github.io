# Homepage Interaction and Content Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine homepage action sizing, add a one-time carousel gesture hint, simplify service icons and the About section, and embed the existing localized contact form into all three homepages.

**Architecture:** Keep the compiled React bundle unchanged. Extend the existing carousel and contact progressive-enhancement modules, add one small homepage-only refinement module, and add narrowly scoped CSS overrides. Version every changed browser asset with `?v=20260728-3` so local and production browsers cannot reuse the previous cached implementation.

**Tech Stack:** Static HTML, CSS, browser DOM APIs, `IntersectionObserver`, `requestAnimationFrame`, Node.js contract scripts, Docker/Nginx, Playwright browser validation.

## Global Constraints

- English, Chinese, and Persian homepages must implement the same behaviors with localized copy and mirrored RTL layout.
- Homepage Hero buttons use content width, `48px` height, `28px` inline padding, and single-line labels.
- Header Contact and language controls are exactly `96 × 36px`.
- The carousel hint runs once per page load, moves `35%` of one card up to `120px`, then returns to the first card.
- The carousel hint is disabled for `prefers-reduced-motion: reduce` and cancelled by user input.
- The six service icons contain no white accent layer.
- The second About body paragraph is removed in all three locales.
- About statistics use a desktop and tablet `2 × 2` grid, switching to one column below `480px`.
- Homepage contact forms submit the existing six-field JSON payload to `POST /api/contact`.
- Existing Solution forms, Contact pages, carousel controls, logo wall, 105 routes, and `/api/contact` behavior must not regress.
- `.superpowers/` is a local visual-companion artifact and must not be staged.

---

### Task 1: Lock the homepage-refinement contract

**Files:**
- Create: `scripts/verify-homepage-refinements.mjs`
- Modify: `scripts/verify-site-rules.mjs`
- Modify: `scripts/verify-contact-form-sections.mjs`
- Modify: `scripts/verify-solution-card-carousel.mjs`

**Interfaces:**
- Consumes: the three homepage HTML files, shared CSS, carousel/contact modules, and the new homepage refinement assets.
- Produces: deterministic zero-exit checks for asset versions, selectors, localized content removal, animation guards, layout rules, and form integration.

- [ ] **Step 1: Create the failing homepage verifier**

Implement `scripts/verify-homepage-refinements.mjs` with these core assertions:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const homepages = ["index.html", "zh/index.html", "fa/index.html"];
const version = "20260728-3";

for (const route of homepages) {
  const html = readFileSync(path.join(root, route), "utf8");
  assert.match(html, new RegExp(`/assets/homepage-refinements\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`/assets/homepage-refinements\\.js\\?v=${version}`));
  assert.match(html, new RegExp(`/assets/contact-form-sections\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`/assets/contact-form-sections\\.js\\?v=${version}`));
  assert.match(html, new RegExp(`/assets/solution-card-carousel\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`/assets/solution-card-carousel\\.js\\?v=${version}`));
}

const homepageScriptPath = path.join(root, "assets/homepage-refinements.js");
const homepageStylesPath = path.join(root, "assets/homepage-refinements.css");
assert.equal(existsSync(homepageScriptPath), true);
assert.equal(existsSync(homepageStylesPath), true);

const homepageScript = readFileSync(homepageScriptPath, "utf8");
const homepageStyles = readFileSync(homepageStylesPath, "utf8");
const contactScript = readFileSync(
  path.join(root, "assets/contact-form-sections.js"),
  "utf8",
);
const contactStyles = readFileSync(
  path.join(root, "assets/contact-form-sections.css"),
  "utf8",
);
const carouselScript = readFileSync(
  path.join(root, "assets/solution-card-carousel.js"),
  "utf8",
);
const sharedStyles = readFileSync(
  path.join(root, "assets/index-e49ffBFL.css"),
  "utf8",
);

assert.match(homepageScript, /data-about-copy/);
assert.match(homepageScript, /data-homepage-secondary-copy-removed/);
assert.match(homepageStyles, /service-card__icon-mark--accent/);
assert.match(homepageStyles, /data-about-stats/);
assert.match(homepageStyles, /grid-template-columns:\s*repeat\\(2/);
assert.match(homepageStyles, /max-width:\s*479px/);

assert.match(sharedStyles, /data-testid="header-actions"/);
assert.match(sharedStyles, /aria-haspopup="menu"/);
assert.match(sharedStyles, /--joto-compact-action-width/);

assert.match(contactScript, /renderHomepageContactForm/);
assert.match(contactScript, /data-home-contact-form/);
assert.match(contactStyles, /width:\s*auto/);
assert.match(contactStyles, /padding-inline:\s*28px/);
assert.match(contactStyles, /grid-template-columns:\s*minmax\\(0,\s*5fr\\)/);

assert.match(carouselScript, /IntersectionObserver/);
assert.match(carouselScript, /HINT_DISTANCE_RATIO/);
assert.match(carouselScript, /prefers-reduced-motion:\s*reduce/);
assert.match(carouselScript, /pointerdown/);
assert.match(carouselScript, /touchstart/);
assert.match(carouselScript, /wheel/);
assert.match(carouselScript, /keydown/);

console.log("Verified homepage interaction and content refinements.");
```

- [ ] **Step 2: Update existing asset-version expectations**

Change the main bundle and stylesheet version expected by `scripts/verify-site-rules.mjs` from `20260728-1` to `20260728-3`.

Update the contact and carousel verifiers so their route regexes accept and require `?v=20260728-3`.

- [ ] **Step 3: Run the verifier and confirm the expected failure**

Run:

```bash
node scripts/verify-homepage-refinements.mjs
```

Expected: failure because `assets/homepage-refinements.js`, `assets/homepage-refinements.css`, and the new versioned references do not exist yet.

---

### Task 2: Implement button, icon, About, and asset-version refinements

**Files:**
- Create: `assets/homepage-refinements.js`
- Create: `assets/homepage-refinements.css`
- Create: `scripts/integrate-homepage-refinements.mjs`
- Modify: `assets/index-e49ffBFL.css`
- Modify: `assets/contact-form-sections.css`
- Modify: `docs/site-modification-rules.md`
- Modify: `scripts/integrate-static-asset-version.mjs`
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`
- Modify: all formal route HTML files through the existing version integrator

**Interfaces:**
- Consumes: rendered `#about [data-about-copy]`, `[data-about-stats]`, service icon data attributes, shared header data attributes, and `[data-home-hero-actions]`.
- Produces: removed secondary copy, solid-green icons, responsive About grid, compact Hero actions, equal header controls, and versioned asset references.

- [ ] **Step 1: Implement idempotent About copy removal**

Create `assets/homepage-refinements.js`:

```js
const ABOUT_COPY_SELECTOR = "#about [data-about-copy]";

function removeSecondaryAboutCopy(copy) {
  if (copy.dataset.homepageSecondaryCopyRemoved === "true") return;
  const bodyParagraphs = Array.from(copy.children).filter(
    (child) => child.tagName === "P",
  );
  if (bodyParagraphs.length < 2) return;
  bodyParagraphs.at(-1).remove();
  copy.dataset.homepageSecondaryCopyRemoved = "true";
}

function startHomepageRefinements() {
  const existing = document.querySelector(ABOUT_COPY_SELECTOR);
  if (existing) {
    removeSecondaryAboutCopy(existing);
    return;
  }

  const root = document.querySelector("#root") || document.body;
  const observer = new MutationObserver(() => {
    const copy = document.querySelector(ABOUT_COPY_SELECTOR);
    if (!copy) return;
    observer.disconnect();
    removeSecondaryAboutCopy(copy);
  });
  observer.observe(root, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startHomepageRefinements, {
    once: true,
  });
} else {
  startHomepageRefinements();
}
```

- [ ] **Step 2: Add homepage layout and icon CSS**

Create `assets/homepage-refinements.css` with:

```css
#services .service-card__icon-mark--accent {
  display: none !important;
}

#services .service-card__icon {
  color: #5ed29c;
}

#about [data-about-layout] {
  align-items: start;
}

#about [data-about-stats] {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

#about [data-about-stat-card] {
  min-height: 9.5rem;
}

@media (min-width: 1024px) {
  #about [data-about-layout] {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  #about [data-about-layout] > :first-child,
  #about [data-about-stats] {
    grid-column: span 6 / span 6;
  }
}

@media (max-width: 479px) {
  #about [data-about-stats] {
    grid-template-columns: minmax(0, 1fr) !important;
  }
}
```

Add responsive value sizing when needed so `MULTI-VENDOR`, `LIFECYCLE`, and their Persian equivalents remain single-line without overflow.

- [ ] **Step 3: Equalize shared header controls**

Append narrowly scoped rules to `assets/index-e49ffBFL.css`:

```css
[data-testid="header-actions"] > a[href$="/contact"],
[data-testid="header-actions"] > a[href="/contact"],
[data-testid="header-actions"] > div[aria-label] > button[aria-haspopup="menu"] {
  width: var(--joto-compact-action-width);
  min-width: var(--joto-compact-action-width);
  height: var(--joto-compact-action-height);
  min-height: var(--joto-compact-action-height);
  padding-inline: 0;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
```

- [ ] **Step 4: Convert Hero buttons to intrinsic width**

Replace the fixed-width homepage action rules in `assets/contact-form-sections.css` with:

```css
[data-home-hero-actions] {
  display: flex;
  width: auto;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 12px 16px;
}

[data-home-hero-actions] [data-hero-cta] {
  display: inline-flex !important;
  width: auto !important;
  min-width: 0;
  max-width: 100%;
  height: 48px;
  min-height: 48px;
  flex: 0 0 auto;
  padding-inline: 28px;
  white-space: nowrap;
}

html[dir="rtl"] [data-home-hero-actions] {
  justify-content: flex-start;
}
```

Remove the mobile rule that forces the actions into a column and the buttons to `width: 100%`.

- [ ] **Step 5: Integrate and version the new assets**

Create `scripts/integrate-homepage-refinements.mjs` to insert exactly once in the three homepage files:

```html
<link rel="stylesheet" href="/assets/homepage-refinements.css?v=20260728-3">
<script src="/assets/homepage-refinements.js?v=20260728-3" defer></script>
```

The integrator must also normalize homepage carousel and contact asset references to `?v=20260728-3`.

Update `scripts/integrate-static-asset-version.mjs` so all formal routes use:

```text
/assets/index-DaFvN0XI.js?v=20260728-3
/assets/index-e49ffBFL.css?v=20260728-3
```

Update `scripts/integrate-contact-form-sections.mjs` so all 78 contact-enhanced routes use `?v=20260728-3`.

Run all three integration scripts twice. The second run must report zero changed files.

- [ ] **Step 6: Record the confirmed homepage button exception**

Update `docs/site-modification-rules.md` to state:

- standard CTA remains `280 × 48px`;
- homepage Hero actions are an approved exception using intrinsic width, `48px` height, and `28px` inline padding;
- header Contact and language selector both use compact `96 × 36px`.

- [ ] **Step 7: Run static checks**

Run:

```bash
node --check assets/homepage-refinements.js
node scripts/verify-site-rules.mjs
git diff --check
```

Expected: the listed checks pass. `node scripts/verify-homepage-refinements.mjs` remains intentionally failing on the not-yet-implemented carousel and homepage-form tokens until Tasks 3 and 4 are complete.

---

### Task 3: Add the cancellable one-time carousel hint

**Files:**
- Modify: `assets/solution-card-carousel.js`
- Modify: `assets/solution-card-carousel.css`
- Modify: `scripts/verify-solution-card-carousel.mjs`

**Interfaces:**
- Consumes: the enhanced solution scroller, card items, controls, computed RTL direction, and reduced-motion media query.
- Produces: `data-solution-carousel-hint` states (`running`, `complete`, `cancelled`, `reduced`) and a one-time scroll hint that returns to the start.

- [ ] **Step 1: Add hint constants and cancellation state**

Add:

```js
const HINT_INTERSECTION_RATIO = 0.35;
const HINT_DISTANCE_RATIO = 0.35;
const HINT_MAX_DISTANCE = 120;
const HINT_DELAY = 180;
const HINT_FORWARD_DURATION = 520;
const HINT_HOLD_DURATION = 420;
const HINT_RETURN_DURATION = 620;
```

Inside `enhanceSolutionCarousel`, track:

```js
let userInteracted = false;
let hintStarted = false;
let hintAnimationFrame = 0;
let hintTimer = 0;
```

- [ ] **Step 2: Implement cancellable scroll animation**

Add a local helper:

```js
function animateScrollLeft(target, duration) {
  const start = scroller.scrollLeft;
  const distance = target - start;
  const startedAt = performance.now();

  return new Promise((resolve) => {
    function step(now) {
      if (userInteracted) {
        hintAnimationFrame = 0;
        resolve(false);
        return;
      }
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      scroller.scrollLeft = start + distance * eased;
      if (progress < 1) {
        hintAnimationFrame = requestAnimationFrame(step);
      } else {
        hintAnimationFrame = 0;
        resolve(true);
      }
    }
    hintAnimationFrame = requestAnimationFrame(step);
  });
}
```

Use the physical position difference between `items[1]` and `items[0]` to determine the LTR/RTL sign:

```js
const itemDelta =
  items[1].getBoundingClientRect().left -
  items[0].getBoundingClientRect().left;
const distance = Math.min(
  Math.abs(itemDelta) * HINT_DISTANCE_RATIO,
  HINT_MAX_DISTANCE,
);
const hintedScrollLeft =
  scroller.scrollLeft + Math.sign(itemDelta || 1) * distance;
```

- [ ] **Step 3: Trigger once from IntersectionObserver**

Observe `scroller.closest("section")` and start only when:

```js
entry.isIntersecting &&
entry.intersectionRatio >= HINT_INTERSECTION_RATIO &&
!hintStarted &&
!userInteracted &&
!reducedMotion.matches
```

Run the forward animation, hold, return to the captured starting `scrollLeft`, set `data-solution-carousel-hint="complete"`, and call `scheduleUpdate()`.

If reduced motion is active, set `data-solution-carousel-hint="reduced"` and do not move.

- [ ] **Step 4: Cancel on genuine user interaction**

Register passive cancellation listeners for:

```js
["pointerdown", "touchstart", "wheel", "keydown"]
```

Also call the same cancellation function at the beginning of both control-button click handlers. Cancellation clears pending timeouts and animation frames, disconnects the hint observer, and sets `data-solution-carousel-hint="cancelled"`. It must not force the scroller back to the starting position.

- [ ] **Step 5: Update CSS and verifier**

Add only state-safe CSS; do not introduce a repeating keyframe animation. Ensure reduced-motion rules remain present.

Extend `scripts/verify-solution-card-carousel.mjs` to assert the new constants, `IntersectionObserver`, all user-input event names, data states, and `requestAnimationFrame`.

- [ ] **Step 6: Run carousel checks**

Run:

```bash
node --check assets/solution-card-carousel.js
node scripts/verify-solution-card-carousel.mjs
```

Expected: both listed checks pass. The combined homepage verifier remains intentionally failing only on the not-yet-implemented homepage-form tokens until Task 4.

---

### Task 4: Reuse the Solution form on homepage contact sections

**Files:**
- Modify: `assets/contact-form-sections.js`
- Modify: `assets/contact-form-sections.css`
- Modify: `scripts/verify-contact-form-sections.mjs`
- Modify: `scripts/verify-homepage-refinements.mjs`

**Interfaces:**
- Consumes: localized `COPY`, existing field renderer, current homepage `section#contact`, and the existing `/api/contact` submission contract.
- Produces: one `[data-home-contact-form]`, a `5 / 7` desktop layout, preserved contact links, and the same localized submit behavior as Solution forms.

- [ ] **Step 1: Extract reusable form creation and binding**

Refactor the existing form template into:

```js
function contactFormMarkup(locale, idPrefix, dataAttribute) {
  // Return the existing localized form markup with the requested data marker.
}

function bindContactForm(form, copy) {
  // Attach the current validation, JSON payload, fetch, success, and fallback logic.
}

function createContactForm(locale, idPrefix, dataAttribute) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = contactFormMarkup(locale, idPrefix, dataAttribute);
  const form = wrapper.firstElementChild;
  bindContactForm(form, COPY[locale]);
  return form;
}
```

Update `renderSolutionContactForm` to use `createContactForm` without changing its rendered content or data markers.

- [ ] **Step 2: Implement homepage form enhancement**

Add:

```js
function renderHomepageContactForm(section, locale) {
  if (section.querySelector("[data-home-contact-form]")) return;

  const container = section.firstElementChild;
  const intro = container?.firstElementChild;
  const links = intro?.nextElementSibling;
  const eyebrow = intro?.firstElementChild;
  const headingCopy = eyebrow?.nextElementSibling;
  if (!container || !intro || !links || !eyebrow || !headingCopy) return;

  const copyPanel = document.createElement("div");
  copyPanel.className = "joto-home-contact__copy";
  copyPanel.append(eyebrow, ...Array.from(headingCopy.children));

  const formPanel = document.createElement("div");
  formPanel.className = "joto-home-contact__form-panel";
  formPanel.append(
    createContactForm(locale, `home-contact-${locale.toLowerCase()}`, "home"),
  );

  intro.replaceChildren(copyPanel, formPanel);
  intro.dataset.homeContactLayout = "";
  links.dataset.homeContactLinks = "";
}
```

The actual helper signature may use a boolean or exact data-marker name, but the rendered DOM must contain exactly one `data-home-contact-form`.

- [ ] **Step 3: Start both homepage enhancements**

For homepage routes, keep `enhanceHomepageActions` and additionally wait for `section#contact`, then call `renderHomepageContactForm`.

The Solution route branch must remain unchanged in scope and continue enhancing both category and partner routes.

- [ ] **Step 4: Add homepage contact layout CSS**

Add to `assets/contact-form-sections.css`:

```css
#contact [data-home-contact-layout] {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 64px;
  align-items: start;
}

.joto-home-contact__copy h2 {
  max-width: 38rem;
  font-size: clamp(2.75rem, 5.5vw, 5.5rem);
  line-height: 0.95;
}

.joto-home-contact__form-panel .joto-solution-contact__form {
  width: 100%;
}

#contact [data-home-contact-links] {
  margin-top: 64px;
}

@media (max-width: 1023px) {
  #contact [data-home-contact-layout] {
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
  }
}
```

Preserve the existing quick-link grid: four columns from `1024px`, two columns from `640px`, and one column below `640px`.

- [ ] **Step 5: Strengthen form verifiers**

Update both contact/homepage verifiers to assert:

- three homepage routes include the versioned contact assets;
- homepage logic contains `renderHomepageContactForm`;
- Solution route detection still supports lengths `2` and `3`;
- only one `/api/contact` payload implementation exists;
- both `data-home-contact-form` and `data-solution-contact-form` are rendered;
- all six payload fields remain present;
- Chinese prohibited text remains absent.

- [ ] **Step 6: Run syntax and contract checks**

Run:

```bash
node --check assets/contact-form-sections.js
node scripts/verify-contact-form-sections.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-customer-logo-wall-preview.mjs
git diff --check
```

Expected: all pass.

---

### Task 5: Rebuild Docker preview and run full browser regression

**Files:**
- Verify: `index.html`
- Verify: `zh/index.html`
- Verify: `fa/index.html`
- Verify: representative Solution and Contact routes
- Review: all changed files

**Interfaces:**
- Consumes: the final committed static source tree and local Docker configuration.
- Produces: a fresh `127.0.0.1:3009` preview and recorded evidence for layout, animation, RTL, forms, and regressions.

- [ ] **Step 1: Rebuild and replace the exact local preview container**

Run:

```bash
docker build -f Dockerfile.local -t jotoglobal-maintenance:20260728-3 .
docker rm -f jotoglobal-local-20260728
docker rm -f jotoglobal-local-20260728-v2
docker run -d \
  --name jotoglobal-local-20260728-v2 \
  -p 127.0.0.1:3009:80 \
  jotoglobal-maintenance:20260728-3
```

Only remove the two exact project preview container names. Do not prune Docker images, volumes, or unrelated containers.

- [ ] **Step 2: Run HTTP smoke checks**

Run:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/zh/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/fa/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/zh/solutions/network/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/zh/contact/
```

Expected: five `200` responses.

- [ ] **Step 3: Verify buttons in Playwright**

At `1440px`, `768px`, and `390px`, for English, Chinese, and Persian:

```js
{
  heroPrimary: {
    height: 48,
    widthLessThan: 280,
    whiteSpace: "nowrap",
  },
  heroContact: {
    height: 48,
    widthLessThan: 280,
    whiteSpace: "nowrap",
  },
  headerContactDesktop: { width: 96, height: 36 },
  language: { width: 96, height: 36 },
  horizontalOverflow: 0,
}
```

Confirm the two Hero buttons share a row when their combined intrinsic width fits, and wrap as whole controls otherwise.

- [ ] **Step 4: Verify carousel hint and manual controls**

In a fresh page context:

1. start at the first card;
2. scroll `#solutions` to `35%` visibility;
3. observe the scroller move in the locale’s forward direction;
4. confirm it returns to its starting scroll position;
5. assert `data-solution-carousel-hint="complete"`;
6. scroll away and back, confirming no second hint;
7. click Next/Previous and confirm one-card navigation and correct disabled states.

Repeat with reduced motion and assert no scroll movement plus `data-solution-carousel-hint="reduced"`.

Trigger pointer or wheel input during the delay in another fresh context and assert state `cancelled`.

- [ ] **Step 5: Verify service icons, About layout, and forms**

For all three locales:

- six `.service-card__icon-mark--accent` elements have `display: none`;
- visible service SVGs compute to the JOTO green color;
- `#about [data-about-copy]` has one body paragraph after the heading;
- the removed localized sentence is absent from rendered text;
- at `1440px` and `768px`, `[data-about-stats]` computes to two columns;
- at `390px`, it computes to one column;
- `#contact` contains exactly one `[data-home-contact-form]`;
- the four existing contact links remain;
- the form submit button is centered and single-line;
- the Solution network page still contains exactly one `[data-solution-contact-form]`;
- the standalone Contact page still contains its original form.

- [ ] **Step 6: Check logs and final static regressions**

For every representative page, assert zero browser console errors and warnings.

Run:

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-customer-logo-wall-preview.mjs
git diff --check
git status --short
git diff --stat
```

Expected: all checks pass; `.superpowers/` is the only unrelated untracked path.

- [ ] **Step 7: Review and commit implementation**

Stage only the design-approved implementation, verification scripts, rules document, integration scripts, route HTML changes, and this plan. Exclude `.superpowers/`.

Commit with:

```bash
git commit -m "feat: refine homepage interactions and contact"
```

Do not push or deploy in this task unless the user separately authorizes the release after reviewing the local Docker preview.
