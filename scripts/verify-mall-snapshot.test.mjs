import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateMallSnapshot } from "./mall-snapshot-contract.mjs";

const fixture = path.resolve("fixtures/mall-snapshot-v1");

await validateMallSnapshot(fixture);

const unsafe = await mkdtemp(path.join(os.tmpdir(), "joto-mall-unsafe-"));
await cp(fixture, unsafe, { recursive: true });
const productPath = path.join(unsafe, "data/products/c881-k9.json");
const product = JSON.parse(await readFile(productPath, "utf8"));
product.price = "100";
await writeFile(productPath, JSON.stringify(product));
await assert.rejects(
  validateMallSnapshot(unsafe),
  /forbidden commerce field at \$\.price/,
);

const missing = await mkdtemp(path.join(os.tmpdir(), "joto-mall-missing-"));
await cp(fixture, missing, { recursive: true });
const manifestPath = path.join(missing, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.record_count = 2;
await writeFile(manifestPath, JSON.stringify(manifest));
await assert.rejects(
  validateMallSnapshot(missing),
  /record_count 2 does not match 1 product files/,
);

console.log("Verified Mall snapshot contract failure modes.");
