# JOTO Global Mall Catalog Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three localized Mall placeholders with a production catalog that consumes immutable, price-free snapshots from the tested crawler and publishes every successfully completed crawl to Aliyun without making the website depend on the Mac Mini being online.

**Architecture:** The crawler repository gains a one-shot snapshot builder that reads only a completed crawl run and writes a versioned static bundle containing a manifest, compact catalog index, per-product JSON, images, documents, and a generated Mall sitemap. The website repository gains a same-origin Mall data client plus separate home, list, and detail controllers styled with the existing JOTO design system. A host-side publisher validates each bundle twice, uploads it into `/var/www/jotoglobal/catalog-releases/`, and atomically switches `/var/www/jotoglobal/catalog-current`.

**Tech Stack:** Python 3.12, SQLAlchemy, existing crawler models and sanitizers, Node.js ESM without new packages, static HTML/CSS/JavaScript, Nginx 1.27, Docker, Playwright, SSH/rsync.

## Global Constraints

- Website repository: `/Users/cuihua/Documents/JOTO global ｜ 维护入口`.
- Crawler repository: `/Users/cuihua/Documents/jotoglobal 信息获取站`.
- Preserve all user-owned dirty changes in the crawler repository; stage and commit only exact task files.
- Do not modify the compiled React bundle `assets/index-DaFvN0XI.js`.
- Use `joto-mall-v1` as the exact snapshot schema version.
- Interface copy is localized for English, Simplified Chinese, and Persian.
- Product titles, models, brands, descriptions, specifications, and document titles remain in English.
- Persian pages remain RTL; product technical blocks explicitly use `dir="ltr"`.
- Never expose or include price, list price, discount, currency, cart, checkout, or payment data.
- The public call to action is Contact Us; no shopping cart or online payment.
- Only non-smoke crawl runs with `status == completed` are publishable.
- A failed build, upload, checksum check, or server validation must leave the current online catalog unchanged.
- Catalog releases and website releases are separate, immutable, and independently reversible.
- All changed browser assets receive one new shared cache version.
- Product technical content must never be invented when a source field is empty.
- Deployment secrets, SSH keys, passwords, and server credentials stay outside Git.

---

### Task 1: Add the snapshot contract and deterministic validator

**Files — website repository:**

- Create: `fixtures/mall-snapshot-v1/manifest.json`
- Create: `fixtures/mall-snapshot-v1/data/catalog-index.json`
- Create: `fixtures/mall-snapshot-v1/data/categories.json`
- Create: `fixtures/mall-snapshot-v1/data/brands.json`
- Create: `fixtures/mall-snapshot-v1/data/products/c881-k9.json`
- Create: `fixtures/mall-snapshot-v1/media/images/c881-k9.svg`
- Create: `scripts/mall-snapshot-contract.mjs`
- Create: `scripts/verify-mall-snapshot.mjs`
- Create: `scripts/verify-mall-snapshot.test.mjs`

**Interfaces:**

- Produces: `SNAPSHOT_SCHEMA_VERSION = "joto-mall-v1"`.
- Produces: `validateMallSnapshot(rootDirectory) -> Promise<{ manifest, products, categories, brands }>`; throws an `Error` with a stable message on any contract violation.
- Produces: `collectForbiddenCommercePaths(value, path = "$") -> string[]`.
- Produces: a committed one-product, zero-price fixture used by browser and static tests.

- [ ] **Step 1: Write the failing validator test**

Create `scripts/verify-mall-snapshot.test.mjs` with these exact cases:

```js
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateMallSnapshot } from "./mall-snapshot-contract.mjs";

const fixture = path.resolve("fixtures/mall-snapshot-v1");

await validateMallSnapshot(fixture);

const unsafe = await mkdtemp(path.join(os.tmpdir(), "joto-mall-unsafe-"));
await cp(fixture, unsafe, { recursive: true });
const productPath = path.join(unsafe, "data/products/c881-k9.json");
const product = JSON.parse(await readFile(productPath, "utf8"));
product.price = "100";
await writeFile(productPath, JSON.stringify(product));
await assert.rejects(
  validateMallSnapshot(unsafe),
  /forbidden commerce field at \$\.price/,
);

const missing = await mkdtemp(path.join(os.tmpdir(), "joto-mall-missing-"));
await cp(fixture, missing, { recursive: true });
const manifestPath = path.join(missing, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.record_count = 2;
await writeFile(manifestPath, JSON.stringify(manifest));
await assert.rejects(
  validateMallSnapshot(missing),
  /record_count 2 does not match 1 product files/,
);

console.log("Verified Mall snapshot contract failure modes.");
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd "/Users/cuihua/Documents/JOTO global ｜ 维护入口"
node scripts/verify-mall-snapshot.test.mjs
```

Expected: non-zero exit with `ERR_MODULE_NOT_FOUND` for `mall-snapshot-contract.mjs`.

- [ ] **Step 3: Create the fixture and contract validator**

The fixture must contain one sanitized Cisco product with:

```json
{
  "id": 1,
  "slug": "c881-k9",
  "title": "Cisco C881-K9 Integrated Services Router",
  "brand": "Cisco",
  "model": "C881-K9",
  "category_path": ["Network", "Routers"],
  "stock_status": null,
  "condition": "Original New",
  "demand_tags": ["Branch networking"],
  "rating": null,
  "review_count": null,
  "summary": "Compact integrated services router for branch environments.",
  "description_html": "<p>Integrated routing for branch environments.</p>",
  "application_scenarios": [],
  "specifications": {"WAN interfaces": "2", "LAN interfaces": "4"},
  "images": ["/mall-data/media/images/c881-k9.svg"],
  "documents": [],
  "related_products": [],
  "source_url": "https://www.router-switch.com/c881-k9-p-1.html",
  "first_seen_at": "2026-07-29T00:00:00Z",
  "last_success_at": "2026-07-29T00:00:00Z",
  "effective_status": "active"
}
```

