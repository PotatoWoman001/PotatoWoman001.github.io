import { loadProduct } from "./mall-data-client.js?v=20260729-4";
import { getMallLocale } from "./mall-i18n.js?v=20260729-4";

const SITE_ORIGIN = "https://jotoglobal.com";
const ALLOWED_DESCRIPTION_TAGS = new Set([
  "P", "UL", "OL", "LI", "STRONG", "EM", "BR", "H2", "H3",
  "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
]);
const BLOCKED_DESCRIPTION_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT"]);
const locale = getMallLocale();

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  node.append(...children.filter(Boolean));
  return node;
}

function localizedPath(path) {
  return `${locale.prefix}${path}`;
}

function productSlug(pathname = window.location.pathname) {
  const match = pathname.match(/^\/(?:zh\/|fa\/)?mall\/products\/([a-z0-9-]{1,500})\/?$/);
  return match?.[1] || "";
}

function waitForMount(callback) {
  const resolve = () => {
    let mount = document.querySelector("[data-joto-mall-product]");
    if (!mount) {
      const template = document.querySelector("template[data-joto-mall-shell]");
      const main = document.querySelector("#root main");
      const candidate = template?.content.querySelector("[data-joto-mall-product]");
      if (main && candidate) {
        mount = candidate.cloneNode(true);
        const header = main.querySelector(":scope > header");
        const footer = main.querySelector(":scope > footer");
        main.replaceChildren(...[header, mount, footer].filter(Boolean));
      }
    }
    if (mount) callback(mount);
    return Boolean(mount);
  };
  if (resolve()) return;
  const observer = new MutationObserver(() => {
    if (!resolve()) return;
    observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}

function renderState(mount, message, retry) {
  const panel = element("div", {
    className: "joto-mall__state",
    role: "status",
  }, [element("p", { text: message })]);
  if (retry) {
    const button = element("button", {
      type: "button",
      className: "joto-mall__button",
      text: locale.retry,
    });
    button.addEventListener("click", retry);
    panel.append(button);
  }
  mount.replaceChildren(panel);
}

function copyDescriptionNode(sourceNode) {
  if (sourceNode.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(sourceNode.textContent || "");
  }
  if (
    sourceNode.nodeType === Node.ELEMENT_NODE &&
    BLOCKED_DESCRIPTION_TAGS.has(sourceNode.tagName)
  ) {
    return document.createDocumentFragment();
  }
  if (sourceNode.nodeType !== Node.ELEMENT_NODE || !ALLOWED_DESCRIPTION_TAGS.has(sourceNode.tagName)) {
    const fragment = document.createDocumentFragment();
    sourceNode.childNodes.forEach((child) => fragment.append(copyDescriptionNode(child)));
    return fragment;
  }
  const target = document.createElement(sourceNode.tagName.toLowerCase());
  for (const attribute of ["colspan", "rowspan"]) {
    const value = sourceNode.getAttribute(attribute);
    if (/^[1-9]\d{0,2}$/.test(value || "")) target.setAttribute(attribute, value);
  }
  sourceNode.childNodes.forEach((child) => target.append(copyDescriptionNode(child)));
  return target;
}

function sanitizedDescription(value) {
  const wrapper = element("div", {
    className: "joto-mall__rich-text",
    dir: "ltr",
  });
  const parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
  parsed.body.childNodes.forEach((child) => wrapper.append(copyDescriptionNode(child)));
  return wrapper;
}

function gallery(product) {
  const images = product.images || [];
  const wrapper = element("div", { className: "joto-mall__gallery" });
  if (!images.length) {
    wrapper.append(element("div", {
      className: "joto-mall__image-placeholder",
      "aria-hidden": "true",
    }));
    return wrapper;
  }
  const mainImage = element("img", {
    className: "joto-mall__gallery-main",
    src: images[0],
    alt: product.title || "",
    decoding: "async",
  });
  wrapper.append(mainImage);
  if (images.length > 1) {
    const thumbnails = element("div", {
      className: "joto-mall__thumbnails",
      role: "list",
    });
    images.forEach((path, index) => {
      const thumbnail = element("button", {
        type: "button",
        className: "joto-mall__thumbnail",
        "aria-label": `${product.title} ${index + 1}`,
        "aria-pressed": String(index === 0),
      }, [
        element("img", { src: path, alt: "", loading: "lazy", decoding: "async" }),
      ]);
      thumbnail.addEventListener("click", () => {
        mainImage.src = path;
        thumbnails.querySelectorAll("button").forEach((button) => {
          button.setAttribute("aria-pressed", String(button === thumbnail));
        });
      });
      thumbnails.append(thumbnail);
    });
    wrapper.append(thumbnails);
  }
  return wrapper;
}

function metadata(product) {
  const list = element("dl", { className: "joto-mall__metadata", dir: "ltr" });
  const entries = [
    [locale.brand, product.brand],
    [locale.model, product.model],
    [locale.status, product.stock_status],
    [locale.condition, product.condition],
    [locale.rating, product.rating],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  entries.forEach(([label, value]) => {
    list.append(element("dt", { text: label }), element("dd", { text: String(value) }));
  });
  return list;
}

function specifications(product) {
  const entries = Object.entries(product.specifications || {}).filter(
    ([key, value]) =>
      key &&
      ["string", "number", "boolean"].includes(typeof value) &&
      value !== "",
  );
  if (!entries.length) return null;
  const section = element("section", {
    className: "joto-mall__detail-section",
    dir: "ltr",
  }, [element("h2", { text: locale.specifications })]);
  const table = element("table");
  const body = element("tbody");
  entries.forEach(([key, value]) => {
    body.append(element("tr", {}, [
      element("th", { scope: "row", text: key }),
      element("td", { text: String(value) }),
    ]));
  });
  table.append(body);
  section.append(table);
  return section;
}

function documents(product) {
  const items = (product.documents || []).filter(
    (document) =>
      (document?.path || document?.url) &&
      (document?.title || document?.name),
  );
  if (!items.length) return null;
  const list = element("ul", { className: "joto-mall__downloads", dir: "ltr" });
  items.forEach((document) => {
    const path = document.path || document.url;
    const title = document.title || document.name;
    list.append(element("li", {}, [
      element("a", { href: path, text: title, target: "_blank", rel: "noopener" }),
    ]));
  });
  return element("section", { className: "joto-mall__detail-section" }, [
    element("h2", { text: locale.downloads }),
    list,
  ]);
}

function relatedProducts(product) {
  const items = (product.related_products || []).filter((item) =>
    typeof item === "string" ? item : item?.slug,
  );
  if (!items.length) return null;
  const list = element("ul", { className: "joto-mall__related", dir: "ltr" });
  items.forEach((item) => {
    const slug = typeof item === "string" ? item : item.slug;
    const title = typeof item === "string" ? item : item.title || item.slug;
    list.append(element("li", {}, [
      element("a", { href: localizedPath(`/mall/products/${slug}/`), text: title }),
    ]));
  });
  return element("section", { className: "joto-mall__detail-section" }, [
    element("h2", { text: locale.related }),
    list,
  ]);
}

function upsertMeta(selector, attribute, key, content) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.append(node);
  }
  node.content = content;
  node.dataset.jotoMallProductSeo = "";
}

function upsertLink(rel, href, hreflang) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("link");
    node.rel = rel;
    if (hreflang) node.hreflang = hreflang;
    document.head.append(node);
  }
  node.href = href;
  node.dataset.jotoMallProductSeo = "";
}

