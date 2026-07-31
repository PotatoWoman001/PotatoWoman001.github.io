import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  hasProductImage,
  MallDataError,
  loadManifest,
  parseCatalogState,
  productTypeFor,
  queryProducts,
  rankedCategories,
  serializeCatalogState,
} from "../assets/mall-data-client.js";
import { MALL_COPY, getMallLocale } from "../assets/mall-i18n.js";

const [navigation, client, i18n] = await Promise.all([
  readFile("assets/mall-navigation-and-page.js", "utf8"),
  readFile("assets/mall-data-client.js", "utf8"),
  readFile("assets/mall-i18n.js", "utf8"),
]);

assert.doesNotMatch(navigation, /mallMarkup|prepared|正在整理|در حال آماده/);
for (const token of [
  'label: "Mall"',
  'label: "商城"',
  'label: "فروشگاه"',
  'path: "/mall/"',
  'path: "/zh/mall/"',
  'path: "/fa/mall/"',
  "MutationObserver",
  "aria-current",
]) {
  assert.ok(navigation.includes(token), `navigation missing ${token}`);
}
assert.doesNotMatch(client, /fetch\((?!publicPath|`\$\{DATA_ROOT\})/);
assert.match(client, /\/mall-data\//);
assert.match(client, /schema-mismatch/);
assert.ok(new MallDataError("schema-mismatch").code === "schema-mismatch");
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ schema_version: "unsupported" }),
});
await assert.rejects(
  loadManifest(),
  (error) => error instanceof MallDataError && error.code === "schema-mismatch",
);
globalThis.fetch = originalFetch;

const products = [
  {
    slug: "z-router",
    title: "Router Z",
    brand: "Cisco",
    model: "",
    category_path: ["Network", "Routers"],
    stock_status: "In stock",
    condition: "Original New",
    summary: "",
    images: ["/mall-data/media/images/router-z.webp"],
    demand_tags: [],
    last_success_at: "2026-07-29T00:00:00Z",
  },
  {
    slug: "a-switch",
    title: "Switch A",
    brand: "",
    model: "A1",
    category_path: ["Network", "Switches"],
    stock_status: null,
    condition: "",
    summary: "",
    images: ["/mall-data/media/images/switch-a.webp"],
    demand_tags: ["Campus"],
    last_success_at: "2026-07-28T00:00:00Z",
  },
];
const state = parseCatalogState(
  new URLSearchParams(
    "q=router&category=Network&brand=Cisco&status=In+stock&condition=Original+New&sort=brand&direction=desc&page=3&size=24&view=list",
  ),
);
assert.deepEqual(state, {
  q: "router",
  category: "Network",
  brand: "Cisco",
  status: "In stock",
  condition: "Original New",
  sort: "brand",
  direction: "desc",
  page: 3,
  pageSize: 24,
  view: "list",
});
assert.equal(serializeCatalogState(state).get("view"), "list");
assert.equal(
  productTypeFor({
    title: "AR1220C-S, Huawei AR1220C Router, 8GE LAN",
    model: "AR1220C-S",
    brand: "Huawei",
    category_path: ["Routers", "Enterprise Routers"],
  }),
  "Enterprise Routers",
);
assert.equal(
  productTypeFor({
    title: "ASA5525-K8, Cisco ASA 5500 Firewall, 8GE",
    model: "ASA5525-K8",
    brand: "Cisco",
    category_path: [],
  }),
  "ASA 5500 Firewall",
);
assert.deepEqual(
  rankedCategories([
    { category_path: ["Routers"], images: ["/mall-data/media/images/1.webp"] },
    { category_path: ["Firewalls"], images: ["/mall-data/media/images/2.webp"] },
    { category_path: ["Routers"], images: ["/mall-data/media/images/3.webp"] },
  ]),
  [
    { name: "Routers", count: 2 },
    { name: "Firewalls", count: 1 },
  ],
);
const result = queryProducts({ products }, state);
assert.equal(result.total, 1);
assert.equal(result.page, 1);
assert.deepEqual(result.facets.brands, ["Cisco"]);
const emptyBrand = queryProducts({ products }, {});
assert.deepEqual(emptyBrand.facets.brands, ["Cisco"]);
assert.deepEqual(queryProducts({ products: [products[1]] }, {}).facets.brands, []);
assert.equal(emptyBrand.products.find((item) => item.slug === "a-switch").summary, "");
assert.equal(
  emptyBrand.products.find((item) => item.slug === "a-switch").productType,
  "Switches",
);

const placeholderFilename =
  "cd6a5082346e186283e0cf0f632762a1172f6ad74da5d9b7a9689974a7afbc84.webp";
assert.equal(
  hasProductImage({ images: ["/mall-data/media/images/real-router.webp"] }),
  true,
);
assert.equal(hasProductImage({ images: [] }), false);
assert.equal(
  hasProductImage({
    images: [`/mall-data/media/images/${placeholderFilename}?v=1#preview`],
  }),
  false,
);

const imageFiltered = queryProducts(
  {
    products: [
      products[0],
      {
        ...products[1],
        slug: "no-image-switch",
        brand: "Hidden Brand",
        category_path: ["Hidden Category"],
        images: [],
      },
      {
        ...products[1],
        slug: "placeholder-switch",
        brand: "Placeholder Brand",
        category_path: ["Placeholder Category"],
        images: [`/mall-data/media/images/${placeholderFilename}`],
      },
    ],
  },
  {},
);
assert.equal(imageFiltered.total, 1);
assert.deepEqual(imageFiltered.products.map((product) => product.slug), ["z-router"]);
assert.deepEqual(imageFiltered.facets.brands, ["Cisco"]);
assert.deepEqual(imageFiltered.facets.categories, ["Network"]);
assert.equal(getMallLocale("/fa/mall/"), MALL_COPY.fa);
assert.equal(MALL_COPY.fa.technicalDirection, "ltr");
assert.match(i18n, /در حال بارگذاری/);

console.log("Verified Mall navigation, locale copy, and catalog data client.");
