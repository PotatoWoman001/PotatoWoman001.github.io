import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  stat,
} from "node:fs/promises";
import path from "node:path";

export const SNAPSHOT_SCHEMA_VERSION = "joto-mall-v1";
export const FORBIDDEN_COMMERCE_KEYS = new Set([
  "price",
  "list_price",
  "discount",
  "currency",
  "cart_url",
  "add_to_cart",
  "checkout",
  "payment",
]);

const PUBLIC_PATH_PREFIX = "/mall-data/";
const REQUIRED_JSON_PATHS = Object.freeze([
  "manifest.json",
  "data/catalog-index.json",
  "data/categories.json",
  "data/brands.json",
]);

export function collectForbiddenCommercePaths(value, currentPath = "$") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenCommercePaths(item, `${currentPath}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${currentPath}.${key}`;
    const own = FORBIDDEN_COMMERCE_KEYS.has(key.toLowerCase())
      ? [childPath]
      : [];
    return [...own, ...collectForbiddenCommercePaths(child, childPath)];
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function safeSnapshotPath(root, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
  ) {
    throw new Error(`invalid snapshot file path ${String(relativePath)}`);
  }
  const normalized = path.posix.normalize(relativePath);
  if (
    normalized !== relativePath
    || normalized === ".."
    || normalized.startsWith("../")
  ) {
    throw new Error(`invalid snapshot file path ${relativePath}`);
  }
  const absolute = path.resolve(root, ...relativePath.split("/"));
  if (!isInside(root, absolute)) {
    throw new Error(`snapshot file path escapes root: ${relativePath}`);
  }
  return absolute;
}

async function readJsonFile(root, relativePath) {
  const absolute = safeSnapshotPath(root, relativePath);
  let source;
  try {
    source = await readFile(absolute, "utf8");
  } catch (error) {
    throw new Error(`missing required snapshot file ${relativePath}`, {
      cause: error,
    });
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`invalid JSON in ${relativePath}: ${error.message}`, {
      cause: error,
    });
  }
}

async function assertNoSymlinkEscapes(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) {
      const target = await realpath(absolute);
      if (!isInside(root, target)) {
        throw new Error(
          `symlink escapes snapshot root: ${path.relative(root, absolute)}`,
        );
      }
      continue;
    }
    if (metadata.isDirectory()) {
      await assertNoSymlinkEscapes(root, absolute);
    }
  }
}

async function collectRegularFiles(root, directory = root) {
  const files = [];
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return files;
    throw error;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (entry.isDirectory()) {
      files.push(...await collectRegularFiles(root, absolute));
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(relative);
    } else {
      throw new Error(`unsupported snapshot entry ${relative}`);
    }
  }
  return files.sort();
}

function assertCount(manifest, key, actual, noun) {
  const expected = manifest[key];
  if (!Number.isInteger(expected) || expected < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }
  if (expected !== actual) {
    throw new Error(`${key} ${expected} does not match ${actual} ${noun}`);
  }
}

function assertNoCommerce(value) {
  const forbiddenPaths = collectForbiddenCommercePaths(value);
  if (forbiddenPaths.length > 0) {
    throw new Error(`forbidden commerce field at ${forbiddenPaths[0]}`);
  }
}

function referencedPublicPath(reference, kind, productSlug) {
  const value = typeof reference === "string"
    ? reference
    : reference?.path ?? reference?.url ?? reference?.href;
  if (typeof value !== "string" || !value.startsWith(PUBLIC_PATH_PREFIX)) {
    throw new Error(
      `${kind} path for product ${productSlug} must begin with ${PUBLIC_PATH_PREFIX}`,
    );
  }
  return value;
}

async function assertReferencedFile(root, rootRealPath, publicPath, kind) {
  const relativePath = publicPath.slice(PUBLIC_PATH_PREFIX.length);
  const expectedPrefix = kind === "image"
    ? "media/images/"
    : "media/documents/";
  if (!relativePath.startsWith(expectedPrefix)) {
    throw new Error(`${kind} path is outside ${expectedPrefix}: ${publicPath}`);
  }
  const absolute = safeSnapshotPath(root, relativePath);
  let targetRealPath;
  try {
    targetRealPath = await realpath(absolute);
  } catch (error) {
    throw new Error(`referenced ${kind} does not exist: ${publicPath}`, {
      cause: error,
    });
  }
  if (!isInside(rootRealPath, targetRealPath)) {
    throw new Error(`referenced ${kind} escapes snapshot root: ${publicPath}`);
  }
  const metadata = await stat(absolute);
  if (!metadata.isFile()) {
    throw new Error(`referenced ${kind} is not a file: ${publicPath}`);
  }
}

function relatedSlug(reference) {
  return typeof reference === "string" ? reference : reference?.slug;
}

function productArrayFromIndex(index) {
  if (Array.isArray(index)) return index;
  if (Array.isArray(index?.products)) return index.products;
  throw new Error("data/catalog-index.json must contain a products array");
}