Implement `mall-snapshot-contract.mjs` with:

```js
export const SNAPSHOT_SCHEMA_VERSION = "joto-mall-v1";
export const FORBIDDEN_COMMERCE_KEYS = new Set([
  "price", "list_price", "discount", "currency", "cart_url",
  "add_to_cart", "checkout", "payment",
]);

export function collectForbiddenCommercePaths(value, currentPath = "$") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenCommercePaths(item, `${currentPath}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${currentPath}.${key}`;
    const own = FORBIDDEN_COMMERCE_KEYS.has(key.toLowerCase())
      ? [childPath]
      : [];
    return [...own, ...collectForbiddenCommercePaths(child, childPath)];
  });
}
```

`validateMallSnapshot()` must also verify:

- manifest schema version;
- manifest file checksums using SHA-256;
- record, category, brand, image, and document counts;
- unique product IDs and slugs;
- unique source URLs;
- referenced images and documents exist under the snapshot root;
- related product slugs exist;
- every public path begins with `/mall-data/`;
- no symlink escapes the snapshot root;
- JSON parses without duplicate task-level files.

- [ ] **Step 4: Run validator tests**

Run:

```bash
node --check scripts/mall-snapshot-contract.mjs
node --check scripts/verify-mall-snapshot.mjs
node scripts/verify-mall-snapshot.test.mjs
node scripts/verify-mall-snapshot.mjs fixtures/mall-snapshot-v1
```

Expected: all commands exit `0`; final output includes `Validated joto-mall-v1 snapshot with 1 product.`

- [ ] **Step 5: Commit the contract**

```bash
git add fixtures/mall-snapshot-v1 scripts/mall-snapshot-contract.mjs scripts/verify-mall-snapshot.mjs scripts/verify-mall-snapshot.test.mjs
git commit -m "test: define mall snapshot contract"
```

---

### Task 2: Build immutable snapshots from completed crawler runs

**Files — crawler repository:**

- Create: `app/services/mall_snapshot.py`
- Create: `scripts/build_jotoglobal_snapshot.py`
- Create: `tests/test_mall_snapshot.py`

**Interfaces:**

- Consumes: crawler `Settings`, `CrawlRun`, `Product`, `Category`, `CatalogService`, `sanitize_description_html`, image and document records.
- Produces: `latest_publishable_run(session) -> CrawlRun | None`.
- Produces: `build_mall_snapshot(session, settings, output_root, run_id=None) -> SnapshotBuildResult`.
- Produces: `SnapshotBuildResult(version: str, root: Path, run_id: int, record_count: int, reused: bool)`.
- Produces: one immutable directory named `<UTC timestamp>-run-<run id>`.

- [ ] **Step 1: Write failing Python tests**

Create `tests/test_mall_snapshot.py`. Reuse the existing `seeded_product`
fixture and define these module-local helpers first so the test file is
self-contained:

```python
@pytest.fixture
def snapshot_settings(tmp_path):
    image_dir = tmp_path / "images"
    document_dir = tmp_path / "documents"
    image_dir.mkdir()
    document_dir.mkdir()
    return Settings(
        database_url="sqlite://",
        image_dir=image_dir,
        document_dir=document_dir,
        testing=True,
    )


def completed_run(db_session):
    run = CrawlRun(
        kind=RunKind.FULL,
        status=RunStatus.COMPLETED,
        finished_at=utc_now(),
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run


@pytest.fixture
def seeded_product_with_image(db_session, seeded_product, snapshot_settings):
    source = snapshot_settings.image_dir / "fixture.jpg"
    source.write_bytes(b"fixture-image")
    seeded_product.images.append(ProductImage(
        source_url="https://example.com/fixture.jpg",
        local_path=str(source),
        content_hash=hashlib.sha256(source.read_bytes()).hexdigest(),
        media_type="image/jpeg",
        position=0,
        is_primary=True,
    ))
    db_session.commit()
    return seeded_product


def test_only_completed_non_smoke_run_is_publishable(db_session):
    queued = CrawlRun(kind=RunKind.INCREMENTAL, status=RunStatus.QUEUED)
    smoke = CrawlRun(kind=RunKind.SMOKE, status=RunStatus.COMPLETED)
    completed = CrawlRun(
        kind=RunKind.FULL,
        status=RunStatus.COMPLETED,
        finished_at=utc_now(),
    )
    db_session.add_all([queued, smoke, completed])
    db_session.commit()
    assert latest_publishable_run(db_session).id == completed.id


def test_snapshot_contains_manifest_index_detail_and_media(
    db_session, snapshot_settings, tmp_path, seeded_product_with_image
):
    run = completed_run(db_session)
    result = build_mall_snapshot(
        db_session,
        snapshot_settings,
        tmp_path,
        run_id=run.id,
    )
    manifest = json.loads((result.root / "manifest.json").read_text())
    assert manifest["schema_version"] == "joto-mall-v1"
    assert manifest["crawl_run_id"] == run.id
    assert manifest["record_count"] == 1
    assert (result.root / "data/products/c881-k9.json").is_file()
    assert list((result.root / "media/images").iterdir())


def test_snapshot_rejects_commerce_content(
    db_session, snapshot_settings, tmp_path, seeded_product
):
    with pytest.raises(ValueError):
        seeded_product.specifications = {"price": "100"}
    seeded_product.summary = "Contact us for price"
    db_session.commit()
    with pytest.raises(CommerceDataError):
        build_mall_snapshot(db_session, snapshot_settings, tmp_path)


def test_same_run_is_idempotent(
    db_session, snapshot_settings, tmp_path, seeded_product
):
    run = completed_run(db_session)
    first = build_mall_snapshot(
        db_session, snapshot_settings, tmp_path, run_id=run.id
    )
    second = build_mall_snapshot(
        db_session, snapshot_settings, tmp_path, run_id=run.id
    )
    assert second.root == first.root
    assert second.reused is True
```

