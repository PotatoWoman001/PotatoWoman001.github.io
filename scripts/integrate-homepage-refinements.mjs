import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const version = "20260803-3";
const homeRoutes = ["index.html", "zh/index.html", "fa/index.html"];

const homepageScriptTag =
  `<script type="module" src="/assets/homepage-refinements.js?v=${version}"></script>`;
const homepageStyleTag =
  `<link rel="stylesheet" href="/assets/homepage-refinements.css?v=${version}">`;
const carouselScriptTag =
  `<script type="module" src="/assets/solution-card-carousel.js?v=${version}"></script>`;
const carouselStyleTag =
  `<link rel="stylesheet" href="/assets/solution-card-carousel.css?v=${version}">`;

const carouselScriptPattern =
  /<script type="module" src="\/assets\/solution-card-carousel\.js(?:\?v=[^"]+)?"><\/script>/;
const carouselStylePattern =
  /<link rel="stylesheet" href="\/assets\/solution-card-carousel\.css(?:\?v=[^"]+)?">/;
const homepageScriptPattern =
  /^\s*<script[^>]+homepage-refinements\.js[^>]*><\/script>\s*$/gm;
const homepageStylePattern =
  /^\s*<link[^>]+homepage-refinements\.css[^>]*>\s*$/gm;

function integrateHomepage(source, route) {
  let html = source
    .replace(homepageScriptPattern, "")
    .replace(homepageStylePattern, "");

  if (!carouselScriptPattern.test(html)) {
    throw new Error(`${route} is missing the solution carousel script.`);
  }
  html = html.replace(carouselScriptPattern, carouselScriptTag);

  if (!carouselStylePattern.test(html)) {
    throw new Error(`${route} is missing the solution carousel stylesheet.`);
  }
  html = html.replace(carouselStylePattern, carouselStyleTag);

  html = html.replace(
    carouselScriptTag,
    `${carouselScriptTag}\n    ${homepageScriptTag}`,
  );
  html = html.replace(
    carouselStyleTag,
    `${carouselStyleTag}\n    ${homepageStyleTag}`,
  );

  return html.replace(/\n{3,}/g, "\n\n");
}

let changedFiles = 0;

for (const route of homeRoutes) {
  const absolutePath = path.join(projectRoot, route);
  const source = await readFile(absolutePath, "utf8");
  const integrated = integrateHomepage(source, route);

  if (integrated === source) continue;

  await writeFile(absolutePath, integrated);
  changedFiles += 1;
}

console.log(`Integrated homepage refinement assets across ${homeRoutes.length} routes.`);
console.log(`${changedFiles} files changed.`);
