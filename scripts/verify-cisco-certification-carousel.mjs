import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = "20260821-1";
const routeGroups = [
  "network/cisco",
  "network/extreme-networks",
  "network/sangfor",
  "security/sangfor",
  "server-storage/dell-technologies",
  "server-storage/huawei",
  "security/palo-alto-networks",
  "safeguarding/verkada",
];
const routes = routeGroups.flatMap((route) => [
  `solutions/${route}/index.html`,
  `zh/solutions/${route}/index.html`,
  `fa/solutions/${route}/index.html`,
]);
const newImages = [
  "cisco-bydata-registered-2026.png",
  "dell-technologies-authorized-partner-2026.png",
  "extreme-networks-authorized-partner-fy26.png",
  "huawei-certified-dealer-2026.png",
  "palo-alto-networks-platinum-innovator-2026.png",
  "sangfor-gold-reseller-2026.png",
  "verkada-certified-gold-member-fy26.png",
];
const existingCiscoImages = [
  "cloud-ai-infrastructure-partner.png",
  "preferred-collaboration-partner.png",
  "preferred-networking-partner.png",
  "preferred-security-partner.png",
  "services-partner.png",
];

for (const image of newImages) {
  const imagePath = path.join(root, "assets/partner-certifications", image);
  assert.equal(existsSync(imagePath), true, `${image} is missing`);
  assert.ok(statSync(imagePath).size > 50_000, `${image} is unexpectedly small`);
}

for (const image of existingCiscoImages) {
  assert.equal(
    existsSync(path.join(root, "assets/cisco-certifications", image)),
    true,
    `${image} is missing`,
  );
}

for (const directory of ["assets/cisco-certifications", "assets/partner-certifications"]) {
  assert.deepEqual(
    readdirSync(path.join(root, directory)).filter((file) => file.toLowerCase().endsWith(".pdf")),
    [],
    `source PDFs must not be published in ${directory}`,
  );
}

const script = readFileSync(path.join(root, "assets/cisco-certifications.js"), "utf8");
const styles = readFileSync(path.join(root, "assets/cisco-certifications.css"), "utf8");

for (const route of routes) {
  const html = readFileSync(path.join(root, route), "utf8");
  assert.match(html, new RegExp(`/assets/cisco-certifications\\.js\\?v=${version}`));
  assert.match(html, new RegExp(`/assets/cisco-certifications\\.css\\?v=${version}`));
}

for (const image of [...newImages, ...existingCiscoImages]) {
  assert.match(script, new RegExp(image.replaceAll(".", "\\.")));
}

for (const route of routeGroups) {
  assert.match(script, new RegExp(route.replaceAll("/", "\\/")));
}

assert.match(script, /certificates\.length > 3/);
assert.match(script, /scrolling \? "scrolling" : "static"/);
assert.match(script, /data-partner-certifications/);
assert.match(script, /customer-logo-wall/);
assert.match(script, /role", "dialog"/);
assert.match(script, /aria-modal/);
assert.match(script, /Escape/);
assert.match(script, /MutationObserver/);
assert.doesNotMatch(script, /\.pdf|download\s*=/i);

assert.match(styles, /data-layout="static"/);
assert.match(styles, /data-layout="scrolling"/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);
assert.match(styles, /animation-play-state:\s*paused/);
assert.match(styles, /partner-certifications-scroll/);
assert.match(styles, /data-partner-certificate-open/);
assert.match(styles, /max-width:\s*767px/);

console.log("Verified partner certifications across 24 localized detail pages.");