The commerce test exercises both layers: the existing SQLAlchemy model
validator rejects the forbidden JSON key at assignment time, and the snapshot
builder rejects forbidden commerce wording that reaches a plain-text field.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
cd "/Users/cuihua/Documents/jotoglobal 信息获取站"
.venv/bin/pytest tests/test_mall_snapshot.py -q
```

Expected: collection failure because `app.services.mall_snapshot` does not exist.

- [ ] **Step 3: Implement `mall_snapshot.py`**

Use a temporary sibling directory and `Path.replace()` for local atomic completion.
The core public signatures must be:

```python
SNAPSHOT_SCHEMA_VERSION = "joto-mall-v1"

@dataclass(frozen=True)
class SnapshotBuildResult:
    version: str
    root: Path
    run_id: int
    record_count: int
    reused: bool

def latest_publishable_run(session: Session) -> CrawlRun | None: ...

def build_mall_snapshot(
    session: Session,
    settings: Settings,
    output_root: Path,
    *,
    run_id: int | None = None,
    now: datetime | None = None,
) -> SnapshotBuildResult: ...
```

Implementation rules:

- select only `RunStatus.COMPLETED` and `RunKind != SMOKE`;
- load only `CatalogService.visible_products_statement()`;
- use `selectinload(Product.images)`, `documents`, and `categories`;
- sanitize `description_html` again;
- call existing `assert_no_commerce_content()` on index, every detail, and manifest;
- copy media by content hash, never by source filename;
- resolve every source `local_path` and require it to remain inside `settings.image_dir` or `settings.document_dir`;
- write JSON using UTF-8, sorted keys, and deterministic separators;
- compute SHA-256 after every file is finalized;
- generate `mall-sitemap.xml` with English, Chinese, Persian, and x-default alternates;
- do not overwrite an existing version for the same run;
- write `latest-ready.json` only after the complete directory is finalized.

- [ ] **Step 4: Implement the one-shot CLI**

Create `scripts/build_jotoglobal_snapshot.py` as a single-command Typer CLI:

```python
from pathlib import Path
import json
import typer
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.db import create_engine_from_settings
from app.services.mall_snapshot import build_mall_snapshot

def main(
    output_root: Path = typer.Option(..., "--output-root"),
    run_id: int | None = typer.Option(None, "--run-id"),
) -> None:
    settings = get_settings()
    engine = create_engine_from_settings(settings)
    with sessionmaker(engine)() as session:
        result = build_mall_snapshot(
            session, settings, output_root, run_id=run_id
        )
    typer.echo(json.dumps({
        "version": result.version,
        "root": str(result.root),
        "run_id": result.run_id,
        "record_count": result.record_count,
        "reused": result.reused,
    }, separators=(",", ":")))

if __name__ == "__main__":
    typer.run(main)
```

- [ ] **Step 5: Run focused and full crawler tests**

Run:

```bash
.venv/bin/pytest tests/test_mall_snapshot.py -q
.venv/bin/pytest -q
```

Expected: focused tests pass; full suite remains green.

- [ ] **Step 6: Build a real local snapshot from the current completed run**

Rebuild the image so the new script exists, then run it through the existing `ops` profile:

```bash
docker compose build
docker compose --profile ops run --rm --no-deps ops \
  python scripts/build_jotoglobal_snapshot.py \
  --output-root /app/data/exports/jotoglobal
```

Expected: JSON output contains a completed non-smoke run ID and `record_count >= 15`; the source database is unchanged.

- [ ] **Step 7: Validate the real snapshot with the website validator**

```bash
cd "/Users/cuihua/Documents/JOTO global ｜ 维护入口"
node scripts/verify-mall-snapshot.mjs \
  "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/<version>"
```

Expected: validation passes with no forbidden commerce paths.

- [ ] **Step 8: Commit only new crawler snapshot files**

The crawler worktree is dirty. Stage only these paths:

```bash
git add app/services/mall_snapshot.py scripts/build_jotoglobal_snapshot.py tests/test_mall_snapshot.py
git diff --cached --check
git commit -m "feat: build jotoglobal mall snapshots"
```

---

### Task 3: Add the idempotent host-side publisher and automatic trigger

**Files — website repository:**

- Create: `scripts/publish-mall-snapshot.mjs`
- Create: `scripts/publish-mall-snapshot.test.mjs`
- Create: `scripts/run-mall-publication.sh`
- Create: `deploy/mall-publisher/com.joto.mall-publisher.plist.template`
- Create: `deploy/mall-publisher/publisher.env.example`
- Create: `docs/mall-catalog-operations.md`

**Interfaces:**

- Consumes: a validated snapshot directory and environment-only SSH settings.
- Produces: remote immutable catalog release and an atomic `catalog-current` switch.
- Produces: local state file `<crawler>/data/exports/jotoglobal/published-state.json`.
- Produces: `publishSnapshot({ snapshotRoot, statePath, dryRun, runner })`.

- [ ] **Step 1: Write the failing publisher tests**

Create tests with an injected command runner:

```js
const calls = [];
const runner = async (command, args) => {
  calls.push([command, args]);
  return { status: 0, stdout: "", stderr: "" };
};

