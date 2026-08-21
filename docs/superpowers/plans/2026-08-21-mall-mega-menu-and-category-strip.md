# Mall Mega Menu and Continuous Category Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localized five-column Mall mega menu to the site navigation and make the Mall page's “More categories” control visually continuous with the primary category pills without clipping its popup.

**Architecture:** Enhance the already injected Mall navigation link in `mall-navigation-and-page.js`, using `loadCatalogIndex()` to derive optional second-level links while keeping five static top-level fallbacks. Move the page-level overflow control into the same horizontal pill track, but render its options in a body-level floating layer positioned from the trigger rectangle. Keep all catalog filtering, dense-list rendering, pagination, and product routes unchanged.

**Tech Stack:** Static HTML, native JavaScript ES modules, CSS, Node.js `assert`, Playwright CLI, Nginx immutable releases.

## Global Constraints

- Top-level category keys are exactly `网络`, `安全`, `服务器与存储`, `协作通信`, and `物理安防`; labels may be localized but query values remain Chinese.
- Clicking the Mall text enters the current-language Mall homepage; hover, focus, and the separate arrow open the desktop menu.
- Desktop shows five columns and up to five data-derived second-level links per column; mobile shows only the five top-level categories.
- A catalog-load failure must leave the Mall homepage link and all five top-level category links usable.
- “More categories” uses the same 40px pill geometry and 10px gap as neighboring category buttons.
- Opening the page-level popup must not change result-section vertical position by more than 1px.
- Existing dense list, grid, search, URL state, pagination, product details, three-language routes, keyboard access, and RTL behavior remain unchanged.
- Unrelated dirty-worktree files must not be staged, committed, archived, or deployed.

---

### Task 1: Specify Mall Navigation and Floating Category Contracts