export async function validateMallSnapshot(rootDirectory) {
  const root = path.resolve(rootDirectory);
  let rootMetadata;
  try {
    rootMetadata = await stat(root);
  } catch (error) {
    throw new Error(`snapshot root does not exist: ${root}`, { cause: error });
  }
  if (!rootMetadata.isDirectory()) {
    throw new Error(`snapshot root is not a directory: ${root}`);
  }
  const rootRealPath = await realpath(root);
  await assertNoSymlinkEscapes(rootRealPath);

  const [manifest, catalogIndex, categories, brands] = await Promise.all(
    REQUIRED_JSON_PATHS.map((relativePath) => readJsonFile(root, relativePath)),
  );
  if (!isPlainObject(manifest)) {
    throw new Error("manifest.json must contain an object");
  }
  if (manifest.schema_version !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(
      `schema_version ${String(manifest.schema_version)} does not match ${SNAPSHOT_SCHEMA_VERSION}`,
    );
  }
  if (
    typeof manifest.generated_at !== "string"
    || Number.isNaN(Date.parse(manifest.generated_at))
  ) {
    throw new Error("manifest generated_at must be an ISO date-time");
  }
  if (!Number.isInteger(manifest.crawl_run_id) || manifest.crawl_run_id < 1) {
    throw new Error("manifest crawl_run_id must be a positive integer");
  }
  if (!Array.isArray(categories)) {
    throw new Error("data/categories.json must contain an array");
  }
  if (!Array.isArray(brands)) {
    throw new Error("data/brands.json must contain an array");
  }
  const indexProducts = productArrayFromIndex(catalogIndex);

  assertNoCommerce(manifest);
  assertNoCommerce(catalogIndex);
  assertNoCommerce(categories);
  assertNoCommerce(brands);

  const productDirectory = path.join(root, "data", "products");
  const productFiles = (await collectRegularFiles(root, productDirectory))
    .filter((relativePath) => relativePath.endsWith(".json"));
  assertCount(
    manifest,
    "record_count",
    productFiles.length,
    "product files",
  );
  assertCount(manifest, "category_count", categories.length, "categories");
  assertCount(manifest, "brand_count", brands.length, "brands");

  const products = [];
  for (const relativePath of productFiles) {
    const product = await readJsonFile(root, relativePath);
    if (!isPlainObject(product)) {
      throw new Error(`${relativePath} must contain an object`);
    }
    assertNoCommerce(product);
    const expectedFilename = `${product.slug}.json`;
    if (path.posix.basename(relativePath) !== expectedFilename) {
      throw new Error(
        `product slug ${String(product.slug)} does not match file ${relativePath}`,
      );
    }
    products.push(product);
  }

  const ids = new Set();
  const slugs = new Set();
  const sourceUrls = new Set();
  for (const product of products) {
    if (ids.has(product.id)) {
      throw new Error(`duplicate product id ${String(product.id)}`);
    }
    ids.add(product.id);
    if (typeof product.slug !== "string" || product.slug.length === 0) {
      throw new Error("product slug must be a non-empty string");
    }
    if (slugs.has(product.slug)) {
      throw new Error(`duplicate product slug ${product.slug}`);
    }
    slugs.add(product.slug);
    if (
      typeof product.source_url !== "string"
      || product.source_url.length === 0
    ) {
      throw new Error(`product ${product.slug} must have a source_url`);
    }
    if (sourceUrls.has(product.source_url)) {
      throw new Error(`duplicate source URL ${product.source_url}`);
    }
    sourceUrls.add(product.source_url);
  }

  const indexSlugs = indexProducts.map((product) => product?.slug);
  if (
    indexSlugs.length !== products.length
    || new Set(indexSlugs).size !== indexSlugs.length
    || indexSlugs.some((slug) => !slugs.has(slug))
  ) {
    throw new Error("catalog index products do not match product files");
  }

  for (const product of products) {
    for (const reference of product.images ?? []) {
      const publicPath = referencedPublicPath(reference, "image", product.slug);
      await assertReferencedFile(root, rootRealPath, publicPath, "image");
    }
    for (const reference of product.documents ?? []) {
      const publicPath = referencedPublicPath(
        reference,
        "document",
        product.slug,
      );
      await assertReferencedFile(root, rootRealPath, publicPath, "document");
    }
    for (const reference of product.related_products ?? []) {
      const slug = relatedSlug(reference);
      if (typeof slug !== "string" || !slugs.has(slug)) {
        throw new Error(
          `product ${product.slug} references missing related product ${String(slug)}`,
        );
      }
    }
  }

  const imageFiles = (await collectRegularFiles(
    root,
    path.join(root, "media", "images"),
  ));
  const documentFiles = (await collectRegularFiles(
    root,
    path.join(root, "media", "documents"),
  ));
  assertCount(manifest, "image_count", imageFiles.length, "image files");
  assertCount(
    manifest,
    "document_count",
    documentFiles.length,
    "document files",
  );

  if (!isPlainObject(manifest.files)) {
    throw new Error("manifest files must contain an object");
  }
  const actualFiles = (await collectRegularFiles(root))
    .filter((relativePath) => relativePath !== "manifest.json");
  const declaredFiles = Object.keys(manifest.files).sort();
  if (
    actualFiles.length !== declaredFiles.length
    || actualFiles.some((file, index) => file !== declaredFiles[index])
  ) {
    throw new Error("manifest files do not match snapshot files");
  }
  for (const relativePath of declaredFiles) {
    const expected = manifest.files[relativePath];
    if (
      typeof expected !== "string"
      || !/^sha256:[a-f0-9]{64}$/.test(expected)
    ) {
      throw new Error(`invalid SHA-256 checksum for ${relativePath}`);
    }
    const bytes = await readFile(safeSnapshotPath(root, relativePath));
    const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    if (actual !== expected) {
      throw new Error(`checksum mismatch for ${relativePath}`);
    }
  }

  return { manifest, products, categories, brands };
}
