import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { publishSnapshot } from "./publish-mall-snapshot.mjs";

const fixture = path.resolve("fixtures/mall-snapshot-v1");
const fixtureManifest = JSON.parse(
  await readFile(path.join(fixture, "manifest.json"), "utf8"),
);
const remote = {
  host: "139.224.51.172",
  user: "joto-mall-deploy",
  releaseRoot: "/var/www/jotoglobal/catalog-releases",
  currentLink: "/var/www/jotoglobal/catalog-releases/current",
};

function successfulCommandResult(command, args) {
  const checksExistingRelease = command === "ssh"
    && args.includes("test")
    && args.includes("-e");
  return {
    status: checksExistingRelease ? 1 : 0,
    stdout: command === "curl" ? JSON.stringify(fixtureManifest) : "",
    stderr: "",
  };
}

async function newStatePath(label) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), `joto-mall-publisher-${label}-`),
  );
  return path.join(directory, "published-state.json");
}

async function assertMissing(filePath) {
  await assert.rejects(access(filePath), { code: "ENOENT" });
}

{
  const statePath = await newStatePath("success");
  const calls = [];
  const runner = async (command, args) => {
    calls.push([command, args]);
    return successfulCommandResult(command, args);
  };

  const first = await publishSnapshot({
    snapshotRoot: fixture,
    statePath,
    dryRun: false,
    runner,
    remote,
  });
  assert.equal(first.published, true);
  assert.ok(calls.some(([command]) => command === "rsync"));
  assert.ok(calls.some(([command]) => command === "ssh"));
  assert.ok(calls.some(([command]) => command === "curl"));

  const callCount = calls.length;
  const second = await publishSnapshot({
    snapshotRoot: fixture,
    statePath,
    dryRun: false,
    runner,
    remote,
  });
  assert.equal(second.published, false);
  assert.equal(second.reason, "already-published");
  assert.equal(calls.length, callCount);
}

{
  const invalidFixture = await mkdtemp(
    path.join(os.tmpdir(), "joto-mall-publisher-invalid-"),
  );
  await cp(fixture, invalidFixture, { recursive: true });
  const productPath = path.join(
    invalidFixture,
    "data/products/c881-k9.json",
  );
  const product = JSON.parse(await readFile(productPath, "utf8"));
  product.payment = "card";
  await writeFile(productPath, JSON.stringify(product));

  const calls = [];
  await assert.rejects(
    publishSnapshot({
      snapshotRoot: invalidFixture,
      statePath: await newStatePath("invalid"),
      dryRun: false,
      runner: async (command, args) => {
        calls.push([command, args]);
        return { status: 0, stdout: "", stderr: "" };
      },
      remote,
    }),
    /forbidden commerce field/,
  );
  assert.equal(calls.length, 0, "validator must run before network commands");
}

{
  const statePath = await newStatePath("rsync-failure");
  const calls = [];
  await assert.rejects(
    publishSnapshot({
      snapshotRoot: fixture,
      statePath,
      dryRun: false,
      runner: async (command, args) => {
        calls.push([command, args]);
        if (command === "rsync") {
          return { status: 23, stdout: "", stderr: "upload failed" };
        }
        return successfulCommandResult(command, args);
      },
      remote,
    }),
    /rsync failed with status 23/,
  );
  assert.equal(calls[0][0], "rsync");
  await assertMissing(statePath);
}

{
  const statePath = await newStatePath("verify-failure");
  const calls = [];
  await assert.rejects(
    publishSnapshot({
      snapshotRoot: fixture,
      statePath,
      dryRun: false,
      runner: async (command, args) => {
        calls.push([command, args]);
        const isRemoteVerification = command === "ssh"
          && args.some((argument) =>
            argument.includes("verify-mall-snapshot.mjs")
          );
        return {
          status: isRemoteVerification ? 1 : 0,
          stdout: command === "curl" ? JSON.stringify(fixtureManifest) : "",
          stderr: isRemoteVerification ? "invalid snapshot" : "",
        };
      },
      remote,
    }),
    /remote snapshot verification failed with status 1/,
  );
  assert.equal(
    calls.some(([command, args]) =>
      command === "ssh" && args.includes("ln")
    ),
    false,
    "a failed remote verification must not create a symlink",
  );
  await assertMissing(statePath);
}

