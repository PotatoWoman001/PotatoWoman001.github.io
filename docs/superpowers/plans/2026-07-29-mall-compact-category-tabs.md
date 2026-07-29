# Mall Compact Category Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized Mall category cards with a compact, horizontally scrollable pill navigation across English, Chinese, and Persian Mall homepages.

**Architecture:** Keep the existing catalog data and localized URL flow. Extend the Mall locale copy with two navigation labels, render the compact category track from the existing `normalizedCategories(index)` result, and isolate the compact layout under a dedicated category-section class. Strengthen static and Playwright contracts before implementation, then publish the exact verified Git state as a new immutable Aliyun release.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js ESM contract scripts, Nginx 1.27, Docker, Playwright CLI, SSH/SCP.

## Global Constraints

- The desktop category section target height is approximately `130px` and must remain at or below `180px` in browser verification.
- The category title is `24px`, weight `500`, line-height `1.2`.
- Every category pill is `40px` high, `14px`, weight `500`, single-line, and horizontally non-shrinking.
- Desktop, tablet, and mobile use one horizontal row; the track scrolls internally instead of wrapping.
- English and Chinese are LTR; Persian is RTL while technical category names remain LTR.
- The first “all products” pill uses `#5dd3a0` fill and `#04100b` text.
- Category data, filtering query parameters, search behavior, product cards, details, and crawler output do not change.
- Poppins remains the first font in every Mall language font stack.
- Browser assets advance from `20260729-5` to `20260729-6`.
- Production deployment creates a new release under `/var/www/jotoglobal/releases/` using the resolved `$release_id` and never overwrites an older release.

---

### Task 1: Add failing compact-category contracts

**Files:**
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: current Mall HTML/CSS/JavaScript and the existing Playwright `exerciseCatalog(page, origin, testCase, viewport)` flow.
- Produces: static selectors and runtime measurements required by the compact category implementation.

- [ ] **Step 1: Add static contract assertions**

Add the following assertions after the existing Mall stylesheet assertions in
`scripts/verify-mall-catalog-pages.mjs`:

```js
for (const expected of [
  "joto-mall__section--categories",
  "joto-mall__category--active",
  "locale.allProducts",
  "locale.viewAllProducts",
]) {
  assert.ok(pages.includes(expected), `Mall category renderer missing ${expected}`);
}
for (const expected of [
  "allProducts:",
  "viewAllProducts:",
]) {
  assert.equal(
    [...i18n.matchAll(new RegExp(`^\\\\s*${expected}`, "gm"))].length,
    3,
    `Mall locale copy missing three ${expected} entries`,
  );
}
assert.match(
  styles,
  /\.joto-mall__section--categories\s*\{[\s\S]*padding-block:\s*32px/,
);
assert.match(
  styles,
  /\.joto-mall__category-grid\s*\{[\s\S]*display:\s*flex[\s\S]*overflow-x:\s*auto/,
);
assert.match(
  styles,
  /\.joto-mall__category\s*\{[\s\S]*min-height:\s*40px[\s\S]*font-size:\s*14px/,
);
assert.match(styles, /scrollbar-width:\s*none/);
assert.match(styles, /white-space:\s*nowrap/);
assert.doesNotMatch(
  styles,
  /\.joto-mall__category\s*\{[\s\S]*?min-height:\s*144px[\s\S]*?\}/,
);
```

- [ ] **Step 2: Add Playwright category layout measurements**

In `exerciseCatalog`, immediately after the real-category count assertion, add:

