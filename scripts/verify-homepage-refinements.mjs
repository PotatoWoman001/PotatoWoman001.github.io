import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const homepages = ["index.html", "zh/index.html", "fa/index.html"];
const version = "20260805-1";

for (const route of homepages) {
  const html = readFileSync(path.join(root, route), "utf8");
  assert.match(
    html,
    new RegExp(`/assets/homepage-refinements\\.css\\?v=${version}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/homepage-refinements\\.js\\?v=${version}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/contact-form-sections\\.css\\?v=${version}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/contact-form-sections\\.js\\?v=${version}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/solution-card-carousel\\.css\\?v=${version}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/solution-card-carousel\\.js\\?v=${version}`),
  );
}

const homepageScriptPath = path.join(root, "assets/homepage-refinements.js");
const homepageStylesPath = path.join(root, "assets/homepage-refinements.css");
assert.equal(existsSync(homepageScriptPath), true);
assert.equal(existsSync(homepageStylesPath), true);

const homepageScript = readFileSync(homepageScriptPath, "utf8");
const homepageStyles = readFileSync(homepageStylesPath, "utf8");
const contactScript = readFileSync(
  path.join(root, "assets/contact-form-sections.js"),
  "utf8",
);
const contactStyles = readFileSync(
  path.join(root, "assets/contact-form-sections.css"),
  "utf8",
);
const carouselScript = readFileSync(
  path.join(root, "assets/solution-card-carousel.js"),
  "utf8",
);
const sharedStyles = readFileSync(
  path.join(root, "assets/index-e49ffBFL.css"),
  "utf8",
);

assert.match(homepageScript, /data-about-copy/);
assert.match(homepageScript, /homepageSecondaryCopyRemoved/);
assert.match(homepageScript, /removeHeroEyebrow/);
assert.match(homepageScript, /removeHeroProofCard/);
assert.match(homepageScript, /enhancePersianIranPresence/);
assert.match(homepageScript, /ایران/);
assert.match(homepageScript, /تهران/);
assert.match(homepageScript, /35\.71219607/);
assert.match(homepageScript, /51\.36844735/);
assert.match(homepageStyles, /service-card__icon-mark--accent/);
assert.match(homepageStyles, /data-about-stats/);
assert.match(homepageStyles, /grid-template-columns:\s*repeat\(2/);
assert.match(homepageStyles, /@media \(max-width:\s*479px\)/);
assert.match(homepageStyles, /data-home-hero-refined/);
assert.match(homepageStyles, /data-iran-presence/);

assert.match(sharedStyles, /data-testid="header-actions"/);
assert.match(sharedStyles, /aria-haspopup="menu"/);
assert.match(sharedStyles, /--joto-compact-action-width/);

assert.match(contactScript, /renderHomepageContactForm/);
assert.match(contactScript, /data-home-contact-form/);
assert.match(contactStyles, /width:\s*auto/);
assert.match(contactStyles, /padding-inline:\s*28px/);
assert.match(contactStyles, /--joto-home-hero-action-width/);
assert.match(contactStyles, /width:\s*var\(--joto-home-hero-action-width\)/);
assert.match(
  contactStyles,
  /grid-template-columns:\s*minmax\(0,\s*5fr\)\s+minmax\(0,\s*7fr\)/,
);

assert.match(carouselScript, /min-width:\s*1024px/);
assert.match(carouselScript, /solution-scroll-section/);
assert.match(carouselScript, /solution-scroll-stage/);
assert.match(carouselScript, /prefers-reduced-motion:\s*reduce/);
assert.match(carouselScript, /translate3d\(/);
assert.match(carouselScript, /window\.scrollTo\(\{/);
assert.match(
  carouselScript,
  /reducedMotion\.matches\s*\?\s*"auto"\s*:\s*"smooth"/,
);
assert.doesNotMatch(carouselScript, /scroller\.scrollLeft\s*=/);
assert.doesNotMatch(carouselScript, /addEventListener\("wheel"/);
assert.doesNotMatch(carouselScript, /preventDefault\(\)/);
assert.match(
  readFileSync(path.join(root, "assets/solution-card-carousel.css"), "utf8"),
  /scroll-snap-type:\s*none !important/,
);
assert.match(homepageStyles, /max-width:\s*300px/);
assert.match(
  homepageStyles,
  /#services \[data-service-card\] h3,[\s\S]*?\[data-solution-category-page\] \[data-service-card\] h3\s*\{[\s\S]*?text-align:\s*center !important;[\s\S]*?justify-content:\s*center;/,
);
assert.match(
  homepageStyles,
  /#services \[data-service-card\] p,[\s\S]*?\[data-solution-category-page\] \[data-service-card\] p\s*\{[\s\S]*?text-align:\s*start !important;/,
);
assert.match(
  homepageStyles,
  /#case-studies \.group > \.flex-1 :where\(h3, ul\)/,
);
assert.match(homepageStyles, /max-width:\s*none !important/);
assert.match(
  homepageStyles,
  /html:lang\(en\) #case-studies \.group > \.flex-1 h3\s*\{[\s\S]*?max-width:\s*none !important;[\s\S]*?font-family:\s*"Poppins",\s*sans-serif;[\s\S]*?font-size:\s*16px !important;[\s\S]*?line-height:\s*24px !important;[\s\S]*?font-weight:\s*500 !important;/,
);
assert.match(
  contactStyles,
  /html:lang\(en\) #contact \.joto-home-contact__copy h2\s*\{[\s\S]*?max-width:\s*32rem;[\s\S]*?font-size:\s*clamp\(36px,\s*3\.2vw,\s*48px\) !important;[\s\S]*?line-height:\s*1\.12 !important;[\s\S]*?font-weight:\s*500;[\s\S]*?letter-spacing:\s*-0\.04em;/,
);
assert.match(homepageStyles, /flex-wrap:\s*nowrap !important/);
assert.match(homepageStyles, /gap:\s*0\.25rem !important/);
assert.match(homepageStyles, /white-space:\s*nowrap !important/);

console.log("Verified homepage interaction and content refinements.");
