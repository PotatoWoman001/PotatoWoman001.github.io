import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSalesMailto,
  buildTrafficSource,
  classifyLeadSource,
} from "../assets/jotoglobal-lead-routing.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const ignoredDirectories = new Set([
  ".git",
  ".playwright-cli",
  ".runtime",
  ".superpowers",
  "brand-film",
  "docs",
  "fixtures",
  "output",
  "work",
]);
const runtimeExtensions = new Set([".html", ".js", ".json"]);

async function collectRuntimeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectRuntimeFiles(absolutePath)));
    else if (runtimeExtensions.has(path.extname(entry.name))) files.push(absolutePath);
  }
  return files;
}

assert.deepEqual(classifyLeadSource(new URL("https://jotoglobal.com/zh/")), {
  sourceKey: "home-contact-form",
  locale: "zh-CN",
  pagePath: "/zh/",
  entry: "",
  objectSlug: "",
});
assert.equal(
  classifyLeadSource(
    new URL("https://jotoglobal.com/fa/contact?product=c881-k9"),
  ).sourceKey,
  "mall-product-inquiry",
);
assert.equal(
  classifyLeadSource(
    new URL("https://jotoglobal.com/solutions/network/cisco"),
  ).sourceKey,
  "solution-contact-form",
);
assert.match(
  buildSalesMailto(new URL("https://jotoglobal.com/zh/contact")),
  /^mailto:sales@jotoglobal\.com\?subject=/,
);
assert.deepEqual(
  buildTrafficSource(
    new URL(
      "https://jotoglobal.com/contact?utm_source=google&utm_medium=cpc&utm_campaign=china",
    ),
    "https://google.com/",
  ),
  {
    source: "google",
    medium: "cpc",
    campaign: "china",
    keyword: "",
    utm_content: "",
    referrer: "https://google.com/",
  },
);

const runtimeFiles = await collectRuntimeFiles(projectRoot);
const runtimeSource = (
  await Promise.all(runtimeFiles.map((file) => readFile(file, "utf8")))
).join("\n");
const mainBundle = await readFile(
  path.join(projectRoot, "assets/index-DaFvN0XI.js"),
  "utf8",
);

assert.doesNotMatch(runtimeSource, /sales@jototech\.cn/);
assert.doesNotMatch(
  runtimeSource,
  /tomi@jototech\.cn|amy\.geng@jototech\.cn|shuting\.wang@jototech\.cn|jungleqiu@icloud\.com/,
);
assert.match(
  mainBundle,
  /import"\.\/jotoglobal-lead-routing\.js\?v=20260811-1"/,
);

console.log(
  `Verified JOTO Global Lead routing helpers and ${runtimeFiles.length} runtime files.`,
);
