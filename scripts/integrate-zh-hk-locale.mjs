// Adds the Hong Kong Traditional Chinese locale (/zh-hk/, zh-HK) to the static
// JOTO Global site. Phase 1 covers the 35 core routes; the Mall and generated
// articles stay in Simplified Chinese (/zh/) and are linked there from /zh-hk/.
//
// The /zh-hk/ pages reuse the zh-CN application content. The bundle is patched
// so that routing, internal links, the language switcher, canonical/hreflang
// and browser-language auto-selection know about zh-HK, and
// assets/zh-hk-locale.js renders the zh-CN text in Hong Kong Traditional
// Chinese at runtime (see docs/zh-hk-review.csv for the review sheet).
//
// Usage: node scripts/integrate-zh-hk-locale.mjs   (idempotent)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://jotoglobal.com";
export const ZH_HK_ASSET_VERSION = "20261124-1";

export const CORE_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/blog",
  "/blog/connected-it-and-safeguarding",
  "/blog/enterprise-network-growth",
  "/blog/five-campus-standardisation",
  "/blog/it-operations-in-china",
  "/blog/multi-site-network-rollout",
  "/blog/practical-security-response",
  "/solutions/network",
  "/solutions/network/aruba",
  "/solutions/network/cisco",
  "/solutions/network/extreme-networks",
  "/solutions/network/sangfor",
  "/solutions/security",
  "/solutions/security/check-point",
  "/solutions/security/fortinet",
  "/solutions/security/knowbe4",
  "/solutions/security/onelogin",
  "/solutions/security/palo-alto-networks",
  "/solutions/security/sangfor",
  "/solutions/server-storage",
  "/solutions/server-storage/dell-technologies",
  "/solutions/server-storage/huawei",
  "/solutions/server-storage/inspur",
  "/solutions/collaboration",
  "/solutions/collaboration/audiocodes",
  "/solutions/collaboration/cyberdata",
  "/solutions/collaboration/informacast",
  "/solutions/collaboration/vodia",
  "/solutions/safeguarding",
  "/solutions/safeguarding/hikvision",
  "/solutions/safeguarding/keyking",
  "/solutions/safeguarding/verkada",
];

// Phase 1 = every zh/ route except preview/ and the Mall (/mall/, /mall/products/).
if (CORE_ROUTES.length !== 35) throw new Error("expected 35 phase-1 routes");

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), s);
};

function replaceOnce(source, find, replacement, label) {
  const first = source.indexOf(find);
  if (first === -1) throw new Error(`zh-HK patch "${label}": anchor not found`);
  if (source.indexOf(find, first + find.length) !== -1) {
    throw new Error(`zh-HK patch "${label}": anchor is not unique`);
  }
  return source.slice(0, first) + replacement + source.slice(first + find.length);
}

// ---------------------------------------------------------------- bundle
const BUNDLE = "assets/index-covers-fe2c6a4b8409.js";
const routeSet = JSON.stringify(CORE_ROUTES);

