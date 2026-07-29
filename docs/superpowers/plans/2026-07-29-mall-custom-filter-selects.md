# Mall Custom Filter Selects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible native Mall product-filter selects with accessible dark custom listboxes, remove duplicate sort choices, and preserve the existing URL/query state contract across English, Chinese, and Persian pages.

**Architecture:** `assets/mall-catalog-pages.js` remains the catalog controller. Each filter receives an explicit array of `{ value, label, dir? }` options, stores state in a visually hidden native select, and exposes a button/listbox UI whose selection dispatches the existing bubbling `change` event. CSS owns the dark popup, focus, responsive, and RTL presentation; the existing verification scripts cover the static contract and real-browser behavior.

**Tech Stack:** Static HTML, CSS, browser-native JavaScript modules, Node.js assertion scripts, Playwright CLI wrapper, Nginx/Docker local preview.

## Global Constraints

- Do not change Mall product data, crawler output, query-parameter names, product cards, pagination, product detail pages, or the main-site language selector.
- Do not add third-party runtime dependencies.
- Sort options must be exactly `title`, `brand`, and `recent`; direction options must be exactly `asc` and `desc`.
- English and Chinese are LTR; Persian is RTL; technical category and brand strings remain LTR.
- The visible dropdown must be dark and site-styled; the native operating-system popup must not be the interaction surface.
- Preserve browser back/forward restoration and the existing form-level `change` path into `update()`.

---

### Task 1: Define the static custom-select contract

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `assets/mall-catalog-pages.js` and `assets/mall-catalog.css` as source text.
- Produces: assertions requiring explicit option objects, hidden native selects, listbox semantics, and dark menu styles.

- [ ] **Step 1: Add failing source-contract assertions**

Add assertions after the existing category-renderer checks:

```js
for (const expected of [
  "joto-mall__custom-select",
  "joto-mall__native-select",
  "joto-mall__select-trigger",
  "joto-mall__select-menu",
  'role: "listbox"',
  'role: "option"',
  'aria-haspopup": "listbox"',
  'aria-selected"',
]) {
  assert.ok(pages.includes(expected), `Mall custom select renderer missing ${expected}`);
}
assert.doesNotMatch(pages, /function selectControl\([^)]*values[^)]*allLabel/);
assert.match(pages, /\{\s*value:\s*"title",\s*label:\s*locale\.sortTitle/);
assert.match(pages, /\{\s*value:\s*"brand",\s*label:\s*locale\.sortBrand/);
assert.match(pages, /\{\s*value:\s*"recent",\s*label:\s*locale\.sortRecent/);
assert.match(pages, /\{\s*value:\s*"asc",\s*label:\s*locale\.ascending/);
assert.match(pages, /\{\s*value:\s*"desc",\s*label:\s*locale\.descending/);
assert.match(styles, /\.joto-mall__native-select[\s\S]*position:\s*absolute/);
assert.match(styles, /\.joto-mall__select-menu[\s\S]*background:\s*#0c1712/);
assert.match(styles, /\.joto-mall__select-option[\s\S]*min-height:\s*44px/);
```

- [ ] **Step 2: Run the verifier and confirm it fails**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: failure containing `Mall custom select renderer missing`.

- [ ] **Step 3: Commit the failing contract**

```bash
git add scripts/verify-mall-catalog-pages.mjs
git commit -m "test: define Mall custom filter select contract"
```

### Task 2: Implement the custom select renderer and interaction

**Files:**
- Modify: `assets/mall-catalog-pages.js`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: explicit option objects `{ value: string, label: string, dir?: "ltr" | "rtl" }`.
- Produces: `selectControl(labelText, name, options, selected) -> HTMLDivElement`; hidden `select[name]`; `.joto-mall__select-trigger`; `.joto-mall__select-menu`; bubbling `change` on selection.

- [ ] **Step 1: Replace `selectControl()` with the explicit-option renderer**

Implement a wrapper `div`, stable label/value IDs, hidden native options, a trigger button, and listbox option buttons. The selected value falls back to the first option when necessary:

