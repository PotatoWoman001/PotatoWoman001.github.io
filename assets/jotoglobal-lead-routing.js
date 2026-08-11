export const SALES_EMAIL = "sales@jotoglobal.com";

const SOURCE_LABELS = Object.freeze({
  "home-contact-form": "首页邮件",
  "contact-page-form": "联系页邮件",
  "solution-contact-form": "解决方案邮件",
  "mall-product-inquiry": "产品邮件",
  "footer-email": "页脚邮件",
});

const LOCALE_LABELS = Object.freeze({
  en: "英文",
  "zh-CN": "中文",
  "fa-IR": "波斯语",
});

function cleanValue(value, maxLength) {
  return String(value || "")
    .replace(/[\[\]\r\n]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function classifyLeadSource(locationLike) {
  const url =
    locationLike instanceof URL ? locationLike : new URL(locationLike.href);
  const parts = url.pathname.split("/").filter(Boolean);
  const locale =
    parts[0] === "zh" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";
  const route = locale === "en" ? parts : parts.slice(1);
  const pagePath = `${url.pathname}${url.search}`.slice(0, 500);
  const product = cleanValue(url.searchParams.get("product"), 160);
  const entry = cleanValue(url.searchParams.get("entry"), 80);

  if (product) {
    return {
      sourceKey: "mall-product-inquiry",
      locale,
      pagePath,
      entry,
      objectSlug: product,
    };
  }
  if (route[0] === "contact") {
    return {
      sourceKey: "contact-page-form",
      locale,
      pagePath,
      entry,
      objectSlug: "",
    };
  }
  if (route[0] === "solutions") {
    return {
      sourceKey: "solution-contact-form",
      locale,
      pagePath,
      entry,
      objectSlug: cleanValue(route.slice(1).join("/"), 160),
    };
  }
  return {
    sourceKey: "home-contact-form",
    locale,
    pagePath,
    entry,
    objectSlug: "",
  };
}

export function buildTrafficSource(locationLike, referrer = "") {
  const url =
    locationLike instanceof URL ? locationLike : new URL(locationLike.href);
  return {
    source: cleanValue(url.searchParams.get("utm_source"), 100),
    medium: cleanValue(url.searchParams.get("utm_medium"), 100),
    campaign: cleanValue(url.searchParams.get("utm_campaign"), 160),
    keyword: cleanValue(url.searchParams.get("utm_term"), 160),
    utm_content: cleanValue(url.searchParams.get("utm_content"), 160),
    referrer: String(referrer || "").trim().slice(0, 500),
  };
}

export function buildSalesMailto(locationLike, placement = "") {
  const context = classifyLeadSource(locationLike);
  const sourceKey = placement === "footer" ? "footer-email" : context.sourceKey;
  const subjectParts = [
    "JOTO Global",
    SOURCE_LABELS[sourceKey] || "直接邮件",
    LOCALE_LABELS[context.locale] || "英文",
  ];
  if (context.objectSlug) subjectParts.push(context.objectSlug);
  if (sourceKey === "footer-email") subjectParts.push(context.pagePath.split("?")[0]);
  const subject = subjectParts.map((part) => `[${cleanValue(part, 160)}]`).join("");
  return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function isSalesMailto(link) {
  const href = link.getAttribute("href") || "";
  return /^mailto:sales@jotoglobal\.com(?:\?|$)/i.test(href);
}

function normalizeSalesLinks(root = document) {
  const links = [];
  if (root instanceof HTMLAnchorElement) links.push(root);
  if (root.querySelectorAll) links.push(...root.querySelectorAll('a[href^="mailto:"]'));

  for (const link of links) {
    if (!isSalesMailto(link)) continue;
    const placement = link.closest("footer") ? "footer" : "";
    link.href = buildSalesMailto(window.location, placement);
  }
}

function installContactRequestEnrichment() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const requestUrl = typeof input === "string" || input instanceof URL
      ? String(input)
      : input?.url || "";
    const method = String(init?.method || input?.method || "GET").toUpperCase();
    const resolvedUrl = new URL(requestUrl, window.location.origin);
    const isContactPost =
      method === "POST" &&
      resolvedUrl.origin === window.location.origin &&
      resolvedUrl.pathname === "/api/contact" &&
      typeof init?.body === "string";

    if (!isContactPost) return originalFetch(input, init);

    try {
      const payload = JSON.parse(init.body);
      if (!payload || Array.isArray(payload) || typeof payload !== "object") {
        return originalFetch(input, init);
      }
      const enriched = {
        ...payload,
        sourceContext: classifyLeadSource(window.location),
      };
      if (!enriched.trafficSource) {
        enriched.trafficSource = buildTrafficSource(
          window.location,
          document.referrer,
        );
      }
      return originalFetch(input, { ...init, body: JSON.stringify(enriched) });
    } catch {
      return originalFetch(input, init);
    }
  };
}

function initializeBrowserLeadRouting() {
  installContactRequestEnrichment();
  normalizeSalesLinks();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) normalizeSalesLinks(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBrowserLeadRouting, {
      once: true,
    });
  } else {
    initializeBrowserLeadRouting();
  }
}