const first = await publishSnapshot({
  snapshotRoot: fixture,
  statePath,
  dryRun: false,
  runner,
  remote: {
    host: "139.224.51.172",
    user: "joto-mall-deploy",
    releaseRoot: "/var/www/jotoglobal/catalog-releases",
    currentLink: "/var/www/jotoglobal/catalog-current",
  },
});
assert.equal(first.published, true);
assert.ok(calls.some(([command]) => command === "rsync"));
assert.ok(calls.some(([command]) => command === "ssh"));

const second = await publishSnapshot({
  snapshotRoot: fixture,
  statePath,
  dryRun: false,
  runner,
  remote,
});
assert.equal(second.published, false);
assert.equal(second.reason, "already-published");
```

Also assert:

- validator runs before any network command;
- a failed rsync does not write the state file;
- a failed remote verification does not call the symlink switch;
- `--dry-run` prints commands without executing them;
- passwords never appear in arguments or state.

- [ ] **Step 2: Run the publisher test and verify it fails**

```bash
node scripts/publish-mall-snapshot.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `publish-mall-snapshot.mjs`.

- [ ] **Step 3: Implement the publisher**

`publish-mall-snapshot.mjs` must:

1. call `validateMallSnapshot(snapshotRoot)`;
2. derive the remote version from `manifest.generated_at` and `crawl_run_id`;
3. `rsync --archive --checksum --delay-updates` into
   `catalog-releases/.incoming-<version>`;
4. run the remote website copy of `verify-mall-snapshot.mjs`;
5. rename the incoming directory to `catalog-releases/<version>`;
6. create `catalog-current.next`;
7. atomically rename `catalog-current.next` to `catalog-current`;
8. verify `/mall-data/manifest.json` through HTTPS;
9. write the local state only after the HTTPS verification passes.

Use `spawn()` argument arrays; do not build a shell command from untrusted values.
The CLI accepts:

```text
--snapshot-root <absolute path>
--state-path <absolute path>
--dry-run
```

Required environment variables:

```text
JOTO_MALL_DEPLOY_HOST=139.224.51.172
JOTO_MALL_DEPLOY_USER=joto-mall-deploy
JOTO_MALL_DEPLOY_KEY=/absolute/path/to/private-key
JOTO_MALL_REMOTE_RELEASE_ROOT=/var/www/jotoglobal/catalog-releases
JOTO_MALL_REMOTE_CURRENT_LINK=/var/www/jotoglobal/catalog-current
```

- [ ] **Step 4: Implement the one-command publication runner**

`scripts/run-mall-publication.sh` must:

- use `set -euo pipefail`;
- lock with `mkdir <state-dir>/publication.lock` and remove only its own lock on exit;
- run the crawler snapshot builder through the existing `ops` container;
- invoke `python scripts/build_jotoglobal_snapshot.py --output-root
  /app/data/exports/jotoglobal` without a subcommand;
- read the absolute snapshot path from `latest-ready.json`;
- call the Node publisher;
- log one JSON line with run ID, version, result, and timestamp;
- leave the last online version untouched on any non-zero exit.

The script must not contain a password or private-key body.

- [ ] **Step 5: Add the LaunchAgent template**

The plist runs `run-mall-publication.sh` every 60 seconds with:

```xml
<key>StartInterval</key>
<integer>60</integer>
<key>RunAtLoad</key>
<true/>
```

It uses absolute project paths substituted by an install command documented in
`docs/mall-catalog-operations.md`. The default installation instructions keep
the agent unloaded until manual snapshot, dry-run, real publish, and rollback
tests pass.

- [ ] **Step 6: Test the publisher without network writes**

```bash
node --check scripts/publish-mall-snapshot.mjs
node scripts/publish-mall-snapshot.test.mjs
JOTO_MALL_DEPLOY_HOST=139.224.51.172 \
JOTO_MALL_DEPLOY_USER=joto-mall-deploy \
JOTO_MALL_DEPLOY_KEY=/private/tmp/nonexistent \
JOTO_MALL_REMOTE_RELEASE_ROOT=/var/www/jotoglobal/catalog-releases \
JOTO_MALL_REMOTE_CURRENT_LINK=/var/www/jotoglobal/catalog-current \
node scripts/publish-mall-snapshot.mjs \
  --snapshot-root fixtures/mall-snapshot-v1 \
  --state-path /private/tmp/joto-mall-publisher-dry-state.json \
  --dry-run
```

Expected: tests pass; dry-run prints the immutable release and atomic switch sequence without opening a network connection.

- [ ] **Step 7: Commit publisher code**

```bash
git add scripts/publish-mall-snapshot.mjs scripts/publish-mall-snapshot.test.mjs scripts/run-mall-publication.sh deploy/mall-publisher docs/mall-catalog-operations.md
git commit -m "feat: publish immutable mall catalog snapshots"
```

---

### Task 4: Refactor Mall navigation and add the shared data client

**Files — website repository:**

- Modify: `assets/mall-navigation-and-page.js`
- Create: `assets/mall-data-client.js`
- Create: `assets/mall-i18n.js`
- Create: `scripts/verify-mall-data-client.mjs`

**Interfaces:**

- `mall-navigation-and-page.js` continues to inject the localized Mall link only.
- `mall-data-client.js` exports:

```js
export async function loadManifest({ signal } = {});
export async function loadCatalogIndex({ signal } = {});
export async function loadProduct(slug, { signal } = {});
export function queryProducts(index, state);
export function parseCatalogState(searchParams);
export function serializeCatalogState(state);
```

- `mall-i18n.js` exports `getMallLocale(pathname)` and immutable `MALL_COPY`.

- [ ] **Step 1: Write failing static assertions**

`verify-mall-data-client.mjs` must assert:

