import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = "20260826-3";
const routes = [
  "solutions/security/check-point/index.html",
  "zh/solutions/security/check-point/index.html",
  "fa/solutions/security/check-point/index.html",
];

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const script = readFileSync(path.join(root, "assets/check-point-email-security.js"), "utf8");
const styles = readFileSync(path.join(root, "assets/check-point-email-security.css"), "utf8");

for (const route of routes) {
  const html = readFileSync(path.join(root, route), "utf8");
  assert.equal(
    count(html, `/assets/check-point-email-security.js?v=${version}`),
    1,
    `${route} must load the email-security script exactly once`,
  );
  assert.equal(
    count(html, `/assets/check-point-email-security.css?v=${version}`),
    1,
    `${route} must load the email-security stylesheet exactly once`,
  );
}

assert.match(script, /data-check-point-email-security/);
assert.match(script, /data-check-point-email-service-anchor/);
assert.match(script, /data-check-point-email-contact-link/);
assert.match(script, /MutationObserver/);
assert.match(script, /Microsoft 365/);
assert.match(script, /SOC 2 Type 2/);
assert.doesNotMatch(script, /Gartner|99\.9|99\.7|65K/i);

assert.match(styles, /\.check-point-email-security/);
assert.match(styles, /html\[dir=["']rtl["']\]/);
assert.match(styles, /@media\s*\(max-width:\s*767px\)/);
assert.match(styles, /:focus-visible/);

console.log("Verified Check Point email security section across three localized routes.");