```js
let selectControlId = 0;

function selectControl(labelText, name, options, selected) {
  const id = `joto-mall-filter-${name}-${selectControlId += 1}`;
  const selectedOption = options.find((option) => option.value === selected) || options[0];
  const wrapper = element("div", {
    className: "joto-mall__filter joto-mall__custom-select",
    dataset: { selectName: name },
  });
  const label = element("span", { id: `${id}-label`, text: labelText || "\u00a0" });
  const native = element("select", {
    name,
    className: "joto-mall__native-select",
    tabIndex: -1,
    "aria-hidden": "true",
  });
  options.forEach((option) => {
    native.append(element("option", {
      value: option.value,
      text: option.label,
      selected: option.value === selectedOption.value,
    }));
  });
  const value = element("span", {
    id: `${id}-value`,
    text: selectedOption.label,
    dir: selectedOption.dir,
  });
  const trigger = element("button", {
    type: "button",
    className: "joto-mall__select-trigger",
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
    "aria-labelledby": `${id}-label ${id}-value`,
  }, [value, element("span", { className: "joto-mall__select-chevron", "aria-hidden": "true" })]);
  const menu = element("div", {
    id: `${id}-menu`,
    className: "joto-mall__select-menu",
    role: "listbox",
    hidden: true,
  });
  trigger.setAttribute("aria-controls", menu.id);
  options.forEach((option) => {
    menu.append(element("button", {
      type: "button",
      className: "joto-mall__select-option",
      role: "option",
      text: option.label,
      dir: option.dir,
      dataset: { value: option.value },
      "aria-selected": String(option.value === selectedOption.value),
    }));
  });
  wrapper.append(label, native, trigger, menu);
  return wrapper;
}
```

- [ ] **Step 2: Pass explicit options from `paint()`**

For category, brand, status, and condition, prepend a deliberate empty option. For sort and direction, pass only real values:

```js
const filterOptions = (allLabel, values, dir = "ltr") => [
  { value: "", label: allLabel },
  ...values.map((value) => ({ value, label: value, dir })),
];

selectControl(locale.category, "category",
  filterOptions(locale.allCategories, result.facets.categories), state.category);
selectControl(locale.sort, "sort", [
  { value: "title", label: locale.sortTitle },
  { value: "brand", label: locale.sortBrand },
  { value: "recent", label: locale.sortRecent },
], state.sort);
selectControl("", "direction", [
  { value: "asc", label: locale.ascending },
  { value: "desc", label: locale.descending },
], state.direction);
```

Remove the post-render `option.textContent` relabeling.

- [ ] **Step 3: Add one delegated interaction layer**

Within `renderList()`, add helpers to close/open menus, synchronize native state, focus options, and handle `click`/`keydown`. Selection must set `native.value` and call:

```js
native.dispatchEvent(new Event("change", { bubbles: true }));
```

Required key behavior:

```js
if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) openSelect(wrapper);
if (event.key === "Home") focusOption(menu, 0);
if (event.key === "End") focusOption(menu, options.length - 1);
if (event.key === "Escape") closeSelect(wrapper, { restoreFocus: true });
```

Use one `controls` click handler, one `controls` keydown handler, one document pointerdown handler, and the existing form `change` handler. `paint()` calls `closeAllSelects()` before replacing controls.

- [ ] **Step 4: Run the static verifier**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: `Verified nine localized Mall shells, catalog controllers, styling, and local routing.` once Task 3 styles are present; before Task 3, only the CSS assertions may fail.

### Task 3: Implement the dark responsive and RTL presentation

**Files:**
- Modify: `assets/mall-catalog.css`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: class names emitted by Task 2.
- Produces: 44px dark trigger/options, positioned 280px-max listbox, focus/selected states, hidden native select, and logical RTL positioning.

- [ ] **Step 1: Replace visible native-select styles**

Add the hidden-native and custom-control styles:

