import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const staticAssetVersion = "20260803-2";
const assetPattern = /(\/assets\/[^"'<>?]+\.(?:js|css))(?:\?v=[^"'<>]+)?/g;
const scriptPattern = /\/assets\/index-DaFvN0XI\.js\?v=20260803-2/g;
const stylePattern = /\/assets\/index-e49ffBFL\.css\?v=20260803-2/g;
const scriptUrl = `/assets/index-DaFvN0XI.js?v=${staticAssetVersion}`;
const styleUrl = `/assets/index-e49ffBFL.css?v=${staticAssetVersion}`;
const excludedDirectories = new Set([
  ".git",
  ".superpowers",
  "docs",
  "preview",
  "scripts",
]);

async function collectIndexFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (excludedDirectories.has(entry.name)) continue;

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

function versionHtml(source, route) {
  const versioned = source.replace(
    assetPattern,
    `$1?v=${staticAssetVersion}`,
  );

  if (!scriptPattern.test(versioned)) {
    throw new Error(`${route} is missing the shared JavaScript bundle URL.`);
  }
  scriptPattern.lastIndex = 0;

  if (!stylePattern.test(versioned)) {
    throw new Error(`${route} is missing the shared stylesheet URL.`);
  }
  stylePattern.lastIndex = 0;

  return versioned.replace(scriptPattern, scriptUrl).replace(stylePattern, styleUrl);
}

const routeFiles = (await collectIndexFiles(projectRoot)).sort();
if (routeFiles.length !== 114) {
  throw new Error(`Expected 114 formal route indexes, found ${routeFiles.length}.`);
}

const targetFiles = [...routeFiles, "404.html"];
let changedFiles = 0;

for (const route of targetFiles) {
  const absolutePath = path.join(projectRoot, route);
  const source = await readFile(absolutePath, "utf8");
  const integrated = versionHtml(source, route);

  if (integrated === source) continue;

  await writeFile(absolutePath, integrated);
  changedFiles += 1;
}

console.log(`Versioned shared assets across ${targetFiles.length} maintained HTML files.`);
console.log(`${changedFiles} files changed.`);