- the navigation module no longer contains `mallMarkup()` or placeholder copy;
- the navigation module still contains all three labels, paths, mutation observer, and `aria-current`;
- data requests use only `/mall-data/`;
- manifest schema mismatch raises a localized unavailable state;
- `queryProducts()` handles q, category, brand, status, condition, sort, direction, page, page size, and view;
- brand facets with zero items are omitted;
- empty optional fields remain empty and are not replaced with invented text;
- Persian copy exists and technical content has an LTR helper.

- [ ] **Step 2: Run static assertions and verify failure**

```bash
node scripts/verify-mall-data-client.mjs
```

Expected: non-zero exit because the new modules do not exist and placeholder
rendering still exists in the navigation module.

- [ ] **Step 3: Implement the locale module**

Define exact locale keys:

```js
export const MALL_COPY = Object.freeze({
  en: {
    lang: "en", dir: "ltr", prefix: "",
    mall: "Mall", products: "Products", search: "Search products",
    viewDetails: "View details", contact: "Contact Us",
  },
  zh: {
    lang: "zh-CN", dir: "ltr", prefix: "/zh",
    mall: "商城", products: "产品", search: "搜索产品",
    viewDetails: "查看详情", contact: "联系我们",
  },
  fa: {
    lang: "fa-IR", dir: "rtl", prefix: "/fa",
    mall: "فروشگاه", products: "محصولات", search: "جستجوی محصولات",
    viewDetails: "مشاهده جزئیات", contact: "تماس با ما",
  },
});
```

Add every visible string used by Tasks 5 and 6 to this object before rendering;
do not hard-code interface copy inside page controllers.

- [ ] **Step 4: Implement the data client**

Rules:

- fetch manifest first with `{ cache: "no-cache" }`;
- fetch versioned JSON with normal HTTP caching;
- validate `schema_version === "joto-mall-v1"`;
- use `AbortController` for navigation changes;
- never use `innerHTML` for product text;
- return new arrays without mutating snapshot records;
- normalize search with Unicode `NFKC` and lowercase matching;
- clamp page and page size;
- keep stable secondary sort by slug;
- return one error type `MallDataError(code, cause)`.

- [ ] **Step 5: Reduce the navigation module to navigation responsibilities**

Keep `injectMallLinks()`, locale path detection, idempotency, and the bounded
mutation observer. Remove Mall placeholder rendering and Mall-page SEO mutation.
The formal Mall controllers take over page content and SEO.

- [ ] **Step 6: Run checks**

```bash
node --check assets/mall-navigation-and-page.js
node --check assets/mall-data-client.js
node --check assets/mall-i18n.js
node scripts/verify-mall-data-client.mjs
```

Expected: all commands pass.

- [ ] **Step 7: Commit the data layer**

```bash
git add assets/mall-navigation-and-page.js assets/mall-data-client.js assets/mall-i18n.js scripts/verify-mall-data-client.mjs
git commit -m "feat: add mall catalog data client"
```

---

### Task 5: Build Mall home, product list, and product detail pages

**Files — website repository:**

- Create: `assets/mall-catalog.css`
- Create: `assets/mall-catalog-pages.js`
- Create: `assets/mall-product-page.js`
- Modify: `scripts/integrate-site-typography-mall.mjs`
- Modify: `scripts/verify-site-typography-mall.mjs`
- Create through integrator: `mall/products/index.html`
- Create through integrator: `zh/mall/products/index.html`
- Create through integrator: `fa/mall/products/index.html`
- Create through integrator: `mall/product/index.html`
- Create through integrator: `zh/mall/product/index.html`
- Create through integrator: `fa/mall/product/index.html`
- Modify: `deploy/local/nginx.conf`
- Create: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**

- Mall home controller mounts into `[data-joto-mall-home]`.
- Product list controller mounts into `[data-joto-mall-products]`.
- Product detail controller mounts into `[data-joto-mall-product]`.
- Product detail slug comes from `/mall/products/<slug>/`, not query text.
- Product controller emits `joto:mall-product-ready` with `{ slug, title, model }`.

- [ ] **Step 1: Write failing page integration assertions**

`verify-mall-catalog-pages.mjs` must require:

- nine Mall route shells total: three home, three product-list, three generic product fallbacks;
- home/list shells load `mall-catalog.css` and `mall-catalog-pages.js`;
- product shells load `mall-catalog.css` and `mall-product-page.js`;
- all browser assets use one new cache version;
- route count increases from 108 to 114;
- three language routes use exact lang/dir values;
- no placeholder copy remains;
- all data reads use `/mall-data/`;
- product detail URLs use localized stable slugs;
- missing optional fields are guarded before markup is created;
- all product text is inserted through text nodes or `textContent`;
- no transaction words appear in interface copy.

- [ ] **Step 2: Run integration assertions and verify failure**

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: non-zero exit because the catalog controllers, stylesheet, and six
additional shells do not exist.

- [ ] **Step 3: Extend the deterministic route integrator**

Add route descriptors:

```js
const mallCatalogRoutes = [
  ["about/index.html", "mall/index.html", "en", "ltr", "home"],
  ["zh/about/index.html", "zh/mall/index.html", "zh-CN", "ltr", "home"],
  ["fa/about/index.html", "fa/mall/index.html", "fa-IR", "rtl", "home"],
  ["about/index.html", "mall/products/index.html", "en", "ltr", "products"],
  ["zh/about/index.html", "zh/mall/products/index.html", "zh-CN", "ltr", "products"],
  ["fa/about/index.html", "fa/mall/products/index.html", "fa-IR", "rtl", "products"],
  ["about/index.html", "mall/product/index.html", "en", "ltr", "product"],
  ["zh/about/index.html", "zh/mall/product/index.html", "zh-CN", "ltr", "product"],
  ["fa/about/index.html", "fa/mall/product/index.html", "fa-IR", "rtl", "product"],
];
```

Generate semantic empty mount sections with a localized loading status. Keep the
shared React header/footer shell and never edit the compiled bundle.

