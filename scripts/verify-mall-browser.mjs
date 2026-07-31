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

const HIDDEN_PRODUCT = {
  slug: "di-7008-mini-d-link-di-7008-series-router-1xwan-7xlan-400mbps-ipsec-vpn",
  titleToken: "DI-7008-MINI",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function searchParam(page, name) {
  return page.evaluate(
    (parameterName) => new URL(window.location.href).searchParams.get(parameterName),
    name,
  );
}

async function waitForCatalog(page, selector) {
  await page.waitForSelector(`${selector}[aria-busy="false"]`, {
    timeout: 20_000,
  });
}

async function assertLoadedImages(page, selector, label) {
  const images = page.locator(`${selector} img`);
  const count = await images.count();
  assert(count > 0, `${label}: expected at least one image`);
  for (const index of [...new Set([0, count - 1])]) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      (node) => node.complete && node.naturalWidth > 0,
      await image.elementHandle(),
      { timeout: 15_000 },
    );
  }
}

async function assertPageBasics(page, testCase, viewport, selector) {
  const attributes = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyText: document.body.innerText,
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
  }));
  assert(
    attributes.lang === testCase.lang,
    `${testCase.locale}/${viewport.name}: lang was ${attributes.lang}`,
  );
  assert(
    attributes.dir === testCase.dir,
    `${testCase.locale}/${viewport.name}: dir was ${attributes.dir}`,
  );
  assert(
    attributes.scrollWidth <= attributes.clientWidth + 1,
    `${testCase.locale}/${viewport.name}: horizontal overflow ${attributes.scrollWidth}/${attributes.clientWidth}`,
  );
  assert(
    !/\b(price|pricing|cart|checkout|payment|currency)\b/i.test(attributes.bodyText),
    `${testCase.locale}/${viewport.name}: commerce wording rendered`,
  );
  assert(
    !/not found|未找到|پیدا نشد/i.test(attributes.title),
    `${testCase.locale}/${viewport.name}: catalog retained the SPA 404 title`,
  );
  assert(
    attributes.canonical.includes(`${testCase.prefix}/mall/`),
    `${testCase.locale}/${viewport.name}: localized canonical missing`,
  );
  await page.waitForSelector("a[data-joto-mall-link]", {
    state: "attached",
    timeout: 15_000,
  });
  const mallStyles = await page.locator("[data-joto-mall]").evaluate((node) => {
    const style = getComputedStyle(node);
    const title = node.querySelector(
      ".joto-mall__hero-title, .joto-mall__list-header h1, .joto-mall__product-summary h1",
    );
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      fontFamily: style.fontFamily,
      titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
    };
  });
  assert(
    mallStyles.backgroundColor === "rgb(255, 255, 255)",
    `${testCase.locale}/${viewport.name}: Mall background is not white`,
  );
  assert(
    mallStyles.backgroundImage === "none",
    `${testCase.locale}/${viewport.name}: Mall grid background remains`,
  );
  assert(
    mallStyles.fontFamily.startsWith("Poppins"),
    `${testCase.locale}/${viewport.name}: Mall font is not Poppins-first`,
  );
  const titleMaximum = viewport.name === "desktop" ? 56 : viewport.name === "tablet" ? 48 : 34;
  assert(
    mallStyles.titleSize > 0 && mallStyles.titleSize <= titleMaximum,
    `${testCase.locale}/${viewport.name}: Mall title size ${mallStyles.titleSize}px exceeds ${titleMaximum}px`,
  );
  const mallLinks = page.locator("a[data-joto-mall-link]");
  assert(
    (await mallLinks.count()) > 0,
    `${testCase.locale}/${viewport.name}: Mall navigation link missing`,
  );
  if (viewport.name === "desktop") {
    const visibleMallLinks = await mallLinks.evaluateAll((links) =>
      links.filter((link) => {
        const style = getComputedStyle(link);
        const box = link.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0;
      }).length,
    );
    assert(
      visibleMallLinks > 0,
      `${testCase.locale}/${viewport.name}: Mall navigation link not visible`,
    );
  }
  await assertLoadedImages(page, selector, `${testCase.locale}/${viewport.name}`);
}