const bundlePatches = [
  [
    "locales",
    'const cm=["en","zh-CN"],Pc="joto:locale",Hs={en:{dir:"ltr",label:"EN",prefix:""},"zh-CN":{dir:"ltr",label:"中文",prefix:"/zh"},"fa-IR":{dir:"rtl",label:"فارسی",prefix:"/fa"}};',
    'const cm=["en","zh-CN","zh-HK","fa-IR"],Pc="joto:locale",Hs={en:{dir:"ltr",label:"EN",prefix:""},"zh-CN":{dir:"ltr",label:"简体中文",prefix:"/zh"},"zh-HK":{dir:"ltr",label:"繁體中文",prefix:"/zh-hk"},"fa-IR":{dir:"rtl",label:"فارسی",prefix:"/fa"}};' +
      "/* zh-HK locale: /zh-hk/ pages render zh-CN content through assets/zh-hk-locale.js */" +
      'function __hkPath(){return typeof window<"u"&&/^\\/zh-hk(?:\\/|$)/i.test(window.location.pathname)}' +
      'function __hkL(n){return n==="zh-CN"&&__hkPath()?"zh-HK":n}' +
      `const __hkRoutes=new Set(${routeSet});` +
      'function __hkHas(n){return __hkRoutes.has(String(n||"/").split(/[?#]/,1)[0].replace(/\\/+$/,"")||"/")}',
  ],
  [
    "browser language",
    'if(t==="zh"||t.startsWith("zh-"))return"zh-CN";',
    'if(t==="zh-hk"||t==="zh-mo"||t==="zh-tw"||t.startsWith("zh-hant")||t.startsWith("zh-hk-")||t.startsWith("zh-mo-")||t.startsWith("zh-tw-"))return"zh-HK";if(t==="zh"||t.startsWith("zh-"))return"zh-CN";',
  ],
  [
    "route detection",
    'function um(n){const e=Zd(n||"/");return e==="/zh"||e.startsWith("/zh/")?"zh-CN":',
    'function um(n){const e=Zd(n||"/");return e.toLowerCase()==="/zh-hk"||e.toLowerCase().startsWith("/zh-hk/")?"zh-HK":e==="/zh"||e.startsWith("/zh/")?"zh-CN":',
  ],
  [
    "route parsing",
    'return t==="zh-CN"?{locale:"zh-CN",pathname:e.slice(3)||"/"}:',
    'return t==="zh-HK"?{locale:"zh-CN",pathname:e.slice(6)||"/"}:t==="zh-CN"?{locale:"zh-CN",pathname:e.slice(3)||"/"}:',
  ],
  [
    "link prefix",
    'function _e(n,e){if(/^(?:https?:|mailto:|tel:)/.test(n))return n;const t=Hs[e].prefix;if(n.startsWith("#"))return t?Kh(`${t}${n}`):n;const i=n.match(/^([^?#]*)(.*)$/),s=(i==null?void 0:i[1])||"/",r=(i==null?void 0:i[2])||"",{pathname:a}=_o(s),o=',
    'function _e(n,e,x){if(/^(?:https?:|mailto:|tel:)/.test(n))return n;const hk=e==="zh-HK"||!x&&e==="zh-CN"&&__hkPath();let t=hk?"/zh-hk":Hs[e].prefix;if(n.startsWith("#"))return t?Kh(`${t}${n}`):n;const i=n.match(/^([^?#]*)(.*)$/),s=(i==null?void 0:i[1])||"/",r=(i==null?void 0:i[2])||"",{pathname:a}=_o(s);hk&&!__hkHas(a)&&(t=Hs["zh-CN"].prefix);const o=',
  ],
  [
    "switch href",
    "function Nc(n,e,t=\"\"){const{pathname:i}=_o(e);return`${_e(i,n)}${t}`}",
    "function Nc(n,e,t=\"\"){const{pathname:i}=_o(e);return`${_e(i,n,1)}${t}`}",
  ],
  [
    "document language",
    "document.documentElement.lang=i,document.documentElement.dir=r",
    "document.documentElement.lang=__hkL(i),document.documentElement.dir=r",
  ],
  [
    "language switcher",
    "function iT(){const{locale:n,switchHref:e,t}=Ie(),",
    "function iT(){const{locale:__n,switchHref:e,t}=Ie(),n=__hkL(__n),",
  ],
  [
    "seo prefixes",
    'Mk={en:"","zh-CN":"/zh","fa-IR":"/fa"};',
    'Mk={en:"","zh-CN":"/zh","zh-HK":"/zh-hk","fa-IR":"/fa"};',
  ],
  [
    "seo urls",
    "function jk(n,e){const t=Fk(n),i=Mk[e];",
    "function jk(n,e,x){const t=Fk(n),i=Mk[x?e:__hkL(e)];",
  ],
  [
    "seo absolute urls",
    "function Wi(n,e){return`${ni}${jk(n,e)}`}",
    "function Wi(n,e,x){return`${ni}${jk(n,e,x)}`}",
  ],
  [
    "seo alternates",
    'function Bk(n){return[{hreflang:"en",href:Wi(n,"en")},{hreflang:"zh-CN",href:Wi(n,"zh-CN")},{hreflang:"fa-IR",href:Wi(n,"fa-IR")},{hreflang:"x-default",href:Wi(n,"en")}]}',
    'function Bk(n){return[{hreflang:"en",href:Wi(n,"en",1)},{hreflang:"zh-CN",href:Wi(n,"zh-CN",1)},...__hkHas(Fk(n))?[{hreflang:"zh-HK",href:Wi(n,"zh-HK",1)}]:[],{hreflang:"fa-IR",href:Wi(n,"fa-IR",1)},{hreflang:"x-default",href:Wi(n,"en",1)}]}',
  ],
  [
    "og locales",
    'Ul={en:"en_US","zh-CN":"zh_CN","fa-IR":"fa_IR"}',
    'Ul={en:"en_US","zh-CN":"zh_CN","zh-HK":"zh_HK","fa-IR":"fa_IR"}',
  ],
  [
    "og locale",
    "locale:Ul[n],alternateLocales:Object.values(Ul).filter(r=>r!==Ul[n])",
    "locale:Ul[__hkL(n)],alternateLocales:Object.values(Ul).filter(r=>r!==Ul[__hkL(n)])",
  ],
  [
    "website inLanguage",
    'url:`${ni}/`,name:"JOTO TECH",inLanguage:n,',
    'url:`${ni}/`,name:"JOTO TECH",inLanguage:__hkL(n),',
  ],
];