- [ ] **Step 4: Implement the confirmed option A homepage**

Render in this order:

1. eyebrow and T1 Hero title;
2. localized introduction;
3. product search;
4. top-level categories;
5. recently indexed products;
6. application scenarios only when present;
7. Contact JOTO panel.

Use the existing JOTO grid background and shared typography variables. Use
responsive columns `3 → 2 → 1`; preserve text boundaries and RTL mirroring.

- [ ] **Step 5: Implement the product list**

The controller must:

- parse URL state;
- render only facets that have values;
- update the URL with `history.pushState`;
- handle `popstate`;
- announce result counts with `aria-live="polite"`;
- preserve grid/list choice;
- render pagination;
- scroll only the result heading into view after page changes;
- avoid full-page rerenders during pointer movement.

- [ ] **Step 6: Implement the product detail**

Render:

- breadcrumb;
- gallery and keyboard-operable thumbnails;
- title, brand, model, status, condition, and rating only when present;
- Contact Us link with locale and slug;
- Overview, Specifications, Downloads, Source, Related Products;
- mobile sticky contact action;
- localized unavailable and not-found states.

Set technical wrappers to `dir="ltr"` on all languages. Sanitize
`description_html` by parsing into a detached template and allowing only:

```text
p, ul, ol, li, strong, em, br, h2, h3, table, thead, tbody, tr, th, td
```

Strip all attributes except `colspan` and `rowspan` numeric values.

- [ ] **Step 7: Implement scoped Mall CSS**

All selectors begin under `[data-joto-mall]`. Required responsive checks:

- desktop 1440;
- tablet 768;
- mobile 390;
- no width below 320;
- no product-card height animation;
- image hover uses at most `transform: scale(1.015)`;
- `prefers-reduced-motion` disables decorative movement;
- focus-visible meets existing green contrast;
- product images use `aspect-ratio` and `object-fit: contain`.

- [ ] **Step 8: Add local Nginx product fallbacks and snapshot mount**

Add exact fallback locations before the general `/` location:

```nginx
location ~ ^/zh/mall/products/[^/]+/?$ {
  try_files $uri $uri/ /zh/mall/product/index.html;
}
location ~ ^/fa/mall/products/[^/]+/?$ {
  try_files $uri $uri/ /fa/mall/product/index.html;
}
location ~ ^/mall/products/[^/]+/?$ {
  try_files $uri $uri/ /mall/product/index.html;
}
location ^~ /mall-data/ {
  alias /usr/share/nginx/html/mall-data/;
  autoindex off;
}
```

During local Docker runs, bind-mount the generated real snapshot directory to
`/usr/share/nginx/html/mall-data:ro`.

- [ ] **Step 9: Run route integration and static checks**

```bash
node scripts/integrate-site-typography-mall.mjs
node scripts/integrate-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
git diff --check
```

Expected: integration is idempotent; route count is 114; all checks pass.

- [ ] **Step 10: Commit the page layer**

```bash
git add assets/mall-catalog.css assets/mall-catalog-pages.js assets/mall-product-page.js deploy/local/nginx.conf scripts/integrate-site-typography-mall.mjs scripts/verify-site-typography-mall.mjs scripts/verify-mall-catalog-pages.mjs mall zh/mall fa/mall
git commit -m "feat: build localized mall catalog pages"
```

---

### Task 6: Prefill the existing Contact form and finish SEO

**Files — website repository:**

- Modify: `assets/contact-form-sections.js`
- Modify: `assets/contact-form-sections.css`
- Modify: `scripts/verify-contact-form-sections.mjs`
- Modify: `assets/mall-product-page.js`
- Modify: `robots.txt`
- Modify: `sitemap.xml`
- Modify: `scripts/integrate-site-typography-mall.mjs`
- Modify: `scripts/verify-mall-catalog-pages.mjs`

**Interfaces:**

- Consumes: `?product=<slug>` and the current snapshot product record.
- Produces: a localized, editable project-requirement prefill.
- Produces: dynamic product title, description, canonical, Open Graph, and alternate links.
- Produces: `/mall-sitemap.xml` from the active snapshot.

- [ ] **Step 1: Extend the failing contact verification**

Add assertions that:

- a single safe slug is accepted;
- duplicate `product` parameters are ignored;
- slugs outside `[a-z0-9-]{1,500}` are ignored;
- the requirement field receives a localized prefix plus exact product title and model;
- the form remains editable;
- no data is submitted until the user presses the existing submit button;
- `/api/contact` remains unchanged.

- [ ] **Step 2: Run verification and confirm failure**

```bash
node scripts/verify-contact-form-sections.mjs
```

Expected: the new product-prefill assertions fail.

- [ ] **Step 3: Implement safe prefill**

On Contact routes:

1. parse one product slug;
2. call `loadProduct(slug)`;
3. format:

```text
EN: Product inquiry: <title> (<model>)
ZH: 产品咨询：<title>（<model>）
FA: درخواست محصول: <title> (<model>)
```

4. set the project-requirement field only when it is empty;
5. dispatch an `input` event so React/form state stays synchronized;
6. do not auto-submit, focus, or scroll.

- [ ] **Step 4: Implement detail SEO**

After product load:

- set localized `document.title`;
- set a localized description using title, brand, model, and category;
- set canonical for the current locale and slug;
- set three alternates plus x-default;
- set Open Graph type `product` without any price properties;
- set JSON-LD type `Product` with name, image, brand/model only when present;
- omit `offers`, price, availability promises, review aggregate, and SKU when absent.

Update `robots.txt` to list:

```text
Sitemap: https://jotoglobal.com/sitemap.xml
Sitemap: https://jotoglobal.com/mall-sitemap.xml
```