async function exerciseCatalog(page, origin, testCase, viewport) {
  const homePath = `${testCase.prefix}/mall/`;
  const productsPath = `${testCase.prefix}/mall/products/`;
  await page.goto(`${origin}${homePath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-home]");
  assert(
    (await page.locator(".joto-mall__category").count()) >= 2,
    `${testCase.locale}/${viewport.name}: real categories were not rendered`,
  );
  const categoryLayout = await page
    .locator(".joto-mall__section--categories")
    .evaluate((section) => {
      const track = section.querySelector(".joto-mall__category-grid");
      const links = [...track.querySelectorAll(".joto-mall__category")];
      const first = links[0];
      const last = links.at(-1);
      const trackStyle = getComputedStyle(track);
      return {
        sectionHeight: section.getBoundingClientRect().height,
        display: trackStyle.display,
        flexWrap: trackStyle.flexWrap,
        overflowX: trackStyle.overflowX,
        trackScrollWidth: track.scrollWidth,
        trackClientWidth: track.clientWidth,
        firstHeight: first.getBoundingClientRect().height,
        firstHref: first.getAttribute("href"),
        firstActive: first.classList.contains("joto-mall__category--active"),
        secondHref: links[1]?.getAttribute("href") || "",
        lastHref: last.getAttribute("href"),
        linkCount: links.length,
      };
    });
  assert(
    categoryLayout.sectionHeight <= 180,
    `${testCase.locale}/${viewport.name}: category section is ${categoryLayout.sectionHeight}px tall`,
  );
  assert(
    categoryLayout.display === "flex" && categoryLayout.flexWrap === "nowrap",
    `${testCase.locale}/${viewport.name}: category track is not a single flex row`,
  );
  assert(
    ["auto", "scroll"].includes(categoryLayout.overflowX),
    `${testCase.locale}/${viewport.name}: category track is not horizontally scrollable`,
  );
  assert(
    Math.abs(categoryLayout.firstHeight - 40) <= 1,
    `${testCase.locale}/${viewport.name}: first category pill is ${categoryLayout.firstHeight}px tall`,
  );
  assert(
    categoryLayout.firstHref === productsPath && categoryLayout.lastHref === productsPath,
    `${testCase.locale}/${viewport.name}: all-products links are not localized`,
  );
  assert(
    categoryLayout.firstActive,
    `${testCase.locale}/${viewport.name}: first category pill is not active`,
  );
  assert(
    categoryLayout.secondHref.includes("category="),
    `${testCase.locale}/${viewport.name}: category link lost its filter query`,
  );
  assert(
    categoryLayout.linkCount >= 4,
    `${testCase.locale}/${viewport.name}: category navigation is incomplete`,
  );
  if (viewport.name === "mobile") {
    assert(
      categoryLayout.trackScrollWidth > categoryLayout.trackClientWidth,
      `${testCase.locale}/mobile: category track does not expose horizontal discovery`,
    );
  }
  const homeLayout = await page.locator("[data-joto-mall-home]").evaluate((root) => {
    const cards = [...root.querySelectorAll(".joto-mall__cards--home .joto-mall__card")];
    const firstCard = cards[0];
    const grid = root.querySelector(".joto-mall__cards--home");
    const search = root.querySelector(".joto-mall__search");
    const categories = root.querySelector(".joto-mall__section--categories");
    const contact = root.querySelector(".joto-mall__contact-panel");
    const summary = root.querySelector(
      ".joto-mall__cards--home .joto-mall__card-summary",
    );
    const media = firstCard?.querySelector(".joto-mall__card-media");
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    return {
      cardCount: cards.length,
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      background: getComputedStyle(root).backgroundColor,
      mediaBackground: media ? getComputedStyle(media).backgroundColor : "",
      summaryDisplay: summary ? getComputedStyle(summary).display : "missing",
      heroCategoryGap:
        categories.getBoundingClientRect().top - search.getBoundingClientRect().bottom,
      contactBorderWidth: getComputedStyle(contact).borderTopWidth,
      contactBackground: getComputedStyle(contact).backgroundColor,
      headerBackground: header ? getComputedStyle(header).backgroundColor : "",
      footerBackground: footer ? getComputedStyle(footer).backgroundColor : "",
    };
  });
  const expectedColumns =
    viewport.width >= 1280 ? 6 : viewport.width >= 768 ? 3 : viewport.width >= 420 ? 2 : 1;
  assert(
    homeLayout.cardCount === 12,
    `${testCase.locale}/${viewport.name}: expected 12 home cards`,
  );
  assert(
    homeLayout.columns === expectedColumns,
    `${testCase.locale}/${viewport.name}: expected ${expectedColumns} home columns, got ${homeLayout.columns}`,
  );
  assert(
    homeLayout.background === "rgb(255, 255, 255)",
    `${testCase.locale}/${viewport.name}: Mall is not white`,
  );
  assert(
    homeLayout.mediaBackground === "rgb(255, 255, 255)",
    `${testCase.locale}/${viewport.name}: media is not white`,
  );
  assert(
    ["none", "missing"].includes(homeLayout.summaryDisplay),
    `${testCase.locale}/${viewport.name}: home summary is visible`,
  );
  assert(
    homeLayout.heroCategoryGap <= 48,
    `${testCase.locale}/${viewport.name}: hero/category gap is ${homeLayout.heroCategoryGap}px`,
  );
  assert(
    homeLayout.contactBorderWidth === "0px",
    `${testCase.locale}/${viewport.name}: contact border remains`,
  );
  assert(
    ["rgba(0, 0, 0, 0)", "transparent"].includes(homeLayout.contactBackground),
    `${testCase.locale}/${viewport.name}: contact background remains`,
  );
  assert(
    (await page.locator(".joto-mall__card").count()) === 12,
    `${testCase.locale}/${viewport.name}: recent products did not render 12 cards`,
  );
  assert(
    !(await page.locator(".joto-mall__card-title").allTextContents())
      .join("\n")
      .includes(HIDDEN_PRODUCT.titleToken),
    `${testCase.locale}/${viewport.name}: no-image product rendered on Mall home`,
  );
  await assertPageBasics(
    page,
    testCase,
    viewport,
    "[data-joto-mall-home]",
  );

  const homeSearch = page.locator("[data-joto-mall-home] input[type=search]");
  await homeSearch.fill("D-Link");
  await page.locator("[data-joto-mall-home] form[role=search]").evaluate(
    (form) => form.requestSubmit(),
  );
  await waitForCatalog(page, "[data-joto-mall-products]");
  assert(
    (await searchParam(page, "q")) === "D-Link",
    `${testCase.locale}/${viewport.name}: home search query was not preserved`,
  );
  assert(
    (await page.locator(".joto-mall__card").count()) > 0,
    `${testCase.locale}/${viewport.name}: search returned no results`,
  );

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  assert(
    (await page.locator(".joto-mall__result-count").innerText()).trim().startsWith("15 "),
    `${testCase.locale}/${viewport.name}: filtered product total is not 15`,
  );
  assert(
    !(await page.locator(".joto-mall__card-title").allTextContents())
      .join("\n")
      .includes(HIDDEN_PRODUCT.titleToken),
    `${testCase.locale}/${viewport.name}: no-image product rendered in catalog`,
  );
  const productGridClass = await page
    .locator("[data-joto-mall-products] .joto-mall__cards")
    .getAttribute("class");
  assert(
    !productGridClass.includes("joto-mall__cards--home"),
    `${testCase.locale}/${viewport.name}: home-only compact class leaked into product list`,
  );

  await page.goto(
    `${origin}${productsPath}?q=${encodeURIComponent(HIDDEN_PRODUCT.titleToken)}`,
    { waitUntil: "domcontentloaded" },
  );
  await waitForCatalog(page, "[data-joto-mall-products]");
  assert(
    (await page.locator(".joto-mall__card").count()) === 0
      && (await page.locator(".joto-mall__result-count").innerText())
        .trim()
        .startsWith("0 "),
    `${testCase.locale}/${viewport.name}: no-image product remains searchable`,
  );

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  const sortControl = page.locator('[data-select-name="sort"]');
  const directionControl = page.locator('[data-select-name="direction"]');
  const sortValues = await sortControl
    .locator("select option")
    .evaluateAll((options) => options.map((option) => option.value));
  const directionValues = await directionControl
    .locator("select option")
    .evaluateAll((options) => options.map((option) => option.value));
  assert(
    JSON.stringify(sortValues) === JSON.stringify(["title", "brand", "recent"]),
    `${testCase.locale}/${viewport.name}: sort values were ${sortValues.join(",")}`,
  );
  assert(
    JSON.stringify(directionValues) === JSON.stringify(["asc", "desc"]),
    `${testCase.locale}/${viewport.name}: direction values were ${directionValues.join(",")}`,
  );
  const sortLabels = await sortControl
    .locator('[role="option"]')
    .allTextContents();
  const directionLabels = await directionControl
    .locator('[role="option"]')
    .allTextContents();
  assert(
    new Set(sortLabels).size === sortLabels.length,
    `${testCase.locale}/${viewport.name}: duplicate sort labels rendered`,
  );
  assert(
    new Set(directionLabels).size === directionLabels.length,
    `${testCase.locale}/${viewport.name}: duplicate direction labels rendered`,
  );

  const sortTrigger = sortControl.locator(".joto-mall__select-trigger");
  await sortTrigger.click();
  const sortMenuStyle = await sortControl
    .locator(".joto-mall__select-menu")
    .evaluate((menu) => ({
      background: getComputedStyle(menu).backgroundColor,
      hidden: menu.hidden,
      role: menu.getAttribute("role"),
    }));
  assert(
    !sortMenuStyle.hidden
      && sortMenuStyle.background === "rgb(255, 255, 255)"
      && sortMenuStyle.role === "listbox",
    `${testCase.locale}/${viewport.name}: sort menu was not the white listbox`,
  );
  await page.locator(".joto-mall__list-header h1").click();
  assert(
    await sortControl.locator(".joto-mall__select-menu").isHidden(),
    `${testCase.locale}/${viewport.name}: outside click did not close sort menu`,
  );

  await sortTrigger.click();
  await sortControl
    .locator('.joto-mall__select-option[data-value="recent"]')
    .click();
  assert(
    (await searchParam(page, "sort")) === "recent",
    `${testCase.locale}/${viewport.name}: custom sort option did not update URL`,
  );

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  const ascendingTitle = await page
    .locator(".joto-mall__card-title")
    .first()
    .innerText();
  const directionTrigger = page.locator(
    '[data-select-name="direction"] .joto-mall__select-trigger',
  );
  await directionTrigger.focus();
  await directionTrigger.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => new URL(window.location.href).searchParams.get("direction") === "desc",
  );
  const descendingTitle = await page
    .locator(".joto-mall__card-title")
    .first()
    .innerText();
  assert(
    ascendingTitle !== descendingTitle,
    `${testCase.locale}/${viewport.name}: descending sort did not change order`,
  );
  assert(
    (await searchParam(page, "direction")) === "desc",
    `${testCase.locale}/${viewport.name}: sort state missing from URL`,
  );

  const categoryTrigger = page.locator(
    '[data-select-name="category"] .joto-mall__select-trigger',
  );
  await categoryTrigger.focus();
  await categoryTrigger.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  assert(
    (await categoryTrigger.getAttribute("aria-expanded")) === "false"
      && (await categoryTrigger.evaluate((node) => document.activeElement === node)),
    `${testCase.locale}/${viewport.name}: keyboard close did not restore category trigger`,
  );

  const categorySelect = page.locator('select[name="category"]');
  const categoryValues = await categorySelect.locator("option").evaluateAll(
    (options) => options.map((option) => option.value).filter(Boolean),
  );
  assert(
    categoryValues.length >= 2,
    `${testCase.locale}/${viewport.name}: category filter has insufficient values`,
  );
  if (testCase.dir === "rtl") {
    const rtlDirections = await page
      .locator('[data-select-name="category"]')
      .evaluate((control) => ({
        trigger: getComputedStyle(
          control.querySelector(".joto-mall__select-trigger"),
        ).direction,
        technicalOption: control.querySelector(
          '.joto-mall__select-option[data-value]:not([data-value=""])',
        )?.dir,
      }));
    assert(
      rtlDirections.trigger === "rtl" && rtlDirections.technicalOption === "ltr",
      `${testCase.locale}/${viewport.name}: RTL control or LTR technical option is incorrect`,
    );
  }
  await categorySelect.selectOption(categoryValues[0]);
  assert(
    (await searchParam(page, "category")) === categoryValues[0],
    `${testCase.locale}/${viewport.name}: category state missing from URL`,
  );

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  const brandSelect = page.locator('select[name="brand"]');
  if (await brandSelect.count()) {
    const brand = await brandSelect.locator("option").nth(1).getAttribute("value");
    await brandSelect.selectOption(brand);
    assert(
      (await searchParam(page, "brand")) === brand,
      `${testCase.locale}/${viewport.name}: brand state missing from URL`,
    );
  }

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  await page.locator('[data-view="list"]').click();
  assert(
    (await searchParam(page, "view")) === "list",
    `${testCase.locale}/${viewport.name}: list view state missing from URL`,
  );
  assert(
    await page.locator(".joto-mall__cards--list").count(),
    `${testCase.locale}/${viewport.name}: list view class missing`,
  );

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  const next = page.locator(".joto-mall__pagination button").last();
  assert(!(await next.isDisabled()), `${testCase.locale}/${viewport.name}: next page disabled`);
  await next.click();
  assert(
    (await searchParam(page, "page")) === "2",
    `${testCase.locale}/${viewport.name}: pagination state missing from URL`,
  );
  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  assert(
    (await searchParam(page, "page")) === null,
    `${testCase.locale}/${viewport.name}: browser back did not restore page one`,
  );
  await page.goForward({ waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  assert(
    (await searchParam(page, "page")) === "2",
    `${testCase.locale}/${viewport.name}: browser forward did not restore page two`,
  );

  await page.goto(`${origin}${productsPath}`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page, "[data-joto-mall-products]");
  const card = page.locator(".joto-mall__card-link").first();
  const detailHref = await card.getAttribute("href");
  assert(
    detailHref?.startsWith(`${testCase.prefix}/mall/products/`),
    `${testCase.locale}/${viewport.name}: product detail link is not localized`,
  );
  await card.click();
  await waitForCatalog(page, "[data-joto-mall-product]");
  await assertLoadedImages(
    page,
    "[data-joto-mall-product]",
    `${testCase.locale}/${viewport.name}/detail`,
  );
  const productTitle = await page.locator(".joto-mall__product-summary h1").innerText();
  const jsonLd = await page
    .locator('script[data-joto-mall-product-jsonld]')
    .textContent();
  assert(jsonLd, `${testCase.locale}/${viewport.name}: Product JSON-LD missing`);
  const structuredProduct = JSON.parse(jsonLd);
  assert(
    !("offers" in structuredProduct) && !("price" in structuredProduct),
    `${testCase.locale}/${viewport.name}: Product JSON-LD contains commerce data`,
  );
  assert(
    (await page.locator(".joto-mall__detail-section").count()) > 0,
    `${testCase.locale}/${viewport.name}: product details missing`,
  );
  assert(
    (await page
      .locator('a[href^="http"]')
      .filter({ hasText: /https?:\/\// })
      .count()) === 0,
    `${testCase.locale}/${viewport.name}: visible source URL remains`,
  );
  assert(
    !/^(Source|来源|منبع)$/m.test(
      await page.locator("[data-joto-mall-product]").innerText(),
    ),
    `${testCase.locale}/${viewport.name}: visible source label remains`,
  );

  const contactCta = page
    .locator(
      ".joto-mall__product-summary .joto-mall__button:visible, .joto-mall__sticky-contact:visible",
    )
    .first();
  assert(
    (await contactCta.count()) === 1,
    `${testCase.locale}/${viewport.name}: visible product contact target missing`,
  );
  assert(
    (await contactCta.getAttribute("href"))?.includes("?product="),
    `${testCase.locale}/${viewport.name}: product contact target missing`,
  );
  await contactCta.click();
  await page.waitForSelector("textarea", { timeout: 15_000 });
  await page.waitForFunction(
    () => document.querySelector("textarea")?.value.length > 0,
    null,
    { timeout: 15_000 },
  );
  const message = page.locator("textarea").first();
  assert(
    (await message.inputValue()).includes(productTitle),
    `${testCase.locale}/${viewport.name}: contact message was not product-prefilled`,
  );
  await message.fill(`${await message.inputValue()}\nBrowser verification`);
  assert(
    (await message.inputValue()).endsWith("Browser verification"),
    `${testCase.locale}/${viewport.name}: contact message is not editable`,
  );

  await page.goto(
    `${origin}${testCase.prefix}/mall/products/${HIDDEN_PRODUCT.slug}/`,
    { waitUntil: "domcontentloaded" },
  );
  await waitForCatalog(page, "[data-joto-mall-product]");
  assert(
    (await page.locator(".joto-mall__product-summary h1").innerText())
      .includes(HIDDEN_PRODUCT.titleToken),
    `${testCase.locale}/${viewport.name}: hidden listing product detail is inaccessible`,
  );
}

async function verifyEnglishHomepageTypography(page, origin, viewport) {
  await page.goto(`${origin}/#case-studies`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#case-studies .group > .flex-1 h3", {
    timeout: 15_000,
  });
  await page.waitForSelector("#contact .joto-home-contact__copy h2", {
    timeout: 15_000,
  });
  const styles = await page.evaluate(() => {
    const caseTitle = document.querySelector(
      "#case-studies .group > .flex-1 h3",
    );
    const contactTitle = document.querySelector(
      "#contact .joto-home-contact__copy h2",
    );
    const caseStyle = getComputedStyle(caseTitle);
    const contactStyle = getComputedStyle(contactTitle);
    return {
      caseFontFamily: caseStyle.fontFamily,
      caseFontSize: Number.parseFloat(caseStyle.fontSize),
      caseLineHeight: Number.parseFloat(caseStyle.lineHeight),
      caseFontWeight: caseStyle.fontWeight,
      contactFontSize: Number.parseFloat(contactStyle.fontSize),
      contactLineHeight: Number.parseFloat(contactStyle.lineHeight),
      contactMaxWidth: Number.parseFloat(contactStyle.maxWidth),
    };
  });
  assert(
    styles.caseFontFamily.startsWith("Poppins")
      && styles.caseFontSize === 16
      && styles.caseLineHeight === 24
      && styles.caseFontWeight === "500",
    `en/${viewport.name}: case title typography is ${JSON.stringify(styles)}`,
  );
  assert(
    styles.contactFontSize >= 36
      && styles.contactFontSize <= 48
      && Math.abs(styles.contactLineHeight / styles.contactFontSize - 1.12) < 0.02
      && styles.contactMaxWidth === 512,
    `en/${viewport.name}: contact title typography is ${JSON.stringify(styles)}`,
  );
}

