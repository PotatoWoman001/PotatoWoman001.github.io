# Mall Category Menu and Dense List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the clipped “More categories” menu and replace Mall list view with a 44–48px high-density catalog table without changing grid view or catalog data behavior.

**Architecture:** Split the category UI into a toolbar containing one horizontally scrollable primary-category track and one non-clipped overflow-select slot. Keep the existing product-card DOM and whole-row link semantics, but restyle list mode as fixed columns with a small thumbnail and collapse it to a model/action row on mobile.

**Tech Stack:** Static HTML, native JavaScript ES modules, CSS, Node.js `assert`, Playwright CLI, Nginx immutable releases.

## Global Constraints

- Desktop list rows must render between `44px` and `48px` high.
- Desktop thumbnail columns must not exceed `52px`; the image is secondary to model and type.
- Mobile list view hides thumbnail and product type while retaining model, brand, and details action.
- Opening the category menu must not change document-flow height or push the results region.
- Search, category state, URL history, pagination, 24-product page size, grid mode, product ordering, detail routes, keyboard behavior, and RTL support remain unchanged.
- English, Chinese, and Persian Mall home/products routes use the same cache versions.
- Unrelated dirty-worktree files must not be staged, committed, archived, or deployed.

---

### Task 1: Add Static Layout Contracts

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: source text from `assets/mall-catalog-pages.js` and `assets/mall-catalog.css`.
- Produces: failing contracts for `joto-mall__category-toolbar`, `joto-mall__category-track`, `joto-mall__category-overflow`, dense desktop rows, and mobile column removal.

- [ ] **Step 1: Add failing renderer and CSS assertions**

After the existing category renderer checks, add:

```js
for (const expected of [
  "joto-mall__category-toolbar",
  "joto-mall__category-track",
  "joto-mall__category-overflow",
]) {
  assert.ok(pages.includes(expected), `Mall category toolbar missing ${expected}`);
}

assert.match(
  styles,
  /\.joto-mall__category-toolbar\s*\{[\s\S]*display:\s*grid[\s\S]*overflow:\s*visible/,
);
assert.match(
  styles,
  /\.joto-mall__category-track\s*\{[\s\S]*display:\s*flex[\s\S]*overflow-x:\s*auto/,
);
assert.match(
  styles,
  /\.joto-mall__category-overflow\s*\{[\s\S]*position:\s*relative[\s\S]*overflow:\s*visible/,
);
assert.match(
  styles,
  /\.joto-mall__cards--list \.joto-mall__card\s*\{[\s\S]*height:\s*46px/,
);
assert.match(
  styles,
  /\.joto-mall__cards--list \.joto-mall__card-link\s*\{[\s\S]*grid-template-columns:\s*48px/,
);
assert.match(
  styles,
  /@media \(max-width:\s*767px\)[\s\S]*\.joto-mall__cards--list \.joto-mall__card-media\s*\{[\s\S]*display:\s*none/,
);
assert.match(
  styles,
  /@media \(max-width:\s*767px\)[\s\S]*\.joto-mall__cards--list \.joto-mall__card-type\s*\{[\s\S]*display:\s*none/,
);
```

Replace the old assertion that requires `.joto-mall__category-navigation` itself to own horizontal overflow with one that targets `.joto-mall__category-track`.

- [ ] **Step 2: Run the static contract and confirm failure**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL with `Mall category toolbar missing joto-mall__category-toolbar`.

- [ ] **Step 3: Commit the failing contract**

```bash
git add scripts/verify-mall-catalog-pages.mjs
git commit -m "test: specify dense Mall list layout"
```

---

### Task 2: Separate the Category Menu from the Scroll Track

**Files:**
- Modify: `assets/mall-catalog-pages.js:395-475`
- Modify: `assets/mall-catalog.css:233-250,467-490,542-558`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: `primaryCategories`, `additionalCategories`, `categoryButton()`, and `selectControl()`.
- Produces: `.joto-mall__category-toolbar` containing `.joto-mall__category-track` plus optional `.joto-mall__category-overflow`; selection continues to emit the existing `change` event on `select[name="category"]`.

