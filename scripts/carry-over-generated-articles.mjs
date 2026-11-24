// Carries the generated articles that are live in the current release over to
// a new release, unchanged.
//
// Generated articles (blog/<slug>/, zh/blog/<slug>/, fa/blog/<slug>/, their
// media under article-data/, and article-sitemap.xml) are published by the
// server-side article publisher, which can run a newer renderer than the one in
// this repository. Re-rendering them from the repository on every site release
// would silently replace production article pages, so a site release keeps the
// pages that are already live instead.
//
// Usage: node scripts/carry-over-generated-articles.mjs --from <current release> --to <new release>
// Exit code 3 means the current release has no article manifest (nothing to carry).
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => (index % 2 === 0 ? [...pairs, [value.replace(/^--/, ""), all[index + 1]]] : pairs), []),
);
const from = path.resolve(args.from || "");
const to = path.resolve(args.to || "");
if (!args.from || !args.to || from === to) {
  console.error("Usage: --from <current release> --to <new release>");
  process.exit(2);
}

const manifestPath = path.join(from, "article-data/manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error(`No article manifest in ${from}`);
  process.exit(3);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const routes = manifest.routes || [];
const ROUTE = /^\/(?:zh\/|fa\/)?blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;

let pages = 0;
for (const route of routes) {
  if (!ROUTE.test(route)) throw new Error(`unexpected generated article route: ${route}`);
  const source = path.join(from, route, "index.html");
  const target = path.join(to, route, "index.html");
  if (!fs.existsSync(source)) throw new Error(`missing generated article page: ${route}`);
  if (fs.existsSync(target)) throw new Error(`release already contains ${route}; refusing to overwrite`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  pages++;
}

fs.cpSync(path.join(from, "article-data"), path.join(to, "article-data"), { recursive: true, errorOnExist: false, force: true });
for (const file of ["article-sitemap.xml"]) {
  if (fs.existsSync(path.join(from, file))) fs.copyFileSync(path.join(from, file), path.join(to, file));
}
console.log(`Carried over ${pages} generated article pages (${manifest.articleCount ?? "?"} articles) from ${from}`);
