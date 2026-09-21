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
  validProductImages,
} from "../assets/mall-data-client.js";
import { MALL_COPY, getMallLocale } from "../assets/mall-i18n.js";
import {
  canonicalCategoryKey,
  canonicalProductTypeKey,
  localizedCategoryLabel,
  localizedProductType,
  productCategoryKey,
  productTypeKey,
  productTypeKeysForCategory,
} from "../assets/mall-taxonomy.js";
import {
  productTypeHref,
} from "../assets/mall-navigation-and-page.js";

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
assert.doesNotMatch(navigation, /observer\.disconnect\(\)/);
assert.match(
  navigation,
  /classList\.remove\("opacity-0", "translate-y-4"\)/,
  "dynamically injected mobile Mall links must not retain hidden entrance classes",
);
assert.match(
  navigation,
  /classList\.add\("opacity-100", "translate-y-0"\)/,
  "dynamically injected mobile Mall links must be made visibly stable",
);
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
    "q=router&category=Network&type=Routers&brand=Cisco&status=In+stock&condition=Original+New&sort=brand&direction=desc&page=1&size=12&view=list",
  ),
);
assert.deepEqual(state, {
  q: "router",
  category: "networking",
  type: "routers",
  page: 1,
  pageSize: 24,
  view: "list",
});
assert.equal(
  serializeCatalogState(state).toString(),
  "q=router&category=networking&type=routers&view=list",
);
assert.equal(
  productTypeFor({
    title: "AR1220C-S, Huawei AR1220C Router, 8GE LAN",
    model: "AR1220C-S",
    brand: "Huawei",
    category_path: ["Routers", "Enterprise Routers"],
  }),
  "routers",
);
assert.equal(
  productTypeFor({
    title: "ASA5525-K8, Cisco ASA 5500 Firewall, 8GE",
    model: "ASA5525-K8",
    brand: "Cisco",
    category_path: [],
  }),
  "firewalls",
);
assert.deepEqual(
  rankedCategories([
    { category_path: ["Routers"], images: ["/mall-data/media/images/1.webp"] },
    { category_path: ["Firewalls"], images: ["/mall-data/media/images/2.webp"] },
    { category_path: ["Routers"], images: ["/mall-data/media/images/3.webp"] },
    { category_path: ["Switches"], images: [] },
  ]),
  [
    { name: "networking", count: 3 },
    { name: "security", count: 1 },
  ],
);
const result = queryProducts({ products }, state);
assert.equal(result.total, 1);
assert.equal(result.page, 1);
const emptyBrand = queryProducts({ products }, {});
assert.equal(emptyBrand.products.find((item) => item.slug === "a-switch").summary, "");
assert.equal(
  emptyBrand.products.find((item) => item.slug === "a-switch").productType,
  "switches",
);
assert.equal(canonicalCategoryKey("服务器与存储"), "servers-storage");
assert.equal(canonicalProductTypeKey("routers"), "routers");
assert.equal(canonicalProductTypeKey("Cisco C1"), "");
assert.equal(productCategoryKey(products[0]), "networking");
assert.equal(productTypeKey(products[1]), "switches");
assert.equal(localizedCategoryLabel("networking", "zh-CN"), "网络");
assert.equal(localizedCategoryLabel("networking", "fa-IR"), "شبکه");
assert.equal(localizedProductType("routers", "en"), "Routers");
assert.equal(localizedProductType("routers", "zh-CN"), "路由器");
assert.equal(localizedProductType("routers", "fa-IR"), "مسیریاب‌ها");
assert.deepEqual(
  productTypeKeysForCategory("networking"),
  ["routers", "switches", "wireless", "enterprise-network"],
);
assert.equal(
  productTypeHref({ key: "zh", path: "/zh/mall/" }, "networking", "routers"),
  "/zh/mall/?category=networking&type=routers",
);
assert.equal(
  productTypeHref({ key: "fa", path: "/fa/mall/" }, "physical-security", "access-control"),
  "/fa/mall/?category=physical-security&type=access-control",
);
const switchResult = queryProducts({ products }, { category: "networking", type: "switches" });
assert.deepEqual(switchResult.products.map(({ slug }) => slug), ["a-switch"]);
const bulkResult = queryProducts(
  {
    products: Array.from({ length: 30 }, (_, index) => ({
      ...products[0],
      slug: `router-${index + 1}`,
      title: `Router ${String(index + 1).padStart(2, "0")}`,
      images: [`/mall-data/media/images/router-${index + 1}.webp`],
    })),
  },
  {},
);
assert.equal(bulkResult.total, 30);
assert.equal(bulkResult.pageSize, 24);
assert.equal(bulkResult.products.length, 24);
const bulkListResult = queryProducts(
  {
    products: Array.from({ length: 30 }, (_, index) => ({
      ...products[0],
      slug: `router-${index + 1}`,
      title: `Router ${String(index + 1).padStart(2, "0")}`,
      images: [`/mall-data/media/images/router-${index + 1}.webp`],
    })),
  },
  { view: "list" },
);
assert.equal(bulkListResult.total, bulkResult.total);
assert.equal(bulkListResult.pageSize, bulkResult.pageSize);
assert.deepEqual(
  bulkListResult.products.map((product) => product.slug),
  bulkResult.products.map((product) => product.slug),
);

const placeholderFilename =
  "cd6a5082346e186283e0cf0f632762a1172f6ad74da5d9b7a9689974a7afbc84.webp";
const jpgPlaceholderFilename =
  "9099315a9ea9f11b618add5542417582c9fa0e8457cda12074a3c10ec6c0b50c.jpg";
const magentoPlaceholderFilename =
  "2637f446bc6640220c9b726c624f2156836bb7a67b754c098f7fda5f126c7fcc.jpg";
assert.deepEqual(
  validProductImages({
    images: [
      "",
      null,
      `/mall-data/media/images/${magentoPlaceholderFilename}`,
      "/mall-data/media/images/real-router.webp?v=1",
      "/mall-data/media/images/real-router.webp?v=1",
    ],
  }),
  ["/mall-data/media/images/real-router.webp?v=1"],
);
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
assert.equal(
  hasProductImage({
    images: [`/mall-data/media/images/${jpgPlaceholderFilename}`],
  }),
  false,
);
assert.equal(
  hasProductImage({
    images: [`/mall-data/media/images/${magentoPlaceholderFilename}`],
  }),
  false,
);

const completeCatalog = queryProducts(
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
assert.equal(completeCatalog.total, 3);
assert.deepEqual(
  completeCatalog.products.map((product) => product.slug),
  ["z-router", "no-image-switch", "placeholder-switch"],
);
assert.deepEqual(completeCatalog.facets.categories, ["networking"]);
assert.deepEqual(
  completeCatalog.products.find((product) => product.slug === "no-image-switch").images,
  [],
);
assert.equal(getMallLocale("/fa/mall/"), MALL_COPY.fa);
assert.equal(MALL_COPY.fa.technicalDirection, "ltr");
assert.match(i18n, /در حال بارگذاری/);

console.log("Verified Mall navigation, locale copy, and catalog data client.");
