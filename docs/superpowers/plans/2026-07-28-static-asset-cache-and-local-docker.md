# Static Asset Cache and Local Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ensure every maintained route loads the approved `Global IT / Service Provider` bundle and corrected Hero layout without stale browser assets, then serve the same maintenance tree from a reproducible local Docker container.

**Architecture:** Keep the maintenance repository as the only content source. Add one idempotent integration script that appends the release version `20260728-1` to the shared main JavaScript and CSS URLs in all 105 formal route indexes plus `404.html`; strengthen the existing site verifier so future releases cannot reuse an unversioned URL. Serve the resulting static tree with an Nginx-based local Docker image and preserve directory-index routing.

**Tech Stack:** Static HTML, Node.js ES modules, Nginx Alpine, Docker, curl, in-app browser.

## Global Constraints

- The header subtitle remains exactly `Global IT` and `Service Provider`.
- `Tech / Shanghai` must not reappear in the maintained shared bundle.
- The desktop title-adjacent Hero CTA remains hidden; only the lower homepage CTA group is visible.
- All 105 formal route indexes load `/assets/index-DaFvN0XI.js?v=20260728-1` and `/assets/index-e49ffBFL.css?v=20260728-1`.
- `404.html` uses the same release version.
- Preview routes and documentation are not production routes and are not rewritten.
- Docker serves files only from this maintenance repository.

---

### Task 1: Lock the versioned shared-asset contract

**Files:**
- Modify: `scripts/verify-site-rules.mjs`
- Test: `scripts/verify-site-rules.mjs`

**Interfaces:**
- Consumes: the existing recursive 105-route collector and shared bundle paths.
- Produces: assertions for `STATIC_ASSET_VERSION = "20260728-1"` on every formal route and `404.html`.

- [x] **Step 1: Add failing version assertions**

Add:

```js
const staticAssetVersion = "20260728-1";
const bundleScriptUrl = `/assets/index-DaFvN0XI.js?v=${staticAssetVersion}`;
const bundleStyleUrl = `/assets/index-e49ffBFL.css?v=${staticAssetVersion}`;
```

For every formal route, require `bundleScriptUrl` and `bundleStyleUrl`. Read `404.html` and require the same URLs.

- [x] **Step 2: Run the verifier and confirm failure**

Run:

```bash
node scripts/verify-site-rules.mjs
```

Expected: failure because existing HTML references do not contain `?v=20260728-1`.

- [x] **Step 3: Keep the existing branding and Hero assertions**

Retain assertions that require:

```text
Global IT
Service Provider
[data-hero-cta-desktop] { display: none !important; }
```

and reject:

```text
Tech
Shanghai
```

- [x] **Step 4: Commit the contract with the integration task**

The verifier and implementation are committed together after Task 2 passes.

---

### Task 2: Version the main JS and CSS on every maintained page

**Files:**
- Create: `scripts/integrate-static-asset-version.mjs`
- Modify: `scripts/integrate-contact-form-sections.mjs`
- Modify: 105 formal `index.html` route files
- Modify: `404.html`

**Interfaces:**
- Consumes: HTML containing `/assets/index-DaFvN0XI.js` and `/assets/index-e49ffBFL.css`, with or without an existing query string.
- Produces: idempotent HTML references ending in `?v=20260728-1`.

- [x] **Step 1: Add the idempotent integration script**

Implement these constants and replacement rules:

```js
const staticAssetVersion = "20260728-1";
const scriptPattern = /\/assets\/index-DaFvN0XI\.js(?:\?v=[^"'<>]+)?/g;
const stylePattern = /\/assets\/index-e49ffBFL\.css(?:\?v=[^"'<>]+)?/g;
const scriptUrl = `/assets/index-DaFvN0XI.js?v=${staticAssetVersion}`;
const styleUrl = `/assets/index-e49ffBFL.css?v=${staticAssetVersion}`;
```

Collect the same 105 formal route indexes as `verify-site-rules.mjs`, append `404.html`, replace both URLs, and fail if either source URL is missing.

- [x] **Step 2: Make the contact integration compatible**

Change its shared-bundle tag patterns so they accept the versioned main bundle:

```js
const bundleScriptPattern =
  /(<script type="module" crossorigin src="\/assets\/index-DaFvN0XI\.js(?:\?v=[^"]+)?"><\/script>)/;
const bundleStylePattern =
  /(<link rel="stylesheet" crossorigin href="\/assets\/index-e49ffBFL\.css(?:\?v=[^"]+)?">)/;
```

- [x] **Step 3: Run the integration**

Run:

```bash
node scripts/integrate-static-asset-version.mjs
```

Expected: `Versioned shared assets across 106 maintained HTML files.`

- [x] **Step 4: Run all static checks**

Run:

```bash
node --check scripts/integrate-static-asset-version.mjs
node --check scripts/integrate-contact-form-sections.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-customer-logo-wall-preview.mjs
git diff --check
```

Expected: all checks pass and the site rule verifier reports 105 routes.

- [x] **Step 5: Commit the cache-safe page update**

```bash
git add scripts/verify-site-rules.mjs scripts/integrate-static-asset-version.mjs \
  scripts/integrate-contact-form-sections.mjs 404.html index.html about blog contact \
  solutions zh fa
git commit -m "fix: version shared assets across maintained pages"
```

---

### Task 3: Serve the maintenance project through local Docker

**Files:**
- Create: `.dockerignore`
- Create: `Dockerfile.local`
- Create: `deploy/local/nginx.conf`

**Interfaces:**
- Consumes: the repository root after Task 2.
- Produces: Docker image `jotoglobal-maintenance:20260728-1` and a local preview at `http://127.0.0.1:3009/zh/`.

- [x] **Step 1: Add the local static image**

`Dockerfile.local`:

```dockerfile
FROM nginx:1.27-alpine
COPY deploy/local/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
```

`.dockerignore`:

```text
.git
.superpowers
docs
Dockerfile.local
```

- [x] **Step 2: Add directory-index routing**

`deploy/local/nginx.conf`:

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ $uri/index.html =404;
  }
}
```

- [x] **Step 3: Build and start Docker**

Run:

```bash
docker build -f Dockerfile.local -t jotoglobal-maintenance:20260728-1 .
docker run --rm -d --name jotoglobal-local-20260728 \
  -p 127.0.0.1:3009:80 jotoglobal-maintenance:20260728-1
```

Expected: the container is running and bound only to local port `3009`.

- [x] **Step 4: Verify representative routes and assets**

Run:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/zh/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/fa/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/zh/solutions/network/
```

Expected: four `200` responses.

- [x] **Step 5: Open and visually verify the local Docker page**

Open `http://127.0.0.1:3009/zh/#top` in the visible in-app browser. Verify:

- header subtitle is `Global IT / Service Provider`;
- the title-adjacent desktop Hero CTA is hidden;
- the lower `查看解决方案 / 联系我们` group is present;
- no horizontal overflow or console errors appear.

- [x] **Step 6: Commit the Docker preview configuration**

```bash
git add .dockerignore Dockerfile.local deploy/local/nginx.conf \
  docs/superpowers/plans/2026-07-28-static-asset-cache-and-local-docker.md
git commit -m "chore: add local Docker preview"
```
