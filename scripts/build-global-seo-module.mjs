// Builds assets/joto-global-seo-20261124.js, the successor of the 2026-11-21
// regional SEO module. JOTO is positioned as a global IT service provider;
// Thailand, Hong Kong and Singapore are named as focus markets, never as the
// only markets. zh-HK entries are pre-converted so the module and the zh-HK
// presentation layer never rewrite each other's text.
//
// It also rewrites the static <title>/meta tags of the affected pages so the
// initial HTML matches what the module renders.
//
// Usage: node scripts/build-global-seo-module.mjs   (idempotent)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { convert } = require(path.join(root, "assets/zh-hk-locale.js"));

export const MODULE_FILE = "assets/joto-global-seo-20261124.js";
const PREVIOUS_MODULE = "/assets/joto-regional-seo-20261121.js";
const BUNDLE = "assets/index-covers-fe2c6a4b8409.js";

// [title, description, visible heading, visible paragraph]
export const PAGES = {
  "/": [
    "Global Enterprise IT Solutions & Systems Integration | JOTO TECH",
    "Global IT services for enterprise networks and security: Cisco, Verkada, KnowBe4 and Fortinet projects worldwide, with focus on Thailand, Hong Kong and Singapore.",
    "Enterprise IT projects worldwide",
    "Planning a new office, campus or branch anywhere in the world? Discuss Cisco networking, Verkada cameras and access control, KnowBe4 awareness training or Fortinet security with JOTO. We deliver multi-country projects, with particular focus on Thailand, Hong Kong and Singapore. Share your locations, existing systems and timeline so we can assess solution fit and delivery scope.",
  ],
  "/solutions/network": [
    "Cisco Networking & Meraki Deployment | JOTO Global",
    "Plan Cisco networking and Meraki deployments for offices and campuses worldwide, including Thailand, Hong Kong and Singapore. Discuss Wi-Fi, switching and multi-site needs.",
    "Cisco networking across your global sites",
    "For multi-site projects worldwide — including Thailand, Hong Kong and Singapore — start with site surveys, Wi-Fi coverage, switching capacity, branch connectivity and operational ownership. Discuss Cisco and Meraki requirements with JOTO to define a deployment and acceptance plan.",
  ],
  "/solutions/security": [
    "Fortinet & KnowBe4 Security Solutions | JOTO Global",
    "Fortinet firewalls, SD-WAN and KnowBe4 training for enterprises worldwide, including Thailand, Hong Kong and Singapore. Discuss deployment, migration and awareness needs.",
    "Network security and employee awareness",
    "For teams worldwide — including Thailand, Hong Kong and Singapore — assess Fortinet FortiGate and SD-WAN requirements alongside KnowBe4 security awareness training and phishing simulations. Define your users, sites, migration constraints and success criteria before selecting a solution.",
  ],
  "/solutions/safeguarding": [
    "Verkada Cameras & Access Control | JOTO Global",
    "Plan Verkada cameras and access control for sites worldwide, including Thailand, Hong Kong and Singapore. Discuss coverage, network readiness and deployment with JOTO.",
    "Verkada physical security project planning",
    "Planning video security or access control for sites around the world, including Thailand, Hong Kong and Singapore? Discuss Verkada coverage, network readiness, user permissions and operational handover with JOTO. Product availability and local delivery scope are confirmed during project assessment.",
  ],
  "/zh": [
    "全球企业 IT 解决方案与系统集成服务 | JOTO TECH",
    "面向全球企业的 IT 服务商，提供 Cisco 网络、Verkada 安防、KnowBe4 安全意识培训与 Fortinet 安全方案的选型、部署及运维，重点服务泰国、香港、新加坡。",
    "面向全球的企业 IT 项目",
    "无论在哪个国家新建办公室、园区或分支机构，都可以向 JOTO 咨询 Cisco 网络、Verkada 摄像头与门禁、KnowBe4 安全意识培训及 Fortinet 安全方案。我们承接跨国多地项目，并重点服务泰国、香港和新加坡。请提供项目地点、现有系统和时间计划，我们会据此评估方案适配性与交付范围。",
  ],
  "/zh/solutions/network": [
    "Cisco 网络与 Meraki 部署方案 | JOTO Global",
    "为全球各地的办公室与园区规划 Cisco 网络与 Meraki 部署，重点市场包括泰国、香港、新加坡，覆盖无线网络、交换机、多分支连接及实施验收。",
    "跨地区 Cisco 网络规划与部署",
    "面向全球的多地网络项目（重点包括泰国、香港和新加坡），从现场勘测、无线覆盖、交换容量、分支连接和运维责任出发，评估 Cisco 与 Meraki 方案。与 JOTO 明确部署要求、维护窗口和验收标准。",
  ],
  "/zh/solutions/security": [
    "Fortinet 与 KnowBe4 企业安全方案 | JOTO Global",
    "面向全球企业，评估 Fortinet 防火墙和 SD-WAN，以及 KnowBe4 安全意识培训与钓鱼模拟，规划实施与效果验收；重点服务泰国、香港、新加坡。",
    "网络安全与员工安全意识协同规划",
    "围绕全球各地的团队与分支业务（重点包括泰国、香港和新加坡），评估 Fortinet FortiGate 防火墙、SD-WAN，以及 KnowBe4 安全意识培训与钓鱼模拟。选型前明确用户规模、部署地点、迁移限制和可验证的项目目标。",
  ],
  "/zh/solutions/safeguarding": [
    "Verkada 视频安防与门禁方案 | JOTO Global",
    "为全球各地的园区和办公项目规划 Verkada 摄像头、视频安防及门禁，重点市场包括泰国、香港、新加坡，评估覆盖范围、网络条件和实施交接要求。",
    "Verkada 视频安防与门禁项目规划",
    "无论项目位于哪个国家（重点包括泰国、香港和新加坡），都可以与 JOTO 评估 Verkada 的覆盖范围、网络条件、权限管理和运维交接。具体产品可用性和当地交付范围将在项目评估中确认。",
  ],
};