function patchBundle() {
  let js = read(BUNDLE);
  if (js.includes("function __hkPath()")) return "already patched";
  for (const [label, find, replacement] of bundlePatches) {
    js = replaceOnce(js, find, replacement, label);
  }
  js = js.split("inLanguage:n.locale").join("inLanguage:__hkL(n.locale)");
  write(BUNDLE, js);
  return `applied ${bundlePatches.length + 1} patches`;
}

// ------------------------------------------------------------ side assets
function patchContactForm() {
  const file = "assets/contact-form-sections.js";
  let js = read(file);
  if (js.includes('"zh-hk"')) return "already patched";
  js = replaceOnce(
    js,
    'const locale = parts[0] === "zh" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";',
    '// /zh-hk/ pages reuse the zh-CN copy; assets/zh-hk-locale.js renders it in HK Traditional Chinese.\n  const locale = parts[0] === "zh" || parts[0] === "zh-hk" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";',
    "contact locale",
  );
  js = replaceOnce(
    js,
    "contactLink.href = `${LOCALE_PREFIXES[locale]}/contact`;",
    'contactLink.href = `${locale === "zh-CN" && /^\\/zh-hk(?:\\/|$)/i.test(window.location.pathname) ? "/zh-hk" : LOCALE_PREFIXES[locale]}/contact`;',
    "contact link",
  );
  write(file, js);
  return "patched";
}

function patchMallNavigation() {
  const file = "assets/mall-navigation-and-page.js";
  let js = read(file);
  if (js.includes("zhHk")) return "already patched";
  js = replaceOnce(
    js,
    '  zh: { key: "zh", label: "商城", path: "/zh/mall/", categoriesLabel: "产品分类" },\n',
    '  zh: { key: "zh", label: "商城", path: "/zh/mall/", categoriesLabel: "产品分类" },\n  // The Mall is not translated for zh-HK yet: /zh-hk/ pages link to the zh-CN Mall.\n  zhHk: { key: "zh", label: "商城", path: "/zh/mall/", categoriesLabel: "产品分类", blogPath: "/zh-hk/blog/" },\n',
    "mall locales",
  );
  js = replaceOnce(
    js,
    '  if (path.startsWith("/zh/") || path === "/zh") return LOCALES.zh;',
    '  if (path.startsWith("/zh-hk/") || path === "/zh-hk") return LOCALES.zhHk;\n  if (path.startsWith("/zh/") || path === "/zh") return LOCALES.zh;',
    "mall locale",
  );
  js = replaceOnce(
    js,
    '  return normalizedPath(link.href) === normalizedPath(locale.path.replace(/mall\\/?$/, "blog/"));',
    '  return normalizedPath(link.href) === normalizedPath(locale.blogPath || locale.path.replace(/mall\\/?$/, "blog/"));',
    "mall blog anchor",
  );
  write(file, js);
  return "patched";
}

