const ABOUT_COPY_SELECTOR = "#about [data-about-copy]";
const ABOUT_SECTION_SELECTOR = "#about";
const ABOUT_STATS_SELECTOR = "[data-about-stats]";
const ABOUT_CARD_SELECTOR = "[data-about-stat-card]";
const ABOUT_VALUE_SELECTOR = "[data-about-stat-value]";
const ABOUT_COUNTER_DURATION = 1000;
const ABOUT_DESKTOP_STAGGER = 100;
const ABOUT_MOBILE_STAGGER = 70;
const HERO_HEADING_SELECTOR =
  '[aria-labelledby="hero-title"] [data-hero-heading-shell]';
const GLOBAL_PRESENCE_SELECTOR = "#global-presence";
const TEHRAN_LATITUDE = 35.71219607;
const TEHRAN_LONGITUDE = 51.36844735;
const TEHRAN_MAP_X = 64.27;
const TEHRAN_MAP_Y = 38.93;

const LOCALIZED_DIGITS = new Map([
  ["۰", "0"],
  ["۱", "1"],
  ["۲", "2"],
  ["۳", "3"],
  ["۴", "4"],
  ["۵", "5"],
  ["۶", "6"],
  ["۷", "7"],
  ["۸", "8"],
  ["۹", "9"],
  ["٠", "0"],
  ["١", "1"],
  ["٢", "2"],
  ["٣", "3"],
  ["٤", "4"],
  ["٥", "5"],
  ["٦", "6"],
  ["٧", "7"],
  ["٨", "8"],
  ["٩", "9"],
]);

function parseLocalizedInteger(value) {
  const normalized = Array.from(
    value,
    (character) => LOCALIZED_DIGITS.get(character) ?? character,
  ).join("");
  if (!/^\s*\d+\s*$/.test(normalized)) return null;
  return Number.parseInt(normalized, 10);
}

function numberFormatter(finalText) {
  const usesLocalizedDigits = /[۰-۹٠-٩]/.test(finalText);
  const locale = usesLocalizedDigits
    ? document.documentElement.lang || "en"
    : "en";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: false,
  });
}

function animateAboutCounter(element, target, delay, formatter) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const startedAt = performance.now();
      const frame = (timestamp) => {
        const progress = Math.min(
          1,
          (timestamp - startedAt) / ABOUT_COUNTER_DURATION,
        );
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatter.format(Math.round(target * eased));
        if (progress < 1) {
          window.requestAnimationFrame(frame);
          return;
        }
        element.textContent = formatter.format(target);
        resolve();
      };
      window.requestAnimationFrame(frame);
    }, delay);
  });
}

function completeAboutMotion(section, values) {
  values.forEach(({ element, finalText }) => {
    element.textContent = finalText;
  });
  section.dataset.aboutMotionRunning = "false";
  section.dataset.aboutMotionComplete = "true";
}

function enhanceAboutStatMotion(section) {
  if (section.dataset.aboutMotionReady === "true") return true;

  const stats = section.querySelector(ABOUT_STATS_SELECTOR);
  const cards = Array.from(
    stats?.querySelectorAll(ABOUT_CARD_SELECTOR) ?? [],
  );
  if (!stats || cards.length !== 4) return false;

  const values = cards.map((card, index) => {
    const element = card.querySelector(ABOUT_VALUE_SELECTOR);
    if (!element) return null;

    const finalText = element.textContent.trim();
    const target = parseLocalizedInteger(finalText);
    const kind = target === null ? "text" : "number";
    card.style.setProperty(
      "--joto-about-delay",
      `${index * ABOUT_DESKTOP_STAGGER}ms`,
    );
    card.style.setProperty(
      "--joto-about-delay-mobile",
      `${index * ABOUT_MOBILE_STAGGER}ms`,
    );
    element.dataset.aboutValueKind = kind;
    element.dataset.aboutMotionFinal = finalText;
    element.setAttribute("aria-label", finalText);
    return { element, finalText, target, index, kind };
  });
  if (values.some((value) => value === null)) return false;

  section.dataset.aboutMotionReady = "true";
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    completeAboutMotion(section, values);
    return true;
  }

  values
    .filter(({ kind }) => kind === "number")
    .forEach(({ element, finalText }) => {
      element.textContent = numberFormatter(finalText).format(0);
    });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.some(
        (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.25,
      );
      if (!visible) return;

      observer.disconnect();
      section.dataset.aboutMotionRunning = "true";
      const stagger = window.matchMedia("(max-width: 479px)").matches
        ? ABOUT_MOBILE_STAGGER
        : ABOUT_DESKTOP_STAGGER;
      const counters = values
        .filter(({ kind }) => kind === "number")
        .map(({ element, target, index, finalText }) =>
          animateAboutCounter(
            element,
            target,
            index * stagger + 120,
            numberFormatter(finalText),
          ),
        );
      Promise.all(counters).then(() => completeAboutMotion(section, values));
    },
    { threshold: [0.25] },
  );
  observer.observe(section);
  return true;
}

