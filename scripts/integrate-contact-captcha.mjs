// Adds the enquiry-form verification code module to every page that loads the
// shared site bundle. Idempotent: running it twice changes nothing.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CAPTCHA_VERSION = "20261125-1";
export const CAPTCHA_SCRIPT = `<script type="module" src="/assets/jotoglobal-contact-captcha.js?v=${CAPTCHA_VERSION}"></script>`;
const BUNDLE_TAG = /<script type="module" crossorigin src="\/assets\/index-covers-fe2c6a4b8409\.js\?v=[^"]+"><\/script>/;
const EXISTING = /<script type="module" src="\/assets\/jotoglobal-contact-captcha\.js\?v=[^"]+"><\/script>/;
const SKIP = new Set([".git", ".github", "docs", "fixtures", "node_modules", "preview", "scripts", "work"]);

export async function collectPages(directory = projectRoot, relative = "") {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const rel = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) pages.push(...(await collectPages(absolute, rel)));
    else if (entry.name.endsWith(".html")) pages.push(rel);
  }
  return pages;
}

export function integrate(html) {
  if (!BUNDLE_TAG.test(html)) return html;
  if (EXISTING.test(html)) return html.replace(EXISTING, CAPTCHA_SCRIPT);
  return html.replace(BUNDLE_TAG, (tag) => `${tag}\n    ${CAPTCHA_SCRIPT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let changed = 0;
  let withBundle = 0;
  for (const page of await collectPages()) {
    const file = path.join(projectRoot, page);
    const source = await readFile(file, "utf8");
    if (BUNDLE_TAG.test(source)) withBundle += 1;
    const next = integrate(source);
    if (next !== source) {
      await writeFile(file, next);
      changed += 1;
    }
  }
  console.log(`Contact captcha script present on ${withBundle} pages (${changed} updated).`);
}
