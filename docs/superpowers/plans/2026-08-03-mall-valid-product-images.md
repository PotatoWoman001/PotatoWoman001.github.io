# Mall 有效产品图片统一过滤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 让 Mall 列表、详情图库、分享图和结构化数据只使用有效产品图片，并自动移除加载失败的图库项。

**Architecture:** 在 `mall-data-client.js` 建立唯一的图片规范化接口 `validProductImages(product)`，目录查询和单产品加载都从该接口取得去重、去空、去占位的图片数组。详情图库只消费规范化结果，并在浏览器运行时移除加载失败的路径、同步主图与缩略图状态。

**Tech Stack:** 原生 JavaScript ES Modules、静态 HTML/CSS、Node.js `assert`、Playwright。

## Global Constraints

- 不修改 `.runtime/mall-data/` 产品 JSON 或抓取器。
- 空路径、重复路径和三个已确认占位文件名必须被过滤。
- 产品列表、详情图库、Open Graph 和 JSON-LD 必须使用同一有效图片集合。
- 产品没有任何有效图片时继续从目录隐藏。
- 英文、中文、波斯语页面不得出现控制台错误或横向溢出。

---

### Task 1: 建立统一图片规范化接口

**Files:**
- Modify: `scripts/verify-mall-data-client.mjs`
- Modify: `assets/mall-data-client.js`

**Interfaces:**
- Consumes: `product.images?: unknown[]`
- Produces: `validProductImages(product): string[]`，返回按原顺序去重并过滤后的图片路径。

- [x] **Step 1: 编写失败测试**

在测试导入中加入 `validProductImages`，并增加：

```js
const magentoPlaceholderFilename =
  "2637f446bc6640220c9b726c624f2156836bb7a67b754c098f7fda5f126c7fcc.jpg";
assert.deepEqual(
  validProductImages({
    images: [
      "",
      null,
      `/mall-data/media/images/${magentoPlaceholderFilename}`,
      "/mall-data/media/images/real-router.webp?v=1",
      "/mall-data/media/images/real-router.webp?v=1",
    ],
  }),
  ["/mall-data/media/images/real-router.webp?v=1"],
);
```

- [x] **Step 2: 运行测试并确认失败**

Run: `node scripts/verify-mall-data-client.mjs`

Expected: FAIL，提示 `validProductImages` 尚未导出。

- [x] **Step 3: 实现图片规范化接口**

把 Magento 文件名加入 `PLACEHOLDER_IMAGE_FILENAMES`，并实现：

```js
export function validProductImages(product) {
  if (!Array.isArray(product?.images)) return [];
  const seen = new Set();
  return product.images.flatMap((image) => {
    if (typeof image !== "string" || !image.trim()) return [];
    const path = image.trim();
    const pathname = path.split(/[?#]/, 1)[0];
    const filename = pathname.split("/").pop()?.toLowerCase();
    if (!filename || PLACEHOLDER_IMAGE_FILENAMES.has(filename) || seen.has(path)) return [];
    seen.add(path);
    return [path];
  });
}

export function hasProductImage(product) {
  return validProductImages(product).length > 0;
}
```

`queryProducts()` 返回产品时使用：

```js
images: validProductImages(product),
```

`loadProduct()` 的成功分支改为：

```js
const product = await fetchJson(
  `${DATA_ROOT}data/products/${encodeURIComponent(slug)}.json?${snapshotVersionQuery(manifest)}`,
  { signal },
);
return {
  ...product,
  images: validProductImages(product),
};
```

- [x] **Step 4: 运行数据测试**

Run: `node scripts/verify-mall-data-client.mjs`

Expected: PASS，输出 `Verified Mall navigation, locale copy, and catalog data client.`

---

### Task 2: 让详情图库和 SEO 使用有效图片

**Files:**
- Modify: `assets/mall-product-page.js`
- Modify: `scripts/verify-mall-catalog-pages.mjs`
- Modify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: `loadProduct()` 返回的已规范化 `product.images: string[]`
- Produces: 只含有效图片的主图、缩略图、`og:image` 和 JSON-LD `image`。

- [x] **Step 1: 增加静态与浏览器失败契约**

静态脚本断言产品页包含图片错误处理标记：

```js
assert.match(product, /addEventListener\("error"/);
assert.match(product, /failedImages/);
```

浏览器脚本在中文手机视口访问 AR0B0037BA，并断言：

```js
const forbiddenImage = "2637f446bc6640220c9b726c624f2156836bb7a67b754c098f7fda5f126c7fcc.jpg";
const sources = await page.locator(".joto-mall__gallery img").evaluateAll((images) =>
  images.map((image) => image.getAttribute("src") || ""),
);
assert(!sources.some((source) => source.includes(forbiddenImage)), "placeholder image remains");
```

