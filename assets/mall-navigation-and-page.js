import { loadCatalogIndex } from "./mall-data-client.js?v=20260821-2";

const ASSET_VERSION = "20260821-2";
const LOCALES = {
  en: { key: "en", label: "Mall", path: "/mall/", categoriesLabel: "Product categories" },
  zh: { key: "zh", label: "商城", path: "/zh/mall/", categoriesLabel: "产品分类" },
  fa: { key: "fa", label: "فروشگاه", path: "/fa/mall/", categoriesLabel: "دسته‌بندی محصولات" },
};
const MALL_CATEGORIES = [
  { value: "网络", aliases: ["Networking", "Routers", "Switches", "Enterprise Network"], labels: { en: "Networking", zh: "网络", fa: "شبکه" } },
  { value: "安全", aliases: ["Firewalls", "Security"], labels: { en: "Security", zh: "安全", fa: "امنیت" } },
  { value: "服务器与存储", aliases: ["Storages", "Servers", "Storage"], labels: { en: "Servers & Storage", zh: "服务器与存储", fa: "سرور و ذخیره‌سازی" } },
  { value: "协作通信", aliases: ["Collaboration", "Unified Communications", "Voice"], labels: { en: "Collaboration", zh: "协作通信", fa: "ارتباطات سازمانی" } },
  { value: "物理安防", aliases: ["Safeguarding", "Video Surveillance", "Physical Security"], labels: { en: "Physical Security", zh: "物理安防", fa: "امنیت فیزیکی" } },
];
let catalogPromise;