function patchStyles() {
  const file = "assets/index-e49ffBFL.css";
  let css = read(file);
  if (css.includes("html[lang=zh-HK]")) return "already patched";
  for (const selector of ["main :is(h1,.hero-display-heading)", "main h2", "main h3", ".hero-accent-word"]) {
    css = replaceOnce(css, `html[lang=zh-CN] ${selector}{`, `html[lang=zh-CN] ${selector},html[lang=zh-HK] ${selector}{`, `css ${selector}`);
  }
  write(file, css);
  return "patched";
}


// Modules that read the locale from the URL path: teach them /zh-hk/.
function patchPathAwareModules() {
  const done = [];
  const patch = (file, pairs) => {
    let js = read(file);
    if (js.includes("zh-hk")) return;
    for (const [find, replacement, label] of pairs) js = replaceOnce(js, find, replacement, label);
    write(file, js);
    done.push(file);
  };
  patch("assets/cisco-certifications.js", [
    ["window.location.pathname.match(/^\\/(zh|fa)\\//)", "window.location.pathname.match(/^\\/(zh|fa)(?:-hk)?\\//) /* zh-hk uses the zh copy */", "cisco locale"],
    ["window.location.pathname.replace(/^\\/(?:zh|fa)(?=\\/)/, \"\")", "window.location.pathname.replace(/^\\/(?:zh-hk|zh|fa)(?=\\/)/, \"\")", "cisco route"],
  ]);
  patch("assets/check-point-email-security.js", [
    ["const CHECK_POINT_EMAIL_ROUTE = /^\\/(?:zh\\/|fa\\/)?solutions", "const CHECK_POINT_EMAIL_ROUTE = /^\\/(?:zh-hk\\/|zh\\/|fa\\/)?solutions", "check point route"],
    ['  if (pathname.startsWith("/zh/")) return COPY.zh;', '  if (pathname.startsWith("/zh/") || pathname.startsWith("/zh-hk/")) return COPY.zh;', "check point copy"],
  ]);
  patch("assets/jotoglobal-articles.js", [
    ["const locale = location.pathname.startsWith('/zh/')", "// /zh-hk/ shows the zh-CN cards (rendered in Traditional Chinese by zh-hk-locale.js).\nconst locale = location.pathname.startsWith('/zh/') || location.pathname.startsWith('/zh-hk/')", "articles locale"],
  ]);
  patch("assets/jotoglobal-lead-routing.js", [
    ['    parts[0] === "zh" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";', '    // zh-hk pages report as zh-CN so the inquiry backend keeps accepting them; pagePath keeps /zh-hk/.\n    parts[0] === "zh" || parts[0] === "zh-hk" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";', "lead locale"],
  ]);
  return done.length ? `patched ${done.join(", ")}` : "already patched";
}

// Cache-busting for every asset this integration changes.
export const BUMPED_ASSETS = [
  "index-covers-fe2c6a4b8409.js", "index-e49ffBFL.css", "contact-form-sections.js", "mall-navigation-and-page.js",
  "mall-catalog-pages.js", "cisco-certifications.js", "cisco-certifications.css", "check-point-email-security.js",
  "check-point-email-security.css", "jotoglobal-articles.js", "jotoglobal-articles.css",
];
function bumpVersions() {
  let files = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if ([".git", "scripts", "docs", "zh-hk", "article-data", "node_modules"].includes(entry.name)) continue;
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".html")) {
        const before = read(rel);
        let after = before;
        for (const asset of BUMPED_ASSETS) {
          after = after.replace(new RegExp(`(/assets/${asset.replace(/[.]/g, "\\.")})\\?v=[0-9a-z-]+`, "g"), `$1?v=${ZH_HK_ASSET_VERSION}`);
        }
        if (after !== before) { write(rel, after); files++; }
      }
    }
  };
  walk(".");
  // ES module imports inside assets
  for (const [file, dep] of [["assets/mall-catalog-pages.js", "contact-form-sections.js"], [BUNDLE, "jotoglobal-lead-routing.js"]]) {
    const js = read(file);
    const next = js.replace(new RegExp(`(\\./${dep.replace(/[.]/g, "\\.")})\\?v=[0-9a-z-]+`, "g"), `$1?v=${ZH_HK_ASSET_VERSION}`);
    if (next !== js) write(file, next);
  }
  return `${files} HTML files`;
}

