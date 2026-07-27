import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "assets/index-e49ffBFL.css");
const jsPath = path.join(root, "assets/index-DaFvN0XI.js");
const css = fs.readFileSync(cssPath, "utf8");
const js = fs.readFileSync(jsPath, "utf8");

function collectIndexFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      [".git", ".superpowers", "docs", "preview", "scripts"].includes(
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

const routeFiles = collectIndexFiles(root);
assert.equal(routeFiles.length, 105, "expected all 105 route index files");

for (const routeFile of routeFiles) {
  const html = fs.readFileSync(routeFile, "utf8");
  assert.match(html, /\/assets\/index-e49ffBFL\.css/);
  assert.match(html, /\/assets\/index-DaFvN0XI\.js/);
}

assert.match(css, /JOTO site-wide visual rules/);
assert.match(css, /--joto-compact-action-width:\s*96px/);
assert.match(css, /--joto-standard-cta-width:\s*280px/);
assert.match(
  css,
  /\.font-serif\.text-joto-green\s*\{\s*font-family:\s*Instrument Serif,\s*serif/,
);
assert.match(
  css,
  /\[data-hero-copy-column\]\s*\{\s*align-items:\s*flex-start/,
);
assert.match(
  css,
  /html\[dir="rtl"\] \[data-hero-copy-column\]\s*\{\s*align-items:\s*flex-end/,
);

assert.doesNotMatch(
  js,
  /children:\["Tech",f\.jsx\("br",\{\}\),"Shanghai"\]/,
);
assert.doesNotMatch(js, /fontFamily:"monospace"/);
assert.match(
  js,
  /children:\["Global IT",f\.jsx\("br",\{\}\),"Service Provider"\]/,
);
assert.match(js, /fontFamily:"Poppins, sans-serif"/);

console.log(`Verified site-wide rules across ${routeFiles.length} routes.`);