function isPersianHomepage() {
  const language = (document.documentElement.lang || "").toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  return language.startsWith("fa") || pathname === "/fa" || pathname === "/fa/";
}

function removeSecondaryAboutCopy(copy) {
  const bodyParagraphs = Array.from(copy.children).filter(
    (child) => child.tagName === "P",
  );
  if (bodyParagraphs.length < 2) {
    copy.dataset.homepageSecondaryCopyRemoved = "true";
    return;
  }

  bodyParagraphs.at(-1).remove();
  copy.dataset.homepageSecondaryCopyRemoved = "true";
}

function removeHeroEyebrow(headingShell) {
  const eyebrow = headingShell.previousElementSibling;
  if (eyebrow?.tagName === "P") eyebrow.remove();
}

function removeHeroProofCard(content) {
  const proofCard = Array.from(content.children).find((child) =>
    child.classList.contains("liquid-glass"),
  );
  proofCard?.remove();
}

function refineHomepageHero(headingShell) {
  const content = headingShell.parentElement;
  const stage = content?.parentElement;
  const hero = headingShell.closest('[aria-labelledby="hero-title"]');
  if (!content || !stage || !hero) return false;

  removeHeroEyebrow(headingShell);
  removeHeroProofCard(content);

  hero.dataset.homeHeroRefined = "true";
  stage.dataset.homeHeroStage = "";
  content.dataset.homeHeroContent = "";
  return true;
}

function createIranRoute(svg) {
  const route = document.createElementNS("http://www.w3.org/2000/svg", "path");
  route.dataset.iranPresence = "";
  route.classList.add("global-map__route");
  route.setAttribute(
    "d",
    `M 82.7186111111111 40.93165 Q 73.49 30.93 ${TEHRAN_MAP_X} ${TEHRAN_MAP_Y}`,
  );
  route.setAttribute("fill", "none");
  route.setAttribute("stroke", "url(#global-route)");
  route.setAttribute("stroke-dasharray", "1.3 1.6");
  route.setAttribute("stroke-linecap", "round");
  route.setAttribute("stroke-width", "0.25");
  route.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(route);
  return route;
}

function createIranMarker(canvas) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.dataset.iranPresence = "";
  marker.dataset.markerId = "tehran";
  marker.dataset.active = "false";
  marker.className =
    "group absolute z-20 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none";
  marker.style.left = `${TEHRAN_MAP_X}%`;
  marker.style.top = `${TEHRAN_MAP_Y}%`;
  marker.setAttribute("aria-label", "تهران، ایران");
  marker.innerHTML = `
    <span aria-hidden="true"
      class="global-map__marker-pulse absolute inset-1 rounded-full border border-[#5ed29c]/45"></span>
    <span aria-hidden="true"
      class="absolute left-1/2 top-1/2 flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2
        items-center justify-center rounded-full border border-[#c9f8e4] bg-[#5ed29c]
        shadow-[0_0_18px_rgba(94,210,156,0.95)] transition-transform duration-300"></span>
    <span class="pointer-events-none absolute bottom-[calc(100%+0.4rem)] right-0 min-w-40
      rounded border border-white/15 bg-[#07100d]/95 px-3 py-2 text-right opacity-0
      shadow-2xl backdrop-blur-md transition-all duration-200
      group-hover:-translate-y-1 group-hover:opacity-100
      group-focus-visible:-translate-y-1 group-focus-visible:opacity-100">
      <span class="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5ed29c]">ایران</span>
      <span class="mt-1 block whitespace-nowrap text-[11px] leading-5 text-white/65">تهران</span>
    </span>
  `;
  canvas.append(marker);
  return marker;
}