- [ ] **Step 5: Run checks**

```bash
node scripts/verify-contact-form-sections.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
```

Expected: all checks pass.

- [ ] **Step 6: Commit contact and SEO integration**

```bash
git add assets/contact-form-sections.js assets/contact-form-sections.css assets/mall-product-page.js scripts/verify-contact-form-sections.mjs scripts/verify-mall-catalog-pages.mjs scripts/integrate-site-typography-mall.mjs robots.txt sitemap.xml
git commit -m "feat: connect mall products to contact inquiries"
```

---

### Task 7: Run full local Docker and browser regression

**Files — website repository:**

- Create: `scripts/verify-mall-browser.mjs`
- Modify only if verification finds a defect: Mall assets, route integrator, local Nginx config, or contact assets from Tasks 4–6.

**Interfaces:**

- Consumes: a real validated snapshot generated in Task 2.
- Produces: repeatable Playwright evidence for English, Chinese, Persian, desktop, tablet, mobile, and RTL.

- [ ] **Step 1: Build the final local image**

```bash
cd "/Users/cuihua/Documents/JOTO global ｜ 维护入口"
docker build -f Dockerfile.local -t jotoglobal-mall:20260729-1 .
```

Run with the real snapshot bind-mounted read-only:

```bash
docker run --rm -d \
  --name jotoglobal-mall-20260729 \
  -p 127.0.0.1:3009:80 \
  -v "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/<version>:/usr/share/nginx/html/mall-data:ro" \
  jotoglobal-mall:20260729-1
```

- [ ] **Step 2: Verify HTTP routes**

Check:

```bash
curl -fsS http://127.0.0.1:3009/mall/
curl -fsS http://127.0.0.1:3009/zh/mall/products/
curl -fsS http://127.0.0.1:3009/fa/mall/products/<known-slug>/
curl -fsS http://127.0.0.1:3009/mall-data/manifest.json
```

Expected: all return `200`; product slug fallback keeps the requested URL.

- [ ] **Step 3: Implement and run browser regression**

`verify-mall-browser.mjs` must cover all combinations:

```js
[
  { locale: "en", prefix: "", dir: "ltr" },
  { locale: "zh", prefix: "/zh", dir: "ltr" },
  { locale: "fa", prefix: "/fa", dir: "rtl" },
].flatMap(locale => [
  { ...locale, width: 1440, height: 900 },
  { ...locale, width: 768, height: 1024 },
  { ...locale, width: 390, height: 844 },
]);
```

For each combination verify:

- correct language and direction;
- one Mall link in desktop and mobile navigation;
- home search opens the localized list;
- category filters update results;
- unavailable brand filter is absent when brands are empty;
- sort direction changes order;
- grid/list control preserves query parameters;
- pagination preserves filters;
- a product opens its localized detail route;
- image natural width is greater than zero;
- only populated tabs are present;
- Contact Us opens localized Contact with the slug;
- requirement text is prefilled once and remains editable;
- no price, currency, cart, checkout, or payment text;
- no horizontal page overflow;
- console errors and warnings are empty.

Also test:

- direct product deep link;
- browser back/forward;
- missing slug;
- missing optional fields;
- snapshot fetch failure using request interception;
- reduced motion.

- [ ] **Step 4: Fix and rerun until clean**

After each discovered defect:

```bash
node scripts/integrate-site-typography-mall.mjs
docker build -f Dockerfile.local -t jotoglobal-mall:20260729-1 .
```

Replace the container, then rerun the complete matrix. Do not accept a partial
matrix after a code change.

- [ ] **Step 5: Run every static regression**

```bash
node --check assets/mall-navigation-and-page.js
node --check assets/mall-data-client.js
node --check assets/mall-i18n.js
node --check assets/mall-catalog-pages.js
node --check assets/mall-product-page.js
node scripts/verify-mall-snapshot.test.mjs
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-contact-form-sections.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-solution-card-carousel.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-customer-logo-wall-preview.mjs
node scripts/verify-site-rules.mjs
git diff --check
```

Expected: all pass.

- [ ] **Step 6: Commit browser regression and fixes**

```bash
git add scripts/verify-mall-browser.mjs
# If browser verification required fixes, add only each exact changed path
# reported by `git diff --name-only`; never stage whole directories here.
git diff --cached --check
git commit -m "test: verify mall catalog across locales"
```

---

### Task 8: Provision Aliyun catalog storage and production routing

**Files — website repository:**

- Create: `deploy/production/jotoglobal-mall.nginx.conf`
- Modify: `docs/mall-catalog-operations.md`
- Modify only if production validation finds a defect: publisher or Mall assets.

**Interfaces:**

- Produces: dedicated `joto-mall-deploy` user.
- Produces: `/var/www/jotoglobal/catalog-releases`.
- Produces: `/var/www/jotoglobal/catalog-current`.
- Produces: same-origin read-only `/mall-data/`.
- Produces: localized product deep-link fallbacks.

- [ ] **Step 1: Create a restricted deploy identity**

On `139.224.51.172`:

```bash
useradd --create-home --shell /bin/bash joto-mall-deploy
install -d -o joto-mall-deploy -g www-data -m 0755 \
  /var/www/jotoglobal/catalog-releases
install -d -o joto-mall-deploy -g www-data -m 0755 \
  /var/www/jotoglobal/catalog-bootstrap
install -d -o joto-mall-deploy -g joto-mall-deploy -m 0700 \
  /home/joto-mall-deploy/.ssh
touch /home/joto-mall-deploy/.ssh/authorized_keys
chown joto-mall-deploy:joto-mall-deploy \
  /home/joto-mall-deploy/.ssh/authorized_keys
chmod 0600 /home/joto-mall-deploy/.ssh/authorized_keys
```

