import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localeRoots = ["solutions", "zh/solutions", "fa/solutions"];

function collectIndexFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectIndexFiles(absolute);
    return entry.name === "index.html" ? [absolute] : [];
  });
}

function resolveBundlePath(routeFile) {
  const html = fs.readFileSync(routeFile, "utf8");
  const match = html.match(
    /<script[^>]+type="module"[^>]+src="(\/assets\/index-[^"?]+\.js)(?:\?v=[^"]+)?"/,
  );
  assert.ok(match, `${path.relative(root, routeFile)} is missing the shared bundle`);
  return match[1].slice(1);
}

function componentSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing component marker ${startMarker}`);
  assert.notEqual(end, -1, `missing component boundary ${endMarker}`);
  return source.slice(start, end);
}

const routeFiles = localeRoots.flatMap((directory) =>
  collectIndexFiles(path.join(root, directory)),
);
assert.equal(routeFiles.length, 75, "expected all 75 Solution route indexes");

const bundlePaths = new Set(routeFiles.map(resolveBundlePath));
assert.equal(bundlePaths.size, 1, "Solution routes must share one active bundle");

const [bundlePath] = bundlePaths;
const bundle = fs.readFileSync(path.join(root, bundlePath), "utf8");
const partnerComponent = componentSlice(bundle, "function Lk({detail:n})", "const Rk=");
const categoryComponent = componentSlice(bundle, "function _k({detail:n})", "function Pk(");

assert.doesNotMatch(partnerComponent, /children:"01 \/ 05"/);
assert.doesNotMatch(partnerComponent, /index:"0[234]"/);
assert.doesNotMatch(partnerComponent, /children:\["0",s\+1\]/);
assert.doesNotMatch(
  partnerComponent,
  /children:\["05 \/ ",e\("Start a project"\)\]/,
);
assert.doesNotMatch(
  categoryComponent,
  /String\(t\.solutions\.categories\.indexOf\(s\)\+1\)\.padStart\(2,"0"\)/,
);
assert.match(categoryComponent, /children:\["\[ ",i\.overview," \]"\]/);
assert.match(partnerComponent, /f\.jsx\(qn,\{\}\)/);
assert.doesNotMatch(
  partnerComponent,
  /solutions · designed, deployed and supported by JOTO/,
);

assert.match(bundle, /foundingDate:"2010"/);
assert.match(bundle, /Catalyst, Nexus, Meraki and Cisco UCS/);

console.log(
  `Verified Solution page cleanup across ${routeFiles.length} routes using ${bundlePath}.`,
);