async function exerciseErrorStates(page, origin, testCase) {
  const missingPath = `${testCase.prefix}/mall/products/not-a-real-product/`;
  await page.goto(`${origin}${missingPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-joto-mall-product] .joto-mall__state");
  const missingText = await page
    .locator("[data-joto-mall-product] .joto-mall__state")
    .innerText();
  assert(missingText.trim(), `${testCase.locale}: missing-product state was empty`);

  const manifestPattern = "**/mall-data/manifest.json";
  await page.route(manifestPattern, (route) => route.abort("failed"));
  await page.goto(`${origin}${testCase.prefix}/mall/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-joto-mall-home] .joto-mall__state button", {
    timeout: 15_000,
  });
  await page.unroute(manifestPattern);
  await page.locator("[data-joto-mall-home] .joto-mall__state button").click();
  await waitForCatalog(page, "[data-joto-mall-home]");
}

async function verifyMallBrowser(
  origin = "http://127.0.0.1:3009",
) {
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
      await page.evaluate((locale) => {
        localStorage.setItem("joto:locale", locale);
      }, testCase.lang);
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.emulateMedia({ reducedMotion: "no-preference" });
        const problemStart = consoleProblems.length;
        const errorStart = pageErrors.length;
        await exerciseCatalog(page, origin, testCase, viewport);
        if (testCase.locale === "en") {
          await verifyEnglishHomepageTypography(page, origin, viewport);
        }
        assert(
          consoleProblems.length === problemStart,
          `${testCase.locale}/${viewport.name}: console problems: ${consoleProblems
            .slice(problemStart)
            .join(" | ")}`,
        );
        assert(
          pageErrors.length === errorStart,
          `${testCase.locale}/${viewport.name}: page errors: ${pageErrors
            .slice(errorStart)
            .join(" | ")}`,
        );
        completed.push(`${testCase.locale}/${viewport.name}`);
      }
      const expectedProblemStart = consoleProblems.length;
      const expectedErrorStart = pageErrors.length;
      await exerciseErrorStates(page, origin, testCase);
      consoleProblems.splice(expectedProblemStart);
      pageErrors.splice(expectedErrorStart);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${origin}/fa/mall/`, { waitUntil: "domcontentloaded" });
    await waitForCatalog(page, "[data-joto-mall-home]");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
      "fa/mobile/reduced-motion: horizontal overflow",
    );
    completed.push("fa/mobile/reduced-motion");
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

const runtimeOrigin = await page.evaluate(() => window.location.origin);
return verifyMallBrowser(runtimeOrigin);
}
