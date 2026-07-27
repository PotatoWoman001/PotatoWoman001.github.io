# Homepage Solution Carousel Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible green scrollbar in the homepage What we deliver card row with accessible previous/next circular controls while preserving touch scrolling.

**Architecture:** Keep the compiled React bundle unchanged and progressively enhance its existing `[data-solutions-scroller]` node. A standalone JavaScript module injects and synchronizes controls from real card geometry, while a standalone stylesheet hides the native scrollbar and supplies the reference-inspired button design.

**Tech Stack:** Static HTML, browser-native ES modules and DOM APIs, CSS, Node.js assertion scripts, Playwright CLI.

## Global Constraints

- Apply the enhancement only to `index.html`, `zh/index.html`, and `fa/index.html`.
- Preserve all five existing cards, their order, links, imagery, hover behavior, responsive widths, and scroll snapping.
- Desktop uses the circular buttons as the primary navigation; mobile retains touch scrolling and also shows the buttons.
- Do not autoplay or loop from the final card to the first.
- Each click advances by one adjacent card.
- Use localized accessible labels for English, Chinese, and Persian.
- Disable smooth scrolling and visual transitions for `prefers-reduced-motion: reduce`.
- Do not modify the compiled React bundle.

---

### Task 1: Build and statically verify the carousel enhancement assets

**Files:**
- Create: `assets/solution-card-carousel.js`
- Create: `assets/solution-card-carousel.css`
- Create: `scripts/verify-solution-card-carousel.mjs`

**Interfaces:**
- Consumes: The compiled homepage contract `[data-solutions-scroller]` containing direct child wrappers with `[data-solution-card]` descendants.
- Produces: One `[data-solution-carousel-controls]` group, localized previous/next buttons, hidden native scrollbar styling, and the command `node scripts/verify-solution-card-carousel.mjs`.

- [ ] **Step 1: Write the failing static verification**

Create `scripts/verify-solution-card-carousel.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "assets/solution-card-carousel.js");
const stylesPath = path.join(root, "assets/solution-card-carousel.css");
const mainBundlePath = path.join(root, "assets/index-DaFvN0XI.js");

assert.equal(existsSync(scriptPath), true, "carousel script must exist");
assert.equal(existsSync(stylesPath), true, "carousel stylesheet must exist");

const script = readFileSync(scriptPath, "utf8");
const styles = readFileSync(stylesPath, "utf8");
const mainBundle = readFileSync(mainBundlePath, "utf8");

assert.match(mainBundle, /data-solutions-scroller/);
assert.match(mainBundle, /data-solution-card/);

assert.match(script, /data-solutions-scroller/);
assert.match(script, /data-solution-card/);
assert.match(script, /data-solution-carousel-controls/);
assert.match(script, /scrollIntoView/);
assert.match(script, /prefers-reduced-motion: reduce/);
assert.match(script, /MutationObserver/);
assert.match(script, /ResizeObserver/);
assert.match(script, /上一张解决方案/);
assert.match(script, /راهکار قبلی/);

assert.match(styles, /scrollbar-width:\s*none/);
assert.match(styles, /solution-card-scroller::\-webkit-scrollbar/);
assert.match(styles, /data-solution-carousel-button/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);

console.log("Verified solution carousel enhancement assets.");
```

- [ ] **Step 2: Run the verification and confirm it fails**

Run:

```bash
node scripts/verify-solution-card-carousel.mjs
```

Expected: FAIL with `carousel script must exist` because the enhancement assets have not been created.

- [ ] **Step 3: Implement the behavior module**

Create `assets/solution-card-carousel.js`:

```js
const SCROLLER_SELECTOR = "[data-solutions-scroller]";
const CARD_SELECTOR = "[data-solution-card]";
const CONTROLS_SELECTOR = "[data-solution-carousel-controls]";
const EDGE_TOLERANCE = 3;

const labelsByLocale = {
  en: {
    controls: "Solution carousel controls",
    previous: "Previous solution",
    next: "Next solution",
  },
  "zh-CN": {
    controls: "解决方案轮播控制",
    previous: "上一张解决方案",
    next: "下一张解决方案",
  },
  "fa-IR": {
    controls: "کنترل راهکارها",
    previous: "راهکار قبلی",
    next: "راهکار بعدی",
  },
};

function getLabels() {
  const language = document.documentElement.lang || "en";
  if (language.toLowerCase().startsWith("zh")) return labelsByLocale["zh-CN"];
  if (language.toLowerCase().startsWith("fa")) return labelsByLocale["fa-IR"];
  return labelsByLocale.en;
}

function createArrowIcon(direction) {
  const path =
    direction === "left"
      ? "M19 12H5m6-6-6 6 6 6"
      : "M5 12h14m-6-6 6 6-6 6";
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="${path}" fill="none" stroke="currentColor"
        stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
    </svg>
  `;
}

function createButton(direction, label, controlsId) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.solutionCarouselButton = direction;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-controls", controlsId);
  button.innerHTML = createArrowIcon(direction);
  return button;
}

function getItems(scroller) {
  return Array.from(scroller.children).filter((child) =>
    child.querySelector(CARD_SELECTOR),
  );
}

function isRtl(scroller) {
  return getComputedStyle(scroller).direction === "rtl";
}