export function allPages() {
  const pages = { ...PAGES };
  for (const [route, copy] of Object.entries(PAGES)) {
    if (route === "/zh" || route.startsWith("/zh/")) pages[route.replace(/^\/zh/, "/zh-hk")] = copy.map(convert);
  }
  return pages;
}

function runtime(pages) {
  return `// Global-first SEO for JOTO Global key pages (successor of joto-regional-seo-20261121.js).
// Generated by scripts/build-global-seo-module.mjs — edit PAGES there, not here.
const pages = ${JSON.stringify(pages)};
const CONTACT = { "/zh-hk": ["/zh-hk/contact", "諮詢項目方案"], "/zh": ["/zh/contact", "咨询项目方案"], "": ["/contact", "Discuss your project"] };
let pending = false;
function update() {
 pending=false;
 const path=location.pathname.replace(/\\/$/,'')||'/';
 let block=document.getElementById('joto-regional-projects');
 if(block&&block.dataset.path!==path){block.remove();block=null;}
 const d=pages[path]; if(!d)return;
 if(document.title!==d[0])document.title=d[0];
 for(const [attribute,name,value] of [['name','description',d[1]],['property','og:title',d[0]],['property','og:description',d[1]],['name','twitter:title',d[0]],['name','twitter:description',d[1]]]) {
  const matches=[...document.head.querySelectorAll(\`meta[\${attribute}="\${name}"]\`)];
  let e=matches.find(node=>node.hasAttribute('data-joto-seo'))||matches[0];
  for(const duplicate of matches)if(duplicate!==e)duplicate.remove();
  if(!e){e=document.createElement('meta');e.setAttribute(attribute,name);e.setAttribute('data-joto-seo','');document.head.append(e);}
  if(e.content!==value)e.content=value;
 }
 for(const script of document.head.querySelectorAll('script[type="application/ld+json"][data-joto-seo]')) {
  try {
   const value=JSON.parse(script.textContent);
   for(const item of value['@graph']||[])if(item['@type']==='WebPage'){item.name=d[0];item.description=d[1];}
   const text=JSON.stringify(value);if(script.textContent!==text)script.textContent=text;
  }catch{}
 }
 const h1=document.querySelector('h1');
 if(!h1||block)return;
 const anchor=document.querySelector('footer')||document.querySelector('main');
 if(!anchor)return;
 block=document.createElement('section');block.id='joto-regional-projects';block.dataset.path=path;
 block.style.cssText='max-width:1200px;margin:48px auto;padding:24px clamp(20px,4vw,48px);font-family:inherit;text-align:left;line-height:1.7;color:inherit';
 const heading=document.createElement('h2');heading.textContent=d[2];heading.style.cssText='font-size:clamp(24px,3vw,36px);line-height:1.2;margin:0 0 20px';
 const p=document.createElement('p');p.textContent=d[3];p.style.cssText='max-width:850px;font-size:16px';
 const prefix=/^\\/zh-hk(?:\\/|$)/.test(path)?'/zh-hk':/^\\/zh(?:\\/|$)/.test(path)?'/zh':'';
 const link=document.createElement('a');link.href=CONTACT[prefix][0];link.textContent=CONTACT[prefix][1];link.style.cssText='display:inline-block;margin-top:16px;text-decoration:underline;font-weight:600';
 block.append(heading,p,link);
 if(anchor.tagName==='FOOTER')anchor.before(block);else anchor.append(block);
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['content']});
addEventListener('popstate',schedule);schedule();
`;
}

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function rewriteStaticHead(html, copy) {
  const [title, description] = copy;
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  const set = (attr, name, value) => {
    const re = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(" data-joto-seo="">)`);
    if (!re.test(out)) throw new Error(`missing static ${attr}=${name}`);
    out = out.replace(re, `$1${escapeHtml(value)}$2`);
  };
  set("name", "description", description);
  set("property", "og:title", title);
  set("property", "og:description", description);
  set("name", "twitter:title", title);
  set("name", "twitter:description", description);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pages = allPages();
  fs.writeFileSync(path.join(root, MODULE_FILE), runtime(pages));
  // Point the bundle at the new module.
  const bundlePath = path.join(root, BUNDLE);
  let bundle = fs.readFileSync(bundlePath, "utf8");
  if (bundle.includes(`import "${PREVIOUS_MODULE}";`)) {
    bundle = bundle.replace(`import "${PREVIOUS_MODULE}";`, `import "/${MODULE_FILE}";`);
    fs.writeFileSync(bundlePath, bundle);
  }
  if (!bundle.includes(`import "/${MODULE_FILE}";`)) throw new Error("bundle does not import the global SEO module");
  // Static <head> of the English and zh-CN pages (zh-HK pages are generated from zh-CN).
  for (const [route, copy] of Object.entries(PAGES)) {
    const file = path.join(root, route === "/" ? "" : route.slice(1), "index.html");
    fs.writeFileSync(file, rewriteStaticHead(fs.readFileSync(file, "utf8"), copy));
  }
  console.log(`global SEO module: ${Object.keys(pages).length} pages (${MODULE_FILE})`);
}
