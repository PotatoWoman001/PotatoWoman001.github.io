# Three-Row Customer Logo Wall Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved three-row Logo wall to the English, Chinese, and Persian homepages without pushing or deploying the site.

**Architecture:** Extract the accepted 14/14/14 DOM transformation into one shared browser module and one shared stylesheet. A small homepage bootstrap waits for the existing lazy Logo wall and enhances it in place; the standalone preview imports the same shared transformer so preview and homepage cannot drift. This avoids editing the concurrently maintained compiled main JS and CSS bundles.

**Tech Stack:** Static HTML, ES modules, browser DOM APIs, existing production Logo wall markup, CSS keyframe animations, Node.js contract tests.

## Global Constraints

- Keep all 42 existing Logo items, split in original order into three groups of 14.
- Track directions remain fixed at left / right / left.
- Track durations remain exactly 52 / 60 / 68 seconds.
- Do not use `alternate`; loops must remain seamless.
- Hovering or focusing any row pauses all three rows.
- Duplicate sequences use `aria-hidden="true"` and empty image alternatives.
- `prefers-reduced-motion: reduce` stops animation and hides duplicate sequences.
- Do not modify `assets/index-DaFvN0XI.js` or `assets/index-e49ffBFL.css`.
- Do not push or deploy.

---

### Task 1: Extract the shared three-row enhancer

**Files:**

- Create: `assets/customer-logo-wall-three-row.js`
- Create: `assets/customer-logo-wall-three-row.css`
- Modify: `assets/customer-logo-wall-preview.js`
- Modify: `assets/customer-logo-wall-preview.css`
- Modify: `preview/customer-logo-wall/index.html`
- Modify: `zh/preview/customer-logo-wall/index.html`
- Modify: `fa/preview/customer-logo-wall/index.html`

**Interfaces:**

- Consumes: `HTMLElement section` containing `.customer-logo-wall__viewport` and 42 primary `[data-customer-logo-item]` elements.
- Produces: `enhanceCustomerLogoWall(section): boolean`, plus `[data-customer-logo-wall-three-row="true"]` and three `[data-logo-wall-row]` viewports.

- [ ] **Step 1: Extend the contract test so it fails before extraction**

Update `scripts/verify-customer-logo-wall-preview.mjs` to require:

```js
const sharedScriptPath = `${root}/assets/customer-logo-wall-three-row.js`;
const sharedStylesPath = `${root}/assets/customer-logo-wall-three-row.css`;
const homepageScriptPath = `${root}/assets/customer-logo-wall-homepage.js`;

assert.equal(existsSync(sharedScriptPath), true);
assert.equal(existsSync(sharedStylesPath), true);
assert.equal(existsSync(homepageScriptPath), true);
```

Run:

```bash
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected: fail because `assets/customer-logo-wall-three-row.js` does not exist.

- [ ] **Step 2: Create the shared enhancer**

`assets/customer-logo-wall-three-row.js` must export:

```js
export const durations = ["52s", "60s", "68s"];
export const directions = ["left", "right", "left"];
export const delays = ["-10s", "-28s", "-42s"];

export function enhanceCustomerLogoWall(section) {
  // Validate the section and exactly 42 primary items.
  // Clone three primary sequences with 14 items each.
  // Clone one aria-hidden duplicate for every row.
  // Hide the original single-row viewport.
  // Mark the section with data-customer-logo-wall-three-row="true".
  // Return true on success and false when prerequisites are not ready.
}
```

The implementation must retain the source viewport classes, existing Logo item classes, image sources, size treatments, and fallback text.

- [ ] **Step 3: Create shared animation styles**

`assets/customer-logo-wall-three-row.css` must define:

```css
.customer-logo-wall-three-row__rows {
  display: grid;
  gap: 0.625rem;
  direction: ltr;
}

.customer-logo-wall-three-row__track--left {
  animation-name: customer-logo-wall-three-row-left;
}

