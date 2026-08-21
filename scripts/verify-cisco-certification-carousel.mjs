import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = "20260817-1";
const routes = [
  "solutions/network/cisco/index.html",
  "zh/solutions/network/cisco/index.html",
  "fa/solutions/network/cisco/index.html",
];
const imageDirectory = path.join(root, "assets/cisco-certifications");
const images = [
  "cloud-ai-infrastructure-partner.png",
  "preferred-collaboration-partner.png",
  "preferred-networking-partner.png",
  "preferred-security-partner.png",
  "services-partner.png",
];

for (const image of images) {
  const imagePath = path.join(imageDirectory, image);
  assert.equal(existsSync(imagePath), true, `${image} is missing`);
  assert.ok(statSync(imagePath).size > 50_000, `${image} is unexpectedly small`);
}

assert.deepEqual(
  readdirSync(imageDirectory).filter((file) => file.toLowerCase().endsWith(".pdf")),
  [],
  "source PDFs must not be published",
);

const scriptPath = path.join(root, "assets/cisco-certifications.js");
const stylesPath = path.join(root, "assets/cisco-certifications.css");
assert.equal(existsSync(scriptPath), true, "Cisco certification script is missing");
assert.equal(existsSync(stylesPath), true, "Cisco certification styles are missing");

const script = readFileSync(scriptPath, "utf8");
const styles = readFileSync(stylesPath, "utf8");

for (const route of routes) {
  const html = readFileSync(path.join(root, route), "utf8");
  assert.match(
    html,
    new RegExp(`/assets/cisco-certifications\\.js\\?v=${version}`),
    `${route} is missing the certification script`,
  );
  assert.match(
    html,
    new RegExp(`/assets/cisco-certifications\\.css\\?v=${version}`),
    `${route} is missing the certification styles`,
  );
}

for (const image of images) assert.match(script, new RegExp(image.replace(".", "\\.")));
assert.match(script, /data-cisco-certifications/);
assert.match(script, /customer-logo-wall/);
assert.match(script, /role",\s*"dialog"/);
assert.match(script, /aria-modal/);
assert.match(script, /Escape/);
assert.match(script, /MutationObserver/);
assert.match(script, /solutions\\\/network\\\/cisco/);
assert.doesNotMatch(script, /\.pdf|download\s*=/i);

assert.match(styles, /prefers-reduced-motion:\s*reduce/);
assert.match(styles, /animation-play-state:\s*paused/);
assert.match(styles, /cisco-certifications-scroll/);
assert.match(styles, /data-cisco-certificate-open/);
assert.match(styles, /max-width:\s*767px/);

console.log("Verified Cisco certification carousel across three localized routes.");
