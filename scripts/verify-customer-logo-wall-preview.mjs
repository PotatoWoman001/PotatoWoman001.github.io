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
const sharedScriptPath = `${root}/assets/customer-logo-wall-three-row.js`;
const sharedStylesPath = `${root}/assets/customer-logo-wall-three-row.css`;
const homepageScriptPath = `${root}/assets/customer-logo-wall-homepage.js`;
const mainBundlePath = `${root}/assets/index-DaFvN0XI.js`;
const homepageRoutePaths = [
  `${root}/index.html`,
  `${root}/zh/index.html`,
  `${root}/fa/index.html`,
];

assert.equal(
  existsSync(sharedScriptPath),
  true,
  "shared three-row script must exist",
);
assert.equal(
  existsSync(sharedStylesPath),
  true,
  "shared three-row stylesheet must exist",
);
assert.equal(
  existsSync(homepageScriptPath),
  true,
  "homepage Logo wall bootstrap must exist",
);

for (const previewRoutePath of previewRoutePaths) {
  assert.equal(
    existsSync(previewRoutePath),
    true,
    `preview route shell must exist: ${previewRoutePath}`,
  );
  const routeHtml = readFileSync(previewRoutePath, "utf8");
  assert.match(routeHtml, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(routeHtml, /\/assets\/index-e49ffBFL\.css/);
  assert.match(routeHtml, /\/assets\/customer-logo-wall-three-row\.css/);
  assert.match(routeHtml, /\/assets\/customer-logo-wall-preview\.css/);
  assert.match(routeHtml, /\/assets\/customer-logo-wall-preview\.js/);
  assert.match(routeHtml, /id="customer-logo-wall-source"/);
}

const previewChunk = readFileSync(previewChunkPath, "utf8");
const previewScript = readFileSync(previewScriptPath, "utf8");
const previewStyles = readFileSync(previewStylesPath, "utf8");
const sharedScript = readFileSync(sharedScriptPath, "utf8");
const sharedStyles = readFileSync(sharedStylesPath, "utf8");
const homepageScript = readFileSync(homepageScriptPath, "utf8");
const mainBundle = readFileSync(mainBundlePath, "utf8");
const previewChunkHash = createHash("sha256")
  .update(previewChunk)
  .digest("hex");

assert.match(
  previewScript,
  /import \{ enhanceCustomerLogoWall \} from "\.\/customer-logo-wall-three-row\.js"/,
);
assert.match(previewScript, /enhanceCustomerLogoWall\(previewSection\)/);
assert.match(
  sharedScript,
  /items\s*\.slice\(rowIndex \* 14, \(rowIndex \+ 1\) \* 14\)/,
);
assert.match(sharedScript, /"left", "right", "left"/);
assert.match(sharedScript, /"52s", "60s", "68s"/);
assert.match(
  sharedScript,
  /duplicate\.setAttribute\("aria-hidden", "true"\)/,
);
assert.match(sharedScript, /image\.alt = ""/);
assert.doesNotMatch(sharedScript, /alternate/);
assert.match(sharedStyles, /prefers-reduced-motion: reduce/);
assert.match(sharedStyles, /customer-logo-wall-three-row__track--left/);
assert.match(sharedStyles, /customer-logo-wall-three-row__track--right/);
assert.match(sharedStyles, /customer-logo-wall-three-row-left/);
assert.match(sharedStyles, /customer-logo-wall-three-row-right/);
assert.doesNotMatch(previewStyles, /@keyframes/);

assert.match(
  homepageScript,
  /import \{ enhanceCustomerLogoWall \} from "\.\/customer-logo-wall-three-row\.js"/,
);
assert.match(homepageScript, /querySelector\("#customer-logo-wall"\)/);
assert.match(homepageScript, /enhanceCustomerLogoWall\(section\)/);

for (const homepageRoutePath of homepageRoutePaths) {
  const routeHtml = readFileSync(homepageRoutePath, "utf8");
  assert.match(routeHtml, /\/assets\/customer-logo-wall-three-row\.css/);
  assert.match(routeHtml, /\/assets\/customer-logo-wall-homepage\.js/);
}

assert.doesNotMatch(mainBundle, /customer-logo-wall-three-row__rows/);
assert.doesNotMatch(mainBundle, /data-logo-wall-row/);

assert.equal(
  previewChunkHash,
  "03c72455ff94d40157e5e0ee829c841a8daeff959d2edf91667ca4cf72f30544",
  "existing application preview chunk must remain unchanged",
);

console.log("customer Logo wall preview contract: PASS");
