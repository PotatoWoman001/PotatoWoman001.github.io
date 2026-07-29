#!/usr/bin/env node

import path from "node:path";
import { validateMallSnapshot } from "./mall-snapshot-contract.mjs";

const snapshotRoot = process.argv[2];

if (!snapshotRoot || process.argv.length !== 3) {
  console.error("Usage: node scripts/verify-mall-snapshot.mjs <snapshot-root>");
  process.exitCode = 2;
} else {
  try {
    const { manifest, products } = await validateMallSnapshot(
      path.resolve(snapshotRoot),
    );
    console.log(
      `Validated ${manifest.schema_version} snapshot with ${products.length} product${products.length === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    console.error(`Mall snapshot validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