- [ ] **Step 1: Build stable toolbar nodes once**

Replace the single `categoryNavigation` declaration with:

```js
const categoryNavigation = element("div", {
  className: "joto-mall__category-navigation",
  role: "navigation",
  "aria-label": locale.categories,
});
const categoryToolbar = element("div", {
  className: "joto-mall__category-toolbar",
});
const categoryTrack = element("div", {
  className: "joto-mall__category-track",
});
const categoryOverflow = element("div", {
  className: "joto-mall__category-overflow",
});
categoryToolbar.append(categoryTrack, categoryOverflow);
categoryNavigation.append(categoryToolbar);
```

- [ ] **Step 2: Paint primary and overflow controls into separate containers**

Replace `paintCategories()` with:

```js
function paintCategories(selected) {
  categoryTrack.replaceChildren(
    categoryButton("", locale.allProducts, !selected),
    ...primaryCategories.map(({ name }) =>
      categoryButton(name, name, selected === name),
    ),
  );

  if (!additionalCategories.length) {
    categoryOverflow.replaceChildren();
    categoryOverflow.hidden = true;
    return;
  }

  const additionalValues = additionalCategories.map(({ name }) => name);
  categoryOverflow.hidden = false;
  categoryOverflow.replaceChildren(
    selectControl(
      locale.category,
      "category",
      [
        { value: "", label: locale.moreCategories },
        ...additionalValues.map((value) => ({ value, label: value, dir: "ltr" })),
      ],
      additionalValues.includes(selected) ? selected : "",
    ),
  );
}
```

Keep `controls.replaceChildren(categoryNavigation)` unchanged so the delegated click, keydown, and change handlers still own both children.

- [ ] **Step 3: Replace clipping layout with toolbar/track/overflow CSS**

Replace the current category-navigation overflow block with:

```css
[data-joto-mall] .joto-mall__category-navigation {
  max-width: 100%;
  grid-column: 1 / -1;
  overflow: visible;
}

[data-joto-mall] .joto-mall__category-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  align-items: end;
  gap: 10px;
  overflow: visible;
}

[data-joto-mall] .joto-mall__category-track {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
  scroll-padding-inline: 1px;
  touch-action: pan-x pan-y;
}

[data-joto-mall] .joto-mall__category-track::-webkit-scrollbar {
  display: none;
}

[data-joto-mall] .joto-mall__category-overflow {
  position: relative;
  min-width: 180px;
  overflow: visible;
}

[data-joto-mall] .joto-mall__category-overflow[hidden] {
  display: none;
}
```

Change `.joto-mall__category-navigation .joto-mall__filter` to `.joto-mall__category-overflow .joto-mall__filter` and keep `min-width: 180px`.

- [ ] **Step 4: Add narrow-screen toolbar wrapping**

Inside the existing `@media (max-width: 767px)` block add:

```css
[data-joto-mall] .joto-mall__category-toolbar {
  grid-template-columns: minmax(0, 1fr);
}

[data-joto-mall] .joto-mall__category-overflow {
  width: min(100%, 220px);
  min-width: 0;
}
```