```css
[data-joto-mall] .joto-mall__custom-select {
  position: relative;
}

[data-joto-mall] .joto-mall__native-select {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

[data-joto-mall] .joto-mall__select-trigger {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--mall-line);
  border-radius: 8px;
  background: #08110d;
  padding: 8px 12px;
  color: #f4f7f5;
  font: inherit;
  font-size: 14px;
  text-align: start;
}

[data-joto-mall] .joto-mall__select-trigger[aria-expanded="true"] {
  border-color: #5dd3a0;
}

[data-joto-mall] .joto-mall__select-menu {
  position: absolute;
  inset-block-start: calc(100% + 8px);
  inset-inline: 0;
  z-index: 40;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid rgba(93, 211, 160, 0.42);
  border-radius: 12px;
  background: #0c1712;
  padding: 6px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
}

[data-joto-mall] .joto-mall__select-option {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 8px 14px;
  color: #f4f7f5;
  font: inherit;
  font-size: 14px;
  text-align: start;
}
```

Add green hover/focus/current styles, a CSS chevron, `[hidden] { display: none; }`, and logical alignment so Persian is RTL while `dir="ltr"` technical values remain LTR.

- [ ] **Step 2: Verify static styling**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
git diff --check
```

Expected: verifier success and no whitespace errors.

- [ ] **Step 3: Commit implementation and static contract**

```bash
git add assets/mall-catalog-pages.js assets/mall-catalog.css scripts/verify-mall-catalog-pages.mjs
git commit -m "feat: add custom Mall filter selects"
```

### Task 4: Extend browser verification and version the release

**Files:**
- Modify: `scripts/verify-mall-browser.mjs`
- Modify: version constants and generated HTML asset URLs currently using `20260729-6`
- Test: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: the Task 2/3 custom-select DOM and styles.
- Produces: a complete three-locale/three-viewport regression and cache-busted local preview.

- [ ] **Step 1: Add browser assertions for custom menus**

On each products page:

```js
const sort = page.locator('[data-select-name="sort"]');
const direction = page.locator('[data-select-name="direction"]');
assert(
  JSON.stringify(
    await sort.locator("select option").evaluateAll((options) => options.map(({ value }) => value)),
  ) === JSON.stringify(["title", "brand", "recent"]),
  "sort option values are incorrect",
);
assert(
  JSON.stringify(
    await direction.locator("select option").evaluateAll((options) => options.map(({ value }) => value)),
  ) === JSON.stringify(["asc", "desc"]),
  "direction option values are incorrect",
);
await sort.locator(".joto-mall__select-trigger").click();
const menuStyle = await sort.locator(".joto-mall__select-menu").evaluate((menu) => ({
  background: getComputedStyle(menu).backgroundColor,
  hidden: menu.hidden,
}));
assert(!menuStyle.hidden && menuStyle.background === "rgb(12, 23, 18)", "sort menu is not dark");
```

Also verify:

- option click updates URL;
- outside click closes;
- `Enter`, arrows, `Home`, `End`, and `Escape` work;
- Persian menu direction is RTL while brand/category option `dir` is LTR;
- no document horizontal overflow;
- no console warnings or page errors.

- [ ] **Step 2: Run the focused browser test locally**

Start/reuse the Docker site at `http://127.0.0.1:3009`, then run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh run-code "$(cat scripts/verify-mall-browser.mjs)"
```

Expected: 10 completed matrix cases, zero console problems, zero page errors.

- [ ] **Step 3: Bump the coordinated static asset version**

Mechanically replace `20260729-6` with `20260729-7` in the maintained version constants, Mall module imports, and generated HTML asset URLs, then run the established integration scripts if their expected route counts remain satisfied.

- [ ] **Step 4: Run the complete static suite**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-snapshot.mjs
node --test scripts/verify-mall-snapshot.test.mjs scripts/publish-mall-snapshot.test.mjs
git diff --check
```

Expected: all commands pass.

- [ ] **Step 5: Re-run the three-language browser matrix and capture preview**

Run the Playwright matrix again against `http://127.0.0.1:3009`, capture the Chinese products page with the sort menu open at desktop and mobile widths, and verify the same UI on English and Persian.

- [ ] **Step 6: Commit the browser coverage and version bump**

```bash
git add assets scripts *.html mall zh fa
git commit -m "test: verify Mall custom filter menus"
```

- [ ] **Step 7: Confirm repository state**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: only `.playwright-cli/` and `.superpowers/` remain untracked; all task source and documentation changes are committed.
