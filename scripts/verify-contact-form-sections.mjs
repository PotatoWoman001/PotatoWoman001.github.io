import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const homeRoutes = ["index.html", "zh/index.html", "fa/index.html"];
const solutionRoutePattern =
  /^(?:(?:zh|fa)\/)?solutions\/[^/]+(?:\/[^/]+)?\/index\.html$/;
const expectedSolutionRouteCount = 75;
const scriptTag =
  '<script type="module" src="/assets/contact-form-sections.js?v=20260728-3"></script>';
const styleTag =
  '<link rel="stylesheet" href="/assets/contact-form-sections.css?v=20260728-3">';

async function collectIndexFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === ".superpowers") continue;

    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.posix.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectIndexFiles(absolutePath, relativePath)));
    } else if (entry.name === "index.html") {
      files.push(relativePath);
    }
  }

  return files;
}

const allIndexFiles = await collectIndexFiles(projectRoot);
const solutionRoutes = allIndexFiles.filter((file) => solutionRoutePattern.test(file)).sort();
const targetRoutes = [...homeRoutes, ...solutionRoutes];

assert.equal(
  solutionRoutes.length,
  expectedSolutionRouteCount,
  `Expected ${expectedSolutionRouteCount} Solution routes, found ${solutionRoutes.length}.`,
);
assert.equal(targetRoutes.length, 78, "Expected three home routes plus 75 Solution routes.");

for (const route of targetRoutes) {
  const html = await readFile(path.join(projectRoot, route), "utf8");
  assert.ok(html.includes(scriptTag), `${route} is missing the contact form module.`);
  assert.ok(html.includes(styleTag), `${route} is missing the contact form stylesheet.`);
  assert.doesNotMatch(html, /contact-placement-preview/, `${route} still uses preview assets.`);
}

const [script, styles] = await Promise.all([
  readFile(path.join(projectRoot, "assets/contact-form-sections.js"), "utf8"),
  readFile(path.join(projectRoot, "assets/contact-form-sections.css"), "utf8"),
]);

for (const locale of ["en", "zh-CN", "fa-IR"]) {
  assert.ok(script.includes(locale), `Missing ${locale} localization.`);
}

assert.match(script, /CONTACT_ENDPOINT\s*=\s*"\/api\/contact"/);
assert.match(script, /dataset\.homeHeroActions/);
assert.match(script, /data-home-contact-form/);
assert.match(script, /data-solution-contact-form/);
assert.match(script, /window\.location\.hash\s*===\s*"#contact"/);
assert.doesNotMatch(script, /安全咨询|提交即表示/);

assert.match(styles, /width:\s*280px/);
assert.match(styles, /height:\s*48px/);
assert.match(styles, /white-space:\s*nowrap/);
assert.match(styles, /html\[dir="rtl"\]/);
assert.match(styles, /@media \(max-width:\s*639px\)/);
assert.match(styles, /clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
assert.doesNotMatch(styles, /left:\s*-9999px/);

console.log(
  `Verified homepage contact CTA and Solution forms across ${targetRoutes.length} routes.`,
);
