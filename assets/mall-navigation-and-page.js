const SITE_ORIGIN = "https://jotoglobal.com";
const MALL_ROUTE_PATTERN = /^\/(?:zh\/|fa\/)?mall\/?$/;

const LOCALES = {
  en: {
    label: "Mall",
    path: "/mall/",
    lang: "en",
    dir: "ltr",
    eyebrow: "JOTO TECH / MALL",
    title: "JOTO Mall",
    description:
      "Product models and product categories are being prepared. Please check back soon.",
    home: "Home",
    solutions: "Solutions",
    contact: "Contact us",
    homePath: "/",
    solutionsPath: "/#solutions",
    contactPath: "/contact/",
  },
  zh: {
    label: "商城",
    path: "/zh/mall/",
    lang: "zh-CN",
    dir: "ltr",
    eyebrow: "JOTO TECH / 商城",
    title: "JOTO 产品商城",
    description: "产品型号与产品分类内容正在整理中，敬请期待。",
    home: "首页",
    solutions: "解决方案",
    contact: "联系我们",
    homePath: "/zh/",
    solutionsPath: "/zh/#solutions",
    contactPath: "/zh/contact/",
  },
  fa: {
    label: "فروشگاه",
    path: "/fa/mall/",
    lang: "fa-IR",
    dir: "rtl",
    eyebrow: "JOTO TECH / فروشگاه",
    title: "فروشگاه محصولات JOTO",
    description:
      "مدل‌ها و دسته‌بندی‌های محصولات در حال آماده‌سازی هستند. به‌زودی دوباره مراجعه کنید.",
    home: "خانه",
    solutions: "راهکارها",
    contact: "تماس با ما",
    homePath: "/fa/",
    solutionsPath: "/fa/#solutions",
    contactPath: "/fa/contact/",
  },
};

function getLocale() {
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/zh/") || path === "/zh") return LOCALES.zh;
  if (path.startsWith("/fa/") || path === "/fa") return LOCALES.fa;
  return LOCALES.en;
}

function normalizedPath(value) {
  return new URL(value, window.location.origin).pathname.replace(/\/+$/, "") || "/";
}

function isBlogLink(link, locale) {
  const expected = normalizedPath(
    locale.path.replace(/mall\/?$/, "blog/"),
  );
  return normalizedPath(link.href) === expected;
}

function injectMallLinks(locale) {
  const currentPath = normalizedPath(window.location.pathname);
  const mallPath = normalizedPath(locale.path);

  document.querySelectorAll("a[href]").forEach((link) => {
    if (!isBlogLink(link, locale)) return;
    const container = link.parentElement;
    if (!container) return;

    const listItem = container.tagName === "LI" ? container : null;
    let mallLink = listItem
      ? Array.from(listItem.parentElement?.children || [])
          .map((item) => item.querySelector(":scope > [data-joto-mall-link]"))
          .find(Boolean)
      : container.querySelector(":scope > [data-joto-mall-link]");

    if (!mallLink) {
      if (listItem) {
        const clonedItem = listItem.cloneNode(true);
        mallLink = clonedItem.querySelector("a[href]");
        if (!mallLink) return;
        mallLink.dataset.jotoMallLink = "";
        mallLink.href = locale.path;
        mallLink.textContent = locale.label;
        listItem.insertAdjacentElement("afterend", clonedItem);
      } else {
        mallLink = link.cloneNode(true);
        mallLink.dataset.jotoMallLink = "";
        mallLink.href = locale.path;
        mallLink.textContent = locale.label;
        link.insertAdjacentElement("afterend", mallLink);
      }
    }

    if (currentPath === mallPath) {
      mallLink.setAttribute("aria-current", "page");
    } else {
      mallLink.removeAttribute("aria-current");
    }
  });
}

function removeMatchingHeadNodes(selector) {
  document.head.querySelectorAll(selector).forEach((node) => node.remove());
}

function addMeta(attribute, name, content) {
  const meta = document.createElement("meta");
  meta.setAttribute(attribute, name);
  meta.content = content;
  meta.dataset.jotoMallSeo = "";
  document.head.append(meta);
}

function addLink(rel, href, hreflang) {
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (hreflang) link.hreflang = hreflang;
  link.dataset.jotoMallSeo = "";
  document.head.append(link);
}

function installMallSeo(locale) {
  removeMatchingHeadNodes("[data-joto-seo], [data-joto-mall-seo]");
  removeMatchingHeadNodes(
    'meta[name="description"], meta[name="robots"], meta[property^="og:"], link[rel="canonical"], link[rel="alternate"][hreflang]',
  );

  const canonical = `${SITE_ORIGIN}${locale.path}`;
  document.title = `${locale.title} | JOTO TECH`;
  addMeta("name", "description", locale.description);
  addMeta("name", "robots", "index, follow");
  addMeta("property", "og:site_name", "JOTO TECH");
  addMeta("property", "og:type", "website");
  addMeta("property", "og:title", document.title);
  addMeta("property", "og:description", locale.description);
  addMeta("property", "og:url", canonical);
  addLink("canonical", canonical);
  addLink("alternate", `${SITE_ORIGIN}/mall/`, "en");
  addLink("alternate", `${SITE_ORIGIN}/zh/mall/`, "zh-CN");
  addLink("alternate", `${SITE_ORIGIN}/fa/mall/`, "fa-IR");
  addLink("alternate", `${SITE_ORIGIN}/mall/`, "x-default");
}

function mallMarkup(locale) {
  return `
    <section class="joto-mall-page__hero" aria-labelledby="joto-mall-title">
      <div class="joto-mall-page__inner">
        <p class="joto-mall-page__eyebrow">${locale.eyebrow}</p>
        <h1 class="joto-mall-page__title" id="joto-mall-title">${locale.title}</h1>
        <p class="joto-mall-page__body">${locale.description}</p>
        <nav class="joto-mall-page__actions" aria-label="${locale.title}">
          <a class="joto-mall-page__action" href="${locale.solutionsPath}">${locale.solutions}</a>
          <a class="joto-mall-page__action" href="${locale.contactPath}">${locale.contact}</a>
          <a class="joto-mall-page__action" href="${locale.homePath}">${locale.home}</a>
        </nav>
      </div>
    </section>
  `;
}

function renderMallPage(locale) {
  const main = document.querySelector("main");
  if (!main) return false;

  document.documentElement.lang = locale.lang;
  document.documentElement.dir = locale.dir;
  main.dataset.mallPage = "";

  const existingHero = main.querySelector(":scope > .joto-mall-page__hero");
  if (!existingHero) {
    const notFoundSection =
      main.querySelector(":scope > section:has([data-not-found-links])") ||
      Array.from(main.children).find(
        (child) => child.tagName === "SECTION" && !child.matches("header, footer"),
      );
    if (!notFoundSection) return false;
    notFoundSection.outerHTML = mallMarkup(locale);
  }

  installMallSeo(locale);
  injectMallLinks(locale);
  return true;
}

function start() {
  const locale = getLocale();
  const isMallRoute = MALL_ROUTE_PATTERN.test(window.location.pathname);
  let scheduled = false;

  const enhance = () => {
    scheduled = false;
    injectMallLinks(locale);
    if (isMallRoute) renderMallPage(locale);
  };

  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(enhance);
  };

  enhance();

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });

  if (isMallRoute) {
    window.setTimeout(() => renderMallPage(locale), 100);
    window.setTimeout(() => renderMallPage(locale), 500);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
