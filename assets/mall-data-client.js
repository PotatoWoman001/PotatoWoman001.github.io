const DATA_ROOT = "/mall-data/";
const SCHEMA_VERSION = "joto-mall-v1";
const DEFAULT_PAGE_SIZE = 24;
const PLACEHOLDER_IMAGE_FILENAMES = new Set([
  "cd6a5082346e186283e0cf0f632762a1172f6ad74da5d9b7a9689974a7afbc84.webp",
  "9099315a9ea9f11b618add5542417582c9fa0e8457cda12074a3c10ec6c0b50c.jpg",
  "2637f446bc6640220c9b726c624f2156836bb7a67b754c098f7fda5f126c7fcc.jpg",
]);

export class MallDataError extends Error {
  constructor(code, cause) {
    super(code, cause ? { cause } : undefined);
    this.name = "MallDataError";
    this.code = code;
  }
}

async function fetchJson(publicPath, options = {}) {
  if (!publicPath.startsWith(DATA_ROOT)) {
    throw new MallDataError("unsafe-path");
  }
  try {
    const response = await fetch(publicPath, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new MallDataError("unavailable", error);
  }
}

export async function loadManifest({ signal } = {}) {
  const manifest = await fetchJson(`${DATA_ROOT}manifest.json`, {
    cache: "no-cache",
    signal,
  });
  if (manifest?.schema_version !== SCHEMA_VERSION) {
    throw new MallDataError("schema-mismatch");
  }
  return manifest;
}

function snapshotVersionQuery(manifest) {
  const version = `${manifest.generated_at || "snapshot"}-${manifest.crawl_run_id ?? "current"}`;
  return new URLSearchParams({ v: version }).toString();
}

export async function loadCatalogIndex({ signal } = {}) {
  const manifest = await loadManifest({ signal });
  return fetchJson(
    `${DATA_ROOT}data/catalog-index.json?${snapshotVersionQuery(manifest)}`,
    { signal },
  );
}

export async function loadProduct(slug, { signal } = {}) {
  if (!/^[a-z0-9-]{1,500}$/.test(slug || "")) {
    throw new MallDataError("not-found");
  }
  const manifest = await loadManifest({ signal });
  try {
    const product = await fetchJson(
      `${DATA_ROOT}data/products/${encodeURIComponent(slug)}.json?${snapshotVersionQuery(manifest)}`,
      { signal },
    );
    return {
      ...product,
      images: validProductImages(product),
    };
  } catch (error) {
    if (error?.cause?.message === "HTTP 404") {
      throw new MallDataError("not-found", error);
    }
    throw error;
  }
}

function normalizedText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase();
}

function productCategory(product) {
  return Array.isArray(product.category_path) ? product.category_path : [];
}

function compareText(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), "en", {
    sensitivity: "base",
    numeric: true,
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function productTypeFor(product) {
  const categories = productCategory(product).filter(Boolean);
  if (categories.length) return String(categories.at(-1)).trim();

  const segments = String(product?.title || "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length < 2) return "";

  const model = String(product?.model || "").trim();
  const brand = String(product?.brand || "").trim();
  let type = segments[1];
  if (model) type = type.replace(model, "");
  if (brand) {
    type = type.replace(new RegExp(`^${escapeRegExp(brand)}\\s*`, "i"), "");
  }
  return type.trim();
}

export function rankedCategories(products) {
  const counts = new Map();
  products.filter(hasProductImage).forEach((product) => {
    const name = productCategory(product)[0];
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort(
      (left, right) =>
        right.count - left.count || compareText(left.name, right.name),
    );
}

export function validProductImages(product) {
  if (!Array.isArray(product?.images)) return [];
  const seen = new Set();
  return product.images.flatMap((image) => {
    if (typeof image !== "string" || !image.trim()) return [];
    const path = image.trim();
    const pathname = path.split(/[?#]/, 1)[0];
    const filename = pathname.split("/").pop()?.toLowerCase();
    if (!filename || PLACEHOLDER_IMAGE_FILENAMES.has(filename) || seen.has(path)) {
      return [];
    }
    seen.add(path);
    return [path];
  });
}

export function hasProductImage(product) {
  return validProductImages(product).length > 0;
}

export function parseCatalogState(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams);
  return {
    q: (params.get("q") || "").normalize("NFKC").trim().slice(0, 200),
    category: (params.get("category") || "").trim(),
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    pageSize: DEFAULT_PAGE_SIZE,
    view: params.get("view") === "list" ? "list" : "grid",
  };
}

export function serializeCatalogState(state) {
  const normalized = parseCatalogState(
    new URLSearchParams({
      q: state.q || "",
      category: state.category || "",
      page: String(state.page || 1),
      view: state.view || "grid",
    }),
  );
  const params = new URLSearchParams();
  if (normalized.q) params.set("q", normalized.q);
  if (normalized.category) params.set("category", normalized.category);
  if (normalized.page !== 1) params.set("page", String(normalized.page));
  if (normalized.view !== "grid") params.set("view", normalized.view);
  return params;
}

function uniqueValues(products, getter) {
  return [...new Set(products.map(getter).filter(Boolean))].sort(compareText);
}

export function queryProducts(index, requestedState = {}) {
  const state = parseCatalogState(serializeCatalogState(requestedState));
  const source = (Array.isArray(index?.products) ? index.products : []).filter(
    hasProductImage,
  );
  const query = normalizedText(state.q);
  const filtered = source.filter((product) => {
    const haystack = [
      product.title,
      product.model,
      product.brand,
      product.summary,
      ...productCategory(product),
      ...(product.demand_tags || []),
    ]
      .map(normalizedText)
      .join("\n");
    return (
      (!query || haystack.includes(query)) &&
      (!state.category || productCategory(product).includes(state.category))
    );
  });

  const sorted = [...filtered].sort(
    (left, right) =>
      compareText(left.title, right.title) ||
      compareText(left.slug, right.slug),
  );

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  const page = Math.min(state.page, totalPages);
  const start = (page - 1) * state.pageSize;
  const products = sorted.slice(start, start + state.pageSize).map((product) => ({
    ...product,
    productType: productTypeFor(product),
    category_path: [...productCategory(product)],
    images: validProductImages(product),
    demand_tags: [...(product.demand_tags || [])],
  }));

  return {
    products,
    total,
    page,
    pageSize: state.pageSize,
    totalPages,
    state: { ...state, page },
    facets: {
      categories: uniqueValues(filtered, (product) => productCategory(product)[0]),
    },
  };
}
