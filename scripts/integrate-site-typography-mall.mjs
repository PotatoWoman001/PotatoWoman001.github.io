import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const version = "20260803-3";
const expectedRouteCount = 114;

const excludedDirectories = new Set([
  ".git",
  ".playwright-cli",
  ".superpowers",
  "docs",
  "preview",
  "scripts",
]);

const mallCatalogRoutes = [
  ["about/index.html", "mall/index.html", "en", "ltr", "home"],
  ["zh/about/index.html", "zh/mall/index.html", "zh-CN", "ltr", "home"],
  ["fa/about/index.html", "fa/mall/index.html", "fa-IR", "rtl", "home"],
  ["about/index.html", "mall/products/index.html", "en", "ltr", "products"],
  ["zh/about/index.html", "zh/mall/products/index.html", "zh-CN", "ltr", "products"],
  ["fa/about/index.html", "fa/mall/products/index.html", "fa-IR", "rtl", "products"],
  ["about/index.html", "mall/product/index.html", "en", "ltr", "product"],
  ["zh/about/index.html", "zh/mall/product/index.html", "zh-CN", "ltr", "product"],
  ["fa/about/index.html", "fa/mall/product/index.html", "fa-IR", "rtl", "product"],
].map(([source, route, lang, dir, mode]) => ({
  source,
  route,
  lang,
  dir,
  mode,
}));

const routeCopy = {
  en: {
    mall: "Mall",
    products: "Products",
    loading: "Loading product catalog…",
    description: "Explore technology products, models and technical details from JOTO TECH.",
  },
  "zh-CN": {
    mall: "商城",
    products: "产品",
    loading: "正在加载产品目录…",
    description: "浏览 JOTO TECH 整理的技术产品、型号与技术资料。",
  },
  "fa-IR": {
    mall: "فروشگاه",
    products: "محصولات",
    loading: "در حال بارگذاری فهرست محصولات…",
    description: "محصولات فناوری، مدل‌ها و جزئیات فنی JOTO TECH را مرور کنید.",
  },
};

const typographyTag =
  `<link rel="stylesheet" href="/assets/site-typography-system.css?v=${version}">`;
const mallNavigationTag =
  `<script type="module" src="/assets/mall-navigation-and-page.js?v=${version}"></script>`;
const mallCatalogStyleTag =
  `<link rel="stylesheet" href="/assets/mall-catalog.css?v=${version}">`;
const contactFormStyleTag =
  `<link rel="stylesheet" href="/assets/contact-form-sections.css?v=${version}">`;

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

function routePrefix(route) {
  return route.startsWith("zh/") ? "/zh" : route.startsWith("fa/") ? "/fa" : "";
}

function routeMetadata(config) {
  const copy = routeCopy[config.lang];
  const prefix = routePrefix(config.route);
  const routePath =
    config.mode === "home"
      ? `${prefix}/mall/`
      : config.mode === "products"
        ? `${prefix}/mall/products/`
        : `${prefix}/mall/product/`;
  const pageName = config.mode === "home" ? copy.mall : copy.products;
  return {
    ...copy,
    title: `${pageName} | JOTO TECH`,
    canonical: `https://jotoglobal.com${routePath}`,
    mount:
      config.mode === "home"
        ? "data-joto-mall-home"
        : config.mode === "products"
          ? "data-joto-mall-products"
          : "data-joto-mall-product",
    script:
      config.mode === "product"
        ? "mall-product-page.js"
        : "mall-catalog-pages.js",
  };
}

function removeGeneratedMallTags(html) {
  return html
    .replace(/\s*<template data-joto-mall-shell[\s\S]*?<\/template>/g, "")
    .replace(/\s*<(?:link|meta)[^>]+data-joto-mall-seed[^>]*>/g, "")
    .replace(
      /\s*<script type="module" src="\/assets\/(?:mall-catalog-pages|mall-product-page)\.js(?:\?v=[^"]+)?"><\/script>/g,
      "",
    )
    .replace(
      /\s*<link rel="stylesheet" href="\/assets\/mall-catalog\.css(?:\?v=[^"]+)?">/g,
      "",
    )
    .replace(
      /\s*<link rel="stylesheet" href="\/assets\/contact-form-sections\.css(?:\?v=[^"]+)?">/g,
      "",
    );
}

