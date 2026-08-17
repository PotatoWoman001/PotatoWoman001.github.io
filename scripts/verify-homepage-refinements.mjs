import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const homepages = ["index.html", "zh/index.html", "fa/index.html"];
const homepageVersion = "20260810-1";
const homepageScriptVersion = "20260817-1";
const homepageStylesVersion = "20260811-3";
const contactVersion = "20260809-1";

for (const route of homepages) {
  const html = readFileSync(path.join(root, route), "utf8");
  assert.match(
    html,
    new RegExp(
      `/assets/homepage-refinements\\.css\\?v=${homepageStylesVersion}`,
    ),
  );
  assert.match(
    html,
    new RegExp(
      `/assets/homepage-refinements\\.js\\?v=${homepageScriptVersion}`,
    ),
  );
  assert.match(
    html,
    new RegExp(`/assets/contact-form-sections\\.css\\?v=${contactVersion}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/contact-form-sections\\.js\\?v=${contactVersion}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/solution-card-carousel\\.css\\?v=${homepageVersion}`),
  );
  assert.match(
    html,
    new RegExp(`/assets/solution-card-carousel\\.js\\?v=${homepageVersion}`),
  );
}

const homepageScriptPath = path.join(root, "assets/homepage-refinements.js");
const homepageStylesPath = path.join(root, "assets/homepage-refinements.css");
assert.equal(existsSync(homepageScriptPath), true);
assert.equal(existsSync(homepageStylesPath), true);

const homepageScript = readFileSync(homepageScriptPath, "utf8");
const homepageStyles = readFileSync(homepageStylesPath, "utf8");
const juniperLogoPath = path.join(root, "assets/juniper-networks-logo.svg");
const juniperLogo = existsSync(juniperLogoPath)
  ? readFileSync(juniperLogoPath, "utf8")
  : "";
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
assert.match(homepageScript, /removeHeroVerticalGuides/);
assert.match(homepageScript, /left-1\/4/);
assert.match(homepageScript, /left-1\/2/);
assert.match(homepageScript, /left-3\/4/);
assert.match(homepageScript, /enhancePersianIranPresence/);
assert.match(homepageScript, /enhanceTechnologyPortfolio/);
assert.match(homepageScript, /Juniper Networks/);
assert.match(homepageScript, /juniper-networks-logo\.svg/);
assert.match(homepageScript, /ایران/);
assert.match(homepageScript, /تهران/);
assert.match(homepageScript, /35\.71219607/);
assert.match(homepageScript, /51\.36844735/);
assert.match(homepageStyles, /service-card__icon-mark--accent/);
assert.match(homepageStyles, /data-about-stats/);
assert.match(homepageStyles, /grid-template-columns:\s*repeat\(2/);
assert.match(homepageStyles, /@media \(max-width:\s*479px\)/);
assert.match(homepageStyles, /data-home-hero-refined/);
assert.match(homepageStyles, /@media \(max-width:\s*1023px\)/);
assert.match(
  homepageStyles,
  /\[data-juniper-networks-partner\]\s*\{\s*display:\s*none;/,
);
assert.match(
  homepageStyles,
  /@media \(max-width:\s*1023px\)[\s\S]*?\[data-juniper-networks-partner\]\s*\{\s*display:\s*block;/,
);
assert.match(homepageStyles, /overflow-x:\s*clip/);
assert.match(
  homepageStyles,
  /\[data-home-hero-refined="true"\][\s\S]*?min-height:\s*100vh\s*!important;[\s\S]*?min-height:\s*100svh\s*!important;/,
);
assert.match(
  homepageStyles,
  /\[data-home-hero-refined="true"\]\s*\[data-home-hero-stage\][\s\S]*?min-height:\s*100vh\s*!important;[\s\S]*?min-height:\s*100svh\s*!important;/,
);
assert.match(
  homepageStyles,
  /\[data-home-hero-refined="true"\]\s*\[data-testid="hero-background-video"\]\s*\{\s*display:\s*none\s*!important;/,
);
assert.match(homepageStyles, /--joto-mobile-hero-title-size/);
assert.match(
  homepageStyles,
  /--joto-mobile-hero-copy-gap:\s*clamp\(/,
);
assert.match(
  homepageStyles,
  /html:lang\(zh\)[\s\S]*?--joto-mobile-hero-title-line:\s*1\.06/,
);
assert.match(
  homepageStyles,
  /html:lang\(zh\)[\s\S]*?--joto-mobile-hero-copy-gap:\s*clamp\(78px,\s*10\.5svh,\s*98px\)/,
);
assert.match(
  homepageStyles,
  /max-height:\s*700px[\s\S]*?html:lang\(zh\)[\s\S]*?--joto-mobile-hero-copy-gap:/,
);
assert.match(
  homepageStyles,
  /html:lang\(zh\)[\s\S]*?--joto-mobile-hero-content-shift:\s*clamp\(42px,\s*7svh,\s*68px\)/,
);
assert.match(
  homepageStyles,
  /html:lang\(zh\)[\s\S]*?data-home-hero-content[\s\S]*?margin-top:\s*var\(--joto-mobile-hero-content-shift\)/,
);
assert.match(
  homepageStyles,
  /max-height:\s*700px[\s\S]*?html:lang\(zh\)[\s\S]*?--joto-mobile-hero-content-shift:\s*18px/,
);
assert.match(
  homepageStyles,
  /max-width:\s*359px[\s\S]*?html:lang\(zh\)[\s\S]*?--joto-mobile-hero-content-shift:\s*10px/,
);
assert.match(homepageStyles, /repeating-linear-gradient\(\s*90deg/);
assert.match(homepageStyles, /joto-mobile-hero-raster-drift/);
assert.match(
  homepageStyles,
  /data-hero-support[\s\S]*?margin-top:\s*var\(--joto-mobile-hero-copy-gap\)/,
);
assert.doesNotMatch(homepageStyles, /joto-mobile-hero-breathe/);
assert.match(
  homepageStyles,
  /@media \(max-width:\s*1023px\) and \(max-height:\s*700px\)/,
);
assert.match(
  homepageStyles,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?::before[\s\S]*?::after[\s\S]*?animation:\s*none\s*!important;/,
);
assert.match(homepageStyles, /data-iran-presence/);
assert.equal(existsSync(juniperLogoPath), true);
assert.match(juniperLogo, /<svg/);
assert.match(juniperLogo, /aria-label="Juniper Networks"/);
assert.match(juniperLogo, /viewBox="50 0 620 150"/);

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
