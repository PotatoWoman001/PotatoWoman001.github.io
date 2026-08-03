async (page) => {
const CASES = [
  { locale: "en", prefix: "", lang: "en", dir: "ltr" },
  { locale: "zh", prefix: "/zh", lang: "zh-CN", dir: "ltr" },
  { locale: "fa", prefix: "/fa", lang: "fa-IR", dir: "rtl" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const HIDDEN_PRODUCT = "DI-7008-MINI";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForCatalog(selector) {
  await page.waitForSelector(`${selector}[aria-busy="false"]`, {
    timeout: 20_000,
  });
}

async function currentParams() {
  return page.evaluate(() =>
    Object.fromEntries(new URL(window.location.href).searchParams.entries()),
  );
}

async function assertNoOverflow(label) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label}: horizontal overflow ${dimensions.scrollWidth}/${dimensions.clientWidth}`,
  );
}

async function assertImagesLoaded(selector, label) {
  const images = page.locator(`${selector} img`);
  const count = await images.count();
  assert(count > 0, `${label}: expected product images`);
  for (const index of [...new Set([0, count - 1])]) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(
      (node) =>
        node.complete && node.naturalWidth > 0
          ? true
          : new Promise((resolve) => {
              node.addEventListener("load", () => resolve(true), { once: true });
              node.addEventListener("error", () => resolve(false), { once: true });
            }),
    );
    assert(
      await image.evaluate((node) => node.naturalWidth > 0),
      `${label}: image failed to load`,
    );
  }
}

async function assertPageBasics(testCase, viewport, selector) {
  const basics = await page.evaluate(() => {
    const root = document.querySelector("[data-joto-mall]");
    const title = root?.querySelector(
      ".joto-mall__hero-title, .joto-mall__list-header h1, .joto-mall__product-summary h1",
    );
    const rootStyle = root ? getComputedStyle(root) : null;
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      background: rootStyle?.backgroundColor || "",
      backgroundImage: rootStyle?.backgroundImage || "",
      fontFamily: rootStyle?.fontFamily || "",
      titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
    };
  });
  const label = `${testCase.locale}/${viewport.name}`;
  assert(basics.lang === testCase.lang, `${label}: wrong lang ${basics.lang}`);
  assert(basics.dir === testCase.dir, `${label}: wrong dir ${basics.dir}`);
  assert(
    basics.canonical.includes(`${testCase.prefix}/mall/`),
    `${label}: localized canonical missing`,
  );
  assert(
    basics.background === "rgb(248, 251, 249)",
    `${label}: Mall background is not off-white`,
  );
  assert(
    basics.backgroundImage.includes("linear-gradient")
      && basics.backgroundImage.includes("radial-gradient"),
    `${label}: technical grid background missing`,
  );
  assert(
    basics.fontFamily.startsWith("Poppins"),
    `${label}: Mall font is not Poppins-first`,
  );
  const titleMaximum = viewport.name === "desktop" ? 56 : viewport.name === "tablet" ? 48 : 34;
  assert(
    basics.titleSize > 0 && basics.titleSize <= titleMaximum,
    `${label}: title is ${basics.titleSize}px`,
  );
  await assertNoOverflow(label);
  await assertImagesLoaded(selector, label);
}

async function assertContactForm(testCase, viewport) {
  const label = `${testCase.locale}/${viewport.name}`;
  const form = page.locator(".joto-mall__contact-form form");
  assert((await form.count()) === 1, `${label}: Mall contact form missing`);
  for (const name of ["name", "company", "email", "phoneOrWechat", "message"]) {
    assert(
      (await form.locator(`[name="${name}"]`).count()) === 1,
      `${label}: contact field ${name} missing`,
    );
  }
  if (viewport.name !== "desktop") return;

  let payload = null;
  await page.route("**/api/contact", async (route) => {
    payload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await form.locator('[name="name"]').fill("Mall Browser Test");
  await form.locator('[name="company"]').fill("JOTO");
  await form.locator('[name="email"]').fill("mall-test@example.com");
  await form.locator('[name="message"]').fill("Catalog inquiry");
  await form.evaluate((node) => node.requestSubmit());
  await page.waitForFunction(
    () => document.querySelector("[data-solution-contact-status]")?.textContent.trim().length > 0,
  );
  assert(payload?.message === "Catalog inquiry", `${label}: contact POST payload missing`);
  await page.unroute("**/api/contact");
}

async function exerciseCatalog(origin, testCase, viewport) {
  const label = `${testCase.locale}/${viewport.name}`;
  const homePath = `${testCase.prefix}/mall/`;
  const productsPath = `${testCase.prefix}/mall/products/`;
  const legacyQuery =
    "?status=In+Stock&brand=Huawei&condition=Original+New&sort=recent&direction=desc&size=12";

  await page.goto(`${origin}${homePath}${legacyQuery}`, {
    waitUntil: "domcontentloaded",
  });
  await waitForCatalog("[data-joto-mall-home]");

  const normalizedParams = await currentParams();
  assert(
    Object.keys(normalizedParams).length === 0,
    `${label}: legacy params remain ${JSON.stringify(normalizedParams)}`,
  );
  for (const name of ["brand", "status", "condition", "sort", "direction", "size"]) {
    assert(
      (await page.locator(`[name="${name}"], [data-select-name="${name}"]`).count()) === 0,
      `${label}: obsolete ${name} control remains`,
    );
  }

  const layout = await page.locator("[data-joto-mall-home]").evaluate((root) => {
    const cards = [...root.querySelectorAll(".joto-mall__cards--grid .joto-mall__card")];
    const grid = root.querySelector(".joto-mall__cards--grid");
    const models = [...root.querySelectorAll(".joto-mall__card-model")];
    const result = root.querySelector(".joto-mall__result-count");
    const categories = root.querySelector(".joto-mall__category-navigation");
    const search = root.querySelector(".joto-mall__search");
    return {
      cardCount: cards.length,
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      total: Number.parseInt(result?.dataset.resultCount || "0", 10),
      categoryCount: root.querySelectorAll(".joto-mall__category").length,
      categoryHeight: categories.getBoundingClientRect().height,
      categoryDisplay: getComputedStyle(categories).display,
      categoryWrap: getComputedStyle(categories).flexWrap,
      categoryOverflowX: getComputedStyle(categories).overflowX,
      categoryScrollWidth: categories.scrollWidth,
      categoryClientWidth: categories.clientWidth,
      categoryGap: categories.getBoundingClientRect().top
        - search.getBoundingClientRect().bottom,
      modelLines: models.map((model) => ({
        text: model.textContent,
        whiteSpace: getComputedStyle(model).whiteSpace,
        overflow: getComputedStyle(model).overflow,
        scrollWidth: model.scrollWidth,
        clientWidth: model.clientWidth,
      })),
      mediaWhite: cards.every(
        (card) =>
          getComputedStyle(card.querySelector(".joto-mall__card-media")).backgroundColor
          === "rgb(255, 255, 255)",
      ),
      actionsVisible: cards.every((card) => {
        const action = card.querySelector(".joto-mall__card-action");
        return action && action.getBoundingClientRect().height > 0 && action.textContent.trim();
      }),
    };
  });
  const expectedColumns =
    viewport.width >= 1280 ? 6 : viewport.width >= 768 ? 3 : 2;
  assert(layout.cardCount === 24, `${label}: expected 24 cards, got ${layout.cardCount}`);
  assert(layout.total > 200, `${label}: expected complete catalog, got ${layout.total}`);
  assert(layout.columns === expectedColumns, `${label}: expected ${expectedColumns} columns`);
  assert(layout.categoryCount >= 2, `${label}: category navigation incomplete`);
  assert(layout.categoryHeight <= 64, `${label}: category row is ${layout.categoryHeight}px tall`);
  assert(
    layout.categoryDisplay === "flex" && layout.categoryWrap === "nowrap",
    `${label}: categories are not a single row`,
  );
  assert(
    ["auto", "scroll"].includes(layout.categoryOverflowX),
    `${label}: categories are not horizontally discoverable`,
  );
  if (viewport.name === "mobile") {
    assert(
      layout.categoryScrollWidth > layout.categoryClientWidth,
      `${label}: category row does not scroll`,
    );
  }
  assert(layout.categoryGap <= 48, `${label}: search/category gap is ${layout.categoryGap}px`);
  assert(layout.mediaWhite, `${label}: product image background is not white`);
  assert(layout.actionsVisible, `${label}: product detail affordance is hidden`);
  assert(
    layout.modelLines.every(
      (model) =>
        model.whiteSpace === "nowrap"
        && model.overflow === "hidden"
        && model.scrollWidth <= model.clientWidth + 1
        && !model.text.includes("…"),
    ),
    `${label}: model is wrapped, clipped or ellipsized`,
  );
  assert(
    !(await page.locator(".joto-mall__card-model").allTextContents())
      .join("\n")
      .includes(HIDDEN_PRODUCT),
    `${label}: no-image product remains in listing`,
  );
  await assertPageBasics(testCase, viewport, "[data-joto-mall-home]");
  await assertContactForm(testCase, viewport);

  const categoryButtons = page.locator(".joto-mall__category");
  await categoryButtons.nth(1).click();
  await waitForCatalog("[data-joto-mall-home]");
  assert(
    Number.parseInt(
      await page.locator(".joto-mall__result-count").getAttribute("data-result-count"),
      10,
    ) > 0,
    `${label}: second category is empty`,
  );
  await page.locator(".joto-mall__category").first().click();
  await waitForCatalog("[data-joto-mall-home]");

  await page.goto(`${origin}${productsPath}${legacyQuery}`, {
    waitUntil: "domcontentloaded",
  });
  await waitForCatalog("[data-joto-mall-products]");
  assert(
    Object.keys(await currentParams()).length === 0,
    `${label}: product page retained legacy params`,
  );
  assert(
    (await page.locator(".joto-mall__card").count()) === 24,
    `${label}: product page did not render 24 products`,
  );

  await page.locator('[data-view="list"]').click();
  assert((await currentParams()).view === "list", `${label}: list state missing`);
  const listMetrics = await page.locator(".joto-mall__card").first().evaluate((card) => {
    const model = card.querySelector(".joto-mall__card-model");
    return {
      height: card.getBoundingClientRect().height,
      modelWhiteSpace: getComputedStyle(model).whiteSpace,
    };
  });
  const maximumListHeight = viewport.name === "mobile" ? 70.5 : 80;
  assert(
    listMetrics.height <= maximumListHeight,
    `${label}: list row is ${listMetrics.height}px tall`,
  );
  assert(listMetrics.modelWhiteSpace === "nowrap", `${label}: list model wraps`);

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog("[data-joto-mall-products]");
  const next = page.locator(".joto-mall__pagination button").last();
  assert(!(await next.isDisabled()), `${label}: next page is disabled`);
  await next.click();
  assert((await currentParams()).page === "2", `${label}: pagination state missing`);
  assert(
    (await page.locator(".joto-mall__card").count()) === 24,
    `${label}: second page did not render 24 products`,
  );

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog("[data-joto-mall-products]");
  const detailHref = await page.locator(".joto-mall__card-link").first().getAttribute("href");
  assert(
    detailHref?.startsWith(`${testCase.prefix}/mall/products/`),
    `${label}: detail link is not localized`,
  );
  await page.locator(".joto-mall__card-link").first().click();
  await waitForCatalog("[data-joto-mall-product]");
  assert(
    (await page.locator(".joto-mall__detail-section").count()) > 0,
    `${label}: product detail missing`,
  );
  if (viewport.name === "mobile") {
    const detailMetrics = await page.locator("[data-joto-mall-product]").evaluate((root) => {
      const rect = root.getBoundingClientRect();
      const gallery = root.querySelector(".joto-mall__gallery-main");
      const title = root.querySelector(".joto-mall__product-summary h1");
      const sticky = root.querySelector(".joto-mall__sticky-contact");
      const contact = root.querySelector(".joto-mall__product-summary .joto-mall__button");
      const rootStyle = getComputedStyle(root);
      return {
        left: rect.left,
        right: window.innerWidth - rect.right,
        backgroundColor: rootStyle.backgroundColor,
        borderRadius: Number.parseFloat(rootStyle.borderRadius),
        pageBackgroundImage: getComputedStyle(document.querySelector("#root")).backgroundImage,
        galleryHeight: gallery.getBoundingClientRect().height,
        titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        stickyDisplay: getComputedStyle(sticky).display,
        contactVisible: contact.getBoundingClientRect().height > 0,
      };
    });
    assert(detailMetrics.left >= 13, `${label}: detail left margin is ${detailMetrics.left}px`);
    assert(detailMetrics.right >= 13, `${label}: detail right margin is ${detailMetrics.right}px`);
    assert(
      detailMetrics.backgroundColor === "rgb(255, 255, 255)",
      `${label}: detail panel is not white`,
    );
    assert(detailMetrics.borderRadius >= 18, `${label}: detail panel radius is too small`);
    assert(
      detailMetrics.pageBackgroundImage !== "none",
      `${label}: detail page grid background is missing`,
    );
    assert(detailMetrics.galleryHeight <= 240, `${label}: gallery is too tall`);
    assert(detailMetrics.titleFontSize <= 26.5, `${label}: product title is too large`);
    assert(detailMetrics.stickyDisplay === "none", `${label}: sticky contact still covers content`);
    assert(detailMetrics.contactVisible, `${label}: in-flow contact action is hidden`);
  }
  await assertNoOverflow(`${label}/detail`);
}

async function verifyMallBrowser(origin = "http://127.0.0.1:3009") {
  const usesLocalRuntimeSnapshot = origin.includes("127.0.0.1");
  if (usesLocalRuntimeSnapshot) {
    await page.route("**/mall-data/**", async (route) => {
      const requestUrl = route.request().url().replace(
        `${origin}/mall-data/`,
        `${origin}/.runtime/mall-data/`,
      );
      await route.continue({ url: requestUrl });
    });
  }
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
      await page.evaluate((lang) => {
        localStorage.setItem("joto:locale", lang);
      }, testCase.lang);
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: "no-preference" });
        const problemStart = consoleProblems.length;
        const errorStart = pageErrors.length;
        await exerciseCatalog(origin, testCase, viewport);
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

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${origin}/fa/mall/`, { waitUntil: "domcontentloaded" });
    await waitForCatalog("[data-joto-mall-home]");
    await assertNoOverflow("fa/mobile/reduced-motion");
    completed.push("fa/mobile/reduced-motion");
  } finally {
    if (usesLocalRuntimeSnapshot) await page.unroute("**/mall-data/**");
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

const runtimeOrigin = await page.evaluate(() => window.location.origin);
return verifyMallBrowser(runtimeOrigin);
}
