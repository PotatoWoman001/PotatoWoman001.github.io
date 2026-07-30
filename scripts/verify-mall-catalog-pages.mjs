import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const version = "20260729-7";
const routes = [
  ["mall/index.html", "en", "ltr", "home", "mall-catalog-pages.js"],
  ["zh/mall/index.html", "zh-CN", "ltr", "home", "mall-catalog-pages.js"],
  ["fa/mall/index.html", "fa-IR", "rtl", "home", "mall-catalog-pages.js"],
  ["mall/products/index.html", "en", "ltr", "products", "mall-catalog-pages.js"],
  ["zh/mall/products/index.html", "zh-CN", "ltr", "products", "mall-catalog-pages.js"],
  ["fa/mall/products/index.html", "fa-IR", "rtl", "products", "mall-catalog-pages.js"],
  ["mall/product/index.html", "en", "ltr", "product", "mall-product-page.js"],
  ["zh/mall/product/index.html", "zh-CN", "ltr", "product", "mall-product-page.js"],
  ["fa/mall/product/index.html", "fa-IR", "rtl", "product", "mall-product-page.js"],
];

async function collectIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if ([".git", ".playwright-cli", ".superpowers", "docs", "preview", "scripts"].includes(entry.name)) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await collectIndexFiles(absolute)));
    else if (entry.name === "index.html") found.push(absolute);
  }
  return found;
}