- [x] **Step 2: 运行契约并确认旧图库失败**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
```

Expected: FAIL，旧图库没有 `failedImages` 运行时错误处理。

- [x] **Step 3: 实现图库加载失败移除**

用以下结构替换 `gallery(product)`：

```js
function gallery(product) {
  let images = [...(product.images || [])];
  const failedImages = new Set();
  const wrapper = element("div", { className: "joto-mall__gallery" });
  const placeholder = () => element("div", {
    className: "joto-mall__image-placeholder",
    "aria-hidden": "true",
  });
  if (!images.length) {
    wrapper.append(placeholder());
    return wrapper;
  }

  let activePath = images[0];
  let thumbnails;
  const mainImage = element("img", {
    className: "joto-mall__gallery-main",
    src: activePath,
    alt: product.title || "",
    decoding: "async",
  });

  const updatePressed = () => {
    thumbnails?.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.imagePath === activePath));
    });
  };
  const selectImage = (path) => {
    activePath = path;
    mainImage.src = path;
    updatePressed();
  };
  const removeFailedImage = (path) => {
    if (failedImages.has(path)) return;
    failedImages.add(path);
    images = images.filter((candidate) => candidate !== path);
    thumbnails?.querySelectorAll("button").forEach((button) => {
      if (button.dataset.imagePath === path) button.remove();
    });
    product.images = [...images];
    installProductSeo(product);
    if (!images.length) {
      mainImage.replaceWith(placeholder());
      thumbnails?.remove();
      return;
    }
    if (activePath === path) selectImage(images[0]);
    if (images.length <= 1) thumbnails?.remove();
  };

  mainImage.addEventListener("error", () => removeFailedImage(activePath));
  wrapper.append(mainImage);
  if (images.length > 1) {
    thumbnails = element("div", {
      className: "joto-mall__thumbnails",
      role: "list",
    });
    images.forEach((path, index) => {
      const thumbnailImage = element("img", {
        src: path,
        alt: "",
        loading: "lazy",
        decoding: "async",
      });
      const thumbnail = element("button", {
        type: "button",
        className: "joto-mall__thumbnail",
        "aria-label": `${product.title} ${index + 1}`,
        "aria-pressed": String(index === 0),
        dataset: { imagePath: path },
      }, [thumbnailImage]);
      thumbnail.addEventListener("click", () => selectImage(path));
      thumbnailImage.addEventListener("error", () => removeFailedImage(path), { once: true });
      thumbnails.append(thumbnail);
    });
    wrapper.append(thumbnails);
  }
  return wrapper;
}
```

主图或缩略图触发 `error` 时，同步更新 `product.images` 并重新安装 SEO；所有路径均失败时移除 `og:image` 和 JSON-LD `image`。

- [x] **Step 4: 保持 SEO 数据一致**

`loadProduct()` 已把 `product.images` 规范化，因此 `installProductSeo(product)` 继续从 `product.images[0]` 写入 `og:image`，并从 `product.images` 生成 JSON-LD。在 `verifyMallBrowser()` 的矩阵循环后加入：

```js
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${origin}/zh/mall/products/ar0b0037ba/`, {
  waitUntil: "domcontentloaded",
});
await waitForCatalog("[data-joto-mall-product]");
const forbiddenImage =
  "2637f446bc6640220c9b726c624f2156836bb7a67b754c098f7fda5f126c7fcc.jpg";
const imageState = await page.evaluate(() => {
  const jsonLd = JSON.parse(
    document.querySelector("[data-joto-mall-product-jsonld]")?.textContent || "{}",
  );
  return {
    sources: [...document.querySelectorAll(".joto-mall__gallery img")]
      .map((image) => image.getAttribute("src") || ""),
    ogImage: document.querySelector('meta[property="og:image"]')?.content || "",
    jsonLdImages: Array.isArray(jsonLd.image) ? jsonLd.image : [],
  };
});
assert(
  ![imageState.ogImage, ...imageState.sources, ...imageState.jsonLdImages]
    .some((source) => source.includes(forbiddenImage)),
  "zh/mobile: placeholder image remains in gallery or SEO",
);
completed.push("zh/mobile/placeholder-images");
```

- [x] **Step 5: 运行 Mall 静态验证**

Run:

```bash
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-data-client.mjs
```

Expected: 两项均 PASS。

---

### Task 3: 三语言浏览器回归与提交

**Files:**
- Verify: `assets/mall-data-client.js`
- Verify: `assets/mall-product-page.js`
- Verify: `scripts/verify-mall-browser.mjs`

**Interfaces:**
- Consumes: Task 1 与 Task 2 的最终实现。
- Produces: 已通过三语言响应式验证的提交。

- [x] **Step 1: 运行 Mall 浏览器矩阵**

Run:

```bash
/bin/bash /Users/cuihua/.codex/skills/playwright/scripts/playwright_cli.sh run-code --filename scripts/verify-mall-browser.mjs
```

Expected: 英文、中文、波斯语桌面、平板、手机、波斯语 reduced-motion 及中文占位图专项共 11 个场景通过；`consoleProblems` 和 `pageErrors` 均为空。

- [x] **Step 2: 运行全站静态回归**

Run:

```bash
node scripts/verify-site-rules.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-mall-data-client.mjs
```

Expected: 114 个正式路由、三语言 Mall 和数据客户端全部通过。

- [x] **Step 3: 核对差异**

Run:

```bash
git diff --check
git status --short
```

Expected: 只有图片客户端、产品详情页、验证脚本和本计划文档发生变化；`.playwright-cli/` 与 `.superpowers/` 不纳入提交。

- [x] **Step 4: 提交实现**

```bash
git add assets/mall-data-client.js assets/mall-product-page.js \
  scripts/verify-mall-data-client.mjs scripts/verify-mall-catalog-pages.mjs \
  scripts/verify-mall-browser.mjs \
  docs/superpowers/plans/2026-08-03-mall-valid-product-images.md
git commit -m "fix: remove empty mall product images"
```
