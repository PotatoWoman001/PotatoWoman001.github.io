import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const homeRoutes = ["index.html", "zh/index.html", "fa/index.html"];

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

function replaceExactly(source, before, after, expectedCount, label) {
  const actualCount = countOccurrences(source, before);
  if (actualCount === 0) return source;
  if (actualCount !== expectedCount) {
    throw new Error(
      `${label}: expected ${expectedCount} source matches, found ${actualCount}`,
    );
  }
  return source.split(before).join(after);
}

function resolveBundlePath(html, route) {
  const match = html.match(
    /<script[^>]+type="module"[^>]+src="(\/assets\/index-[^"?]+\.js)(?:\?v=[^"]+)?"/,
  );
  if (!match) throw new Error(`${route} is missing the shared bundle.`);
  return match[1].slice(1);
}

const bundlePaths = new Set();
for (const route of homeRoutes) {
  const html = await readFile(path.join(projectRoot, route), "utf8");
  bundlePaths.add(resolveBundlePath(html, route));
}
if (bundlePaths.size !== 1) {
  throw new Error(`Home routes reference ${bundlePaths.size} shared bundles.`);
}

const [bundlePath] = bundlePaths;
const absoluteBundlePath = path.join(projectRoot, bundlePath);
const source = await readFile(absoluteBundlePath, "utf8");
let integrated = source;

if (!integrated.includes("function qn()")) {
  throw new Error("The shared homepage footer component qn is missing.");
}

const replacements = [
  {
    label: "category overview ordinal",
    before:
      'children:["[ ",i.overview," / ",String(t.solutions.categories.indexOf(s)+1).padStart(2,"0")," ]"]',
    after: 'children:["[ ",i.overview," ]"]',
    count: 1,
  },
  {
    label: "partner hero progress",
    before:
      ',f.jsx("p",{className:"font-mono text-[10px] tracking-[0.18em] text-white/40",children:"01 / 05"})',
    after: "",
    count: 1,
  },
  {
    label: "relationship section ordinal",
    before: ',index:"02",title:n.relationshipTitle',
    after: ",title:n.relationshipTitle",
    count: 1,
  },
  {
    label: "services section ordinal",
    before: ',index:"03",title:n.servicesTitle',
    after: ",title:n.servicesTitle",
    count: 1,
  },
  {
    label: "cases section ordinal",
    before: ',index:"04",title:n.casesTitle',
    after: ",title:n.casesTitle",
    count: 1,
  },
  {
    label: "relationship card ordinal",
    before:
      'f.jsxs("p",{className:"font-mono text-[10px] tracking-[0.2em] text-joto-green",children:["0",s+1]}),f.jsx("h3",{className:"mt-20 text-2xl',
    after: 'f.jsx("h3",{className:"text-2xl',
    count: 1,
  },
  {
    label: "service card ordinal",
    before:
      'f.jsxs("span",{className:"font-mono text-[10px] tracking-[0.2em] text-white/40",children:["0",s+1]}),f.jsx("h3",{className:"mt-4 text-2xl',
    after: 'f.jsx("h3",{className:"text-2xl',
    count: 1,
  },
  {
    label: "case card ordinal",
    before:
      'f.jsxs("span",{className:"font-mono text-[10px] tracking-[0.2em] text-joto-green",children:["0",s+1]}),',
    after: "",
    count: 1,
  },
  {
    label: "contact section ordinal",
    before:
      'f.jsxs("p",{className:"text-[11px] font-semibold uppercase tracking-[0.22em] lg:col-span-3",children:["05 / ",e("Start a project")]})',
    after:
      'f.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-[0.22em] lg:col-span-3",children:e("Start a project")})',
    count: 1,
  },
  {
    label: "partner compact footer",
    before:
      'f.jsx("footer",{className:"border-t border-white/10 bg-[#050807] px-5 py-8 text-white sm:px-8 lg:px-12",children:f.jsxs("div",{className:"mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5",children:[f.jsx("a",{className:"text-xl font-extrabold tracking-[-0.055em]",href:xn("/#top",!0),children:"JOTO"}),f.jsxs("p",{className:"text-[10px] uppercase tracking-[0.16em] text-white/38",children:[n.partnerName," ",e("solutions · designed, deployed and supported by JOTO")]}),f.jsx("a",{className:"text-xs text-white/55 transition-colors hover:text-joto-green",href:`mailto:${n.contactEmail}`,children:n.contactEmail})]})})',
    after: "f.jsx(qn,{})",
    count: 1,
  },
];

for (const replacement of replacements) {
  integrated = replaceExactly(
    integrated,
    replacement.before,
    replacement.after,
    replacement.count,
    replacement.label,
  );
}

const requiredFinalTokens = [
  'children:["[ ",i.overview," ]"]',
  'children:e("Start a project")',
  "f.jsx(qn,{})",
  'foundingDate:"2010"',
  "Catalyst, Nexus, Meraki and Cisco UCS",
];
for (const token of requiredFinalTokens) {
  if (!integrated.includes(token)) {
    throw new Error(`Post-integration token is missing: ${token}`);
  }
}

const forbiddenFinalTokens = [
  'children:"01 / 05"',
  ',index:"02",title:n.relationshipTitle',
  ',index:"03",title:n.servicesTitle',
  ',index:"04",title:n.casesTitle',
  'children:["05 / ",e("Start a project")]',
  'children:[n.partnerName," ",e("solutions · designed, deployed and supported by JOTO")]',
];
for (const token of forbiddenFinalTokens) {
  if (integrated.includes(token)) {
    throw new Error(`Post-integration token remains: ${token}`);
  }
}

if (integrated === source) {
  console.log(`Solution page cleanup is already integrated in ${bundlePath}.`);
  console.log("0 files changed.");
} else {
  await writeFile(absoluteBundlePath, integrated);
  console.log(`Integrated Solution page cleanup in ${bundlePath}.`);
  console.log("1 file changed.");
}