function createIranCard(grid) {
  const wrapper = document.createElement("div");
  wrapper.dataset.iranPresence = "";
  wrapper.className = "min-w-0 bg-[#070b0a]";

  const card = document.createElement("button");
  card.type = "button";
  card.dataset.regionCard = "true";
  card.dataset.regionKey = "Iran";
  card.dataset.active = "false";
  card.className =
    "global-region-card group relative flex min-h-[112px] w-full items-center gap-3 overflow-hidden p-4 text-start outline-none lg:h-full lg:min-h-0 lg:px-4 lg:py-3";
  card.setAttribute("aria-label", "ایران. تهران");
  card.setAttribute("aria-pressed", "false");
  card.innerHTML = `
    <span aria-hidden="true"
      class="global-region-card__orb relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full"
      data-region-icon="true">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="10" r="3"></circle>
        <path d="M12 22s7-6.1 7-12A7 7 0 1 0 5 10c0 5.9 7 12 7 12Z"></path>
      </svg>
    </span>
    <span class="relative z-10 min-w-0 flex-1">
      <span class="block truncate text-sm font-medium tracking-[-0.02em] text-white
        transition-transform duration-300 group-hover:-translate-y-0.5
        group-focus-visible:-translate-y-0.5">ایران</span>
      <span class="mt-1 line-clamp-2 block text-[10px] leading-4 text-white/48
        transition-colors duration-300 group-hover:text-white/66
        group-focus-visible:text-white/66">تهران</span>
    </span>
  `;
  wrapper.append(card);
  grid.append(wrapper);
  return card;
}

function bindIranPresenceState(card, marker, route) {
  const setActive = (active) => {
    const value = String(active);
    card.dataset.active = value;
    card.setAttribute("aria-pressed", value);
    marker.dataset.active = value;
    route.dataset.active = value;
  };

  [card, marker].forEach((element) => {
    element.addEventListener("pointerenter", () => setActive(true));
    element.addEventListener("pointerleave", () => setActive(false));
    element.addEventListener("focus", () => setActive(true));
    element.addEventListener("blur", () => setActive(false));
  });
}

function enhancePersianIranPresence(section) {
  if (!isPersianHomepage()) return true;
  if (section.querySelector("[data-iran-presence]")) return true;

  const canvas = section.querySelector(".global-map__canvas");
  const svg = canvas?.querySelector("svg");
  const grid = section.querySelector("[data-region-grid]");
  if (!canvas || !svg || !grid) return false;

  section.dataset.iranCoordinates =
    `${TEHRAN_LATITUDE},${TEHRAN_LONGITUDE}`;
  const route = createIranRoute(svg);
  const marker = createIranMarker(canvas);
  const card = createIranCard(grid);
  bindIranPresenceState(card, marker, route);
  return true;
}

function applyHomepageRefinements() {
  const copy = document.querySelector(ABOUT_COPY_SELECTOR);
  const aboutSection = document.querySelector(ABOUT_SECTION_SELECTOR);
  const headingShell = document.querySelector(HERO_HEADING_SELECTOR);
  const globalPresence = document.querySelector(GLOBAL_PRESENCE_SELECTOR);

  if (copy) removeSecondaryAboutCopy(copy);
  const heroComplete = headingShell ? refineHomepageHero(headingShell) : false;
  const iranComplete = globalPresence
    ? enhancePersianIranPresence(globalPresence)
    : false;
  const aboutMotionComplete = aboutSection
    ? enhanceAboutStatMotion(aboutSection)
    : false;

  return Boolean(
    copy && heroComplete && iranComplete && aboutMotionComplete,
  );
}

function startHomepageRefinements() {
  const root = document.querySelector("#root") || document.body;
  const observer = new MutationObserver(applyHomepageRefinements);

  observer.observe(root, { childList: true, subtree: true });
  applyHomepageRefinements();
  [50, 250, 800, 1600].forEach((delay) => {
    window.setTimeout(applyHomepageRefinements, delay);
  });
  window.setTimeout(() => observer.disconnect(), 3000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startHomepageRefinements, {
    once: true,
  });
} else {
  startHomepageRefinements();
}