assert.equal((await collectIndexFiles(root)).length, 114);
for (const [route, lang, dir, mode, script] of routes) {
  assert.equal(existsSync(path.join(root, route)), true, `${route} missing`);
  const html = await readFile(path.join(root, route), "utf8");
  assert.match(html, new RegExp(`<html lang="${lang}" dir="${dir}">`));
  assert.ok(html.includes(`data-joto-mall-shell="${mode}"`));
  assert.ok(html.includes(`/assets/mall-catalog.css?v=${version}`));
  assert.ok(html.includes(`/assets/${script}?v=${version}`));
  for (const match of html.matchAll(/\/assets\/[^"'<>]+\.(?:js|css)\?v=([^"'<>]+)/g)) {
    assert.equal(match[1], version, `${route} has mismatched cache version`);
  }
  assert.doesNotMatch(html, /being prepared|正在整理|در حال آماده‌سازی/);
}

const [pages, product, styles, client, i18n, nginx, robots, sitemap] = await Promise.all([
  readFile("assets/mall-catalog-pages.js", "utf8"),
  readFile("assets/mall-product-page.js", "utf8"),
  readFile("assets/mall-catalog.css", "utf8"),
  readFile("assets/mall-data-client.js", "utf8"),
  readFile("assets/mall-i18n.js", "utf8"),
  readFile("deploy/local/nginx.conf", "utf8"),
  readFile("robots.txt", "utf8"),
  readFile("sitemap.xml", "utf8"),
]);

assert.match(client, /\/mall-data\//);
assert.match(pages, /history\.pushState/);
assert.match(pages, /popstate/);
assert.match(pages, /aria-live/);
assert.match(pages, /scrollIntoView/);
assert.match(pages, /textContent/);
assert.match(pages, /hasProductImage/);
assert.match(pages, /\.filter\(hasProductImage\)/);
assert.match(product, /\/mall\/products\//);
assert.match(product, /textContent/);
assert.match(product, /DOMParser/);
assert.match(product, /ALLOWED_DESCRIPTION_TAGS/);
assert.match(product, /BLOCKED_DESCRIPTION_TAGS/);
assert.match(product, /technicalDirection|dir:\s*"ltr"|dir:\s*"ltr"/);
assert.match(product, /joto:mall-product-ready/);
assert.match(product, /description_html/);
assert.match(product, /if \(product\.brand\)|product\.brand\s*\?/);
assert.doesNotMatch(product, /product\.source_url|locale\.source/);
assert.doesNotMatch(i18n, /^\s*source:\s*/m);
assert.doesNotMatch(`${pages}\n${product}`, /\.innerHTML\s*=/);
for (const asset of [pages, product]) {
  assert.match(asset, /\.js\?v=20260729-7/);
}
assert.match(product, /og:type", "product"/);
assert.match(product, /"@type": "Product"/);
assert.match(product, /hreflang|upsertLink\("alternate"/);
assert.match(product, /"x-default"/);
assert.doesNotMatch(product, /\boffers\b|\bprice\b|\bcurrency\b|\bsku\b/i);
assert.doesNotMatch(i18n, /\b(?:price|currency|cart|checkout|payment)\b/i);
for (const expected of [
  "joto-mall__section--categories",
  "joto-mall__category--active",
  "locale.allProducts",
  "locale.viewAllProducts",
]) {
  assert.ok(pages.includes(expected), `Mall category renderer missing ${expected}`);
}
for (const expected of [
  "allProducts:",
  "viewAllProducts:",
]) {
  assert.equal(
    [...i18n.matchAll(new RegExp(`^\\s*${expected}`, "gm"))].length,
    3,
    `Mall locale copy missing three ${expected} entries`,
  );
}
for (const expected of [
  "joto-mall__custom-select",
  "joto-mall__native-select",
  "joto-mall__select-trigger",
  "joto-mall__select-menu",
  'role: "listbox"',
  'role: "option"',
  '"aria-haspopup": "listbox"',
  '"aria-selected"',
]) {
  assert.ok(pages.includes(expected), `Mall custom select renderer missing ${expected}`);
}
assert.doesNotMatch(pages, /function selectControl\([^)]*values[^)]*allLabel/);
assert.match(pages, /\{\s*value:\s*"title",\s*label:\s*locale\.sortTitle/);
assert.match(pages, /\{\s*value:\s*"brand",\s*label:\s*locale\.sortBrand/);
assert.match(pages, /\{\s*value:\s*"recent",\s*label:\s*locale\.sortRecent/);
assert.match(pages, /\{\s*value:\s*"asc",\s*label:\s*locale\.ascending/);
assert.match(pages, /\{\s*value:\s*"desc",\s*label:\s*locale\.descending/);
assert.match(styles, /\.joto-mall__native-select[\s\S]*position:\s*absolute/);
assert.match(styles, /\.joto-mall__select-menu[\s\S]*background:\s*#0c1712/);
assert.match(styles, /\.joto-mall__select-option[\s\S]*min-height:\s*44px/);
assert.match(
  styles,
  /\.joto-mall__section--categories\s*\{[\s\S]*padding-block:\s*32px/,
);
assert.match(
  styles,
  /\.joto-mall__category-grid\s*\{[\s\S]*display:\s*flex[\s\S]*overflow-x:\s*auto/,
);
assert.match(
  styles,
  /\.joto-mall__category\s*\{[\s\S]*min-height:\s*40px[\s\S]*font-size:\s*14px/,
);
assert.match(styles, /scrollbar-width:\s*none/);
assert.match(styles, /white-space:\s*nowrap/);
assert.doesNotMatch(
  styles,
  /\.joto-mall__category\s*\{[\s\S]*?min-height:\s*144px[\s\S]*?\}/,
);
assert.match(styles, /grid-template-columns:\s*repeat\(3/);
assert.match(styles, /grid-template-columns:\s*repeat\(2/);
assert.match(styles, /grid-template-columns:\s*1fr/);
assert.match(styles, /scale\(1\.015\)/);
assert.doesNotMatch(styles, /height\s+\d+ms|transition:\s*height/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(styles, /aspect-ratio/);
assert.match(styles, /object-fit:\s*contain/);
for (const expected of [
  "--mall-bg: #050a08",
  "--mall-surface: #08110d",
  "--mall-green: #5dd3a0",
  'html[lang^="en"] [data-joto-mall]',
  'html[lang^="zh"] [data-joto-mall]',
  'html[lang^="fa"] [data-joto-mall]',
  "font-family: Poppins, sans-serif",
  'font-family: Poppins, "PingFang SC", "Microsoft YaHei", sans-serif',
  "font-family: Poppins, Vazirmatn, sans-serif",
]) {
  assert.ok(styles.includes(expected), `Mall styles missing ${expected}`);
}
assert.doesNotMatch(styles, /background-size:\s*32px 32px/);
assert.match(
  styles,
  /\.joto-mall__hero-title[\s\S]*font-size:\s*clamp\(34px,\s*5vw,\s*56px\)/,
);
assert.match(
  styles,
  /\.joto-mall__card-title[\s\S]*font-size:\s*18px/,
);
for (const route of [
  "/zh/mall/product/index.html",
  "/fa/mall/product/index.html",
  "/mall/product/index.html",
  "/mall-data/",
  "/mall-sitemap.xml",
]) {
  assert.ok(nginx.includes(route), `nginx missing ${route}`);
}
assert.ok(robots.includes("Sitemap: https://jotoglobal.com/sitemap.xml"));
assert.ok(robots.includes("Sitemap: https://jotoglobal.com/mall-sitemap.xml"));
for (const route of [
  "/mall/",
  "/zh/mall/",
  "/fa/mall/",
  "/mall/products/",
  "/zh/mall/products/",
  "/fa/mall/products/",
]) {
  assert.ok(sitemap.includes(`<loc>https://jotoglobal.com${route}</loc>`));
}

console.log("Verified nine localized Mall shells, catalog controllers, styling, and local routing.");