.customer-logo-wall-three-row__track--right {
  animation-name: customer-logo-wall-three-row-right;
}
```

It must also define exact linear infinite animation behavior, global wall hover/focus pausing, seamless `0 ↔ -50%` keyframes, and reduced-motion static behavior.

- [ ] **Step 4: Refactor the standalone preview to import the shared enhancer**

`assets/customer-logo-wall-preview.js` must import:

```js
import { enhanceCustomerLogoWall } from "./customer-logo-wall-three-row.js";
```

Keep the existing same-origin iframe readiness checks and single-mount lock. Replace its local row-building function with:

```js
if (!enhanceCustomerLogoWall(previewSection)) {
  showError();
  return;
}
```

Remove duplicated animation rules from `assets/customer-logo-wall-preview.css`. Add `/assets/customer-logo-wall-three-row.css` to all three preview HTML shells.

- [ ] **Step 5: Run syntax and contract checks**

Run:

```bash
node --check assets/customer-logo-wall-three-row.js
node --check assets/customer-logo-wall-preview.js
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected: all commands exit `0`.

### Task 2: Bootstrap the enhancer on all homepages

**Files:**

- Create: `assets/customer-logo-wall-homepage.js`
- Modify: `index.html`
- Modify: `zh/index.html`
- Modify: `fa/index.html`
- Modify: `scripts/verify-customer-logo-wall-preview.mjs`

**Interfaces:**

- Consumes: `enhanceCustomerLogoWall(section)` from Task 1 and the lazy-mounted `#customer-logo-wall`.
- Produces: an enhanced homepage section with `data-customer-logo-wall-three-row="true"`.

- [ ] **Step 1: Add homepage requirements to the contract test**

For `index.html`, `zh/index.html`, and `fa/index.html`, assert:

```js
assert.match(html, /\/assets\/customer-logo-wall-three-row\.css/);
assert.match(html, /\/assets\/customer-logo-wall-homepage\.js/);
```

Also assert the shared script contains:

```js
assert.match(sharedScript, /"52s", "60s", "68s"/);
assert.match(sharedScript, /"left", "right", "left"/);
assert.doesNotMatch(sharedScript, /alternate/);
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected: fail because the homepage HTML files do not reference the new assets.

- [ ] **Step 3: Create the homepage bootstrap**

`assets/customer-logo-wall-homepage.js` must:

```js
import { enhanceCustomerLogoWall } from "./customer-logo-wall-three-row.js";

// Poll the lazy component with requestAnimationFrame.
// Require 42 primary items and two stable frames after all images complete.
// Call enhanceCustomerLogoWall(section) once.
// Stop after success; never modify sections outside #customer-logo-wall.
```

- [ ] **Step 4: Link the assets from each homepage shell**

Add to the `<head>` of `index.html`, `zh/index.html`, and `fa/index.html`:

```html
<script type="module" src="/assets/customer-logo-wall-homepage.js"></script>
<link rel="stylesheet" href="/assets/customer-logo-wall-three-row.css">
```

- [ ] **Step 5: Run automated checks**

Run:

```bash
node --check assets/customer-logo-wall-homepage.js
node scripts/verify-customer-logo-wall-preview.mjs
git diff --check
```

Expected: syntax passes, contract prints `customer Logo wall preview contract: PASS`, and `git diff --check` exits `0`.

- [ ] **Step 6: Verify the real Chinese homepage in a browser**

Open:

```text
http://127.0.0.1:4173/zh/
```

Expected runtime contract:

```js
{
  enhanced: "true",
  counts: [14, 14, 14],
  directions: ["left", "right", "left"],
  durations: ["52s", "60s", "68s"],
  pageOverflow: false
}
```

Focus the middle row and verify all three `animationPlayState` values equal `"paused"`. Repeat the count and overflow checks at 390 px width.

- [ ] **Step 7: Commit without push or deployment**

Stage only:

```bash
git add assets/customer-logo-wall-three-row.js \
  assets/customer-logo-wall-three-row.css \
  assets/customer-logo-wall-homepage.js \
  assets/customer-logo-wall-preview.js \
  assets/customer-logo-wall-preview.css \
  preview/customer-logo-wall/index.html \
  zh/preview/customer-logo-wall/index.html \
  fa/preview/customer-logo-wall/index.html \
  scripts/verify-customer-logo-wall-preview.mjs \
  index.html zh/index.html fa/index.html \
  docs/superpowers/plans/2026-07-27-customer-logo-wall-homepage.md
git commit -m "feat: apply three-row Logo wall to homepages"
```

Do not run `git push` and do not invoke any deployment tool.
