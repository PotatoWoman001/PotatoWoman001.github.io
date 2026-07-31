import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const homeRoutes = new Set(["index.html", "zh/index.html", "fa/index.html"]);
const contactRoutes = new Set([
  "contact/index.html",
  "zh/contact/index.html",
  "fa/contact/index.html",
]);
const solutionRoutePattern =
  /^(?:(?:zh|fa)\/)?solutions\/[^/]+(?:\/[^/]+)?\/index\.html$/;
const finalScriptTag =
  '<script type="module" src="/assets/contact-form-sections.js?v=20260731-3"></script>';
const finalStyleTag =
  '<link rel="stylesheet" href="/assets/contact-form-sections.css?v=20260731-3">';
const bundleScriptPattern =
  /(<script type="module" crossorigin src="\/assets\/index-DaFvN0XI\.js(?:\?v=[^"]+)?"><\/script>)/;
const bundleStylePattern =
  /(<link rel="stylesheet" crossorigin href="\/assets\/index-e49ffBFL\.css(?:\?v=[^"]+)?">)/;

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

function integrateHtml(source, route) {
  let html = source
    .replace(
      /^\s*<script[^>]+contact-placement-preview\.js[^>]*><\/script>\s*$/gm,
      "",
    )
    .replace(/^\s*<link[^>]+contact-placement-preview\.css[^>]*>\s*$/gm, "")
    .replace(
      /^\s*<script[^>]+contact-form-sections\.js[^>]*><\/script>\s*$/gm,
      "",
    )
    .replace(/^\s*<link[^>]+contact-form-sections\.css[^>]*>\s*$/gm, "");

  if (!html.includes(finalScriptTag)) {
    if (!bundleScriptPattern.test(html)) {
      throw new Error(`${route} is missing the shared JavaScript bundle tag.`);
    }
    html = html.replace(bundleScriptPattern, `$1\n    ${finalScriptTag}`);
  }

  if (!html.includes(finalStyleTag)) {
    if (!bundleStylePattern.test(html)) {
      throw new Error(`${route} is missing the shared stylesheet tag.`);
    }
    html = html.replace(bundleStylePattern, `$1\n    ${finalStyleTag}`);
  }

  return html.replace(/\n{3,}/g, "\n\n");
}

const indexFiles = await collectIndexFiles(projectRoot);
const targetRoutes = indexFiles
  .filter(
    (route) =>
      homeRoutes.has(route) ||
      contactRoutes.has(route) ||
      solutionRoutePattern.test(route),
  )
  .sort();

if (targetRoutes.length !== 81) {
  throw new Error(`Expected 81 target routes, found ${targetRoutes.length}.`);
}

let changedFiles = 0;

for (const route of targetRoutes) {
  const absolutePath = path.join(projectRoot, route);
  const source = await readFile(absolutePath, "utf8");
  const integrated = integrateHtml(source, route);

  if (integrated === source) continue;

  await writeFile(absolutePath, integrated);
  changedFiles += 1;
}

console.log(`Integrated contact form assets across ${targetRoutes.length} routes.`);
console.log(`${changedFiles} files changed.`);
