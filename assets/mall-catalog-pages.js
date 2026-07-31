import {
  hasProductImage,
  loadCatalogIndex,
  parseCatalogState,
  queryProducts,
  serializeCatalogState,
} from "./mall-data-client.js?v=20260730-1";
import { getMallLocale } from "./mall-i18n.js?v=20260730-1";

const locale = getMallLocale();
const SITE_ORIGIN = "https://jotoglobal.com";
let activeRequest;
let selectControlId = 0;

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key === "checked") node.checked = Boolean(value);
    else if (key in node && key !== "form") node[key] = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  node.append(...children.filter(Boolean));
  return node;
}

function localizedPath(path) {
  return `${locale.prefix}${path}`;
}

function productPath(slug) {
  return localizedPath(`/mall/products/${encodeURIComponent(slug)}/`);
}

function upsertMeta(selector, attribute, key, content) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.append(node);
  }
  node.content = content;
  node.dataset.jotoMallCatalogSeo = "";
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
  node.dataset.jotoMallCatalogSeo = "";
}

function installCatalogSeo(mode) {
  const suffix = mode === "home" ? "/mall/" : "/mall/products/";
  const title =
    mode === "home"
      ? `${locale.mall} | JOTO TECH`
      : `${locale.products} | ${locale.mall} | JOTO TECH`;
  const canonical = `${SITE_ORIGIN}${localizedPath(suffix)}`;
  document.head
    .querySelectorAll("[data-joto-seo]")
    .forEach((node) => node.remove());
  document.title = title;
  upsertMeta("meta[name=description]", "name", "description", locale.homeIntro);
  upsertMeta("meta[name=robots]", "name", "robots", "index, follow");
  upsertMeta("meta[property='og:type']", "property", "og:type", "website");
  upsertMeta("meta[property='og:title']", "property", "og:title", title);
  upsertMeta(
    "meta[property='og:description']",
    "property",
    "og:description",
    locale.homeIntro,
  );
  upsertMeta("meta[property='og:url']", "property", "og:url", canonical);
  upsertLink("canonical", canonical);
  upsertLink("alternate", `${SITE_ORIGIN}${suffix}`, "en");
  upsertLink("alternate", `${SITE_ORIGIN}/zh${suffix}`, "zh-CN");
  upsertLink("alternate", `${SITE_ORIGIN}/fa${suffix}`, "fa-IR");
  upsertLink("alternate", `${SITE_ORIGIN}${suffix}`, "x-default");
}

