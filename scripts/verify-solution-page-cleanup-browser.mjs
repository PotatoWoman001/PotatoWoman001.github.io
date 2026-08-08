async (page) => {
  const origin = "http://127.0.0.1:3009";
  const cases = [
    { locale: "en", prefix: "", lang: "en", dir: "ltr" },
    { locale: "zh", prefix: "/zh", lang: "zh-CN", dir: "ltr" },
    { locale: "fa", prefix: "/fa", lang: "fa-IR", dir: "rtl" },
  ];
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ];

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function open(pathname, label) {
    const consoleErrors = [];
    const pageErrors = [];
    const onConsole = (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    };
    const onPageError = (error) => pageErrors.push(error.message);
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    const response = await page.goto(`${origin}${pathname}`, {
      waitUntil: "domcontentloaded",
    });
    assert(response?.ok(), `${label}: HTTP ${response?.status()}`);
    await page.waitForSelector("main");
    await page.waitForSelector("footer");
    await page.waitForTimeout(150);
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    assert(pageErrors.length === 0, `${label}: page errors ${pageErrors.join(" | ")}`);
    assert(
      consoleErrors.length === 0,
      `${label}: console errors ${consoleErrors.join(" | ")}`,
    );
  }

  async function assertBasics(testCase, label) {
    const basics = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      footerCount: document.querySelectorAll("footer").length,
    }));
    assert(basics.lang === testCase.lang, `${label}: wrong lang ${basics.lang}`);
    assert(basics.dir === testCase.dir, `${label}: wrong dir ${basics.dir}`);
    assert(basics.footerCount === 1, `${label}: expected one footer`);
    assert(
      basics.scrollWidth <= basics.clientWidth + 1,
      `${label}: horizontal overflow ${basics.scrollWidth}/${basics.clientWidth}`,
    );
  }

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const testCase of cases) {
      const baseLabel = `${testCase.locale}/${viewport.name}`;
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await page.evaluate((locale) => {
        window.localStorage.setItem("joto:locale", locale);
      }, testCase.lang);
      await open(`${testCase.prefix}/`, `${baseLabel}/home`);
      const homepageFooter = (await page.locator("footer").innerText()).trim();
      assert(homepageFooter.includes("JOTO"), `${baseLabel}: homepage footer incomplete`);

      await open(
        `${testCase.prefix}/solutions/network/`,
        `${baseLabel}/category`,
      );
      await assertBasics(testCase, `${baseLabel}/category`);
      const categoryLabel = await page
        .locator('main p[class*="font-mono"][class*="text-joto-green"]')
        .first()
        .innerText();
      assert(categoryLabel.includes("["), `${baseLabel}: overview label missing`);
      assert(!/\/\s*\d{2}/.test(categoryLabel), `${baseLabel}: category ordinal remains`);
      assert(
        (await page.locator("footer").innerText()).trim() === homepageFooter,
        `${baseLabel}: category footer differs from homepage`,
      );

      await open(
        `${testCase.prefix}/solutions/network/cisco/`,
        `${baseLabel}/cisco`,
      );
      await assertBasics(testCase, `${baseLabel}/cisco`);
      const partnerState = await page.evaluate(() => {
        const exactClassTexts = (rootSelector, exactClass) =>
          [...document.querySelectorAll(`${rootSelector} p, ${rootSelector} span`)]
            .filter((node) => node.className === exactClass)
            .map((node) => node.textContent.trim());
        return {
          bodyText: document.body.innerText,
          sectionIndexes: exactClassTexts(
            "#partner-relationship, #partner-services, #partner-case-studies",
            "font-mono text-[11px] tracking-[0.2em] text-[#5ed29c]",
          ),
          relationshipIndexes: exactClassTexts(
            "#partner-relationship",
            "font-mono text-[10px] tracking-[0.2em] text-joto-green",
          ),
          serviceIndexes: exactClassTexts(
            "#partner-services",
            "font-mono text-[10px] tracking-[0.2em] text-white/40",
          ),
          caseIndexes: exactClassTexts(
            "#partner-case-studies",
            "font-mono text-[10px] tracking-[0.2em] text-joto-green",
          ),
          contactEyebrow:
            document.querySelector('#contact p[class*="uppercase"]')?.textContent.trim() || "",
        };
      });
      assert(!partnerState.bodyText.includes("01 / 05"), `${baseLabel}: hero ordinal remains`);
      assert(partnerState.sectionIndexes.length === 0, `${baseLabel}: section ordinal remains`);
      assert(
        partnerState.relationshipIndexes.length === 0,
        `${baseLabel}: relationship card ordinal remains`,
      );
      assert(partnerState.serviceIndexes.length === 0, `${baseLabel}: service ordinal remains`);
      assert(partnerState.caseIndexes.length === 0, `${baseLabel}: case ordinal remains`);
      assert(
        !/^05\s*\//.test(partnerState.contactEyebrow),
        `${baseLabel}: contact ordinal remains`,
      );
      assert(
        /(?:2010|۲۰۱۰)/.test(partnerState.bodyText),
        `${baseLabel}: business year missing`,
      );
      assert(
        (await page.locator("footer").innerText()).trim() === homepageFooter,
        `${baseLabel}: partner footer differs from homepage`,
      );
    }
  }

  return { passed: true, combinations: cases.length * viewports.length * 2 };
}
