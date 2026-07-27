# Three-Row Customer Logo Wall Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality three-row counterflow Logo wall at `/preview/customer-logo-wall/` while leaving the homepage Logo wall and its shared production bundle unchanged.

**Architecture:** Keep the rendered homepage Logo wall as the single source of Logo data and visual treatment. Each standalone preview route loads the existing localized homepage in a hidden same-origin iframe, clones the completed 42-item Logo wall into the preview document, and splits the clone into three isolated tracks. A Node contract test verifies preview isolation, direction, duration, accessibility, route coverage, and that the existing application preview chunk remains unchanged.

**Tech Stack:** Static HTML, same-origin iframe DOM access, existing production CSS, browser DOM APIs, CSS keyframe animation, Node.js built-in assertions and crypto.

## Global Constraints

- The homepage and `assets/index-DaFvN0XI.js` must not be modified.
- The existing 42 Logo items must be split into three ordered groups of 14.
- Track directions must remain fixed at left / right / left; no `alternate` animation is allowed.
- Track durations must be exactly 52 / 60 / 68 seconds.
- The preview must use seamless duplicated sequences and hide duplicates from assistive technology.
- Hovering or keyboard-focusing any track must pause all three tracks.
- `prefers-reduced-motion: reduce` must stop all motion and hide duplicated sequences.
- The preview route must use `noindex, nofollow`.
- The English, Chinese, and Persian homepages must remain unchanged.

---

## File Structure

- Create `preview/customer-logo-wall/index.html`: English standalone preview shell with an iframe source at `/`.
- Create `zh/preview/customer-logo-wall/index.html`: Chinese standalone preview shell with an iframe source at `/zh/`.
- Create `fa/preview/customer-logo-wall/index.html`: Persian standalone preview shell with an iframe source at `/fa/`.
- Create `scripts/verify-customer-logo-wall-preview.mjs`: contract test for preview behavior and homepage isolation.
- Create `assets/customer-logo-wall-preview.js`: stable two-frame mount, exact 14/14/14 split, duplicate sequence creation, and iframe cleanup.
- Create `assets/customer-logo-wall-preview.css`: scoped layout, fixed directions, pause behavior, LTR track geometry, and reduced-motion fallback.
- Keep `assets/CustomerLogoWallPreviewPage-CzNVx3OI.js` unchanged.
- Do not modify `index.html`, `zh/index.html`, `fa/index.html`, `assets/index-DaFvN0XI.js`, or `assets/index-e49ffBFL.css`.

### Task 1: Build and verify the isolated three-row preview

**Files:**

- Create: `scripts/verify-customer-logo-wall-preview.mjs`
- Create: `preview/customer-logo-wall/index.html`
- Create: `zh/preview/customer-logo-wall/index.html`
- Create: `fa/preview/customer-logo-wall/index.html`
- Create: `assets/customer-logo-wall-preview.js`
- Create: `assets/customer-logo-wall-preview.css`
- Test: `scripts/verify-customer-logo-wall-preview.mjs`

**Interfaces:**

- Consumes: the rendered localized homepage section `#customer-logo-wall` and its 42 elements under `[data-logo-sequence="primary"]`.
- Produces: a preview root marked with `[data-customer-logo-wall-preview]`, three viewports marked with `[data-preview-logo-row="1"|"2"|"3"]`, and track classes `customer-logo-wall-preview__track--left` or `customer-logo-wall-preview__track--right`.

> **Runtime revision:** Browser validation showed that localized application routes such as `/fa/preview/customer-logo-wall/` resolve to the application 404. The final implementation therefore uses standalone route shells plus a hidden same-origin homepage iframe. This revision supersedes the earlier preview-chunk implementation shown in Steps 3–4; the files listed in **File Structure** are authoritative.

- [ ] **Step 1: Write the failing preview-isolation contract test**

Create `scripts/verify-customer-logo-wall-preview.mjs`:

```js
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const previewRoutePaths = [
  `${root}/preview/customer-logo-wall/index.html`,
  `${root}/zh/preview/customer-logo-wall/index.html`,
  `${root}/fa/preview/customer-logo-wall/index.html`,
];
const previewChunkPath = `${root}/assets/CustomerLogoWallPreviewPage-CzNVx3OI.js`;
const mainBundlePath = `${root}/assets/index-DaFvN0XI.js`;

for (const previewRoutePath of previewRoutePaths) {
  assert.equal(
    existsSync(previewRoutePath),
    true,
    `preview route shell must exist: ${previewRoutePath}`,
  );
  const routeHtml = readFileSync(previewRoutePath, "utf8");
  assert.match(routeHtml, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(routeHtml, /\/assets\/index-DaFvN0XI\.js/);
  assert.match(routeHtml, /\/assets\/index-e49ffBFL\.css/);
}

const previewChunk = readFileSync(previewChunkPath, "utf8");
const mainBundle = readFileSync(mainBundlePath);
const mainBundleHash = createHash("sha256").update(mainBundle).digest("hex");

assert.match(previewChunk, /data-customer-logo-wall-preview/);
assert.match(previewChunk, /previewLogoRow/);
assert.match(
  previewChunk,
  /items\s*\.slice\(rowIndex \* 14, \(rowIndex \+ 1\) \* 14\)/,
);
assert.match(previewChunk, /customer-logo-wall-preview__track--left/);
assert.match(previewChunk, /customer-logo-wall-preview__track--right/);
assert.match(previewChunk, /"52s", "60s", "68s"/);
assert.match(previewChunk, /prefers-reduced-motion: reduce/);
assert.match(previewChunk, /duplicate\.setAttribute\("aria-hidden", "true"\)/);
assert.doesNotMatch(previewChunk, /alternate/);

assert.equal(
  mainBundleHash,
  "1204bf9b00feb03acc1f6351357550ea9720ee473c6ed82fb2d52b4b88dce77d",
  "homepage bundle must remain unchanged",
);

console.log("customer Logo wall preview contract: PASS");
```

