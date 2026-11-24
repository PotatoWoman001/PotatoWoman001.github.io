// Global-first SEO copy for the home, about and contact pages.
// JOTO serves enterprises worldwide; Thailand, Hong Kong and Singapore are
// named as focus markets in descriptions, not as the limit of the business.
// zh-HK pages derive their copy from zh-CN via assets/zh-hk-locale.js.
//
// Usage: node scripts/integrate-global-seo-copy.mjs   (idempotent)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = path.join(root, "assets/index-covers-fe2c6a4b8409.js");

export const GLOBAL_SEO_COPY = [
  // [old, new] — English
  [
    'home:{title:"Enterprise IT Solutions & Systems Integration | JOTO TECH",description:"JOTO TECH designs, integrates and supports enterprise networks, cybersecurity, servers, storage, collaboration and physical security in China and global markets."}',
    'home:{title:"Global Enterprise IT Solutions & Systems Integration | JOTO TECH",description:"JOTO TECH plans, deploys and supports enterprise networks, cybersecurity, data centers, collaboration and physical security worldwide, including Thailand, Hong Kong and Singapore."}',
  ],
  [
    'about:{title:"About JOTO TECH | Enterprise IT Integrator in China",description:"Founded in Shanghai in 2010, JOTO TECH plans, integrates and supports complex enterprise IT and physical-security environments."}',
    'about:{title:"About JOTO TECH | Global Enterprise IT Integrator Since 2010",description:"Founded in Shanghai in 2010, JOTO TECH plans, integrates and supports enterprise IT and physical security for global companies across Asia, Europe and North America."}',
  ],
  [
    'contact:{title:"Contact JOTO TECH | Discuss Your Enterprise IT Project",description:"Talk to JOTO TECH about enterprise networks, security, data centers, collaboration, physical security, multi-site deployment or managed IT support."}',
    'contact:{title:"Contact JOTO TECH | Discuss Your Global IT Project",description:"Talk to JOTO TECH about enterprise networks, security, data centers, collaboration, physical security and multi-site rollouts in Thailand, Hong Kong, Singapore or worldwide."}',
  ],
  // Simplified Chinese (also the source of the zh-HK copy)
  [
    'home:{title:"企业 IT 解决方案与系统集成服务 | JOTO TECH",description:"JOTO TECH 提供企业网络、网络安全、服务器与存储、协作通信及物理安防解决方案，覆盖 IT 规划、系统集成、项目实施与持续运维。"}',
    'home:{title:"全球企业 IT 解决方案与系统集成服务 | JOTO TECH",description:"JOTO TECH 为全球企业规划、部署和运维网络、网络安全、服务器与存储、协作通信及物理安防系统，服务覆盖泰国、香港、新加坡等市场。"}',
  ],
  [
    'about:{title:"关于 JOTO TECH | 上海企业 IT 系统集成服务商",description:"JOTO TECH 于 2010 年创立于上海，为企业提供 IT 规划、系统集成、项目交付与持续运维服务。"}',
    'about:{title:"关于 JOTO TECH | 面向全球的企业 IT 系统集成服务商",description:"JOTO TECH 于 2010 年创立于上海，为全球企业提供 IT 规划、系统集成、项目交付与持续运维，服务覆盖亚洲、欧洲和北美。"}',
  ],
  [
    'contact:{title:"联系 JOTO TECH | 咨询企业 IT 项目与解决方案",description:"咨询企业网络、网络安全、服务器与存储、协作通信、物理安防、多站点部署及 IT 运维服务。"}',
    'contact:{title:"联系 JOTO TECH | 咨询全球企业 IT 项目",description:"咨询企业网络、网络安全、服务器与存储、协作通信、物理安防、多站点部署及 IT 运维服务，支持泰国、香港、新加坡及全球项目。"}',
  ],
  // Persian
  [
    'home:{title:"راهکارهای فناوری اطلاعات و یکپارچه‌سازی سازمانی | JOTO TECH",description:"JOTO TECH شبکه، امنیت سایبری، سرور، ذخیره‌سازی، ارتباطات یکپارچه و امنیت فیزیکی سازمانی را طراحی، اجرا و پشتیبانی می‌کند."}',
    'home:{title:"راهکارهای جهانی فناوری اطلاعات و یکپارچه‌سازی سازمانی | JOTO TECH",description:"JOTO TECH شبکه، امنیت سایبری، مرکز داده، ارتباطات یکپارچه و امنیت فیزیکی سازمان‌ها را در سراسر جهان، از جمله تایلند، هنگ‌کنگ و سنگاپور، طراحی، اجرا و پشتیبانی می‌کند."}',
  ],
  [
    'about:{title:"درباره JOTO TECH | یکپارچه‌ساز فناوری اطلاعات سازمانی",description:"JOTO TECH از سال ۲۰۱۰ محیط‌های پیچیده فناوری اطلاعات و امنیت فیزیکی سازمانی را طراحی، یکپارچه و پشتیبانی می‌کند."}',
    'about:{title:"درباره JOTO TECH | یکپارچه‌ساز جهانی فناوری اطلاعات سازمانی",description:"JOTO TECH از سال ۲۰۱۰ در شانگهای، محیط‌های فناوری اطلاعات و امنیت فیزیکی سازمان‌ها را در آسیا، اروپا و آمریکای شمالی طراحی، یکپارچه و پشتیبانی می‌کند."}',
  ],
  [
    'contact:{title:"تماس با JOTO TECH | مشاوره پروژه فناوری اطلاعات سازمانی",description:"برای شبکه، امنیت، مرکز داده، ارتباطات، امنیت فیزیکی، استقرار چندسایتی و پشتیبانی مدیریت‌شده با JOTO TECH گفتگو کنید."}',
    'contact:{title:"تماس با JOTO TECH | مشاوره پروژه‌های جهانی فناوری اطلاعات",description:"برای شبکه، امنیت، مرکز داده، ارتباطات، امنیت فیزیکی و استقرار چندسایتی در تایلند، هنگ‌کنگ، سنگاپور یا هر نقطه از جهان با JOTO TECH گفتگو کنید."}',
  ],
];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let js = fs.readFileSync(BUNDLE, "utf8");
  let applied = 0;
  for (const [before, after] of GLOBAL_SEO_COPY) {
    if (js.includes(after)) continue;
    const count = js.split(before).length - 1;
    if (count !== 1) throw new Error(`global SEO copy: expected one match, found ${count}: ${before.slice(0, 60)}`);
    js = js.replace(before, after);
    applied++;
  }
  fs.writeFileSync(BUNDLE, js);
  console.log(`global SEO copy: ${applied} entries applied, ${GLOBAL_SEO_COPY.length - applied} already present`);
}