function installProductSeo(product) {
  const slug = product.slug;
  const title = `${product.title} | ${locale.mall} | JOTO TECH`;
  const description = locale.seoDescription(product);
  const canonical = `${SITE_ORIGIN}${localizedPath(`/mall/products/${slug}/`)}`;
  document.head
    .querySelectorAll('script[type="application/ld+json"][data-joto-seo]')
    .forEach((node) => node.remove());
  document.title = title;
  upsertMeta('meta[name="description"]', "name", "description", description);
  upsertMeta('meta[name="robots"]', "name", "robots", "index, follow");
  upsertMeta('meta[property="og:type"]', "property", "og:type", "product");
  upsertMeta('meta[property="og:title"]', "property", "og:title", title);
  upsertMeta('meta[property="og:description"]', "property", "og:description", description);
  upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
  if (product.images?.[0]) {
    upsertMeta('meta[property="og:image"]', "property", "og:image", `${SITE_ORIGIN}${product.images[0]}`);
  } else {
    document.head.querySelector('meta[property="og:image"]')?.remove();
  }
  upsertLink("canonical", canonical);
  upsertLink("alternate", `${SITE_ORIGIN}/mall/products/${slug}/`, "en");
  upsertLink("alternate", `${SITE_ORIGIN}/zh/mall/products/${slug}/`, "zh-CN");
  upsertLink("alternate", `${SITE_ORIGIN}/fa/mall/products/${slug}/`, "fa-IR");
  upsertLink("alternate", `${SITE_ORIGIN}/mall/products/${slug}/`, "x-default");

  document.head.querySelector('[data-joto-mall-product-jsonld]')?.remove();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
  };
  if (product.images?.length) {
    jsonLd.image = product.images.map((path) => new URL(path, SITE_ORIGIN).href);
  }
  if (product.brand) jsonLd.brand = { "@type": "Brand", name: product.brand };
  if (product.model) jsonLd.model = product.model;
  const script = element("script", {
    type: "application/ld+json",
    dataset: { jotoMallProductJsonld: "" },
  });
  script.textContent = JSON.stringify(jsonLd);
  document.head.append(script);
}