function seedMallShell(source, config) {
  const metadata = routeMetadata(config);
  let html = removeGeneratedMallTags(source)
    .replace(/<html\b[^>]*>/, `<html lang="${config.lang}" dir="${config.dir}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${metadata.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${metadata.description}" />`,
    )
    .replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${config.mode === "product" ? "noindex, follow" : "index, follow"}" />`,
    );

  const headSeed = [
    `<link rel="canonical" href="${metadata.canonical}" data-joto-mall-seed>`,
    `<meta property="og:title" content="${metadata.title}" data-joto-mall-seed>`,
    `<meta property="og:description" content="${metadata.description}" data-joto-mall-seed>`,
    `<meta property="og:url" content="${metadata.canonical}" data-joto-mall-seed>`,
    mallCatalogStyleTag,
    contactFormStyleTag,
    `<script type="module" src="/assets/${metadata.script}?v=${version}"></script>`,
  ].join("\n    ");
  html = html.replace(/(\s*<\/head>)/, `\n    ${headSeed}$1`);

  const shell = [
    `<template data-joto-mall-shell="${config.mode}">`,
    `  <section ${metadata.mount} data-joto-mall aria-busy="true">`,
    `    <p role="status" aria-live="polite">${metadata.loading}</p>`,
    "  </section>",
    "</template>",
  ].join("\n    ");
  html = html.replace(/(\s*<\/body>)/, `\n    ${shell}$1`);
  return html.replace(/\n{3,}/g, "\n\n");
}

async function generateMallShells() {
  for (const config of mallCatalogRoutes) {
    const source = await readFile(path.join(projectRoot, config.source), "utf8");
    const target = path.join(projectRoot, config.route);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, seedMallShell(source, config));
  }
}

function integrateGlobalAssets(source, route) {
  let html = source;
  const bundleScriptPattern =
    /<script type="module" crossorigin src="\/assets\/index-DaFvN0XI\.js(?:\?v=[^"]+)?"><\/script>/;
  const bundleStylePattern =
    /<link rel="stylesheet" crossorigin href="\/assets\/index-e49ffBFL\.css(?:\?v=[^"]+)?">/;
  const mallScriptPattern =
    /<script type="module" src="\/assets\/mall-navigation-and-page\.js(?:\?v=[^"]+)?"><\/script>/;
  const typographyPattern =
    /<link rel="stylesheet" href="\/assets\/site-typography-system\.css(?:\?v=[^"]+)?">/;
  if (!bundleScriptPattern.test(html)) {
    throw new Error(`${route} is missing the shared JavaScript bundle.`);
  }
  if (!bundleStylePattern.test(html)) {
    throw new Error(`${route} is missing the shared stylesheet.`);
  }
  html = mallScriptPattern.test(html)
    ? html.replace(mallScriptPattern, mallNavigationTag)
    : html.replace(bundleScriptPattern, `$&\n    ${mallNavigationTag}`);
  html = typographyPattern.test(html)
    ? html.replace(typographyPattern, typographyTag)
    : html.replace(bundleStylePattern, `$&\n    ${typographyTag}`);
  return html
    .replace(
      /\/assets\/([^"'?<>]+\.(?:js|css))(?:\?v=[^"'<>]+)?/g,
      `/assets/$1?v=${version}`,
    )
    .replace(/\n{3,}/g, "\n\n");
}

function sitemapEntry(route, base) {
  return `  <url>
    <loc>https://jotoglobal.com${route}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://jotoglobal.com${base}" />
    <xhtml:link rel="alternate" hreflang="zh-CN" href="https://jotoglobal.com/zh${base}" />
    <xhtml:link rel="alternate" hreflang="fa-IR" href="https://jotoglobal.com/fa${base}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://jotoglobal.com${base}" />
  </url>`;
}

const sitemapBlock = `  <!-- JOTO Mall static routes · 2026-07-29 -->
${["/mall/", "/mall/products/"]
  .flatMap((base) =>
    ["", "/zh", "/fa"].map((prefix) => sitemapEntry(`${prefix}${base}`, base)),
  )
  .join("\n")}`;

async function updateSitemap() {
  const sitemapPath = path.join(projectRoot, "sitemap.xml");
  const source = await readFile(sitemapPath, "utf8");
  const withoutExistingBlock = source
    .replace(/\s*<!-- JOTO Mall routes · 2026-07-28 -->[\s\S]*?(?=\n<\/urlset>)/, "")
    .replace(/\s*<!-- JOTO Mall static routes · 2026-07-29 -->[\s\S]*?(?=\n<\/urlset>)/, "");
  await writeFile(
    sitemapPath,
    withoutExistingBlock.replace("\n</urlset>", `\n${sitemapBlock}\n</urlset>`),
  );
}

await generateMallShells();
const routeFiles = (await collectIndexFiles(projectRoot)).sort();
if (routeFiles.length !== expectedRouteCount) {
  throw new Error(
    `Expected ${expectedRouteCount} formal route indexes, found ${routeFiles.length}.`,
  );
}

let changedFiles = 0;
for (const route of [...routeFiles, "404.html"]) {
  const target = path.join(projectRoot, route);
  const source = await readFile(target, "utf8");
  const integrated = integrateGlobalAssets(source, route);
  if (integrated === source) continue;
  await writeFile(target, integrated);
  changedFiles += 1;
}
await updateSitemap();
console.log(
  `Integrated typography and Mall assets across ${routeFiles.length} routes plus 404.html.`,
);
console.log(`${changedFiles} HTML files changed.`);
