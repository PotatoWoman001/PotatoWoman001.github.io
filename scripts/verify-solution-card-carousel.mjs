import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "assets/solution-card-carousel.js");
const stylesPath = path.join(root, "assets/solution-card-carousel.css");
const mainBundlePath = path.join(root, "assets/index-DaFvN0XI.js");
const assetVersion = "20260803-1";

assert.equal(existsSync(scriptPath), true, "carousel script must exist");
assert.equal(existsSync(stylesPath), true, "carousel stylesheet must exist");

const script = readFileSync(scriptPath, "utf8");
const styles = readFileSync(stylesPath, "utf8");
const mainBundle = readFileSync(mainBundlePath, "utf8");

assert.match(mainBundle, /data-solutions-scroller/);
assert.match(mainBundle, /data-solution-card/);

assert.match(script, /data-solutions-scroller/);
assert.match(script, /data-solution-card/);
assert.match(script, /data-solution-carousel-controls/);
assert.match(script, /scrollIntoView/);
assert.match(script, /prefers-reduced-motion: reduce/);
assert.match(script, /MutationObserver/);
assert.match(script, /ResizeObserver/);
assert.match(script, /min-width:\s*1024px/);
assert.match(script, /solution-scroll-section/);
assert.match(script, /solution-scroll-stage/);
assert.match(script, /requestAnimationFrame/);
assert.match(script, /translate3d\(/);
assert.match(script, /window\.addEventListener\("scroll"[\s\S]*passive:\s*true/);
assert.match(script, /window\.scrollTo\(\{/);
assert.match(script, /reducedMotion\.matches\s*\?\s*"auto"\s*:\s*"smooth"/);
assert.doesNotMatch(script, /scroller\.scrollLeft\s*=/);
assert.doesNotMatch(script, /addEventListener\("wheel"/);
assert.doesNotMatch(script, /preventDefault\(\)/);
assert.doesNotMatch(script, /solutionCarouselHint/);
assert.match(script, /上一张解决方案/);
assert.match(script, /راهکار قبلی/);
assert.match(script, /window\.location\.pathname/);

assert.match(styles, /scrollbar-width:\s*none/);
assert.match(styles, /solution-card-scroller::\-webkit-scrollbar/);
assert.match(styles, /data-solution-carousel-button/);
assert.match(styles, /scroll-snap-type:\s*x proximity/);
assert.match(styles, /\.solution-scroll-section\.is-scroll-driven/);
assert.match(styles, /\.solution-scroll-stage\.is-scroll-driven/);
assert.match(styles, /position:\s*sticky/);
assert.match(styles, /top:\s*76px/);
assert.match(styles, /will-change:\s*transform/);
assert.match(styles, /height:\s*410px !important/);
assert.match(styles, /height:\s*320px !important/);
assert.match(styles, /height:\s*430px !important/);
assert.match(styles, /height:\s*340px !important/);
assert.match(styles, /height:\s*440px !important/);
assert.match(styles, /height:\s*350px !important/);
assert.match(styles, /contain:\s*layout paint/);
assert.match(styles, /transition-duration:\s*320ms !important/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);

const homepagePaths = [
  path.join(root, "index.html"),
  path.join(root, "zh/index.html"),
  path.join(root, "fa/index.html"),
];

for (const homepagePath of homepagePaths) {
  const html = readFileSync(homepagePath, "utf8");
  assert.ok(
    html.includes(`/assets/solution-card-carousel.css?v=${assetVersion}`),
  );
  assert.ok(
    html.includes(`/assets/solution-card-carousel.js?v=${assetVersion}`),
  );
}

function collectIndexFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      [".git", ".playwright-cli", ".superpowers", "docs", "scripts"].includes(
        entry.name,
      )
    ) {
      return [];
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectIndexFiles(absolute);
    return entry.name === "index.html" ? [absolute] : [];
  });
}

const homepageSet = new Set(homepagePaths);
for (const routePath of collectIndexFiles(root)) {
  if (homepageSet.has(routePath)) continue;
  const html = readFileSync(routePath, "utf8");
  assert.doesNotMatch(
    html,
    /\/assets\/solution-card-carousel\.(?:css|js)/,
  );
}

console.log(
  "Verified solution carousel enhancement assets and homepage integration.",
);