function renderProduct(mount, product) {
  const breadcrumb = element("nav", {
    className: "joto-mall__breadcrumb",
    "aria-label": locale.products,
  }, [
    element("a", { href: localizedPath("/mall/"), text: locale.mall }),
    document.createTextNode(" / "),
    element("a", { href: localizedPath("/mall/products/"), text: locale.products }),
    document.createTextNode(" / "),
    element("span", { text: product.title, "aria-current": "page", dir: "ltr" }),
  ]);
  const header = element("section", { className: "joto-mall__product-hero" }, [
    gallery(product),
    element("div", { className: "joto-mall__product-summary", dir: "ltr" }, [
      product.brand
        ? element("p", { className: "joto-mall__eyebrow", text: product.brand })
        : null,
      element("h1", { text: product.title }),
      product.summary ? element("p", { className: "joto-mall__lead", text: product.summary }) : null,
      metadata(product),
      element("a", {
        className: "joto-mall__button",
        href: `${localizedPath("/contact/")}?${new URLSearchParams({ product: product.slug })}`,
        text: locale.contact,
      }),
    ]),
  ]);
  const details = element("div", { className: "joto-mall__detail-sections" });
  if (product.description_html) {
    details.append(element("section", { className: "joto-mall__detail-section" }, [
      element("h2", { text: locale.overview }),
      sanitizedDescription(product.description_html),
    ]));
  }
  const specificationSection = specifications(product);
  const documentSection = documents(product);
  if (specificationSection) details.append(specificationSection);
  if (documentSection) details.append(documentSection);
  if (product.source_url) {
    details.append(element("section", { className: "joto-mall__detail-section", dir: "ltr" }, [
      element("h2", { text: locale.source }),
      element("a", {
        href: product.source_url,
        target: "_blank",
        rel: "noopener noreferrer",
        text: product.source_url,
      }),
    ]));
  }
  const relatedSection = relatedProducts(product);
  if (relatedSection) details.append(relatedSection);
  const sticky = element("a", {
    className: "joto-mall__sticky-contact",
    href: `${localizedPath("/contact/")}?${new URLSearchParams({ product: product.slug })}`,
    text: locale.contact,
  });
  mount.replaceChildren(breadcrumb, header, details, sticky);
  mount.setAttribute("aria-busy", "false");
  installProductSeo(product);
  document.dispatchEvent(
    new CustomEvent("joto:mall-product-ready", {
      detail: { slug: product.slug, title: product.title, model: product.model || "" },
    }),
  );
}

async function start(mount) {
  const slug = productSlug();
  if (!slug) {
    renderState(mount, locale.notFound);
    return;
  }
  const controller = new AbortController();
  renderState(mount, locale.loading);
  try {
    const product = await loadProduct(slug, { signal: controller.signal });
    renderProduct(mount, product);
  } catch (error) {
    if (error?.code === "not-found") renderState(mount, locale.notFound);
    else if (error?.name !== "AbortError") {
      renderState(mount, locale.unavailable, () => start(mount));
    }
  }
  window.addEventListener("pagehide", () => controller.abort(), { once: true });
}

waitForMount(start);