function waitForMount(selector, callback) {
  const resolve = () => {
    let mount = document.querySelector(selector);
    if (!mount) {
      const template = document.querySelector("template[data-joto-mall-shell]");
      const main = document.querySelector("#root main");
      const candidate = template?.content.querySelector(selector);
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

function setStatus(mount, message, retry) {
  const panel = element("div", {
    className: "joto-mall__state",
    role: "status",
  });
  panel.append(element("p", { text: message }));
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

function imageFor(product) {
  const imagePath = product.images?.[0];
  if (!imagePath) {
    return element("div", {
      className: "joto-mall__image-placeholder",
      "aria-hidden": "true",
    });
  }
  return element("img", {
    src: imagePath,
    alt: product.title || "",
    loading: "lazy",
    decoding: "async",
  });
}

function productCard(product) {
  const link = element("a", {
    href: productPath(product.slug),
    className: "joto-mall__card-link",
    "aria-label": `${locale.viewDetails}: ${product.title}`,
  });
  const media = element("div", { className: "joto-mall__card-media" }, [
    imageFor(product),
  ]);
  const copy = element("div", { className: "joto-mall__card-copy", dir: "ltr" });
  if (product.brand) {
    copy.append(element("p", { className: "joto-mall__card-brand", text: product.brand }));
  }
  copy.append(element("h3", { className: "joto-mall__card-title", text: product.title }));
  if (product.model) {
    copy.append(element("p", { className: "joto-mall__card-model", text: product.model }));
  }
  if (product.summary) {
    copy.append(element("p", { className: "joto-mall__card-summary", text: product.summary }));
  }
  copy.append(
    element("span", { className: "joto-mall__card-action", text: locale.viewDetails }),
  );
  link.append(media, copy);
  return element("article", { className: "joto-mall__card" }, [link]);
}

function sectionHeading(eyebrow, title) {
  return element("header", { className: "joto-mall__section-heading" }, [
    eyebrow ? element("p", { className: "joto-mall__eyebrow", text: eyebrow }) : null,
    element("h2", { text: title }),
  ]);
}

function normalizedCategories(index) {
  const categories = Array.isArray(index.categories) ? index.categories : [];
  const explicit = categories
    .map((category) =>
      typeof category === "string"
        ? { name: category, slug: category }
        : {
            name: category.name || category.title || category.path?.[0],
            slug: category.slug || category.name || category.path?.[0],
          },
    )
    .filter((category) => category.name);
  if (explicit.length) return explicit;
  return [
    ...new Set(
      (index.products || []).map((product) => product.category_path?.[0]).filter(Boolean),
    ),
  ].map((name) => ({ name, slug: name }));
}

function renderSearch(target, compact = false) {
  const form = element("form", {
    className: compact ? "joto-mall__search joto-mall__search--compact" : "joto-mall__search",
    role: "search",
  });
  const label = element("label", {
    className: "joto-mall__sr-only",
    htmlFor: compact ? "mall-list-search" : "mall-home-search",
    text: locale.search,
  });
  const input = element("input", {
    id: compact ? "mall-list-search" : "mall-home-search",
    type: "search",
    name: "q",
    placeholder: locale.search,
    maxLength: 200,
  });
  const submit = element("button", {
    type: "submit",
    className: "joto-mall__button",
    text: locale.search,
  });
  form.append(label, input, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const q = input.value.normalize("NFKC").trim();
    if (q) params.set("q", q);
    window.location.href = `${localizedPath("/mall/products/")}${params.size ? `?${params}` : ""}`;
  });
  target.append(form);
  return input;
}

function renderHome(mount, index) {
  mount.replaceChildren();
  const hero = element("section", {
    className: "joto-mall__hero joto-mall__grid-field",
    "aria-labelledby": "joto-mall-home-title",
  });
  const heroInner = element("div", { className: "joto-mall__inner" });
  heroInner.append(
    element("p", { className: "joto-mall__eyebrow", text: locale.eyebrow }),
    element("h1", {
      id: "joto-mall-home-title",
      className: "joto-mall__hero-title",
      text: locale.homeTitle,
    }),
    element("p", { className: "joto-mall__hero-intro", text: locale.homeIntro }),
  );
  renderSearch(heroInner);
  hero.append(heroInner);

  const categories = normalizedCategories(index);
  const productsHref = localizedPath("/mall/products/");
  const categorySection = element("section", {
    className: "joto-mall__section joto-mall__section--categories",
  });
  categorySection.append(sectionHeading("", locale.categories));
  const categoryGrid = element("div", {
    className: "joto-mall__category-grid",
    role: "navigation",
    "aria-label": locale.categories,
  });
  categoryGrid.append(
    element("a", {
      href: productsHref,
      className: "joto-mall__category joto-mall__category--active",
      text: locale.allProducts,
    }),
  );
  categories.forEach((category) => {
    const href = `${productsHref}?${new URLSearchParams({
      category: category.name,
    })}`;
    categoryGrid.append(
      element("a", {
        href,
        className: "joto-mall__category",
        text: category.name,
        dir: "ltr",
      }),
    );
  });
  categoryGrid.append(
    element("a", {
      href: productsHref,
      className: "joto-mall__category joto-mall__category--all",
      text: locale.viewAllProducts,
    }),
  );
  if (categories.length) categorySection.append(categoryGrid);

  const recentSection = element("section", {
    className: "joto-mall__section joto-mall__section--recent",
  });
  recentSection.append(sectionHeading("", locale.recent));
  const recentGrid = element("div", {
    className: "joto-mall__cards joto-mall__cards--home",
  });
  [...(index.products || [])]
    .filter(hasProductImage)
    .sort((a, b) =>
      String(b.last_success_at || "").localeCompare(String(a.last_success_at || "")),
    )
    .slice(0, 12)
    .forEach((product) => recentGrid.append(productCard(product)));
  recentSection.append(recentGrid);

  const scenarios = [
    ...new Set((index.products || []).flatMap((product) => product.demand_tags || [])),
  ].filter(Boolean);
  const scenarioSection = element("section", { className: "joto-mall__section" });
  if (scenarios.length) {
    scenarioSection.append(sectionHeading("", locale.scenarios));
    scenarioSection.append(
      element(
        "ul",
        { className: "joto-mall__scenario-list", dir: "ltr" },
        scenarios.map((scenario) => element("li", { text: scenario })),
      ),
    );
  }

  const contact = element("section", { className: "joto-mall__contact-panel" }, [
    element("div", {}, [
      element("h2", { text: locale.contactTitle }),
      element("p", { text: locale.contactBody }),
    ]),
    element("a", {
      href: localizedPath("/contact/"),
      className: "joto-mall__button",
      text: locale.contact,
    }),
  ]);
  mount.append(hero, categorySection, recentSection);
  if (scenarios.length) mount.append(scenarioSection);
  mount.append(contact);
  mount.setAttribute("aria-busy", "false");
  installCatalogSeo("home");
}

function selectControl(labelText, name, options, selected) {
  const id = `joto-mall-filter-${name}-${selectControlId += 1}`;
  const selectedOption =
    options.find((option) => option.value === selected) || options[0];
  const wrapper = element("div", {
    className: "joto-mall__filter joto-mall__custom-select",
    dataset: { selectName: name },
  });
  const label = element("span", {
    id: `${id}-label`,
    text: labelText || "\u00a0",
    "aria-hidden": labelText ? undefined : "true",
  });
  const select = element("select", {
    name,
    className: "joto-mall__native-select",
    tabIndex: -1,
    "aria-hidden": "true",
  });
  options.forEach((option) =>
    select.append(
      element("option", {
        value: option.value,
        text: option.label,
        selected: option.value === selectedOption.value,
      }),
    ),
  );
  const value = element("span", {
    id: `${id}-value`,
    text: selectedOption.label,
    dir: selectedOption.dir,
  });
  const trigger = element(
    "button",
    {
      type: "button",
      className: "joto-mall__select-trigger",
      "aria-haspopup": "listbox",
      "aria-expanded": "false",
      "aria-controls": `${id}-menu`,
      "aria-labelledby": labelText
        ? `${id}-label ${id}-value`
        : `${id}-value`,
    },
    [
      value,
      element("span", {
        className: "joto-mall__select-chevron",
        "aria-hidden": "true",
      }),
    ],
  );
  const menu = element("div", {
    id: `${id}-menu`,
    className: "joto-mall__select-menu",
    role: "listbox",
    hidden: true,
  });
  options.forEach((option) =>
    menu.append(
      element("button", {
        type: "button",
        className: "joto-mall__select-option",
        role: "option",
        text: option.label,
        dir: option.dir,
        tabIndex: -1,
        dataset: { value: option.value },
        "aria-selected": String(option.value === selectedOption.value),
      }),
    ),
  );
  wrapper.append(label, select, trigger, menu);
  return wrapper;
}

function renderList(mount, index) {
  let state = parseCatalogState(window.location.search);
  const header = element("header", { className: "joto-mall__list-header" }, [
    element("p", { className: "joto-mall__eyebrow", text: locale.eyebrow }),
    element("h1", { text: locale.products }),
  ]);
  const searchSlot = element("div");
  const searchInput = renderSearch(searchSlot, true);
  searchInput.value = state.q;
  const controls = element("form", {
    className: "joto-mall__filters",
    "aria-label": locale.filters,
  });
  const resultsHeading = element("h2", {
    className: "joto-mall__result-count",
    tabIndex: -1,
  });
  const live = element("p", {
    className: "joto-mall__sr-only",
    "aria-live": "polite",
  });
  const resultGrid = element("div", { className: "joto-mall__cards" });
  const pagination = element("nav", {
    className: "joto-mall__pagination",
    "aria-label": locale.page,
  });
  const viewControls = element("div", {
    className: "joto-mall__view-controls",
    role: "group",
    "aria-label": locale.products,
  });
  for (const [value, label] of [["grid", locale.grid], ["list", locale.list]]) {
    const button = element("button", {
      type: "button",
      text: label,
      dataset: { view: value },
    });
    button.addEventListener("click", () => update({ view: value, page: 1 }));
    viewControls.append(button);
  }

  const filterOptions = (allLabel, values, dir = "ltr") => [
    { value: "", label: allLabel },
    ...values.map((value) => ({ value, label: value, dir })),
  ];

  function closeSelect(wrapper, options = {}) {
    if (!wrapper) return;
    const trigger = wrapper.querySelector(".joto-mall__select-trigger");
    const menu = wrapper.querySelector(".joto-mall__select-menu");
    trigger?.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
    menu
      ?.querySelectorAll(".joto-mall__select-option")
      .forEach((option) => {
        option.tabIndex = -1;
      });
    if (options.restoreFocus) trigger?.focus();
  }

  function closeAllSelects(except) {
    controls.querySelectorAll(".joto-mall__custom-select").forEach((wrapper) => {
      if (wrapper !== except) closeSelect(wrapper);
    });
  }

  function focusOption(menu, index) {
    const options = [...menu.querySelectorAll(".joto-mall__select-option")];
    if (!options.length) return;
    const boundedIndex = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => {
      option.tabIndex = optionIndex === boundedIndex ? 0 : -1;
    });
    options[boundedIndex].focus();
  }

  function openSelect(wrapper, options = {}) {
    if (!wrapper) return;
    closeAllSelects(wrapper);
    const trigger = wrapper.querySelector(".joto-mall__select-trigger");
    const menu = wrapper.querySelector(".joto-mall__select-menu");
    const selected = menu?.querySelector('[aria-selected="true"]');
    trigger?.setAttribute("aria-expanded", "true");
    if (menu) menu.hidden = false;
    if (options.focusOption && menu) {
      const menuOptions = [...menu.querySelectorAll(".joto-mall__select-option")];
      focusOption(menu, Math.max(0, menuOptions.indexOf(selected)));
    }
  }

  function chooseOption(option) {
    const wrapper = option.closest(".joto-mall__custom-select");
    const select = wrapper?.querySelector(".joto-mall__native-select");
    const name = select?.name;
    if (!select || !name) return;
    select.value = option.dataset.value;
    closeSelect(wrapper);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    controls
      .querySelector(`[data-select-name="${CSS.escape(name)}"] .joto-mall__select-trigger`)
      ?.focus();
  }

  function update(next, options = {}) {
    state = { ...state, ...next };
    const params = serializeCatalogState(state);
    if (options.history !== false) {
      history.pushState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    }
    paint();
    if (options.scroll) {
      resultsHeading.focus({ preventScroll: true });
      resultsHeading.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function paint() {
    const result = queryProducts(index, state);
    state = result.state;
    searchInput.value = state.q;
    closeAllSelects();
    controls.replaceChildren(
      selectControl(
        locale.category,
        "category",
        filterOptions(locale.allCategories, result.facets.categories),
        state.category,
      ),
    );
    if (result.facets.brands.length) {
      controls.append(
        selectControl(
          locale.brand,
          "brand",
          filterOptions(locale.allBrands, result.facets.brands),
          state.brand,
        ),
      );
    }
    if (result.facets.statuses.length) {
      controls.append(
        selectControl(
          locale.status,
          "status",
          filterOptions(locale.allStatuses, result.facets.statuses),
          state.status,
        ),
      );
    }
    if (result.facets.conditions.length) {
      controls.append(
        selectControl(
          locale.condition,
          "condition",
          filterOptions(locale.allConditions, result.facets.conditions),
          state.condition,
        ),
      );
    }
    controls.append(
      selectControl(
        locale.sort,
        "sort",
        [
          { value: "title", label: locale.sortTitle },
          { value: "brand", label: locale.sortBrand },
          { value: "recent", label: locale.sortRecent },
        ],
        state.sort,
      ),
      selectControl(
        "",
        "direction",
        [
          { value: "asc", label: locale.ascending },
          { value: "desc", label: locale.descending },
        ],
        state.direction,
      ),
    );

    const countText = `${result.total} ${locale.results}`;
    resultsHeading.textContent = countText;
    live.textContent = countText;
    resultGrid.className = `joto-mall__cards joto-mall__cards--${state.view}`;
    resultGrid.replaceChildren();
    if (!result.products.length) {
      resultGrid.append(element("p", { className: "joto-mall__empty", text: locale.noResults }));
    } else {
      result.products.forEach((product) => resultGrid.append(productCard(product)));
    }
    viewControls.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    });

    pagination.replaceChildren();
    const previous = element("button", {
      type: "button",
      text: locale.previous,
      disabled: result.page <= 1,
    });
    previous.addEventListener("click", () => update({ page: result.page - 1 }, { scroll: true }));
    const current = element("span", {
      text: `${locale.page} ${result.page} / ${result.totalPages}`,
    });
    const next = element("button", {
      type: "button",
      text: locale.next,
      disabled: result.page >= result.totalPages,
    });
    next.addEventListener("click", () => update({ page: result.page + 1 }, { scroll: true }));
    pagination.append(previous, current, next);
  }

  controls.addEventListener("change", (event) => {
    const select = event.target.closest("select");
    if (select) update({ [select.name]: select.value, page: 1 });
  });
  controls.addEventListener("click", (event) => {
    const option = event.target.closest(".joto-mall__select-option");
    if (option) {
      chooseOption(option);
      return;
    }
    const trigger = event.target.closest(".joto-mall__select-trigger");
    if (!trigger) return;
    const wrapper = trigger.closest(".joto-mall__custom-select");
    if (trigger.getAttribute("aria-expanded") === "true") closeSelect(wrapper);
    else openSelect(wrapper);
  });
  controls.addEventListener("keydown", (event) => {
    const trigger = event.target.closest(".joto-mall__select-trigger");
    if (trigger && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      openSelect(trigger.closest(".joto-mall__custom-select"), {
        focusOption: true,
      });
      return;
    }
    const option = event.target.closest(".joto-mall__select-option");
    if (!option) return;
    const wrapper = option.closest(".joto-mall__custom-select");
    const menu = option.closest(".joto-mall__select-menu");
    const options = [...menu.querySelectorAll(".joto-mall__select-option")];
    const index = options.indexOf(option);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(menu, index + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusOption(menu, event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseOption(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSelect(wrapper, { restoreFocus: true });
    } else if (event.key === "Tab") {
      closeSelect(wrapper);
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!controls.contains(event.target)) closeAllSelects();
  });
  searchSlot.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    update({ q: searchInput.value.normalize("NFKC").trim(), page: 1 });
  });
  window.addEventListener("popstate", () => {
    state = parseCatalogState(window.location.search);
    paint();
  });

  mount.replaceChildren(
    header,
    searchSlot,
    controls,
    viewControls,
    resultsHeading,
    live,
    resultGrid,
    pagination,
  );
  mount.setAttribute("aria-busy", "false");
  paint();
  installCatalogSeo("products");
}

async function start(mount, mode) {
  activeRequest?.abort();
  activeRequest = new AbortController();
  setStatus(mount, locale.loading);
  try {
    const index = await loadCatalogIndex({ signal: activeRequest.signal });
    if (mode === "home") renderHome(mount, index);
    else renderList(mount, index);
  } catch (error) {
    if (error?.name !== "AbortError") {
      setStatus(mount, locale.unavailable, () => start(mount, mode));
    }
  }
}

waitForMount("[data-joto-mall-home]", (mount) => start(mount, "home"));
waitForMount("[data-joto-mall-products]", (mount) => start(mount, "products"));
