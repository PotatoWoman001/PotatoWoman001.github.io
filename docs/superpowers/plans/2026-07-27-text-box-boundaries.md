# JOTO Global Text Box Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved text-box boundary rule across every shared page template and all 105 formal routes.

**Architecture:** Keep the compiled static-site architecture unchanged and implement the missing behavior in the shared CSS bundle loaded by every route. Use CSS logical properties so English and Chinese align from the left start edge while Persian mirrors from the right start edge, then extend the existing static verifier and measure representative templates in a real browser.

**Tech Stack:** Static HTML, shared compiled CSS, Node.js assertions, in-app browser automation.

## Global Constraints

- English and Chinese headings, body copy, lists, and related CTA regions share the local left start edge.
- Persian uses the same rules through logical properties and shares the local right start edge.
- Headings may be wider than body copy, but neither may exceed its existing content container.
- Text wraps naturally with `white-space: normal`, `overflow-wrap: break-word`, and no justified stretching.
- Desktop, tablet, and mobile may change width and spacing only; direction and local start-edge relationships remain unchanged.
- Functional controls remain outside the CTA alignment rule.
- The implementation must remain centralized; do not edit 105 route files individually.
- Do not push or deploy.

---

### Task 1: Add failing static assertions for the missing boundary contract

**Files:**
- Modify: `scripts/verify-site-rules.mjs`
- Read: `assets/index-e49ffBFL.css`

**Interfaces:**
- Consumes: the shared CSS bundle text already loaded by `scripts/verify-site-rules.mjs`.
- Produces: failing assertions until the complete narrative-copy and CTA boundary rules exist.

- [x] **Step 1: Add assertions for narrative text boxes**

Add:

```js
assert.match(css, /JOTO copy boundary completion/);
assert.match(
  css,
  /:where\(h1, h2, h3, h4, h5, h6, p, ul, ol, li, label, blockquote\):not/,
);
assert.match(css, /text-align:\s*start\s*!important/);
assert.match(css, /max-inline-size:\s*100%/);
assert.match(css, /white-space:\s*normal/);
assert.match(css, /overflow-wrap:\s*break-word/);
assert.match(css, /margin-inline-start:\s*0\s*!important/);
assert.match(css, /margin-inline-end:\s*auto\s*!important/);
assert.doesNotMatch(css, /text-align:\s*justify/);
```

- [x] **Step 2: Add assertions for related CTA alignment**

Add:

```js
assert.match(
  css,
  /main article > a\.absolute\.rounded-full\s*\{[^}]*left:\s*auto;[^}]*right:\s*auto;[^}]*inset-inline-start:\s*1\.5rem/s,
);
assert.match(
  css,
  /html\[dir="rtl"\]\s+main\s+:is\(h1, h2, h3, h4, h5, h6\):not\(\.sr-only\)\s*\{[^}]*justify-content:\s*flex-end/s,
);
```

- [x] **Step 3: Run the verifier and confirm failure**

Run:

```bash
node scripts/verify-site-rules.mjs
```

Expected: FAIL on `JOTO copy boundary completion`.

---

### Task 2: Complete the centralized text-box boundary CSS

**Files:**
- Modify: `assets/index-e49ffBFL.css`
- Test: `scripts/verify-site-rules.mjs`

**Interfaces:**
- Consumes: existing page containers, card padding, CTA dimensions, and document `dir`.
- Produces: direction-aware start alignment for narrative text boxes and their associated CTA regions.

- [x] **Step 1: Replace the partial narrative alignment rule**

Replace the current selector that excludes centered content with:

```css
/* JOTO copy boundary completion · 2026-07-27 */
main
  :where(h1, h2, h3, h4, h5, h6, p, ul, ol, li, label, blockquote):not(
    .sr-only
  ),
footer
  :where(h1, h2, h3, h4, h5, h6, p, ul, ol, li, label, blockquote):not(
    .sr-only
  ) {
  min-inline-size: 0;
  text-align: start !important;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: normal;
}

main
  :where(h1, h2, h3, h4, h5, h6, p, ul, ol, li, label, blockquote):not(
    .sr-only
  ):not([class*="max-w-"]),
footer
  :where(h1, h2, h3, h4, h5, h6, p, ul, ol, li, label, blockquote):not(
    .sr-only
  ):not([class*="max-w-"]) {
  max-inline-size: 100%;
}

main :where(h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote):not(.sr-only),
footer :where(h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote):not(.sr-only) {
  margin-inline-start: 0 !important;
  margin-inline-end: auto !important;
}

main :is(h1, h2, h3, h4, h5, h6):not(.sr-only),
footer :is(h1, h2, h3, h4, h5, h6):not(.sr-only) {
  justify-content: flex-start;
}

html[dir="rtl"] main :is(h1, h2, h3, h4, h5, h6):not(.sr-only),
html[dir="rtl"] footer :is(h1, h2, h3, h4, h5, h6):not(.sr-only) {
  justify-content: flex-end;
}

html[dir="rtl"] main > header:not(.fixed) {
  direction: rtl;
  text-align: right;
}
```

