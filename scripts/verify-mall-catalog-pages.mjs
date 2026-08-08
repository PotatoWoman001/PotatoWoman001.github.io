import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const version = "20260805-1";
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
    if ([".git", ".playwright-cli", ".superpowers", "docs", "preview", "scripts", "work"].includes(entry.name)) {
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
  assert.ok(html.includes(`/assets/contact-form-sections.css?v=${version}`));
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
assert.match(client, /hasProductImage/);
assert.match(client, /\.filter\(\s*hasProductImage/);
assert.match(product, /\/mall\/products\//);
assert.match(product, /textContent/);
assert.match(product, /DOMParser/);
assert.match(product, /addEventListener\("error"/);
assert.match(product, /failedImages/);
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
  assert.match(asset, /\.js\?v=20260805-1/);
}
assert.match(product, /og:type", "product"/);
assert.match(product, /"@type": "Product"/);
assert.match(product, /hreflang|upsertLink\("alternate"/);
assert.match(product, /"x-default"/);
assert.doesNotMatch(product, /\boffers\b|\bprice\b|\bcurrency\b|\bsku\b/i);
assert.doesNotMatch(i18n, /\b(?:price|currency|cart|checkout|payment)\b/i);
for (const expected of [
  "joto-mall__category-navigation",
  "joto-mall__category--active",
  "locale.allProducts",
  "locale.moreCategories",
]) {
  assert.ok(pages.includes(expected), `Mall category renderer missing ${expected}`);
}
for (const expected of [
  "allProducts:",
  "moreCategories:",
  "clearFilters:",
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
assert.match(pages, /createContactForm/);
assert.match(pages, /pageSize:\s*24/);
assert.doesNotMatch(pages, /locale\.allBrands/);
assert.doesNotMatch(pages, /locale\.allStatuses/);
assert.doesNotMatch(pages, /locale\.allConditions/);
assert.doesNotMatch(pages, /locale\.sortRecent/);
assert.doesNotMatch(pages, /joto-mall__section--recent/);
assert.doesNotMatch(pages, /\.slice\(0,\s*12\)/);
assert.match(pages, /function renderCatalog\(/);
assert.match(pages, /renderCatalog\(mount,\s*index,\s*\{\s*mode:\s*"home"/);
assert.match(pages, /renderCatalog\(mount,\s*index,\s*\{\s*mode:\s*"list"/);
assert.match(pages, /className:\s*"joto-mall__card-type"/);
assert.match(pages, /state\.category\s*\|\|\s*locale\.allProductsHeading/);
assert.match(pages, /title:\s*model\.trim\(\)\s*\|\|\s*undefined/);
assert.match(pages, /function paginationItems\(/);
assert.ok(
  i18n.includes(
    'homeIntro: "浏览 JOTO 可提供的产品型号、技术资料与应用场景。"',
  ),
  "Chinese Mall intro copy is stale",
);
assert.match(styles, /\.joto-mall__native-select[\s\S]*position:\s*absolute/);
assert.match(
  styles,
  /\.joto-mall__select-menu[\s\S]*background:\s*var\(--mall-surface-raised\)/,
);
assert.match(styles, /\.joto-mall__select-option[\s\S]*min-height:\s*44px/);
assert.match(
  styles,
  /\.joto-mall__category-navigation\s*\{[\s\S]*display:\s*flex[\s\S]*overflow-x:\s*auto/,
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
  "--mall-bg: #ffffff",
  "--mall-surface: #ffffff",
  "--mall-surface-raised: #ffffff",
  "--mall-ink: #0a0f0c",
  "--mall-green: #5dd3a0",
  "color-scheme: light",
  'html[lang^="en"] [data-joto-mall]',
  'html[lang^="zh"] [data-joto-mall]',
  'html[lang^="fa"] [data-joto-mall]',
  "font-family: Poppins, sans-serif",
  'font-family: Poppins, "PingFang SC", "Microsoft YaHei", sans-serif',
  "font-family: Poppins, Vazirmatn, sans-serif",
]) {
  assert.ok(styles.includes(expected), `Mall styles missing ${expected}`);
}
assert.match(
  styles,
  /\.joto-mall__cards--grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(6/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*1279px\)[\s\S]*\.joto-mall__cards--grid[\s\S]*repeat\(3/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*767px\)[\s\S]*\.joto-mall__cards--grid[\s\S]*repeat\(2/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*419px\)[\s\S]*\.joto-mall__cards--grid[\s\S]*grid-template-columns:\s*repeat\(2/,
);
assert.match(
  styles,
  /\.joto-mall__card-model\s*\{[\s\S]*white-space:\s*nowrap/,
);
assert.doesNotMatch(
  styles,
  /\.joto-mall__card-model\s*\{[\s\S]{0,320}-webkit-line-clamp/,
);
assert.match(styles, /radial-gradient\([\s\S]*linear-gradient\(/);
assert.match(
  styles,
  /\.joto-mall__contact-panel\s*\{[\s\S]*border:\s*0[\s\S]*background:\s*transparent/,
);
assert.match(
  styles,
  /\.joto-mall__cards--list[\s\S]*max-height:\s*76px/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*639px\)[\s\S]*\.joto-mall__cards--list[\s\S]*max-height:\s*68px/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*639px\)[\s\S]*\.joto-mall__cards--list \.joto-mall__card-media[\s\S]*height:\s*66px/,
);
assert.match(styles, /#root:has\(\[data-joto-mall-product\]\)/);
assert.match(
  styles,
  /\[data-joto-mall\]\[data-joto-mall-product\][\s\S]*border-radius:\s*18px/,
);
assert.match(
  styles,
  /\[data-joto-mall\]\[data-joto-mall-product\]\s*\{[\s\S]*?max-width:\s*1280px/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*639px\)[\s\S]*?\[data-joto-mall\]\[data-joto-mall-product\]\s*\{[\s\S]*?width:\s*min\(100%\s*-\s*40px,\s*1280px\)/,
);
assert.doesNotMatch(
  styles,
  /\[data-joto-mall\]\[data-joto-mall-product\][\s\S]{0,240}(?:margin-left|margin-right):/,
);
assert.match(
  styles,
  /@media\s*\(max-width:\s*639px\)[\s\S]*\.joto-mall__product-summary h1[\s\S]*font-size:\s*26px\s*!important/,
);
assert.doesNotMatch(
  styles,
  /@media\s*\(max-width:\s*639px\)[\s\S]*\.joto-mall__sticky-contact\s*\{[\s\S]*position:\s*sticky/,
);
assert.doesNotMatch(styles, /background-size:\s*32px 32px/);
assert.match(
  styles,
  /\.joto-mall__hero-title[\s\S]*font-size:\s*clamp\(34px,\s*5vw,\s*56px\)/,
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
