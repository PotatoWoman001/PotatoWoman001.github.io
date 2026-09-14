import {
  loadCatalogIndex,
  parseCatalogState,
  queryProducts,
  serializeCatalogState,
} from "./mall-data-client.js?v=20260914-1";
import { getMallLocale } from "./mall-i18n.js?v=20260914-1";
import { createContactForm } from "./contact-form-sections.js?v=20260821-2";
import { MALL_CATEGORIES, localizedCategoryLabel, localizedProductType } from "./mall-taxonomy.js?v=20260914-1";

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
  const model = product.model || "\u00a0";
  const modelLength = model.trim().length;
  const modelClass =
    modelLength > 38
      ? "joto-mall__card-model joto-mall__card-model--xsmall"
      : modelLength > 28
        ? "joto-mall__card-model joto-mall__card-model--small"
        : "joto-mall__card-model";
  copy.append(
    element("p", {
      className: modelClass,
      text: model,
      title: model.trim() || undefined,
      dataset: { length: String(modelLength) },
    }),
    element("p", {
      className: "joto-mall__card-type",
      text: localizedProductType(product.productType, locale) || "\u00a0",
    }),
  );
  copy.append(
    element("span", { className: "joto-mall__card-action", text: locale.viewDetails }),
  );
  link.append(media, copy);
  return element("article", { className: "joto-mall__card" }, [link]);
}

function renderSearch(target, { compact = false, onSubmit } = {}) {
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
    const q = input.value.normalize("NFKC").trim();
    if (onSubmit) {
      onSubmit(q);
      return;
    }
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    window.location.href =
      `${localizedPath("/mall/products/")}${params.size ? `?${params}` : ""}`;
  });
  target.append(form);
  return input;
}

function contactPanel() {
  const panel = element("section", { className: "joto-mall__contact-panel" });
  const copy = element("div", { className: "joto-mall__contact-copy" }, [
    element("h2", { text: locale.contactTitle }),
    element("p", { text: locale.contactBody }),
  ]);
  const formSlot = element("div", { className: "joto-mall__contact-form" });
  formSlot.append(
    createContactForm(
      locale.lang,
      `mall-contact-${locale.lang.toLowerCase()}`,
      "solution",
    ),
  );
  panel.append(copy, formSlot);
  return panel;
}

function paginationItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const ordered = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const items = [];
  ordered.forEach((value, index) => {
    if (index && value - ordered[index - 1] > 1) items.push("ellipsis");
    items.push(value);
  });
  return items;
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