function getCurrentIndex(scroller, items) {
  const scrollerRect = scroller.getBoundingClientRect();
  const rtl = isRtl(scroller);
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  items.forEach((item, index) => {
    const itemRect = item.getBoundingClientRect();
    const distance = rtl
      ? Math.abs(scrollerRect.right - itemRect.right)
      : Math.abs(itemRect.left - scrollerRect.left);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function getEdgeState(scroller, items) {
  const scrollerRect = scroller.getBoundingClientRect();
  const firstRect = items[0].getBoundingClientRect();
  const lastRect = items.at(-1).getBoundingClientRect();

  if (isRtl(scroller)) {
    return {
      atStart: firstRect.right <= scrollerRect.right + EDGE_TOLERANCE,
      atEnd: lastRect.left >= scrollerRect.left - EDGE_TOLERANCE,
    };
  }

  return {
    atStart: firstRect.left >= scrollerRect.left - EDGE_TOLERANCE,
    atEnd: lastRect.right <= scrollerRect.right + EDGE_TOLERANCE,
  };
}

function enhanceSolutionCarousel(scroller) {
  if (scroller.dataset.solutionCarouselEnhanced === "true") return;

  const items = getItems(scroller);
  if (items.length < 2 || document.querySelector(CONTROLS_SELECTOR)) return;

  scroller.dataset.solutionCarouselEnhanced = "true";
  scroller.id ||= "solution-card-scroller";
  scroller.parentElement?.classList.add("solution-card-carousel-enhanced");

  const labels = getLabels();
  const controls = document.createElement("div");
  controls.dataset.solutionCarouselControls = "";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", labels.controls);

  const previousButton = createButton("left", labels.previous, scroller.id);
  const nextButton = createButton("right", labels.next, scroller.id);
  controls.append(previousButton, nextButton);
  scroller.before(controls);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let frame = 0;
  let currentIndex = 0;

  function updateState() {
    frame = 0;
    currentIndex = getCurrentIndex(scroller, items);
    const { atStart, atEnd } = getEdgeState(scroller, items);
    previousButton.disabled = atStart;
    nextButton.disabled = atEnd;
  }

  function scheduleUpdate() {
    if (frame) return;
    frame = window.requestAnimationFrame(updateState);
  }

  function navigate(offset) {
    currentIndex = getCurrentIndex(scroller, items);
    const targetIndex = Math.max(
      0,
      Math.min(items.length - 1, currentIndex + offset),
    );
    items[targetIndex].scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
    currentIndex = targetIndex;
    scheduleUpdate();
  }

  previousButton.addEventListener("click", () => navigate(-1));
  nextButton.addEventListener("click", () => navigate(1));
  scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
  reducedMotion.addEventListener?.("change", scheduleUpdate);

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(scroller);
    items.forEach((item) => resizeObserver.observe(item));
  } else {
    window.addEventListener("resize", scheduleUpdate, { passive: true });
  }

  updateState();
}

function start() {
  const scroller = document.querySelector(SCROLLER_SELECTOR);
  if (scroller) {
    enhanceSolutionCarousel(scroller);
    return;
  }

  const root = document.querySelector("#root") || document.body;
  const observer = new MutationObserver(() => {
    const renderedScroller = document.querySelector(SCROLLER_SELECTOR);
    if (!renderedScroller) return;
    observer.disconnect();
    enhanceSolutionCarousel(renderedScroller);
  });
  observer.observe(root, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
```

- [ ] **Step 4: Implement the visual styling**

Create `assets/solution-card-carousel.css`:

```css
.solution-card-carousel-enhanced .solution-card-scroller {
  margin-top: 1.25rem !important;
  padding-bottom: 0 !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none;
}

.solution-card-carousel-enhanced .solution-card-scroller::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

[data-solution-carousel-controls] {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2.5rem;
}

[data-solution-carousel-button] {
  display: inline-flex;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 3.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    color 180ms ease,
    opacity 180ms ease;
}

[data-solution-carousel-button] svg {
  width: 1.5rem;
  height: 1.5rem;
}

[data-solution-carousel-button]:hover:not(:disabled) {
  border-color: #ffffff;
  background: #ffffff;
  color: #07100c;
}

[data-solution-carousel-button]:focus-visible {
  outline: 2px solid #5ed29c;
  outline-offset: 4px;
}

[data-solution-carousel-button]:disabled {
  opacity: 0.28;
  cursor: default;
}

@media (max-width: 639px) {
  [data-solution-carousel-controls] {
    margin-top: 2rem;
    gap: 0.625rem;
  }

  [data-solution-carousel-button] {
    width: 3rem;
    height: 3rem;
    flex-basis: 3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-solution-carousel-button] {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the static verification**

Run:

```bash
node scripts/verify-solution-card-carousel.mjs
```

Expected: PASS with `Verified solution carousel enhancement assets.`

- [ ] **Step 6: Commit the enhancement assets**

```bash
git add assets/solution-card-carousel.js assets/solution-card-carousel.css scripts/verify-solution-card-carousel.mjs
git commit -m "feat: add homepage solution carousel controls"
```

### Task 2: Integrate the enhancement on the three homepages and verify in-browser

**Files:**
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`
- Modify: `scripts/verify-solution-card-carousel.mjs`

**Interfaces:**
- Consumes: `/assets/solution-card-carousel.css`, `/assets/solution-card-carousel.js`, and the existing compiled homepage.
- Produces: Three localized homepages with the enhancement loaded after the main site assets; all other routes remain unchanged.

- [ ] **Step 1: Extend the verification with failing route assertions**

Change the file-system import in
`scripts/verify-solution-card-carousel.mjs` to:

```js
import { existsSync, readFileSync, readdirSync } from "node:fs";
```

Then add this code before the final `console.log`:

```js
const homepagePaths = [
  path.join(root, "index.html"),
  path.join(root, "zh/index.html"),
  path.join(root, "fa/index.html"),
];

for (const homepagePath of homepagePaths) {
  const html = readFileSync(homepagePath, "utf8");
  assert.match(html, /\/assets\/solution-card-carousel\.css/);
  assert.match(html, /\/assets\/solution-card-carousel\.js/);
}

function collectIndexFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      [".git", ".playwright-cli", ".superpowers", "docs", "scripts"].includes(
        entry.name,
      )
    ) {
      return [];
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectIndexFiles(absolute);
    return entry.name === "index.html" ? [absolute] : [];
  });
}

const homepageSet = new Set(homepagePaths);
for (const routePath of collectIndexFiles(root)) {
  if (homepageSet.has(routePath)) continue;
  const html = readFileSync(routePath, "utf8");
  assert.doesNotMatch(html, /\/assets\/solution-card-carousel\.(?:css|js)/);
}
```

Replace the final log line with:

```js
console.log(
  "Verified solution carousel enhancement assets and homepage integration.",
);
```

- [ ] **Step 2: Run the verification and confirm the new assertions fail**

Run:

```bash
node scripts/verify-solution-card-carousel.mjs
```

Expected: FAIL because `index.html` does not yet reference
`/assets/solution-card-carousel.css`.

- [ ] **Step 3: Add the assets to each homepage**

In `index.html`, `zh/index.html`, and `fa/index.html`, add the module directly
after the compiled main bundle:

```html
<script type="module" crossorigin src="/assets/index-DaFvN0XI.js"></script>
<script type="module" src="/assets/solution-card-carousel.js"></script>
```

Add the stylesheet directly after the compiled main stylesheet:

```html
<link rel="stylesheet" crossorigin href="/assets/index-e49ffBFL.css">
<link rel="stylesheet" href="/assets/solution-card-carousel.css">
```

Keep the existing customer Logo wall assets in place.

- [ ] **Step 4: Run all static site verifications**

Run:

```bash
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected:

```text
Verified solution carousel enhancement assets and homepage integration.
Verified site-wide rules across 105 routes.
Verified customer Logo wall preview and homepage integration.
```

- [ ] **Step 5: Start the local static server**

Run:

```bash
python3 -m http.server 3009 --bind 127.0.0.1
```

Expected: the server listens at `http://127.0.0.1:3009/`.

- [ ] **Step 6: Verify the English, Chinese, and Persian homepages with Playwright CLI**

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh open http://127.0.0.1:3009/ --headed
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh snapshot
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh open http://127.0.0.1:3009/zh/ --headed
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh snapshot
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh open http://127.0.0.1:3009/fa/ --headed
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh snapshot
```

Verify in the snapshot:

- A control group with two localized buttons exists before the solution cards.
- The previous button is disabled initially and the next button is enabled.
- Clicking the next button changes the card position by one adjacent card.
- Repeated clicks reach the physical end and disable the next button.
- Clicking the previous button returns one adjacent card at a time.

- [ ] **Step 7: Verify responsive geometry and reduced-motion behavior**

Use Playwright CLI `run-code` to test widths `1440`, `768`, and `390`:

```js
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto("http://127.0.0.1:3009/zh/");
await page.locator("#solutions").scrollIntoViewIfNeeded();
const result = await page.evaluate(() => {
  const section = document.querySelector("#solutions");
  const scroller = document.querySelector("[data-solutions-scroller]");
  const controls = document.querySelector("[data-solution-carousel-controls]");
  const style = getComputedStyle(scroller);
  return {
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    controlsRightGap:
      Math.abs(section.getBoundingClientRect().right - controls.getBoundingClientRect().right),
    scrollbarWidth: style.scrollbarWidth,
    buttonCount: controls.querySelectorAll("button").length,
  };
});
```

Expected at every width:

- `pageOverflow` is `false`.
- `buttonCount` is `2`.
- `scrollbarWidth` is `none`.
- The controls remain right-aligned inside the section content.

Then emulate reduced motion and click next:

```js
await page.emulateMedia({ reducedMotion: "reduce" });
const behavior = await page.evaluate(() => {
  const scroller = document.querySelector("[data-solutions-scroller]");
  const original = Element.prototype.scrollIntoView;
  let captured;
  Element.prototype.scrollIntoView = function (options) {
    captured = options;
  };
  document.querySelector('[data-solution-carousel-button="right"]').click();
  Element.prototype.scrollIntoView = original;
  return captured?.behavior;
});
```

Expected: `behavior` is `auto`.

- [ ] **Step 8: Commit homepage integration and verification**

```bash
git add index.html zh/index.html fa/index.html scripts/verify-solution-card-carousel.mjs
git commit -m "feat: enable solution carousel controls on homepages"
```