- [ ] **Step 2: Run the contract test and verify it fails before implementation**

Run:

```bash
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected result:

```text
AssertionError [ERR_ASSERTION]: preview route shell must exist
```

- [ ] **Step 3: Create the static preview route shell**

Create `preview/customer-logo-wall/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Internal preview of the JOTO TECH customer Logo wall." />
    <meta name="robots" content="noindex, nofollow">
    <title>Customer Logo Wall Preview | JOTO TECH</title>
    <script type="module" crossorigin src="/assets/index-DaFvN0XI.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-e49ffBFL.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

- [ ] **Step 4: Replace the preview-only chunk with the three-row decorator**

Replace `assets/CustomerLogoWallPreviewPage-CzNVx3OI.js` with:

```js
import { j as jsx, C as CustomerLogoWall } from "./index-DaFvN0XI.js";

const durations = ["52s", "60s", "68s"];
const directions = ["left", "right", "left"];
const delays = ["-5s", "-14s", "-21s"];

const previewStyles = `
[data-customer-logo-wall-preview] .customer-logo-wall__viewport[hidden] {
  display: none;
}
.customer-logo-wall-preview__rows {
  display: grid;
  gap: 0.625rem;
}
.customer-logo-wall-preview__track {
  animation-duration: var(--logo-wall-duration);
  animation-delay: var(--logo-wall-delay);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.customer-logo-wall-preview__track--left {
  animation-name: customer-logo-wall-preview-left;
}
.customer-logo-wall-preview__track--right {
  animation-name: customer-logo-wall-preview-right;
}
[data-customer-logo-wall-preview]:hover .customer-logo-wall-preview__track,
[data-customer-logo-wall-preview]:focus-within .customer-logo-wall-preview__track {
  animation-play-state: paused;
}
@keyframes customer-logo-wall-preview-left {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@keyframes customer-logo-wall-preview-right {
  from { transform: translate3d(-50%, 0, 0); }
  to { transform: translate3d(0, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .customer-logo-wall-preview__viewport {
    overflow-x: auto;
    mask-image: none;
    -webkit-mask-image: none;
  }
  .customer-logo-wall-preview__track {
    animation: none !important;
    transform: none !important;
  }
  .customer-logo-wall-preview__track [data-logo-sequence="duplicate"] {
    display: none;
  }
}
`;

function buildPreviewRows() {
  const root = document.querySelector("[data-customer-logo-wall-preview]");
  if (!root || root.dataset.previewReady === "true") return;

  const sourceViewport = root.querySelector(".customer-logo-wall__viewport");
  const sourcePrimary = sourceViewport?.querySelector(
    '[data-logo-sequence="primary"]',
  );
  const items = sourcePrimary ? Array.from(sourcePrimary.children) : [];
  if (!sourceViewport || !sourcePrimary || items.length !== 42) return;

  const rows = document.createElement("div");
  rows.className = "customer-logo-wall-preview__rows";

  durations.forEach((duration, rowIndex) => {
    const viewport = document.createElement("div");
    viewport.className =
      `${sourceViewport.className} customer-logo-wall-preview__viewport`;
    viewport.dataset.previewLogoRow = String(rowIndex + 1);
    viewport.setAttribute("role", "group");
    viewport.setAttribute("tabindex", "0");

    const sourceLabel =
      sourceViewport.getAttribute("aria-label") ?? "Customer logos row 1";
    viewport.setAttribute(
      "aria-label",
      sourceLabel.replace(/\d+\s*$/, String(rowIndex + 1)),
    );

    const track = document.createElement("div");
    track.className =
      `customer-logo-wall__track customer-logo-wall-preview__track ` +
      `customer-logo-wall-preview__track--${directions[rowIndex]} flex w-max`;
    track.style.setProperty("--logo-wall-duration", duration);
    track.style.setProperty("--logo-wall-delay", delays[rowIndex]);

    const sequence = sourcePrimary.cloneNode(false);
    sequence.removeAttribute("aria-hidden");
    sequence.dataset.logoSequence = "primary";
    sequence.append(
      ...items
        .slice(rowIndex * 14, (rowIndex + 1) * 14)
        .map((item) => item.cloneNode(true)),
    );

    const duplicate = sequence.cloneNode(true);
    duplicate.dataset.logoSequence = "duplicate";
    duplicate.setAttribute("aria-hidden", "true");
    duplicate.querySelectorAll("img").forEach((image) => {
      image.alt = "";
    });

    track.append(sequence, duplicate);
    viewport.append(track);
    rows.append(viewport);
  });

  sourceViewport.hidden = true;
  sourceViewport.setAttribute("aria-hidden", "true");
  sourceViewport.after(rows);
  root.dataset.previewReady = "true";
}

function CustomerLogoWallPreviewPage() {
  requestAnimationFrame(buildPreviewRows);

  return jsx.jsxs("main", {
    "data-customer-logo-wall-preview": true,
    className:
      "flex min-h-screen items-center bg-[#070b0a] text-white antialiased",
    children: [
      jsx.jsx("style", { children: previewStyles }),
      jsx.jsx("div", {
        className: "w-full",
        children: jsx.jsx(CustomerLogoWall, {}),
      }),
    ],
  });
}

export { CustomerLogoWallPreviewPage as default };
```

- [ ] **Step 5: Run the contract test and verify it passes**

Run:

```bash
node scripts/verify-customer-logo-wall-preview.mjs
```

Expected result:

```text
customer Logo wall preview contract: PASS
```

- [ ] **Step 6: Start a local static server for the formal preview**

Run from the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Expected result:

```text
Serving HTTP on 127.0.0.1 port 4173
```

- [ ] **Step 7: Verify the runtime DOM contract in a browser**

Open:

```text
http://127.0.0.1:4173/preview/customer-logo-wall/
```

Evaluate:

```js
({
  ready: document.querySelector(
    "[data-customer-logo-wall-preview]",
  )?.dataset.previewReady,
  rows: Array.from(
    document.querySelectorAll("[data-preview-logo-row]"),
  ).map((row) => ({
    row: row.dataset.previewLogoRow,
    primaryCount: row.querySelectorAll(
      '[data-logo-sequence="primary"] [data-customer-logo-item]',
    ).length,
    duplicateHidden: row
      .querySelector('[data-logo-sequence="duplicate"]')
      ?.getAttribute("aria-hidden"),
    animationName: getComputedStyle(
      row.querySelector(".customer-logo-wall-preview__track"),
    ).animationName,
    animationDuration: getComputedStyle(
      row.querySelector(".customer-logo-wall-preview__track"),
    ).animationDuration,
  })),
})
```

Expected result:

```js
{
  ready: "true",
  rows: [
    {
      row: "1",
      primaryCount: 14,
      duplicateHidden: "true",
      animationName: "customer-logo-wall-preview-left",
      animationDuration: "52s",
    },
    {
      row: "2",
      primaryCount: 14,
      duplicateHidden: "true",
      animationName: "customer-logo-wall-preview-right",
      animationDuration: "60s",
    },
    {
      row: "3",
      primaryCount: 14,
      duplicateHidden: "true",
      animationName: "customer-logo-wall-preview-left",
      animationDuration: "68s",
    },
  ],
}
```

- [ ] **Step 8: Verify visual quality and pause behavior**

At 1440 px and 390 px viewport widths, confirm:

- Three rows are visible and no page-level horizontal scrollbar appears.
- The first and third rows move left while the second moves right.
- There is no blank gap or endpoint reversal.
- Logo sizing, monochrome treatment, edge masks, and heading match the existing component.
- Hovering any row produces:

```js
Array.from(
  document.querySelectorAll(".customer-logo-wall-preview__track"),
).map((track) => getComputedStyle(track).animationPlayState)
```

Expected result:

```js
["paused", "paused", "paused"]
```

- [ ] **Step 9: Review the Git diff for preview-only isolation**

Run:

```bash
git status --short
git diff -- assets/CustomerLogoWallPreviewPage-CzNVx3OI.js preview/customer-logo-wall/index.html scripts/verify-customer-logo-wall-preview.mjs
git diff --exit-code -- index.html zh/index.html fa/index.html assets/index-DaFvN0XI.js assets/index-e49ffBFL.css
```

Expected result:

- Only the preview chunk, preview route shell, test script, and this plan are changed.
- The final `git diff --exit-code` command exits with code `0`.

- [ ] **Step 10: Commit the isolated formal preview**

Run:

```bash
git add assets/CustomerLogoWallPreviewPage-CzNVx3OI.js \
  preview/customer-logo-wall/index.html \
  zh/preview/customer-logo-wall/index.html \
  fa/preview/customer-logo-wall/index.html \
  scripts/verify-customer-logo-wall-preview.mjs \
  docs/superpowers/plans/2026-07-27-customer-logo-wall-preview.md
git commit -m "feat: add three-row customer Logo wall preview"
```

Expected result:

```text
[codex/jotoglobal-maintenance <commit>] feat: add three-row customer Logo wall preview
```