```js
  const categoryLayout = await page
    .locator(".joto-mall__section--categories")
    .evaluate((section) => {
      const track = section.querySelector(".joto-mall__category-grid");
      const links = [...track.querySelectorAll(".joto-mall__category")];
      const first = links[0];
      const last = links.at(-1);
      const trackStyle = getComputedStyle(track);
      return {
        sectionHeight: section.getBoundingClientRect().height,
        display: trackStyle.display,
        flexWrap: trackStyle.flexWrap,
        overflowX: trackStyle.overflowX,
        trackScrollWidth: track.scrollWidth,
        trackClientWidth: track.clientWidth,
        firstHeight: first.getBoundingClientRect().height,
        firstHref: first.getAttribute("href"),
        firstActive: first.classList.contains("joto-mall__category--active"),
        secondHref: links[1]?.getAttribute("href") || "",
        lastHref: last.getAttribute("href"),
        linkCount: links.length,
      };
    });
  assert(
    categoryLayout.sectionHeight <= 180,
    `${testCase.locale}/${viewport.name}: category section is ${categoryLayout.sectionHeight}px tall`,
  );
  assert(
    categoryLayout.display === "flex" && categoryLayout.flexWrap === "nowrap",
    `${testCase.locale}/${viewport.name}: category track is not a single flex row`,
  );
  assert(
    ["auto", "scroll"].includes(categoryLayout.overflowX),
    `${testCase.locale}/${viewport.name}: category track is not horizontally scrollable`,
  );
  assert(
    Math.abs(categoryLayout.firstHeight - 40) <= 1,
    `${testCase.locale}/${viewport.name}: first category pill is ${categoryLayout.firstHeight}px tall`,
  );
  assert(
    categoryLayout.firstHref === productsPath && categoryLayout.lastHref === productsPath,
    `${testCase.locale}/${viewport.name}: all-products links are not localized`,
  );
  assert(
    categoryLayout.firstActive,
    `${testCase.locale}/${viewport.name}: first category pill is not active`,
  );
  assert(
    categoryLayout.secondHref.includes("category="),
    `${testCase.locale}/${viewport.name}: category link lost its filter query`,
  );
  assert(
    categoryLayout.linkCount >= 4,
    `${testCase.locale}/${viewport.name}: category navigation is incomplete`,
  );
  if (viewport.name === "mobile") {
    assert(
      categoryLayout.trackScrollWidth > categoryLayout.trackClientWidth,
      `${testCase.locale}/mobile: category track does not expose horizontal discovery`,
    );
  }
```

- [ ] **Step 3: Run contracts and verify they fail**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL because `joto-mall__section--categories` is not yet rendered.

Run the local browser contract only after the Docker container is rebuilt in
Task 4; its new measurements are expected to fail against the current large
cards.

- [ ] **Step 4: Commit the failing contracts**

```bash
git add scripts/verify-mall-catalog-pages.mjs scripts/verify-mall-browser.mjs
git commit -m "test: define compact Mall category navigation"
```

---

### Task 2: Implement localized compact category pills

**Files:**
- Modify: `assets/mall-i18n.js`
- Modify: `assets/mall-catalog-pages.js`
- Modify: `assets/mall-catalog.css`

**Interfaces:**
- Consumes: `locale.prefix`, `locale.dir`, `normalizedCategories(index)`, and `localizedPath(pathname)`.
- Produces: `.joto-mall__section--categories`, `.joto-mall__category-grid`, `.joto-mall__category--active`, localized first/last product links, and unchanged `category` query links.

- [ ] **Step 1: Add exact localized navigation labels**

Add these keys immediately after `categories` in each locale object in
`assets/mall-i18n.js`:

```js
// en
allProducts: "All products",
viewAllProducts: "View all products",

// zh
allProducts: "全部产品",
viewAllProducts: "查看全部产品",

// fa
allProducts: "همه محصولات",
viewAllProducts: "مشاهده همه محصولات",
```

- [ ] **Step 2: Render the compact navigation structure**

Replace the current category-section construction in
`assets/mall-catalog-pages.js` with:

```js
  const categories = normalizedCategories(index);
  const productsHref = localizedPath("/mall/products/");
  const categorySection = element("section", {
    className: "joto-mall__section joto-mall__section--categories",
  });
  categorySection.append(sectionHeading("", locale.categories));
  const categoryGrid = element("div", {
    className: "joto-mall__category-grid",
    role: "navigation",
    "aria-label": locale.categories,
  });
  categoryGrid.append(
    element("a", {
      href: productsHref,
      className: "joto-mall__category joto-mall__category--active",
      text: locale.allProducts,
    }),
  );
  categories.forEach((category) => {
    const href = `${productsHref}?${new URLSearchParams({
      category: category.name,
    })}`;
    categoryGrid.append(
      element("a", {
        href,
        className: "joto-mall__category",
        text: category.name,
        dir: "ltr",
      }),
    );
  });
  categoryGrid.append(
    element("a", {
      href: productsHref,
      className: "joto-mall__category joto-mall__category--all",
      text: locale.viewAllProducts,
    }),
  );
  if (categories.length) categorySection.append(categoryGrid);
```

- [ ] **Step 3: Split card-grid and category-track styles**

Replace the shared category/card grid block and current category block in
`assets/mall-catalog.css` with:

```css
[data-joto-mall] .joto-mall__section--categories {
  padding-block: 32px;
}

[data-joto-mall] .joto-mall__section--categories .joto-mall__section-heading {
  margin-bottom: 18px;
}

#root [data-joto-mall] .joto-mall__section--categories .joto-mall__section-heading h2 {
  font-size: 24px !important;
  font-weight: 500 !important;
  line-height: 1.2 !important;
}

[data-joto-mall] .joto-mall__category-grid {
  display: flex;
  max-width: 100%;
  gap: 10px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
  scroll-padding-inline: 1px;
  touch-action: pan-x pan-y;
}

[data-joto-mall] .joto-mall__category-grid::-webkit-scrollbar {
  display: none;
}

[data-joto-mall] .joto-mall__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

[data-joto-mall] .joto-mall__category {
  display: inline-flex;
  flex: 0 0 auto;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(93, 211, 160, 0.34);
  border-radius: 999px;
  background: var(--mall-surface);
  padding: 10px 18px;
  color: var(--mall-ink);
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 180ms ease, background-color 180ms ease;
}

[data-joto-mall] .joto-mall__category--active {
  border-color: var(--mall-green);
  background: var(--mall-green);
  color: #04100b;
}

[data-joto-mall] .joto-mall__category:hover,
[data-joto-mall] .joto-mall__category:focus-visible {
  border-color: rgba(93, 211, 160, 0.82);
  background: var(--mall-surface-raised);
}

[data-joto-mall] .joto-mall__category--active:hover,
[data-joto-mall] .joto-mall__category--active:focus-visible {
  border-color: #80d3a5;
  background: #80d3a5;
  color: #04100b;
}
```

In the `max-width: 1023px` and `max-width: 639px` media rules, remove
`.joto-mall__category-grid` from the declarations that set card grids to two
columns and one column. Leave `.joto-mall__cards` and `.joto-mall__filters`
unchanged.

- [ ] **Step 4: Run the static contract**

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected:

```text
Verified nine localized Mall shells, catalog controllers, styling, and local routing.
```

- [ ] **Step 5: Commit the implementation**

```bash
git add assets/mall-i18n.js assets/mall-catalog-pages.js assets/mall-catalog.css
git commit -m "feat: compact Mall category navigation"
```

---

### Task 3: Advance browser asset version and run static regression

**Files:**
- Modify: tracked HTML files containing `20260729-5`
- Modify: `assets/*.js` references containing `20260729-5`
- Modify: `scripts/*.mjs` version constants containing `20260729-5`

**Interfaces:**
- Consumes: the verified `20260729-5` asset graph.
- Produces: cache-isolated `20260729-6` references across all 114 routes and verification scripts.

- [ ] **Step 1: Mechanically advance maintained browser references**

Run:

```bash
git grep -l -z "20260729-5" -- "*.html" "assets/*.js" "scripts/*.mjs" |
  xargs -0 perl -pi -e 's/20260729-5/20260729-6/g'
```

Expected: Mall CSS/JavaScript, shared bundles, homepage refinements, typography,
contact forms, route HTML, and their verifier constants all use
`20260729-6`. Historical design and plan documents remain unchanged.

- [ ] **Step 2: Run all static contracts**

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-site-rules.mjs
node --test scripts/publish-mall-snapshot.test.mjs scripts/verify-mall-snapshot.test.mjs
node scripts/verify-mall-snapshot.mjs \
  "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/20260729T033844Z-run-8"
git diff --check
```

Expected: all contracts pass, site rules report `114 routes`, publisher tests
report two passing tests, and the real snapshot reports `16 products`.

- [ ] **Step 3: Confirm only task files and versioned routes changed**

```bash
git status --short
git diff --stat
```

Expected: `.playwright-cli/` and `.superpowers/` remain untracked and unstaged.
No crawler snapshot data, credentials, or local runtime files are modified.

- [ ] **Step 4: Commit asset versioning**

```bash
git add 404.html assets scripts \
  about blog contact fa index.html mall solutions zh \
  docs/superpowers/plans/2026-07-29-mall-compact-category-tabs.md
git commit -m "chore: version compact Mall category assets"
```

---

### Task 4: Rebuild Docker and verify the three-language browser matrix

**Files:**
- Verify only: committed task files.
- Runtime only: local Docker image `jotoglobal-mall:20260729-6`.

**Interfaces:**
- Consumes: exact committed `20260729-6` site tree and validated Mall snapshot.
- Produces: a local browser result covering layout, links, RTL, reduced motion, and console health.

- [ ] **Step 1: Build the exact local image**

```bash
docker build -f Dockerfile.local -t jotoglobal-mall:20260729-6 .
```

Expected: image build succeeds.

- [ ] **Step 2: Replace only the named local preview container**

```bash
docker rm -f jotoglobal-mall-20260729-6
```

If the container does not yet exist, continue after confirming the error names
only `jotoglobal-mall-20260729-6`.

Run:

```bash
docker run -d \
  --name jotoglobal-mall-20260729-6 \
  -p 127.0.0.1:3009:80 \
  -v "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/20260729T033844Z-run-8:/usr/share/nginx/html/mall-data:ro" \
  jotoglobal-mall:20260729-6