{
  const statePath = await newStatePath("dry-run");
  let executed = false;
  const result = await publishSnapshot({
    snapshotRoot: fixture,
    statePath,
    dryRun: true,
    runner: async () => {
      executed = true;
      throw new Error("dry-run executed a command");
    },
    remote,
  });
  assert.equal(result.published, false);
  assert.equal(result.reason, "dry-run");
  assert.equal(executed, false);
  assert.ok(result.commands.some(({ command }) => command === "rsync"));
  assert.ok(result.commands.some(({ command }) => command === "ssh"));
  assert.ok(result.commands.some(({ command }) => command === "curl"));
  const existenceCheck = result.commands.find(
    ({ command, args }) =>
      command === "ssh" && args.includes("test") && args.includes("-e"),
  );
  assert.ok(existenceCheck);
  assert.equal(
    existenceCheck.args.includes("--"),
    false,
    "the remote shell test builtin does not accept --",
  );
  await assertMissing(statePath);
}

{
  const statePath = await newStatePath("secret");
  const secret = "do-not-store-this-password";
  const calls = [];
  await publishSnapshot({
    snapshotRoot: fixture,
    statePath,
    dryRun: false,
    runner: async (command, args) => {
      calls.push([command, args]);
      return successfulCommandResult(command, args);
    },
    remote: { ...remote, password: secret },
  });
  assert.equal(JSON.stringify(calls).includes(secret), false);
  assert.equal((await readFile(statePath, "utf8")).includes(secret), false);
}

{
  let executed = false;
  await assert.rejects(
    publishSnapshot({
      snapshotRoot: fixture,
      statePath: await newStatePath("unsafe-current-link"),
      dryRun: false,
      runner: async () => {
        executed = true;
        return { status: 0, stdout: "", stderr: "" };
      },
      remote: {
        ...remote,
        currentLink: "/var/www/jotoglobal/catalog-current",
      },
    }),
    /remote current link must be inside remote release root/,
  );
  assert.equal(executed, false);
}

{
  const statePath = await newStatePath("existing-release");
  const calls = [];
  const result = await publishSnapshot({
    snapshotRoot: fixture,
    statePath,
    dryRun: false,
    runner: async (command, args) => {
      calls.push([command, args]);
      if (command === "ssh" && args.includes("test") && args.includes("-e")) {
        return { status: 0, stdout: "", stderr: "" };
      }
      return successfulCommandResult(command, args);
    },
    remote,
  });
  assert.equal(result.published, true);
  const release = `${remote.releaseRoot}/${result.version}`;
  assert.equal(
    calls.some(([command, args]) =>
      command === "ssh"
      && args.includes("mv")
      && args.includes(release)
    ),
    false,
    "an existing immutable release must never be an mv destination",
  );
  assert.ok(
    calls.some(([command, args]) =>
      command === "ssh"
      && args.some((argument) =>
        argument.includes("verify-mall-snapshot.mjs")
      )
      && args.includes(release)
    ),
    "an existing release must be verified before reuse",
  );
}

for (const [field, wrongValue] of [
  ["schema_version", "joto-mall-v0"],
  ["crawl_run_id", fixtureManifest.crawl_run_id + 1],
  ["generated_at", "2026-07-30T00:00:00Z"],
]) {
  const statePath = await newStatePath(`https-mismatch-${field}`);
  await assert.rejects(
    publishSnapshot({
      snapshotRoot: fixture,
      statePath,
      dryRun: false,
      runner: async (command, args) => {
        const result = successfulCommandResult(command, args);
        if (command === "curl") {
          result.stdout = JSON.stringify({
            ...fixtureManifest,
            [field]: wrongValue,
          });
        }
        return result;
      },
      remote,
    }),
    new RegExp(`HTTPS manifest ${field} does not match local manifest`),
  );
  await assertMissing(statePath);
}

{
  const runnerPath = path.resolve("scripts/run-mall-publication.sh");
  const exportRoot = await mkdtemp(
    path.join(os.tmpdir(), "joto-mall-export-root-"),
  );
  const version = "20260729T000000Z-run-1";
  const resolveRoot = (readyRoot) => spawnSync(
    "/bin/bash",
    [
      "-c",
      'source "$1"; resolve_snapshot_root "$2" "$3"',
      "_",
      runnerPath,
      readyRoot,
      exportRoot,
    ],
    { encoding: "utf8" },
  );

  const containerPath = resolveRoot(
    `/app/data/exports/jotoglobal/${version}`,
  );
  assert.equal(containerPath.status, 0, containerPath.stderr);
  assert.equal(containerPath.stdout.trim(), path.join(exportRoot, version));

  const hostPath = resolveRoot(path.join(exportRoot, version));
  assert.equal(hostPath.status, 0, hostPath.stderr);
  assert.equal(hostPath.stdout.trim(), path.join(exportRoot, version));

  for (const unsafePath of [
    "relative/snapshot",
    "/app/data/exports/jotoglobal/../outside",
    path.join(exportRoot, "..", "outside"),
  ]) {
    const unsafe = resolveRoot(unsafePath);
    assert.notEqual(unsafe.status, 0, `${unsafePath} must be rejected`);
  }
}

console.log("Verified Mall snapshot publisher safety and idempotency.");
