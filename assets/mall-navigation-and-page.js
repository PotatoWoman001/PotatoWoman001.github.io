const LOCALES = {
  en: { label: "Mall", path: "/mall/" },
  zh: { label: "商城", path: "/zh/mall/" },
  fa: { label: "فروشگاه", path: "/fa/mall/" },
};

function getLocale(pathname = window.location.pathname) {
  const path = pathname.toLowerCase();
  if (path.startsWith("/zh/") || path === "/zh") return LOCALES.zh;
  if (path.startsWith("/fa/") || path === "/fa") return LOCALES.fa;
  return LOCALES.en;
}

function normalizedPath(value) {
  return new URL(value, window.location.origin).pathname.replace(/\/+$/, "") || "/";
}

function isBlogLink(link, locale) {
  const blogPath = locale.path.replace(/mall\/?$/, "blog/");
  return normalizedPath(link.href) === normalizedPath(blogPath);
}

function stabilizeInjectedLink(link) {
  const hasHiddenEntrance =
    link.classList.contains("opacity-0") ||
    link.classList.contains("translate-y-4");
  if (!hasHiddenEntrance) return;

  link.classList.remove("opacity-0", "translate-y-4");
  link.classList.add("opacity-100", "translate-y-0");
  link.style.removeProperty("transition-delay");
}

export function injectMallLinks(locale = getLocale()) {
  const currentPath = normalizedPath(window.location.pathname);
  const mallPath = normalizedPath(locale.path);

  document.querySelectorAll("a[href]").forEach((blogLink) => {
    if (!isBlogLink(blogLink, locale)) return;
    const container = blogLink.parentElement;
    if (!container) return;

    const listItem = container.tagName === "LI" ? container : null;
    const siblings = listItem
      ? Array.from(listItem.parentElement?.children || [])
      : [container];
    let mallLink = siblings
      .map((item) => item.querySelector(":scope > [data-joto-mall-link]"))
      .find(Boolean);

    if (!mallLink) {
      if (listItem) {
        const clone = listItem.cloneNode(true);
        mallLink = clone.querySelector("a[href]");
        if (!mallLink) return;
        mallLink.dataset.jotoMallLink = "";
        listItem.insertAdjacentElement("afterend", clone);
      } else {
        mallLink = blogLink.cloneNode(true);
        mallLink.dataset.jotoMallLink = "";
        blogLink.insertAdjacentElement("afterend", mallLink);
      }
    }

    mallLink.href = locale.path;
    mallLink.textContent = locale.label;
    stabilizeInjectedLink(mallLink);
    if (currentPath === mallPath || currentPath.startsWith(`${mallPath}/`)) {
      mallLink.setAttribute("aria-current", "page");
    } else {
      mallLink.removeAttribute("aria-current");
    }
  });
}

function start() {
  const locale = getLocale();
  let scheduled = false;
  const enhance = () => {
    scheduled = false;
    injectMallLinks(locale);
  };
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(enhance);
  };

  enhance();
  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
