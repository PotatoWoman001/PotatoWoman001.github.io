import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = "20260805-1";
const expectedRouteCount = 114;
const excludedDirectories = new Set([
  ".git",
  ".playwright-cli",
  ".superpowers",
  "docs",
  "preview",
  "scripts",
  "work",
]);

function collectIndexFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excludedDirectories.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectIndexFiles(absolute);
    return entry.name === "index.html" ? [absolute] : [];
  });
}

const routeFiles = collectIndexFiles(root);
assert.equal(
  routeFiles.length,
  expectedRouteCount,
  `expected all ${expectedRouteCount} formal route indexes`,
);

const typographyUrl =
  `/assets/site-typography-system.css?v=${version}`;
const mallScriptUrl =
  `/assets/mall-navigation-and-page.js?v=${version}`;

for (const routeFile of [...routeFiles, path.join(root, "404.html")]) {
  const route = path.relative(root, routeFile);
  const html = readFileSync(routeFile, "utf8");
  assert.ok(html.includes(typographyUrl), `${route} missing typography CSS`);
  assert.ok(html.includes(mallScriptUrl), `${route} missing Mall module`);
  assert.doesNotMatch(
    html,
    /\/assets\/[^"'?<>]+\.(?:js|css)(?=["'])/,
    `${route} contains an unversioned browser asset`,
  );
  for (const match of html.matchAll(/\/assets\/[^"'<>]+\.(?:js|css)\?v=([^"'<>]+)/g)) {
    assert.equal(
      match[1],
      version,
      `${route} contains a mismatched browser asset version`,
    );
  }
}

const mallRoutes = [
  {
    route: "mall/index.html",
    lang: "en",
    dir: "ltr",
    title: "Mall | JOTO TECH",
    description: "Explore technology products, models and technical details from JOTO TECH.",
  },
  {
    route: "zh/mall/index.html",
    lang: "zh-CN",
    dir: "ltr",
    title: "商城 | JOTO TECH",
    description: "浏览 JOTO TECH 整理的技术产品、型号与技术资料。",
  },
  {
    route: "fa/mall/index.html",
    lang: "fa-IR",
    dir: "rtl",
    title: "فروشگاه | JOTO TECH",
    description: "محصولات فناوری، مدل‌ها و جزئیات فنی JOTO TECH را مرور کنید.",
  },
];

for (const config of mallRoutes) {
  const absolute = path.join(root, config.route);
  assert.equal(existsSync(absolute), true, `${config.route} must exist`);
  const html = readFileSync(absolute, "utf8");
  assert.match(html, new RegExp(`<html lang="${config.lang}" dir="${config.dir}">`));
  assert.ok(html.includes(`<title>${config.title}</title>`));
  assert.ok(html.includes(config.description));
  assert.match(html, /rel="canonical"/);
  assert.match(html, /data-joto-mall-shell="home"/);
  assert.match(html, /data-joto-mall-home/);
}

const typography = readFileSync(
  path.join(root, "assets/site-typography-system.css"),
  "utf8",
);
for (const token of [
  "--joto-type-t0-size",
  "--joto-type-t1-size",
  "--joto-type-t2-size",
  "--joto-type-t3-size",
  "--joto-type-t4-size",
  "--joto-type-b1-size",
  "--joto-type-b2-size",
  "--joto-type-b3-size",
  "--joto-type-l1-size",
  "--joto-type-m1-size",
]) {
  assert.ok(typography.includes(token), `missing typography token ${token}`);
}
assert.match(typography, /--joto-font-latin:\s*Poppins,\s*sans-serif/);
assert.match(typography, /--joto-font-zh:\s*Poppins,/);
assert.match(typography, /--joto-font-fa:\s*Poppins,\s*Vazirmatn/);
assert.match(typography, /--joto-font-brand-serif:\s*"Instrument Serif",\s*serif/);
assert.match(
  typography,
  /html:lang\(zh\)\s*\{[\s\S]*--joto-type-t0-line:\s*1\.2;[\s\S]*--joto-type-t1-line:\s*1\.2;[\s\S]*--joto-type-t2-line:\s*1\.2;/,
);
assert.match(
  typography,
  /\.font-serif\.text-joto-green,[\s\S]*font-family:\s*var\(--joto-font-brand-serif\)/,
);
assert.match(typography, /@media \(max-width:\s*1279px\)/);
assert.match(typography, /@media \(max-width:\s*767px\)/);
assert.match(typography, /--joto-type-m1-size:\s*11px/);

const mallModule = readFileSync(
  path.join(root, "assets/mall-navigation-and-page.js"),
  "utf8",
);
const mainBundle = readFileSync(
  path.join(root, "assets/index-DaFvN0XI.js"),
  "utf8",
);
assert.match(mainBundle, /const cm=\["en","zh-CN"\]/);
assert.doesNotMatch(mainBundle, /const cm=\["en","zh-CN","fa-IR"\]/);
assert.match(mainBundle, /t==="fa"\|\|t\.startsWith\("fa-"\)\)return"fa-IR"/);
assert.match(mainBundle, /"fa-IR":\{dir:"rtl",label:"فارسی",prefix:"\/fa"\}/);
for (const expected of [
  'label: "Mall"',
  'label: "商城"',
  'label: "فروشگاه"',
  'path: "/mall/"',
  'path: "/zh/mall/"',
  'path: "/fa/mall/"',
  "data-joto-mall-link",
  "MutationObserver",
  "aria-current",
]) {
  assert.ok(mallModule.includes(expected), `Mall module missing ${expected}`);
}

const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const url of [
  "https://jotoglobal.com/mall/",
  "https://jotoglobal.com/zh/mall/",
  "https://jotoglobal.com/fa/mall/",
]) {
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap missing ${url}`);
}

console.log(
  `Verified site typography and localized Mall integration across ${routeFiles.length} routes.`,
);