Append only the generated Mall publisher public key with:

```text
no-agent-forwarding,no-port-forwarding,no-pty,no-X11-forwarding ssh-ed25519 <public-key> joto-mall-publisher
```

Do not reuse the root password in automation.

- [ ] **Step 2: Install Nginx catalog routing**

`jotoglobal-mall.nginx.conf` contains:

```nginx
location = /mall-sitemap.xml {
  alias /var/www/jotoglobal/catalog-current/mall-sitemap.xml;
}

location ^~ /mall-data/ {
  alias /var/www/jotoglobal/catalog-current/;
  autoindex off;
  limit_except GET { deny all; }
  add_header X-Content-Type-Options nosniff always;
}

location ~ ^/zh/mall/products/[^/]+/?$ {
  try_files $uri $uri/ /zh/mall/product/index.html;
}
location ~ ^/fa/mall/products/[^/]+/?$ {
  try_files $uri $uri/ /fa/mall/product/index.html;
}
location ~ ^/mall/products/[^/]+/?$ {
  try_files $uri $uri/ /mall/product/index.html;
}
```

Include it inside the existing `jotoglobal.com` server block, then run:

```bash
nginx -t
systemctl reload nginx
```

Expected: syntax succeeds; existing site remains online before a catalog switch.

- [ ] **Step 3: Publish the first snapshot manually**

Run the publisher with the real snapshot and production key. Verify:

```bash
readlink -f /var/www/jotoglobal/catalog-current
curl -fsS https://jotoglobal.com/mall-data/manifest.json
curl -fsS https://jotoglobal.com/mall-sitemap.xml
```

Expected: symlink points to the new immutable version; both URLs return 200.

- [ ] **Step 4: Test failed publication**

Create a temporary copy with a wrong manifest checksum and run the publisher.
Expected:

- non-zero exit;
- `catalog-current` target unchanged;
- production Mall still returns the previous manifest.

- [ ] **Step 5: Test rollback**

Publish a second valid test version, capture both release names, then switch back:

```bash
ln -sfn "/var/www/jotoglobal/catalog-releases/<previous>" \
  /var/www/jotoglobal/catalog-current.next
mv -Tf /var/www/jotoglobal/catalog-current.next \
  /var/www/jotoglobal/catalog-current
```

Expected: old manifest and product data return immediately.

- [ ] **Step 6: Commit production routing and runbook**

```bash
git add deploy/production/jotoglobal-mall.nginx.conf docs/mall-catalog-operations.md
git commit -m "ops: add mall catalog production routing"
```

---

### Task 9: Deploy website code, enable automatic publication, and verify production

**Files:**

- Website repository: all committed implementation from Tasks 1, 3–8.
- Crawler repository: committed snapshot builder from Task 2.
- External state: Mac Mini LaunchAgent and Aliyun immutable releases.

**Interfaces:**

- Produces: one new website release without overwriting prior releases.
- Produces: one active catalog release and one retained previous catalog release.
- Produces: automatic publication after each newly completed non-smoke crawl.

- [ ] **Step 1: Audit both repositories**

Website:

```bash
cd "/Users/cuihua/Documents/JOTO global ｜ 维护入口"
git status --short
git log -8 --oneline
```

Crawler:

```bash
cd "/Users/cuihua/Documents/jotoglobal 信息获取站"
git status --short
git log -8 --oneline
```

Expected: website task files are committed; crawler task files are committed;
pre-existing crawler dirty files remain untouched and unstaged.

- [ ] **Step 2: Deploy website as a new release**

Use the existing immutable release procedure:

1. create `/var/www/jotoglobal/releases/<timestamp>-<commit>`;
2. upload the exact committed tree;
3. verify checksums;
4. run `nginx -t`;
5. atomically switch the website `current` symlink;
6. preserve the previous website release.

Do not overwrite an existing release directory.

- [ ] **Step 3: Rebuild crawler and manually run publication once**

```bash
cd "/Users/cuihua/Documents/jotoglobal 信息获取站"
docker compose build
docker compose up -d
cd "/Users/cuihua/Documents/JOTO global ｜ 维护入口"
./scripts/run-mall-publication.sh
```

Expected: the latest completed run is published once; a second call reports
`already-published`.

- [ ] **Step 4: Enable the LaunchAgent**

Install the rendered plist into `~/Library/LaunchAgents`, then:

```bash
launchctl bootstrap "gui/$(id -u)" \
  "$HOME/Library/LaunchAgents/com.joto.mall-publisher.plist"
launchctl print "gui/$(id -u)/com.joto.mall-publisher"
```

Expected: agent is loaded, interval is 60 seconds, last exit status is 0.

- [ ] **Step 5: Prove Mac Mini independence**

After one catalog is online:

```bash
cd "/Users/cuihua/Documents/jotoglobal 信息获取站"
docker compose stop web worker
```

Verify production Mall home, list, detail, images, and documents still return
200. Restart:

```bash
docker compose start web worker
```

- [ ] **Step 6: Run final production browser matrix**

Repeat the full Task 7 matrix against `https://jotoglobal.com`. Also verify:

- the production manifest matches the active server symlink;
- English, Chinese, and Persian deep links survive refresh;
- Contact forms post only when explicitly submitted;
- browser console has 0 errors and 0 warnings;
- no page contains price/cart language;
- the existing homepage, solutions, Blog, About, Contact, and 404 routes have no visual regressions.

- [ ] **Step 7: Record final release evidence**

Capture:

- website commit and release directory;
- crawler snapshot-builder commit;
- crawl run ID;
- catalog release directory;
- active manifest SHA-256;
- static test results;
- browser viewport/language matrix;
- Nginx test result;
- rollback test result;
- LaunchAgent state.

Do not include secrets or password material.
