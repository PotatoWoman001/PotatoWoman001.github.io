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
const previewScriptPath = `${root}/assets/customer-logo-wall-preview.js`;
const previewStylesPath = `${root}/assets/customer-logo-wall-preview.css`;
const mainBundlePath = `${root}/assets/index-DaFvN0XI.js`;

for (const previewRoutePath of previewRoutePaths) {
  assert.equal(
    existsSync(previewRoutePath),
    true,
    `preview route shell must exist: ${previewRoutePath}`,
  );
  const routeHtml = readFileSync(previewRoutePath, "utf8");
  assert.match(routeHtml, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(routeHtml, /\/assets\/index-e49ffBFL\.css/);
  assert.match(routeHtml, /\/assets\/customer-logo-wall-preview\.css/);
  assert.match(routeHtml, /\/assets\/customer-logo-wall-preview\.js/);
  assert.match(routeHtml, /id="customer-logo-wall-source"/);
}

const previewChunk = readFileSync(previewChunkPath, "utf8");
const previewScript = readFileSync(previewScriptPath, "utf8");
const previewStyles = readFileSync(previewStylesPath, "utf8");
const mainBundle = readFileSync(mainBundlePath, "utf8");
const previewChunkHash = createHash("sha256")
  .update(previewChunk)
  .digest("hex");

assert.match(previewScript, /previewLogoRow/);
assert.match(
  previewScript,
  /items\s*\.slice\(rowIndex \* 14, \(rowIndex \+ 1\) \* 14\)/,
);
assert.match(previewScript, /"left", "right", "left"/);
assert.match(previewScript, /"52s", "60s", "68s"/);
assert.match(
  previewScript,
  /duplicate\.setAttribute\("aria-hidden", "true"\)/,
);
assert.doesNotMatch(previewScript, /alternate/);
assert.match(previewStyles, /prefers-reduced-motion: reduce/);
assert.match(previewStyles, /customer-logo-wall-preview__track--left/);
assert.match(previewStyles, /customer-logo-wall-preview__track--right/);
assert.match(previewStyles, /customer-logo-wall-preview-left/);
assert.match(previewStyles, /customer-logo-wall-preview-right/);

assert.doesNotMatch(mainBundle, /customer-logo-wall-preview__rows/);
assert.doesNotMatch(mainBundle, /data-preview-logo-row/);

assert.equal(
  previewChunkHash,
  "03c72455ff94d40157e5e0ee829c841a8daeff959d2edf91667ca4cf72f30544",
  "existing application preview chunk must remain unchanged",
);

console.log("customer Logo wall preview contract: PASS");
