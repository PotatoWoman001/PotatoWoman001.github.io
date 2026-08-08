import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "assets/index-e49ffBFL.css");
const jsPath = path.join(root, "assets/index-DaFvN0XI.js");
const staticAssetVersion = "20260805-1";
const bundleScriptUrl = `/assets/index-DaFvN0XI.js?v=${staticAssetVersion}`;
const bundleStyleUrl = `/assets/index-e49ffBFL.css?v=${staticAssetVersion}`;
const css = fs.readFileSync(cssPath, "utf8");
const js = fs.readFileSync(jsPath, "utf8");

function collectIndexFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      [".git", ".superpowers", "docs", "preview", "scripts", "work"].includes(
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
assert.equal(routeFiles.length, 114, "expected all 114 route index files");

for (const routeFile of routeFiles) {
  const html = fs.readFileSync(routeFile, "utf8");
  assert.ok(
    html.includes(bundleStyleUrl),
    `${path.relative(root, routeFile)} is missing ${bundleStyleUrl}`,
  );
  assert.ok(
    html.includes(bundleScriptUrl),
    `${path.relative(root, routeFile)} is missing ${bundleScriptUrl}`,
  );
}

const notFoundHtml = fs.readFileSync(path.join(root, "404.html"), "utf8");
assert.ok(notFoundHtml.includes(bundleStyleUrl), `404.html is missing ${bundleStyleUrl}`);
assert.ok(notFoundHtml.includes(bundleScriptUrl), `404.html is missing ${bundleScriptUrl}`);

assert.match(css, /JOTO site-wide visual rules/);
assert.match(css, /--joto-compact-action-width:\s*96px/);
assert.match(css, /--joto-standard-cta-width:\s*280px/);
assert.match(
  css,
  /\.font-serif\.text-joto-green\s*\{\s*font-family:\s*Instrument Serif,\s*serif/,
);
assert.match(
  css,
  /\[data-hero-copy-column\]\s*\{\s*align-items:\s*flex-start;\s*align-self:\s*flex-start/,
);
assert.match(
  css,
  /main :has\(> \[data-hero-copy-column\]\)\s*\{\s*margin-inline-start:\s*0\s*!important/,
);
assert.match(
  css,
  /\[data-hero-heading-shell\] \[data-hero-line\]\s*\{\s*padding-inline-start:\s*0\s*!important/,
);
assert.match(
  css,
  /html\[dir="rtl"\] \[data-hero-copy-column\]\s*\{\s*align-items:\s*flex-end;\s*align-self:\s*flex-end/,
);
assert.match(
  css,
  /\[data-hero-cta-desktop\]\s*\{\s*display:\s*none\s*!important/,
);
assert.match(
  css,
  /\[data-hero-cta-mobile\]\s*\{\s*display:\s*inline-flex\s*!important/,
);
assert.match(css, /JOTO copy boundary completion/);
assert.match(
  css,
  /:where\(h1, h2, h3, h4, h5, h6, p, ul, ol, li, label, blockquote\):not/,
);
assert.match(css, /text-align:\s*start\s*!important/);
assert.match(css, /max-inline-size:\s*100%/);
assert.match(css, /white-space:\s*normal/);
assert.match(css, /overflow-wrap:\s*break-word/);
assert.match(css, /margin-inline-start:\s*0\s*!important/);
assert.match(css, /margin-inline-end:\s*auto\s*!important/);
assert.doesNotMatch(css, /text-align:\s*justify/);
assert.match(
  css,
  /main article > a\.absolute\.rounded-full\s*\{[^}]*left:\s*auto;[^}]*right:\s*auto;[^}]*inset-inline-start:\s*1\.5rem/s,
);
assert.match(
  css,
  /html\[dir="rtl"\] main > header:not\(\.fixed\)\s*\{[^}]*direction:\s*rtl/s,
);
assert.match(
  css,
  /html\[dir="rtl"\]\s+main\s+:is\(h1, h2, h3, h4, h5, h6\):not\(\.sr-only\)[^{]*\{[^}]*justify-content:\s*flex-end/s,
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