// ------------------------------------------------------------------ pages
function routeDir(prefix, route) {
  return route === "/" ? prefix : `${prefix}${route}`;
}

function generatePages() {
  const runtimeTag = `<script src="/assets/zh-hk-locale.js?v=${ZH_HK_ASSET_VERSION}"></script>`;
  for (const route of CORE_ROUTES) {
    const source = path.posix.join(routeDir("zh", route), "index.html");
    const target = path.posix.join(routeDir("zh-hk", route), "index.html");
    let html = read(source);
    html = html.replace(/<html lang="[^"]*"/, '<html lang="zh-HK"');
    if (!html.includes('<html lang="zh-HK"')) throw new Error(`${source}: missing <html lang>`);
    html = replaceOnce(html, '<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${runtimeTag}`, `${source} runtime`);
    // Static title / meta copy in Hong Kong Traditional Chinese.
    const { convert } = createRequire(import.meta.url)(path.join(root, "assets/zh-hk-locale.js"));
    html = html
      .replace(/<title>([\s\S]*?)<\/title>/, (m, t) => `<title>${convert(t)}</title>`)
      .replace(/(<meta [^>]*content=")([^"]*)(")/g, (m, a, v, b) => a + convert(v) + b);
    write(target, html);
  }
  return `${CORE_ROUTES.length} pages`;
}

// ---------------------------------------------------------- sitemap/robots
function url(prefix, route) {
  return route === "/" ? `${SITE}${prefix}/` : `${SITE}${prefix}${route}`;
}

function alternates(route) {
  return [
    ["en", url("", route)],
    ["zh-CN", url("/zh", route)],
    ["zh-HK", url("/zh-hk", route)],
    ["fa-IR", url("/fa", route)],
    ["x-default", url("", route)],
  ]
    .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`)
    .join("\n");
}

function updateSitemap() {
  let xml = read("sitemap.xml");
  if (xml.includes('hreflang="zh-HK"')) return "already updated";
  const byLoc = new Map();
  for (const route of CORE_ROUTES) {
    for (const prefix of ["", "/zh", "/fa"]) byLoc.set(url(prefix, route), route);
  }
  let count = 0;
  xml = xml.replace(/  <url>\n    <loc>([^<]+)<\/loc>\n[\s\S]*?  <\/url>\n/g, (block, loc) => {
    const route = byLoc.get(loc);
    if (!route) return block;
    count++;
    const rebuilt = `  <url>\n    <loc>${loc}</loc>\n${alternates(route)}\n  </url>\n`;
    if (loc !== url("/zh", route)) return rebuilt;
    return rebuilt + `  <url>\n    <loc>${url("/zh-hk", route)}</loc>\n${alternates(route)}\n  </url>\n`;
  });
  if (count !== CORE_ROUTES.length * 3) {
    throw new Error(`sitemap: expected ${CORE_ROUTES.length * 3} core entries, found ${count}`);
  }
  write("sitemap.xml", xml);
  return `${count} entries updated, ${CORE_ROUTES.length} added`;
}

function updateRobots() {
  let txt = read("robots.txt");
  if (txt.includes("/zh-hk/preview/")) return "already updated";
  txt = replaceOnce(txt, "Disallow: /zh/preview/\n", "Disallow: /zh/preview/\nDisallow: /zh-hk/preview/\n", "robots");
  write("robots.txt", txt);
  return "updated";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(path.join(root, "assets/zh-hk-locale.js"))) {
    throw new Error("assets/zh-hk-locale.js is missing");
  }
  console.log("bundle:", patchBundle());
  console.log("contact form:", patchContactForm());
  console.log("mall navigation:", patchMallNavigation());
  console.log("styles:", patchStyles());
  console.log("path-aware modules:", patchPathAwareModules());
  console.log("versions:", bumpVersions());
  console.log("pages:", generatePages());
  console.log("sitemap:", updateSitemap());
  console.log("robots:", updateRobots());
}