- [x] **Step 2: Align standard CTAs to the same logical start edge**

Extend the standard CTA selector with:

```css
margin-inline-start: 0 !important;
margin-inline-end: auto !important;
```

Replace the centered absolute-card CTA rule with:

```css
main article > a.absolute.rounded-full {
  left: auto;
  right: auto;
  inset-inline-start: 1.5rem;
  inset-inline-end: auto;
  max-width: calc(100% - 3rem);
  transform: none;
}

@media (min-width: 640px) {
  main article > a.absolute.rounded-full {
    inset-inline-start: 1.75rem;
    max-width: calc(100% - 3.5rem);
  }
}
```

Keep the homepage CTA in the same copy stack as its description at every
breakpoint, and remove the locale-specific indentation from that stack:

```css
main :has(> [data-hero-copy-column]) {
  margin-inline-start: 0 !important;
}

[data-hero-copy-column] {
  align-items: flex-start;
  align-self: flex-start;
}

html[dir="rtl"] [data-hero-copy-column] {
  align-items: flex-end;
  align-self: flex-end;
}

[data-hero-cta-desktop] {
  display: none !important;
}

[data-hero-cta-mobile] {
  display: inline-flex !important;
}
```

- [x] **Step 3: Run static verification**

Run:

```bash
node scripts/verify-site-rules.mjs
git diff --check
```

Expected:

```text
Verified site-wide rules across 105 routes.
```

---

### Task 3: Verify every shared template family and responsive direction

**Files:**
- Read: `assets/index-e49ffBFL.css`
- Test: local formal routes

**Interfaces:**
- Consumes: the completed shared CSS from Task 2.
- Produces: browser evidence that all template families preserve local start edges and container boundaries.

- [x] **Step 1: Reload the local server preview**

Reload `http://127.0.0.1:3010/` after the CSS change.

Expected: the browser loads the new CSS without console errors.

- [x] **Step 2: Verify representative templates at desktop width**

Check:

```text
/
/about/
/contact/
/blog/
/blog/practical-security-response/
/solutions/network/
/solutions/network/cisco/
/404.html
```

For every visible narrative element, verify:

```js
({
  textAlign: getComputedStyle(element).textAlign,
  whiteSpace: getComputedStyle(element).whiteSpace,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
})
```

Expected: `textAlign` resolves to the language start side, `whiteSpace` is `normal`, and `overflow` is `0`.

Also measure the logical start coordinate of each title, paragraph, list, and
related CTA in a vertical copy group:

```js
const start =
  document.documentElement.dir === "rtl" ? rect.right : rect.left;
```

Expected: the maximum difference between related start coordinates is no more
than `2px`. Apply the same measurement explicitly to the homepage hero heading,
description, and visible CTA.

- [x] **Step 3: Verify Chinese and Persian mirrors**

Repeat the homepage, Contact, solution category, and vendor-detail checks under `/zh/` and `/fa/`.

Expected:

- English and Chinese text boxes begin from the local left content edge.
- Persian text boxes begin from the corresponding local right content edge.
- Associated CTA boxes use the same local start edge.

- [x] **Step 4: Verify tablet and mobile**

Measure at approximately `768px` and `390px` widths.

Expected: no horizontal overflow; headings may remain wider than paragraphs but share the same local start edge; CTA width remains at most `280px`.

- [x] **Step 5: Visually inspect the English and Persian homepages**

Expected: centered card copy and centered card CTAs now use their language start edge, while button text remains centered inside the button.

---

### Task 4: Record the corrective update locally

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-text-box-boundaries.md`
- Stage: `assets/index-e49ffBFL.css`
- Stage: `scripts/verify-site-rules.mjs`
- Stage: `docs/superpowers/plans/2026-07-27-text-box-boundaries.md`

**Interfaces:**
- Consumes: passing static and browser verification.
- Produces: one local commit on `codex/jotoglobal-maintenance`.

- [x] **Step 1: Mark completed checklist items**

Change all completed entries in this plan from `- [ ]` to `- [x]`.

- [x] **Step 2: Run final checks**

Run:

```bash
node scripts/verify-site-rules.mjs
git diff --check
git status --short
```

Expected: the verifier passes and only the planned files plus preserved unrelated untracked work appear.

- [x] **Step 3: Create the local commit**

Run:

```bash
git add assets/index-e49ffBFL.css scripts/verify-site-rules.mjs docs/superpowers/plans/2026-07-27-text-box-boundaries.md
git commit -m "fix: complete text box boundaries"
```

Expected: commit succeeds locally; no push or deployment occurs.
