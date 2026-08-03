async (page) => {
const CASES = [
  { locale: "en", path: "/", lang: "en", dir: "ltr" },
  { locale: "zh", path: "/zh/", lang: "zh-CN", dir: "ltr" },
  { locale: "fa", path: "/fa/", lang: "fa-IR", dir: "rtl" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeInteger(value) {
  const localizedDigits = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  return Number.parseInt(
    Array.from(value, (character) => localizedDigits[character] ?? character)
      .join(""),
    10,
  );
}

async function readMotionState() {
  return page.locator("#about").evaluate((section) => {
    const cards = [...section.querySelectorAll("[data-about-stat-card]")];
    const values = [...section.querySelectorAll("[data-about-stat-value]")];
    return {
      ready: section.dataset.aboutMotionReady,
      running: section.dataset.aboutMotionRunning,
      complete: section.dataset.aboutMotionComplete,
      values: values.map((value) => ({
        current: value.textContent.trim(),
        final: value.dataset.aboutMotionFinal,
        kind: value.dataset.aboutValueKind,
      })),
      cards: cards.map((card) => {
        const style = getComputedStyle(card);
        return {
          opacity: Number.parseFloat(style.opacity),
          transform: style.transform,
          desktopDelay: card.style.getPropertyValue("--joto-about-delay"),
          mobileDelay: card.style.getPropertyValue("--joto-about-delay-mobile"),
          transitionDuration: style.transitionDuration,
        };
      }),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
    };
  });
}

async function verifyAnimatedCase(origin, testCase, viewport) {
  const label = `${testCase.locale}/${viewport.name}`;
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate((lang) => localStorage.setItem("joto:locale", lang), testCase.lang);
  await page.goto(
    `${origin}${testCase.path}?why-motion=${testCase.locale}-${viewport.name}-${Date.now()}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector('#about[data-about-motion-ready="true"]');

  const initial = await readMotionState();
  assert(initial.lang === testCase.lang, `${label}: wrong lang ${initial.lang}`);
  assert(initial.dir === testCase.dir, `${label}: wrong dir ${initial.dir}`);
  assert(initial.complete !== "true", `${label}: motion completed before entering`);
  const initialNumbers = initial.values.filter(({ kind }) => kind === "number");
  const initialTexts = initial.values.filter(({ kind }) => kind === "text");
  assert(initialNumbers.length === 2, `${label}: expected two numeric values`);
  assert(initialTexts.length === 2, `${label}: expected two text values`);
  assert(
    initialNumbers.every(({ current }) => normalizeInteger(current) === 0),
    `${label}: counters did not start at zero`,
  );

  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.waitForSelector('#about[data-about-motion-running="true"]');
  await page.waitForFunction(() => {
    const value = document.querySelector(
      '#about [data-about-stat-value][data-about-value-kind="number"]',
    );
    if (!value) return false;
    const current = value.textContent.trim();
    const final = value.dataset.aboutMotionFinal;
    return current !== "0" && current !== "۰" && current !== "٠" && current !== final;
  }, null, { timeout: 900, polling: 50 });
  const midpoint = await readMotionState();
  const midpointNumber = normalizeInteger(
    midpoint.values.find(({ kind }) => kind === "number").current,
  );
  const midpointTarget = normalizeInteger(
    midpoint.values.find(({ kind }) => kind === "number").final,
  );
  assert(
    midpointNumber > 0 && midpointNumber < midpointTarget,
    `${label}: counter did not visibly progress (${midpointNumber}/${midpointTarget})`,
  );

  await page.waitForSelector('#about[data-about-motion-complete="true"]');
  const completed = await readMotionState();
  assert(completed.running === "false", `${label}: running flag not cleared`);
  assert(
    completed.values.every(({ current, final }) => current === final),
    `${label}: final values were not restored`,
  );
  assert(
    completed.cards.every(
      ({ opacity, transform }) =>
        opacity === 1 && (transform === "none" || transform.includes("matrix(1, 0, 0, 1")),
    ),
    `${label}: cards did not settle in place`,
  );
  assert(
    completed.cards.every(
      ({ desktopDelay, mobileDelay }, index) =>
        desktopDelay === `${index * 100}ms`
        && mobileDelay === `${index * 70}ms`,
    ),
    `${label}: stagger variables are incorrect`,
  );
  assert(
    completed.scrollWidth <= completed.clientWidth + 1,
    `${label}: horizontal overflow ${completed.scrollWidth}/${completed.clientWidth}`,
  );

  const finalValues = completed.values.map(({ current }) => current);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(120);
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const reentered = await readMotionState();
  assert(reentered.running === "false", `${label}: animation replayed on re-entry`);
  assert(
    JSON.stringify(reentered.values.map(({ current }) => current))
      === JSON.stringify(finalValues),
    `${label}: values changed on re-entry`,
  );
}

async function verifyReducedMotion(origin) {
  const label = "zh/mobile/reduced-motion";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => localStorage.setItem("joto:locale", "zh-CN"));
  await page.goto(`${origin}/zh/?why-motion=reduced-${Date.now()}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('#about[data-about-motion-complete="true"]');
  const state = await readMotionState();
  assert(state.running === "false", `${label}: running state should be disabled`);
  assert(
    state.values.every(({ current, final }) => current === final),
    `${label}: final values are not immediately visible`,
  );
  assert(
    state.cards.every(({ opacity, transform, transitionDuration }) =>
      opacity === 1
      && transform === "none"
      && transitionDuration.split(",").every((duration) => duration.trim() === "0s")),
    `${label}: motion styles were not disabled`,
  );
  assert(
    state.scrollWidth <= state.clientWidth + 1,
    `${label}: horizontal overflow ${state.scrollWidth}/${state.clientWidth}`,
  );
}

const origin = await page.evaluate(() => window.location.origin);
const consoleProblems = [];
const pageErrors = [];
const onConsole = (message) => {
  if (["warning", "error"].includes(message.type())) {
    consoleProblems.push(`${message.type()}: ${message.text()}`);
  }
};
const onPageError = (error) => pageErrors.push(error.message);
page.on("console", onConsole);
page.on("pageerror", onPageError);

const completed = [];
try {
  for (const testCase of CASES) {
    for (const viewport of VIEWPORTS) {
      const problemStart = consoleProblems.length;
      const errorStart = pageErrors.length;
      await verifyAnimatedCase(origin, testCase, viewport);
      assert(
        consoleProblems.length === problemStart,
        `${testCase.locale}/${viewport.name}: ${consoleProblems.slice(problemStart).join(" | ")}`,
      );
      assert(
        pageErrors.length === errorStart,
        `${testCase.locale}/${viewport.name}: ${pageErrors.slice(errorStart).join(" | ")}`,
      );
      completed.push(`${testCase.locale}/${viewport.name}`);
    }
  }

  const problemStart = consoleProblems.length;
  const errorStart = pageErrors.length;
  await verifyReducedMotion(origin);
  assert(
    consoleProblems.length === problemStart,
    `zh/mobile/reduced-motion: ${consoleProblems.slice(problemStart).join(" | ")}`,
  );
  assert(
    pageErrors.length === errorStart,
    `zh/mobile/reduced-motion: ${pageErrors.slice(errorStart).join(" | ")}`,
  );
  completed.push("zh/mobile/reduced-motion");
} finally {
  page.off("console", onConsole);
  page.off("pageerror", onPageError);
}

return {
  completed,
  matrixCases: completed.length,
  consoleProblems,
  pageErrors,
};
}
