// Verifies the Hong Kong Traditional Chinese locale (/zh-hk/, zh-HK).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { CORE_ROUTES, ZH_HK_ASSET_VERSION } from "./integrate-zh-hk-locale.mjs";
import { GLOBAL_SEO_COPY } from "./integrate-global-seo-copy.mjs";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const require = createRequire(import.meta.url);
const zhHk = require(path.join(root, "assets/zh-hk-locale.js"));

// Bundle integration
const bundle = read("assets/index-covers-fe2c6a4b8409.js");
for (const marker of [
  'const cm=["en","zh-CN","zh-HK","fa-IR"]',
  '"zh-CN":{dir:"ltr",label:"简体中文",prefix:"/zh"}',
  '"zh-HK":{dir:"ltr",label:"繁體中文",prefix:"/zh-hk"}',
  "function __hkPath()",
  "function __hkL(n)",
  'return"zh-HK";if(t==="zh"||t.startsWith("zh-"))return"zh-CN";',
  'Mk={en:"","zh-CN":"/zh","zh-HK":"/zh-hk","fa-IR":"/fa"}',
  '{hreflang:"zh-HK",href:Wi(n,"zh-HK",1)}',
  '"zh-HK":"zh_HK"',
  "function iT(){const{locale:__n,switchHref:e,t}=Ie(),n=__hkL(__n),",
  "document.documentElement.lang=__hkL(i)",
]) {
  assert.ok(bundle.includes(marker), `bundle is missing zh-HK integration: ${marker}`);
}
assert.ok(!/(?:navigator\.geolocation|joto_cc|ipapi|ipinfo)/.test(bundle), "zh-HK must use the existing browser-language logic, not IP lookups");

// Global-first SEO copy (home / about / contact in en, zh-CN, fa-IR; zh-HK derives from zh-CN)
for (const [before, after] of GLOBAL_SEO_COPY) {
  assert.ok(bundle.includes(after), `bundle is missing global SEO copy: ${after.slice(0, 70)}`);
  assert.ok(!bundle.includes(before), `bundle still has the old SEO copy: ${before.slice(0, 70)}`);
}
assert.ok(!/Enterprise IT Integrator in China"/.test(bundle), "About title must not limit JOTO to China");

// Side assets
assert.match(read("assets/contact-form-sections.js"), /parts\[0\] === "zh-hk" \? "zh-CN"/);
assert.equal((read("assets/index-e49ffBFL.css").match(/html\[lang=zh-HK\]/g) || []).length, 4, "zh-HK heading typography");
assert.match(read("assets/mall-navigation-and-page.js"), /zhHk: \{ key: "zh", label: "商城", path: "\/zh\/mall\/", categoriesLabel: "产品分类", blogPath: "\/zh-hk\/blog\/" \}/);

// Pages
const runtimeTag = `<script src="/assets/zh-hk-locale.js?v=${ZH_HK_ASSET_VERSION}"></script>`;
for (const route of CORE_ROUTES) {
  const rel = route === "/" ? "" : route;
  const html = read(`zh-hk${rel}/index.html`);
  const zh = read(`zh${rel}/index.html`);
  assert.match(html, /<html lang="zh-HK">/, `zh-hk${rel} lang`);
  const runtimeAt = html.indexOf(runtimeTag);
  assert.ok(runtimeAt > 0, `zh-hk${rel} is missing the zh-HK runtime`);
  assert.ok(runtimeAt < html.indexOf('type="module"'), `zh-hk${rel}: runtime must load before modules`);
  for (const asset of zh.match(/\/assets\/[^"'<>]+/g) || []) {
    assert.ok(html.includes(asset), `zh-hk${rel} is missing ${asset} from the zh page`);
  }
}
assert.ok(!fs.existsSync(path.join(root, "zh-hk/mall")), "Mall is out of phase-1 scope");
assert.ok(!fs.existsSync(path.join(root, "zh-hk/preview")), "previews are not published for zh-HK");

// Sitemap and robots
const sitemap = read("sitemap.xml");
assert.equal((sitemap.match(/<url>/g) || []).length, 111 + CORE_ROUTES.length);
for (const route of CORE_ROUTES) {
  const loc = route === "/" ? "https://jotoglobal.com/zh-hk/" : `https://jotoglobal.com/zh-hk${route}`;
  assert.ok(sitemap.includes(`<loc>${loc}</loc>`), `sitemap is missing ${loc}`);
  assert.equal(
    (sitemap.match(new RegExp(`hreflang="zh-HK" href="${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")) || []).length,
    4,
    `${loc} must be an alternate of en, zh-CN, zh-HK and fa-IR entries`,
  );
}
assert.ok(!/hreflang="zh-HK" href="[^"]*\/mall/.test(sitemap), "Mall must not advertise zh-HK");
assert.match(read("robots.txt"), /^Disallow: \/zh-hk\/preview\/$/m);

// Converter
const c = zhHk.convert;
assert.equal(c("企业网络与信息安全"), "企業網絡與資訊安全");
assert.equal(c("服务器与存储"), "伺服器與儲存");
assert.equal(c("技术支持"), "技術支援");
assert.equal(c("联系我们"), "聯絡我們");
assert.equal(c("怀俄明州谢里登"), "懷俄明州謝里登");
assert.equal(c("沪ICP备15056478号"), "沪ICP备15056478号", "ICP filing text stays verbatim");
assert.equal(c("上海聚托信息科技有限公司"), "上海聚托信息科技有限公司", "legal names are not reworded");
assert.equal(c("JOTO TECH"), "JOTO TECH");
assert.equal(c("简体中文"), "简体中文", "the Simplified Chinese switcher label keeps its own script");
assert.equal(c("“专业服务”"), "「專業服務」");

console.log(`Verified zh-HK locale across ${CORE_ROUTES.length} routes, sitemap alternates and converter rules.`);