- [ ] **Step 5: Run the static contract**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node --check assets/mall-catalog-pages.js
```

Expected: category-toolbar assertions PASS; dense-list assertions still FAIL because Task 3 is not implemented.

- [ ] **Step 6: Commit the category repair**

```bash
git add assets/mall-catalog-pages.js assets/mall-catalog.css
git commit -m "fix: separate Mall category overflow menu"
```

---

### Task 3: Implement the High-Density Catalog Table

**Files:**
- Modify: `assets/mall-catalog.css:628-680,1054-1100`
- Test: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**
- Consumes: existing `.joto-mall__card`, `.joto-mall__card-link`, `.joto-mall__card-media`, `.joto-mall__card-copy`, brand/model/type/action nodes.
- Produces: desktop 46px rows with a 48px thumbnail column and mobile model/action rows without image or type.

- [ ] **Step 1: Replace desktop list-card geometry**

Replace the desktop list-mode rules with:

```css
[data-joto-mall] .joto-mall__cards--list {
  grid-template-columns: 1fr;
  gap: 2px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card {
  height: 46px;
  max-height: 46px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-link {
  grid-template-columns: 48px minmax(0, 1fr);
  grid-template-rows: none;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-media {
  width: 48px;
  height: 44px;
  min-height: 44px;
  border-bottom: 0;
  border-inline-end: 1px solid var(--mall-line);
  padding: 4px;
  aspect-ratio: auto;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__image-placeholder {
  min-height: 0;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-copy {
  grid-template-columns: minmax(220px, 0.8fr) minmax(180px, 1fr) 80px;
  grid-template-rows: 1fr;
  align-items: center;
  column-gap: 16px;
  padding: 4px 12px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-brand,
[data-joto-mall] .joto-mall__cards--list .joto-mall__card-model {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  white-space: nowrap;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-brand {
  justify-self: end;
  margin: 0;
  padding-inline-start: 12px;
  color: var(--mall-muted);
  font-size: 9px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-model {
  justify-self: start;
  max-width: calc(100% - 72px);
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-type {
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-action {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  margin: 0;
  font-size: 10px;
  white-space: nowrap;
}
```

- [ ] **Step 2: Replace mobile list overrides**

Inside `@media (max-width: 767px)`, replace the old list overrides with:

```css
[data-joto-mall] .joto-mall__cards--list .joto-mall__card {
  height: 44px;
  max-height: 44px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-link {
  display: block;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-media,
[data-joto-mall] .joto-mall__cards--list .joto-mall__card-type {
  display: none;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-copy {
  height: 42px;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: 1fr;
  column-gap: 8px;
  padding: 4px 8px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-brand,
[data-joto-mall] .joto-mall__cards--list .joto-mall__card-model {
  grid-column: 1;
  grid-row: 1;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-brand {
  justify-self: end;
  margin: 0;
  font-size: 8px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-model {
  justify-self: start;
  max-width: calc(100% - 60px);
  font-size: 10px;
}

[data-joto-mall] .joto-mall__cards--list .joto-mall__card-action {
  grid-column: 2;
  grid-row: 1;
  font-size: 10px;
}
```

- [ ] **Step 3: Run contracts and syntax checks**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-data-client.mjs
git diff --check
```

Expected:

```text
Verified nine localized Mall shells, catalog controllers, styling, and local routing.
Verified Mall navigation, locale copy, and catalog data client.
```

- [ ] **Step 4: Commit the table layout**

```bash
git add assets/mall-catalog.css scripts/verify-mall-catalog-pages.mjs
git commit -m "feat: add dense Mall catalog table"
```

---

### Task 4: Add Browser Measurements and Interaction Regression

**Files:**
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: a running local preview origin and existing `exerciseCatalog(origin, testCase, viewport)` flow.
- Produces: runtime checks for non-clipped menus, invariant result position, row height, thumbnail width, mobile hidden columns, URL state, and RTL.

- [ ] **Step 1: Measure the category menu before and after opening**

In `exerciseCatalog()`, after the initial category layout checks, add:

```js
const menuTrigger = page.locator(".joto-mall__category-overflow .joto-mall__select-trigger");
if (await menuTrigger.count()) {
  const resultTopBefore = await page
    .locator(".joto-mall__result-count")
    .evaluate((node) => node.getBoundingClientRect().top);
  await menuTrigger.click();
  const menuLayout = await page
    .locator(".joto-mall__category-overflow .joto-mall__select-menu")
    .evaluate((menu) => {
      const rect = menu.getBoundingClientRect();
      const toolbar = menu.closest(".joto-mall__category-toolbar");
      return {
        visible: !menu.hidden && rect.width > 0 && rect.height > 0,
        withinViewport: rect.left >= 0 && rect.right <= window.innerWidth + 1,
        toolbarOverflow: getComputedStyle(toolbar).overflow,
      };
    });
  const resultTopAfter = await page
    .locator(".joto-mall__result-count")
    .evaluate((node) => node.getBoundingClientRect().top);
  assert(menuLayout.visible, `${label}: more-category menu is not visible`);
  assert(menuLayout.withinViewport, `${label}: more-category menu leaves viewport`);
  assert(menuLayout.toolbarOverflow === "visible", `${label}: menu toolbar clips overflow`);
  assert(
    Math.abs(resultTopAfter - resultTopBefore) <= 1,
    `${label}: opening menu moved results by ${resultTopAfter - resultTopBefore}px`,
  );
  await page.keyboard.press("Escape");
}
```

- [ ] **Step 2: Measure list density after switching view**

Immediately after clicking the list-view button, add:

```js
const denseList = await page.locator(".joto-mall__cards--list").evaluate((list) => {
  const rows = [...list.querySelectorAll(".joto-mall__card")];
  const first = rows[0];
  const media = first?.querySelector(".joto-mall__card-media");
  const type = first?.querySelector(".joto-mall__card-type");
  return {
    rowCount: rows.length,
    rowHeights: rows.slice(0, 8).map((row) => row.getBoundingClientRect().height),
    mediaWidth: media ? media.getBoundingClientRect().width : 0,
    mediaDisplay: media ? getComputedStyle(media).display : "none",
    typeDisplay: type ? getComputedStyle(type).display : "none",
  };
});
assert(denseList.rowCount === 24, `${label}: dense list lost products`);
if (viewport.name === "mobile") {
  assert(denseList.mediaDisplay === "none", `${label}: mobile thumbnail remains visible`);
  assert(denseList.typeDisplay === "none", `${label}: mobile type remains visible`);
  assert(
    denseList.rowHeights.every((height) => height >= 43 && height <= 45),
    `${label}: mobile row heights ${denseList.rowHeights.join(",")}`,
  );
} else {
  assert(
    denseList.rowHeights.every((height) => height >= 44 && height <= 48),
    `${label}: desktop row heights ${denseList.rowHeights.join(",")}`,
  );
  assert(denseList.mediaWidth <= 52, `${label}: thumbnail column is ${denseList.mediaWidth}px`);
}
```

- [ ] **Step 3: Run the local browser matrix**

First confirm the prerequisite:

```bash
command -v npx >/dev/null 2>&1
```

Reuse an existing compatible local preview on `127.0.0.1:3009`; only if none exists, start the repository's established local preview. Then run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dense-list open "http://127.0.0.1:3009/zh/mall/"
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dense-list run-code --filename scripts/verify-mall-browser.mjs
```

Expected: all English/Chinese/Persian desktop, tablet, and mobile catalog cases pass with no page errors, console errors, clipping, or horizontal overflow.

- [ ] **Step 4: Capture focused review screenshots**

Use the same session to capture:

```text
output/playwright/mall-category-menu-desktop.png
output/playwright/mall-dense-list-desktop.png
output/playwright/mall-dense-list-mobile.png
```

Expected: the category menu overlays without whitespace; desktop list resembles a compact table; mobile shows no thumbnail/type column.

- [ ] **Step 5: Commit browser regression coverage**

```bash
git add scripts/verify-mall-browser.mjs
git commit -m "test: verify Mall menu and list density"
```

Do not add generated screenshots to the commit.

---

### Task 5: Version Assets, Run Final Regression, and Prepare Isolated Release

**Files:**
- Modify: `mall/index.html`
- Modify: `mall/products/index.html`
- Modify: `mall/product/index.html`
- Modify: `zh/mall/index.html`
- Modify: `zh/mall/products/index.html`
- Modify: `zh/mall/product/index.html`
- Modify: `fa/mall/index.html`
- Modify: `fa/mall/products/index.html`
- Modify: `fa/mall/product/index.html`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-product-page.js`
- Modify: `assets/contact-form-sections.js`

**Interfaces:**
- Consumes: verified CSS and category JavaScript.
- Produces: cache-isolated Mall assets shared by all nine localized shells and an exact Git commit suitable for immutable deployment.

- [ ] **Step 1: Advance Mall asset versions consistently**

Set:

```js
const version = "20260821-1";
const mallScriptVersion = "20260821-1";
```

in `scripts/verify-mall-catalog-pages.mjs`. In all nine Mall HTML shells, change:

```html
/assets/mall-catalog.css?v=20260805-1
```

to:

```html
/assets/mall-catalog.css?v=20260821-1
```

In the six catalog shells, change `mall-catalog-pages.js?v=20260819-1` to `mall-catalog-pages.js?v=20260821-1`. In the three product shells, change `mall-product-page.js?v=20260819-1` to `mall-product-page.js?v=20260821-1`. Change every maintained internal Mall import in `assets/mall-catalog-pages.js`, `assets/mall-product-page.js`, and `assets/contact-form-sections.js` from `20260819-1` to `20260821-1`, so the entire Mall script graph has one cache version.

- [ ] **Step 2: Run the complete static regression**

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
node --check assets/mall-catalog-pages.js
git diff --check
```

Expected: Mall data and nine-shell contracts pass; site rules still report `114 routes`; syntax and whitespace checks exit `0`.

- [ ] **Step 3: Re-run the browser matrix against cache-isolated URLs**

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dense-list open \
  "http://127.0.0.1:3009/zh/mall/?preview=20260821-1"
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-dense-list run-code --filename scripts/verify-mall-browser.mjs
```

Expected: the complete matrix passes again using the versioned assets.

- [ ] **Step 4: Confirm release scope**

```bash
git status --short
git diff --name-only HEAD
```

Expected: only this plan's Mall assets, nine Mall shells, and Mall verification scripts are staged for the implementation commit. Existing Cisco, brand-film, `.playwright-cli`, `.superpowers`, `output`, and `work` changes remain unstaged/untracked.

- [ ] **Step 5: Commit the release-ready implementation**

```bash
git add assets/mall-catalog.css assets/mall-catalog-pages.js \
  assets/mall-product-page.js assets/contact-form-sections.js \
  mall/index.html mall/products/index.html mall/product/index.html \
  zh/mall/index.html zh/mall/products/index.html zh/mall/product/index.html \
  fa/mall/index.html fa/mall/products/index.html fa/mall/product/index.html \
  scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "fix: refine Mall category and list layout"
```

- [ ] **Step 6: Deploy only after explicit production authorization**

After the user explicitly authorizes production deployment, create the exact archive:

```bash
release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
archive_path="/private/tmp/jotoglobal-${release_id}.tar.gz"
git archive --format=tar.gz --output="$archive_path" HEAD
archive_sha256="$(shasum -a 256 "$archive_path" | awk '{print $1}')"
printf 'release_id=%s\narchive_path=%s\narchive_sha256=%s\n' \
  "$release_id" "$archive_path" "$archive_sha256"
```

Upload the archive with the configured JOTO deployment identity. On the server, substitute the exact printed values and run:

```bash
remote_archive="/tmp/jotoglobal-${release_id}.tar.gz"
release_path="/var/www/jotoglobal/releases/${release_id}"
echo "${archive_sha256}  ${remote_archive}" | sha256sum -c -
test ! -e "$release_path"
mkdir -p "$release_path"
tar -xzf "$remote_archive" -C "$release_path"
cd "$release_path"
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
nginx -t
next_link="/var/www/jotoglobal/current.next.${release_id}"
ln -s "$release_path" "$next_link"
mv -Tf "$next_link" /var/www/jotoglobal/current
systemctl reload nginx
readlink -f /var/www/jotoglobal/current
```

Expected: SHA-256 and both Mall contracts pass, Nginx syntax is successful, and `current` resolves to the new immutable release. Then run the production browser matrix against `https://jotoglobal.com/zh/mall/?release=20260821-1`; verify the menu remains non-clipped and list rows are 44–48px. Preserve all prior release directories for rollback.