**Files:**
- Modify: `scripts/verify-site-typography-mall.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: source text from `assets/mall-navigation-and-page.js`, `assets/mall-navigation.css`, `assets/mall-catalog-pages.js`, and `assets/mall-catalog.css`.
- Produces: failing static assertions for five stable categories, localized menu data, desktop/mobile menu classes, floating page-category popup, and one shared cache version.

- [ ] **Step 1: Add failing navigation assertions**

Read the new navigation stylesheet alongside the existing navigation module, then assert the exact stable keys and public DOM hooks:

```js
const stableCategories = ["网络", "安全", "服务器与存储", "协作通信", "物理安防"];
for (const category of stableCategories) {
  assert.ok(navigation.includes(JSON.stringify(category)), `missing Mall category ${category}`);
}
for (const hook of [
  "data-joto-mall-nav",
  "data-joto-mall-toggle",
  "joto-mall-nav__mega",
  "joto-mall-nav__mobile-categories",
]) {
  assert.ok(navigation.includes(hook) || navigationStyles.includes(hook));
}
assert.match(navigation, /loadCatalogIndex/);
assert.match(navigationStyles, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
```

- [ ] **Step 2: Add failing page-popup assertions**

```js
for (const hook of [
  "joto-mall__category-more",
  "joto-mall__category-popover",
  "positionCategoryPopover",
]) {
  assert.ok(pages.includes(hook) || styles.includes(hook));
}
assert.match(styles, /\.joto-mall__category-more[\s\S]*height:\s*40px/);
assert.match(styles, /\.joto-mall__category-popover[\s\S]*position:\s*fixed/);
```

- [ ] **Step 3: Run contracts and confirm failure**

Run:

```bash
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL on a missing Mall navigation stylesheet or `joto-mall__category-more` hook.

- [ ] **Step 4: Commit the failing contracts**

```bash
git add scripts/verify-site-typography-mall.mjs scripts/verify-mall-catalog-pages.mjs
git commit -m "test: specify Mall category navigation"
```

---

### Task 2: Build the Desktop Mall Mega Menu

**Files:**
- Create: `assets/mall-navigation.css`
- Modify: `assets/mall-navigation-and-page.js`
- Modify: `assets/mall-data-client.js`
- Test: `scripts/verify-site-typography-mall.mjs`

**Interfaces:**
- Consumes: `loadCatalogIndex()` and each catalog item's `category_path`.
- Produces: `MALL_CATEGORIES`, `categoryHref(locale, category, subcategory?)`, `deriveSubcategories(items)`, and an enhanced desktop node marked `data-joto-mall-nav`.

- [ ] **Step 1: Export a non-mutating catalog loader contract**

Keep `loadCatalogIndex()` as the single network path and export it from `mall-data-client.js` if it is not already exported. Do not add a second fetch implementation.

- [ ] **Step 2: Define localized stable categories and URL construction**

Add this shape to `mall-navigation-and-page.js`:

```js
const MALL_CATEGORIES = [
  { value: "网络", labels: { en: "Networking", zh: "网络", fa: "شبکه" } },
  { value: "安全", labels: { en: "Security", zh: "安全", fa: "امنیت" } },
  { value: "服务器与存储", labels: { en: "Servers & Storage", zh: "服务器与存储", fa: "سرور و ذخیره‌سازی" } },
  { value: "协作通信", labels: { en: "Collaboration", zh: "协作通信", fa: "ارتباطات سازمانی" } },
  { value: "物理安防", labels: { en: "Physical Security", zh: "物理安防", fa: "امنیت فیزیکی" } },
];

function categoryHref(locale, category, subcategory = "") {
  const url = new URL(locale.path, window.location.origin);
  url.searchParams.set("category", category);
  if (subcategory) url.searchParams.set("subcategory", subcategory);
  return `${url.pathname}${url.search}`;
}
```

- [ ] **Step 3: Derive at most five real subcategories per column**

Implement `deriveSubcategories(items)` by locating each stable category in `category_path`, counting the first non-empty following segment, sorting by descending count then `localeCompare`, and returning the first five. Ignore rows without a matching path and never invent fallback subcategories.

- [ ] **Step 4: Enhance only the desktop Mall link**

Wrap the injected desktop anchor in `[data-joto-mall-nav]`, append a real `button[data-joto-mall-toggle]`, and append `.joto-mall-nav__mega` with five columns. Each heading always links via `categoryHref`; append derived second-level links after `loadCatalogIndex()` resolves. On rejection, retain the headings and remove only second-level links.

- [ ] **Step 5: Add accessible open/close behavior**

Open on `pointerenter`, `focusin`, or toggle click. Close after a short `pointerleave` delay, on outside click, or on `Escape`; return focus to the toggle after Escape. Keep `aria-expanded` synchronized and avoid assigning ARIA `menu` roles.

- [ ] **Step 6: Style the five-column panel**

In `mall-navigation.css`, anchor the dark panel below the header, use `repeat(5, minmax(0, 1fr))`, constrain it to the viewport, support `[dir="rtl"]`, and hide `.joto-mall-nav__mega` below the desktop breakpoint.

- [ ] **Step 7: Run static checks and commit**

```bash
node --check assets/mall-navigation-and-page.js
node --check assets/mall-data-client.js
node scripts/verify-site-typography-mall.mjs
git add assets/mall-navigation-and-page.js assets/mall-navigation.css assets/mall-data-client.js scripts/verify-site-typography-mall.mjs
git commit -m "feat: add Mall navigation mega menu"
```

Expected: navigation contracts PASS.

---

### Task 3: Add the Mobile Five-Category Expansion

**Files:**
- Modify: `assets/mall-navigation-and-page.js`
- Modify: `assets/mall-navigation.css`
- Test: `scripts/verify-site-typography-mall.mjs`

**Interfaces:**
- Consumes: `MALL_CATEGORIES`, `categoryHref()`, and the existing cloned mobile Mall list item.
- Produces: `.joto-mall-nav__mobile-categories` with exactly five top-level links and a separate `aria-expanded` toggle.

- [ ] **Step 1: Detect the injected mobile list item**

When the Blog clone's container is `LI`, keep the Mall homepage anchor intact, add a sibling button, and append a nested list with one localized link per `MALL_CATEGORIES` entry.

- [ ] **Step 2: Implement mobile expansion state**

Toggle the nested list with `hidden` and `aria-expanded`; reset it when the enclosing navigation becomes hidden or the URL changes. Do not load or render second-level categories in the mobile list.

- [ ] **Step 3: Add mobile-only layout rules**

Hide the nested category list by default, indent its links, preserve RTL indentation, and ensure the separate toggle has a minimum 44px hit area.

- [ ] **Step 4: Verify and commit**

```bash
node --check assets/mall-navigation-and-page.js
node scripts/verify-site-typography-mall.mjs
git add assets/mall-navigation-and-page.js assets/mall-navigation.css scripts/verify-site-typography-mall.mjs
git commit -m "feat: add mobile Mall category navigation"
```

Expected: exactly five mobile category links and no mobile subcategory renderer.

---

### Task 4: Make “More Categories” Part of the Continuous Pill Strip

**Files:**
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-catalog.css`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `additionalCategories`, current `state.category`, existing category change flow, and `.joto-mall__category-track`.
- Produces: `button.joto-mall__category-more`, body-level `.joto-mall__category-popover`, and `positionCategoryPopover()`.

- [ ] **Step 1: Replace the detached select with an adjacent pill trigger**

Append the trigger directly after the primary buttons inside `.joto-mall__category-track`. Use `type="button"`, `aria-haspopup="listbox"`, `aria-expanded="false"`, and the localized “More categories” label.

- [ ] **Step 2: Render a body-level floating option layer**

Create one `.joto-mall__category-popover` appended to `document.body`, with buttons carrying the same category values used by current delegated filtering. Mark the active additional category and keep the existing URL/state update function as the only state transition.

- [ ] **Step 3: Position without affecting document flow**

Implement `positionCategoryPopover()` using `getBoundingClientRect()`. Use `position: fixed`, align to the trigger's inline start, clamp to an 8px viewport gutter, flip above the trigger if the menu would exceed the lower viewport, and recompute on open, scroll, and resize. RTL alignment uses the trigger's right edge.

- [ ] **Step 4: Preserve keyboard and dismissal behavior**

Arrow keys move through options, Enter/Space select, Escape closes and restores trigger focus, and outside pointer events close. Remove listeners when the Mall page is torn down.

- [ ] **Step 5: Apply continuous-strip styling**

Remove the separate overflow grid column. Keep one horizontal flex track with 10px gaps; style `.joto-mall__category-more` to the existing 40px pill geometry. Give the popover a fixed position and viewport-safe maximum height. Do not change dense-list selectors.

- [ ] **Step 6: Run contracts and commit**

```bash
node --check assets/mall-catalog-pages.js
node scripts/verify-mall-catalog-pages.mjs
git add assets/mall-catalog-pages.js assets/mall-catalog.css scripts/verify-mall-catalog-pages.mjs
git commit -m "fix: unify Mall category controls"
```

Expected: page contracts PASS and existing 46px dense-list assertions remain green.

---

### Task 5: Version, Browser-Verify, and Prepare the Exact Release

**Files:**
- Modify: `mall/index.html`
- Modify: `zh/mall/index.html`
- Modify: `fa/mall/index.html`
- Modify: the six localized Mall product templates identified by `rg -l 'mall-navigation-and-page|mall-catalog-pages' -- */mall/products/*/index.html`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-site-typography-mall.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: completed navigation/page assets and the production catalog fixture.
- Produces: one cache version across navigation CSS/JS and catalog CSS/JS, automated three-locale browser evidence, and one exact deployable Git commit.

- [ ] **Step 1: Bump every affected asset to one cache version**

Choose the current release date version (for example `20260821-2`) and use it consistently for `mall-navigation-and-page.js`, `mall-navigation.css`, `mall-catalog-pages.js`, `mall-catalog.css`, and their module imports in all nine Mall pages. Update both static verification scripts to expect the same value.

- [ ] **Step 2: Extend focused browser verification**

For English, Chinese, and Persian at desktop and mobile widths, assert:

```js
expect(desktopColumns).toBe(5);
expect(topLevelCategoryLinks).toBe(5);
expect(mobileTopLevelLinks).toBe(5);
expect(pageHorizontalOverflow).toBe(0);
expect(Math.abs(resultTopAfterOpen - resultTopBeforeOpen)).toBeLessThanOrEqual(1);
expect(morePillHeight).toBe(40);
expect(popoverInsideViewport).toBe(true);
```

Also click one populated top-level category and one real derived subcategory and assert a non-empty result count.

- [ ] **Step 3: Run the complete Mall verification set**

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-browser.mjs
```

Expected: all commands exit 0; all three locales pass desktop/mobile navigation, popup geometry, dense list, grid, search, and pagination checks.

- [ ] **Step 4: Review the exact diff and commit**

```bash
git diff --check
git status --short
git add mall/index.html zh/mall/index.html fa/mall/index.html assets/mall-navigation-and-page.js assets/mall-navigation.css assets/mall-catalog-pages.js assets/mall-catalog.css assets/mall-data-client.js scripts/verify-mall-browser.mjs scripts/verify-mall-catalog-pages.mjs scripts/verify-site-typography-mall.mjs
git commit -m "feat: add direct Mall category navigation"
```

Expected: only files belonging to this feature are staged; unrelated Cisco and workspace artifacts remain unstaged.

- [ ] **Step 5: Publish only after explicit production authorization**

Use the repository's immutable release script with the exact committed SHA, run its pre-switch validation, switch the `current` symlink only on success, then verify the live three-language Mall pages and one category URL. Record the release path, SHA, HTTP status, result count, and rollback target.