```

Expected: the named container is running on `127.0.0.1:3009`.

- [ ] **Step 3: Run the Playwright matrix**

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-category-local open \
  "http://127.0.0.1:3009/zh/mall/?release=20260729-6"
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-category-local run-code \
  --filename scripts/verify-mall-browser.mjs
```

Expected:

```json
{
  "matrixCases": 10,
  "consoleProblems": [],
  "pageErrors": []
}
```

The completed cases must include English, Chinese, Persian at desktop, tablet,
and mobile plus Persian mobile reduced motion.

- [ ] **Step 4: Capture and inspect desktop and mobile evidence**

Use Playwright CLI to capture:

- Chinese desktop `1440×900` at `/zh/mall/`.
- Persian mobile `390×844` at `/fa/mall/`.

Expected: the category section is compact, desktop pills stay on one row,
mobile pills expose horizontal scrolling, the fixed header does not overlap
content, and RTL starts from the right.

- [ ] **Step 5: Re-run static checks after browser verification**

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
git diff --check
git status --short
git log -3 --oneline
```

Expected: all checks pass and only `.playwright-cli/` and `.superpowers/`
remain untracked.

---

### Task 5: Publish an immutable Aliyun release and verify production

**Files:**
- Verify only: all committed Task 1–4 files.
- Server release: `/var/www/jotoglobal/releases/$release_id`.

**Interfaces:**
- Consumes: the exact Git state that passed local static and Playwright checks.
- Produces: a new immutable production release behind `/var/www/jotoglobal/current`.

- [ ] **Step 1: Build an immutable archive from Git**

```bash
release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
archive_path="/private/tmp/jotoglobal-${release_id}.tar.gz"
git archive --format=tar.gz --output="$archive_path" HEAD
archive_sha256="$(shasum -a 256 "$archive_path" | awk '{print $1}')"
printf 'release_id=%s\narchive_path=%s\narchive_sha256=%s\n' \
  "$release_id" "$archive_path" "$archive_sha256"
```

Expected: output includes one SHA-256 checksum and the archive contains only
tracked files.

- [ ] **Step 2: Upload and verify the archive**

Upload the exact archive while retaining the Step 1 shell variables:

```bash
scp "$archive_path" \
  "root@139.224.51.172:/tmp/jotoglobal-${release_id}.tar.gz"
```

Start a persistent interactive SSH session. Assign `release_id` and
`archive_sha256` to the exact values printed by Step 1, then verify the archive:

```bash
remote_archive="/tmp/jotoglobal-${release_id}.tar.gz"
echo "${archive_sha256}  ${remote_archive}" | sha256sum -c -
```

Expected: `OK`. Credentials must be entered interactively and never written to
the repository, plan, terminal transcript, or final response.

- [ ] **Step 3: Create and validate the new release directory**

On the server:

```bash
release_path="/var/www/jotoglobal/releases/${release_id}"
test ! -e "$release_path"
mkdir -p "$release_path"
tar -xzf "$remote_archive" -C "$release_path"
cd "$release_path"
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
nginx -t
```

Expected: Mall and typography contracts pass, site rules report `114 routes`,
and Nginx syntax is successful.

- [ ] **Step 4: Atomically switch the current release**

On the server:

```bash
next_link="/var/www/jotoglobal/current.next.${release_id}"
ln -s "$release_path" "$next_link"
mv -Tf "$next_link" /var/www/jotoglobal/current
nginx -t
systemctl reload nginx
readlink -f /var/www/jotoglobal/current
```

Expected: the final path equals the new release directory and previous release
directories remain untouched.

- [ ] **Step 5: Run the production Playwright matrix**

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-category-live open \
  "https://jotoglobal.com/zh/mall/?release=20260729-6"
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh \
  --session mall-category-live run-code \
  --filename scripts/verify-mall-browser.mjs
```

Expected: all 10 cases pass, `consoleProblems` and `pageErrors` are empty, and
the final browser origin remains `https://jotoglobal.com`.

- [ ] **Step 6: Final repository and production evidence**

```bash
git status --short
git log -5 --oneline
```

Expected: task changes are committed. Only `.playwright-cli/` and
`.superpowers/` remain untracked. Report the final commit, release directory,
production URL, static verification totals, and Playwright totals.
