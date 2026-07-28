import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const version = "20260728-6";
const expectedRouteCount = 108;

const excludedDirectories = new Set([
  ".git",
  ".playwright-cli",
  ".superpowers",
  "docs",
  "preview",
  "scripts",
]);

const mallRoutes = [
  {
    source: "about/index.html",
    route: "mall/index.html",
    lang: "en",
    dir: "ltr",
    title: "JOTO Mall | JOTO TECH",
    description:
      "Product models and product categories are being prepared. Please check back soon.",
    canonical: "https://jotoglobal.com/mall/",
  },
  {
    source: "zh/about/index.html",
    route: "zh/mall/index.html",
    lang: "zh-CN",
    dir: "ltr",
    title: "JOTO 产品商城 | JOTO TECH",
    description: "产品型号与产品分类内容正在整理中，敬请期待。",
    canonical: "https://jotoglobal.com/zh/mall/",
  },
  {
    source: "fa/about/index.html",
    route: "fa/mall/index.html",
    lang: "fa-IR",
    dir: "rtl",
    title: "فروشگاه محصولات JOTO | JOTO TECH",
    description:
      "مدل‌ها و دسته‌بندی‌های محصولات در حال آماده‌سازی هستند. به‌زودی دوباره مراجعه کنید.",
    canonical: "https://jotoglobal.com/fa/mall/",
  },
];

const typographyTag =
  `<link rel="stylesheet" href="/assets/site-typography-system.css?v=${version}">`;
const mallScriptTag =
  `<script type="module" src="/assets/mall-navigation-and-page.js?v=${version}"></script>`;

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

function seedMallShell(source, config) {
  let html = source
    .replace(/<html\b[^>]*>/, `<html lang="${config.lang}" dir="${config.dir}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${config.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${config.description}" />`,
    )
    .replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      '<meta name="robots" content="index, follow" />',
    )
    .replace(
      /^\s*<link[^>]+data-joto-mall-seed[^>]*>\s*$/gm,
      "",
    )
    .replace(
      /^\s*<meta[^>]+data-joto-mall-seed[^>]*>\s*$/gm,
      "",
    );

  const seoSeed = [
    `<link rel="canonical" href="${config.canonical}" data-joto-mall-seed>`,
    `<link rel="alternate" hreflang="en" href="https://jotoglobal.com/mall/" data-joto-mall-seed>`,
    `<link rel="alternate" hreflang="zh-CN" href="https://jotoglobal.com/zh/mall/" data-joto-mall-seed>`,
    `<link rel="alternate" hreflang="fa-IR" href="https://jotoglobal.com/fa/mall/" data-joto-mall-seed>`,
    `<link rel="alternate" hreflang="x-default" href="https://jotoglobal.com/mall/" data-joto-mall-seed>`,
    `<meta property="og:title" content="${config.title}" data-joto-mall-seed>`,
    `<meta property="og:description" content="${config.description}" data-joto-mall-seed>`,
    `<meta property="og:url" content="${config.canonical}" data-joto-mall-seed>`,
  ].join("\n    ");

  html = html.replace(
    /(\s*<title>[^<]*<\/title>)/,
    `$1\n    ${seoSeed}`,
  );
  return html.replace(/\n{3,}/g, "\n\n");
}

async function generateMallShells() {
  for (const config of mallRoutes) {
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
    ? html.replace(mallScriptPattern, mallScriptTag)
    : html.replace(bundleScriptPattern, `$&\n    ${mallScriptTag}`);
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

const sitemapBlock = `  <!-- JOTO Mall routes · 2026-07-28 -->
  <url>
    <loc>https://jotoglobal.com/mall/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://jotoglobal.com/mall/" />
    <xhtml:link rel="alternate" hreflang="zh-CN" href="https://jotoglobal.com/zh/mall/" />
    <xhtml:link rel="alternate" hreflang="fa-IR" href="https://jotoglobal.com/fa/mall/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://jotoglobal.com/mall/" />
  </url>
  <url>
    <loc>https://jotoglobal.com/zh/mall/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://jotoglobal.com/mall/" />
    <xhtml:link rel="alternate" hreflang="zh-CN" href="https://jotoglobal.com/zh/mall/" />
    <xhtml:link rel="alternate" hreflang="fa-IR" href="https://jotoglobal.com/fa/mall/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://jotoglobal.com/mall/" />
  </url>
  <url>
    <loc>https://jotoglobal.com/fa/mall/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://jotoglobal.com/mall/" />
    <xhtml:link rel="alternate" hreflang="zh-CN" href="https://jotoglobal.com/zh/mall/" />
    <xhtml:link rel="alternate" hreflang="fa-IR" href="https://jotoglobal.com/fa/mall/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://jotoglobal.com/mall/" />
  </url>`;

async function updateSitemap() {
  const sitemapPath = path.join(projectRoot, "sitemap.xml");
  const source = await readFile(sitemapPath, "utf8");
  const withoutExistingBlock = source.replace(
    /\s*<!-- JOTO Mall routes · 2026-07-28 -->[\s\S]*?(?=\n<\/urlset>)/,
    "",
  );
  const integrated = withoutExistingBlock.replace(
    "\n</urlset>",
    `\n${sitemapBlock}\n</urlset>`,
  );
  await writeFile(sitemapPath, integrated);
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