function getLocale(pathname = window.location.pathname) {
  const path = pathname.toLowerCase();
  if (path.startsWith("/zh/") || path === "/zh") return LOCALES.zh;
  if (path.startsWith("/fa/") || path === "/fa") return LOCALES.fa;
  return LOCALES.en;
}
function ensureStyles() {
  if (document.querySelector("link[data-joto-mall-navigation-styles]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `/assets/mall-navigation.css?v=${ASSET_VERSION}`;
  link.dataset.jotoMallNavigationStyles = "";
  document.head.append(link);
}
function normalizedPath(value) {
  return new URL(value, window.location.origin).pathname.replace(/\/+$/, "") || "/";
}
function isBlogLink(link, locale) {
  return normalizedPath(link.href) === normalizedPath(locale.path.replace(/mall\/?$/, "blog/"));
}
export function categoryHref(locale, value) {
  const url = new URL(locale.path, window.location.origin);
  url.searchParams.set("category", value);
  return `${url.pathname}${url.search}`;
}
export function deriveSubcategories(items = []) {
  const result = new Map(MALL_CATEGORIES.map(({ value }) => [value, new Map()]));
  const topLevelCounts = new Map();
  items.forEach((item) => {
    const path = Array.isArray(item?.category_path)
      ? item.category_path.map((part) => String(part || "").trim()).filter(Boolean)
      : [];
    if (path[0]) topLevelCounts.set(path[0], (topLevelCounts.get(path[0]) || 0) + 1);
    MALL_CATEGORIES.forEach(({ value }) => {
      const index = path.indexOf(value);
      const child = index >= 0 ? path.slice(index + 1).find(Boolean) : "";
      if (!child || child === value) return;
      const counts = result.get(value);
      counts.set(child, (counts.get(child) || 0) + 1);
    });
  });
  MALL_CATEGORIES.forEach(({ value, aliases }) => {
    const counts = result.get(value);
    aliases.forEach((alias) => {
      const count = topLevelCounts.get(alias) || 0;
      if (count) counts.set(alias, Math.max(count, counts.get(alias) || 0));
    });
  });
  return new Map([...result].map(([category, counts]) => [category, [...counts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5).map(([name]) => name)]));
}
function categoryLink(locale, category, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = categoryHref(locale, category.value);
  link.textContent = category.labels[locale.key];
  link.dir = locale.key === "fa" ? "rtl" : "ltr";
  return link;
}
function renderMegaColumns(panel, locale, subcategories = new Map()) {
  panel.replaceChildren(...MALL_CATEGORIES.map((category) => {
    const column = document.createElement("section");
    column.className = "joto-mall-nav__column";
    column.append(categoryLink(locale, category, "joto-mall-nav__heading"));
    const children = document.createElement("div");
    children.className = "joto-mall-nav__children";
    (subcategories.get(category.value) || []).forEach((name) => {
      const link = document.createElement("a");
      link.href = categoryHref(locale, name);
      link.textContent = name;
      link.dir = "auto";
      children.append(link);
    });
    column.append(children);
    return column;
  }));
}
function enhanceDesktopLink(link, locale) {
  if (link.closest("[data-joto-mall-nav]")) return;
  const wrapper = document.createElement("span");
  wrapper.className = "joto-mall-nav";
  wrapper.dataset.jotoMallNav = "";
  link.before(wrapper);
  wrapper.append(link);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "joto-mall-nav__toggle";
  toggle.setAttribute("data-joto-mall-toggle", "");
  toggle.setAttribute("aria-label", locale.categoriesLabel);
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "⌄";
  const panel = document.createElement("nav");
  panel.className = "joto-mall-nav__mega";
  panel.id = `joto-mall-mega-${locale.key}-${document.querySelectorAll("[data-joto-mall-nav]").length}`;
  panel.setAttribute("aria-label", locale.categoriesLabel);
  panel.hidden = true;
  toggle.setAttribute("aria-controls", panel.id);
  renderMegaColumns(panel, locale);
  wrapper.append(toggle, panel);
  let closeTimer;
  let pinned = false;
  const open = () => {
    window.clearTimeout(closeTimer);
    const anchor = wrapper.closest("header") || wrapper;
    panel.style.setProperty("--joto-mall-nav-top", `${Math.round(anchor.getBoundingClientRect().bottom)}px`);
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  };
  const close = (restoreFocus = false) => {
    window.clearTimeout(closeTimer);
    pinned = false;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) toggle.focus();
  };
  wrapper.addEventListener("pointerenter", open);
  wrapper.addEventListener("pointerleave", () => {
    if (!pinned) closeTimer = window.setTimeout(close, 140);
  });
  wrapper.addEventListener("focusin", open);
  wrapper.addEventListener("focusout", (event) => {
    if (!pinned && !wrapper.contains(event.relatedTarget)) closeTimer = window.setTimeout(close, 140);
  });
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (panel.hidden) {
      pinned = true;
      open();
    } else if (!pinned) {
      pinned = true;
      open();
    } else close();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!wrapper.contains(event.target)) close();
  });
  wrapper.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      close(true);
    }
  });
  catalogPromise ||= loadCatalogIndex();
  catalogPromise.then((index) => renderMegaColumns(panel, locale, deriveSubcategories(index?.products)))
    .catch(() => renderMegaColumns(panel, locale));
}
function enhanceMobileLink(link, locale) {
  const item = link.closest("li");
  if (!item || item.dataset.jotoMallMobileEnhanced === "true") return;
  item.dataset.jotoMallMobileEnhanced = "true";
  item.classList.add("joto-mall-nav__mobile-item");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "joto-mall-nav__mobile-toggle";
  toggle.setAttribute("aria-label", locale.categoriesLabel);
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "⌄";
  const list = document.createElement("ul");
  list.className = "joto-mall-nav__mobile-categories";
  list.hidden = true;
  MALL_CATEGORIES.forEach((category) => {
    const item = document.createElement("li");
    item.append(categoryLink(locale, category, "joto-mall-nav__mobile-link"));
    list.append(item);
  });
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    list.hidden = expanded;
  });
  item.append(toggle, list);
}
function stabilizeInjectedLink(link) {
  if (!link.classList.contains("opacity-0") && !link.classList.contains("translate-y-4")) return;
  link.classList.remove("opacity-0", "translate-y-4");
  link.classList.add("opacity-100", "translate-y-0");
  link.style.removeProperty("transition-delay");
}
export function injectMallLinks(locale = getLocale()) {
  ensureStyles();
  const currentPath = normalizedPath(window.location.pathname);
  const mallPath = normalizedPath(locale.path);
  document.querySelectorAll("a[href]").forEach((blogLink) => {
    if (!isBlogLink(blogLink, locale)) return;
    const container = blogLink.parentElement;
    if (!container) return;
    const listItem = container.tagName === "LI" ? container : null;
    const siblings = listItem ? Array.from(listItem.parentElement?.children || []) : [container];
    let mallLink = siblings.map((item) => item.querySelector("[data-joto-mall-link]")).find(Boolean);
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
    if (mallLink.textContent !== locale.label) mallLink.textContent = locale.label;
    stabilizeInjectedLink(mallLink);
    if (currentPath === mallPath || currentPath.startsWith(`${mallPath}/`)) mallLink.setAttribute("aria-current", "page");
    else mallLink.removeAttribute("aria-current");
    if (mallLink.closest("li")) enhanceMobileLink(mallLink, locale);
    else enhanceDesktopLink(mallLink, locale);
  });
}
function start() {
  const locale = getLocale();
  let scheduled = false;
  const enhance = () => { scheduled = false; injectMallLinks(locale); };
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(enhance);
  };
  enhance();
  new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