function renderCatalog(mount, index, { mode }) {
  const isHome = mode === "home";
  const catalogState = () => ({
    ...parseCatalogState(window.location.search),
    pageSize: 24,
  });
  let state = catalogState();
  const initialParams = serializeCatalogState(state);
  history.replaceState(
    {},
    "",
    `${window.location.pathname}${initialParams.size ? `?${initialParams}` : ""}`,
  );
  const header = isHome
    ? element(
        "section",
        {
          className: "joto-mall__hero joto-mall__grid-field",
          "aria-labelledby": "joto-mall-home-title",
        },
        [
          element("div", { className: "joto-mall__inner" }, [
            element("p", {
              className: "joto-mall__eyebrow",
              text: locale.eyebrow,
            }),
            element("h1", {
              id: "joto-mall-home-title",
              className: "joto-mall__hero-title",
              text: locale.homeTitle,
            }),
            element("p", {
              className: "joto-mall__hero-intro",
              text: locale.homeIntro,
            }),
          ]),
        ],
      )
    : element("header", { className: "joto-mall__list-header" }, [
        element("p", { className: "joto-mall__eyebrow", text: locale.eyebrow }),
        element("h1", { text: locale.products }),
      ]);
  const catalog = element("section", {
    className: `joto-mall__catalog joto-mall__catalog--${mode}`,
  });
  const searchSlot = element("div", {
    className: "joto-mall__catalog-search",
  });
  const searchInput = renderSearch(searchSlot, {
    compact: true,
    onSubmit: (q) => update({ q, page: 1 }),
  });
  searchInput.value = state.q;
  const controls = element("form", {
    className: "joto-mall__filters",
    "aria-label": locale.filters,
  });
  const categoryNavigation = element("div", {
    className: "joto-mall__category-navigation",
    role: "navigation",
    "aria-label": locale.categories,
  });
  const categoryToolbar = element("div", {
    className: "joto-mall__category-toolbar",
  });
  const categoryTrack = element("div", {
    className: "joto-mall__category-track",
  });
  const categoryMore = element("button", {
    type: "button",
    className: "joto-mall__category joto-mall__category-more",
    text: `${locale.moreCategories}⌄`,
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
  });
  const categoryPopover = element("div", {
    className: "joto-mall__category-popover",
    role: "listbox",
    "aria-label": locale.moreCategories,
  });
  categoryPopover.hidden = true;
  document.body.append(categoryPopover);
  categoryToolbar.append(categoryTrack);
  categoryNavigation.append(categoryToolbar);
  const resultsHeading = element("h2", {
    className: "joto-mall__result-count",
    tabIndex: -1,
  });
  const live = element("p", {
    className: "joto-mall__sr-only",
    "aria-live": "polite",
  });
  const resultGrid = element("div", {
    className: "joto-mall__cards joto-mall__cards--grid",
  });
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

  function categoryButton(value, label, selected) {
    return element("button", {
      type: "button",
      className: selected
        ? "joto-mall__category joto-mall__category--active"
        : "joto-mall__category",
      text: label,
      dataset: { category: value },
      "aria-pressed": String(selected),
      dir: value ? locale.dir : undefined,
    });
  }

  function paintCategories(selected) {
    categoryTrack.replaceChildren(
      categoryButton("", locale.allProducts, !selected),
      ...MALL_CATEGORIES.map(({ key }) =>
        categoryButton(key, localizedCategoryLabel(key, locale), selected === key),
      ),
    );
    categoryMore.hidden = true;
    categoryPopover.replaceChildren();
  }

  function positionCategoryPopover() {
    if (categoryPopover.hidden) return;
    const trigger = categoryMore.getBoundingClientRect();
    const menu = categoryPopover.getBoundingClientRect();
    const gutter = 8;
    const rtl = document.documentElement.dir === "rtl";
    let left = rtl ? trigger.right - menu.width : trigger.left;
    left = Math.max(gutter, Math.min(left, window.innerWidth - menu.width - gutter));
    let top = trigger.bottom + 8;
    if (top + menu.height > window.innerHeight - gutter) {
      top = Math.max(gutter, trigger.top - menu.height - 8);
    }
    categoryPopover.style.left = `${Math.round(left)}px`;
    categoryPopover.style.top = `${Math.round(top)}px`;
  }

  function closeCategoryPopover(restoreFocus = false) {
    categoryPopover.hidden = true;
    categoryMore.setAttribute("aria-expanded", "false");
    if (restoreFocus) categoryMore.focus();
  }

  function openCategoryPopover(focusOption = false) {
    closeAllSelects();
    categoryPopover.hidden = false;
    categoryMore.setAttribute("aria-expanded", "true");
    positionCategoryPopover();
    if (focusOption) {
      const selected = categoryPopover.querySelector('[aria-selected="true"]');
      (selected || categoryPopover.querySelector("button"))?.focus();
    }
  }

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
    closeCategoryPopover();
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
    paintCategories(state.category);
    controls.replaceChildren(categoryNavigation);

    const activeCategory = state.category
      ? localizedCategoryLabel(state.category, locale)
      : locale.allProductsHeading;
    const countText = `${activeCategory} · ${result.total} ${locale.results}`;
    resultsHeading.textContent = countText;
    resultsHeading.dataset.resultCount = String(result.total);
    live.textContent = countText;
    resultGrid.className = `joto-mall__cards joto-mall__cards--${state.view}`;
    resultGrid.replaceChildren();
    if (!result.products.length) {
      const empty = element("div", { className: "joto-mall__empty" }, [
        element("p", { text: locale.noResults }),
      ]);
      const clear = element("button", {
        type: "button",
        className: "joto-mall__button",
        text: locale.clearFilters,
      });
      clear.addEventListener("click", () =>
        update({
          q: "",
          category: "",
          page: 1,
        }),
      );
      empty.append(clear);
      resultGrid.append(empty);
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
    pagination.append(previous);
    paginationItems(result.page, result.totalPages).forEach((item) => {
      if (item === "ellipsis") {
        pagination.append(
          element("span", {
            className: "joto-mall__pagination-ellipsis",
            text: "…",
            "aria-hidden": "true",
          }),
        );
        return;
      }
      const pageButton = element("button", {
        type: "button",
        className: "joto-mall__pagination-page",
        text: String(item),
        "aria-current": item === result.page ? "page" : undefined,
        "aria-label": `${locale.page} ${item}`,
      });
      pageButton.addEventListener("click", () =>
        update({ page: item }, { scroll: true }),
      );
      pagination.append(pageButton);
    });
    pagination.append(
      element("span", {
        className: "joto-mall__pagination-mobile-current",
        text: `${locale.page} ${result.page} / ${result.totalPages}`,
      }),
    );
    const next = element("button", {
      type: "button",
      text: locale.next,
      disabled: result.page >= result.totalPages,
    });
    next.addEventListener("click", () => update({ page: result.page + 1 }, { scroll: true }));
    pagination.append(next);
  }

  controls.addEventListener("change", (event) => {
    const select = event.target.closest("select");
    if (select) update({ [select.name]: select.value, page: 1 });
  });
  controls.addEventListener("click", (event) => {
    const more = event.target.closest(".joto-mall__category-more");
    if (more) {
      if (categoryPopover.hidden) openCategoryPopover();
      else closeCategoryPopover();
      return;
    }
    const category = event.target.closest("[data-category]");
    if (category) {
      update({ category: category.dataset.category, page: 1 });
      return;
    }
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
    if (event.target.closest(".joto-mall__category-more") && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      openCategoryPopover(true);
      return;
    }
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
    if (!controls.contains(event.target) && !categoryPopover.contains(event.target)) {
      closeCategoryPopover();
    }
  });
  categoryPopover.addEventListener("click", (event) => {
    const option = event.target.closest("[data-category]");
    if (option) update({ category: option.dataset.category, page: 1 });
  });
  categoryPopover.addEventListener("keydown", (event) => {
    const options = [...categoryPopover.querySelectorAll("button")];
    const index = options.indexOf(event.target);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      options[event.key === "Home" ? 0 : options.length - 1]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.target.click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeCategoryPopover(true);
    } else if (event.key === "Tab") {
      closeCategoryPopover();
    }
  });
  window.addEventListener("resize", positionCategoryPopover);
  window.addEventListener("scroll", positionCategoryPopover, true);
  window.addEventListener("popstate", () => {
    state = catalogState();
    paint();
  });

  catalog.append(
    searchSlot,
    controls,
    viewControls,
    resultsHeading,
    live,
    resultGrid,
    pagination,
  );
  mount.replaceChildren(header, catalog);
  if (isHome) mount.append(contactPanel());
  mount.setAttribute("aria-busy", "false");
  paint();
  installCatalogSeo(isHome ? "home" : "products");
}

async function start(mount, mode) {
  activeRequest?.abort();
  activeRequest = new AbortController();
  setStatus(mount, locale.loading);
  try {
    const index = await loadCatalogIndex({ signal: activeRequest.signal });
    if (mode === "home") renderCatalog(mount, index, { mode: "home" });
    else renderCatalog(mount, index, { mode: "list" });
  } catch (error) {
    if (error?.name !== "AbortError") {
      setStatus(mount, locale.unavailable, () => start(mount, mode));
    }
  }
}

waitForMount("[data-joto-mall-home]", (mount) => start(mount, "home"));
waitForMount("[data-joto-mall-products]", (mount) => start(mount, "products"));
