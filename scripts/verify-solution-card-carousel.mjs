import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "assets/solution-card-carousel.js");
const stylesPath = path.join(root, "assets/solution-card-carousel.css");
const mainBundlePath = path.join(root, "assets/index-DaFvN0XI.js");

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
assert.match(script, /上一张解决方案/);
assert.match(script, /راهکار قبلی/);

assert.match(styles, /scrollbar-width:\s*none/);
assert.match(styles, /solution-card-scroller::\-webkit-scrollbar/);
assert.match(styles, /data-solution-carousel-button/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);

console.log("Verified solution carousel enhancement assets.");
