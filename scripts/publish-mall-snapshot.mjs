#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateMallSnapshot } from "./mall-snapshot-contract.mjs";

const DEFAULT_PUBLIC_MANIFEST_URL =
  "https://jotoglobal.com/mall-data/manifest.json";
const SAFE_HOST = /^[A-Za-z0-9.-]+$/;
const SAFE_USER = /^[A-Za-z0-9._-]+$/;
const SAFE_REMOTE_PATH = /^\/[A-Za-z0-9._/-]+$/;
const SAFE_LOCAL_KEY_PATH = /^\/[A-Za-z0-9._/@+-]+$/;

function requiredString(value, name, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`invalid ${name}`);
  }
  return value;
}

function normalizeRemote(remote) {
  if (!remote || typeof remote !== "object") {
    throw new Error("remote publication settings are required");
  }
  const host = requiredString(remote.host, "remote host", SAFE_HOST);
  const user = requiredString(remote.user, "remote user", SAFE_USER);
  const releaseRoot = requiredString(
    remote.releaseRoot,
    "remote release root",
    SAFE_REMOTE_PATH,
  ).replace(/\/+$/, "");
  const currentLink = requiredString(
    remote.currentLink,
    "remote current link",
    SAFE_REMOTE_PATH,
  ).replace(/\/+$/, "");
  if (!currentLink.startsWith(`${releaseRoot}/`)) {
    throw new Error("remote current link must be inside remote release root");
  }
  let key = null;
  if (remote.key !== undefined && remote.key !== null && remote.key !== "") {
    key = requiredString(remote.key, "deployment key path", SAFE_LOCAL_KEY_PATH);
    if (!path.isAbsolute(key)) {
      throw new Error("deployment key path must be absolute");
    }
  }
  const verifierPath = requiredString(
    remote.verifierPath
      ?? `${path.posix.dirname(releaseRoot)}/current/scripts/verify-mall-snapshot.mjs`,
    "remote verifier path",
    SAFE_REMOTE_PATH,
  );
  const publicManifestUrl =
    remote.publicManifestUrl ?? DEFAULT_PUBLIC_MANIFEST_URL;
  let parsedPublicUrl;
  try {
    parsedPublicUrl = new URL(publicManifestUrl);
  } catch (error) {
    throw new Error("invalid public manifest URL", { cause: error });
  }
  if (parsedPublicUrl.protocol !== "https:") {
    throw new Error("public manifest URL must use HTTPS");
  }
  return {
    host,
    user,
    releaseRoot,
    currentLink,
    key,
    verifierPath,
    publicManifestUrl: parsedPublicUrl.href,
  };
}

function versionFromManifest(manifest) {
  const generatedAt = new Date(manifest.generated_at);
  if (Number.isNaN(generatedAt.valueOf())) {
    throw new Error("manifest generated_at is invalid");
  }
  const timestamp = generatedAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000", "");
  return `${timestamp}-run-${manifest.crawl_run_id}`;
}

function sshConnectionArgs(remote) {
  return [
    ...(remote.key ? ["-i", remote.key] : []),
    "-o",
    "BatchMode=yes",
    `${remote.user}@${remote.host}`,
  ];
}

function rsyncRemoteShell(remote) {
  if (!remote.key) return "ssh -o BatchMode=yes";
  return `ssh -i ${remote.key} -o BatchMode=yes`;
}

function buildPublicationCommands(snapshotRoot, version, remote) {
  const incoming = `${remote.releaseRoot}/.incoming-${version}`;
  const release = `${remote.releaseRoot}/${version}`;
  const nextLink = `${remote.currentLink}.next`;
  const connection = sshConnectionArgs(remote);
  return {
    upload: {
      label: "rsync",
      command: "rsync",
      args: [
        "--archive",
        "--checksum",
        "--delay-updates",
        "--delete",
        "--rsh",
        rsyncRemoteShell(remote),
        `${snapshotRoot}${path.sep}`,
        `${remote.user}@${remote.host}:${incoming}/`,
      ],
    },
    verifyIncoming: {
      label: "remote snapshot verification",
      command: "ssh",
      args: [
        ...connection,
        "node",
        remote.verifierPath,
        incoming,
      ],
    },
    releaseExists: {
      label: "remote release existence check",
      command: "ssh",
      args: [...connection, "test", "-e", release],
    },
    finalizeRelease: {
      label: "remote release finalization",
      command: "ssh",
      args: [...connection, "mv", "-T", "--", incoming, release],
    },
    verifyRelease: {
      label: "existing remote release verification",
      command: "ssh",
      args: [
        ...connection,
        "node",
        remote.verifierPath,
        release,
      ],
    },
    discardIncoming: {
      label: "validated incoming release cleanup",
      command: "ssh",
      args: [...connection, "rm", "-r", "--", incoming],
    },
    switchCommands: [{
      label: "remote next-link cleanup",
      command: "ssh",
      args: [...connection, "rm", "-f", "--", nextLink],
    },
    {
      label: "remote next-link creation",
      command: "ssh",
      args: [...connection, "ln", "-s", "--", release, nextLink],
    },
    {
      label: "remote current-link switch",
      command: "ssh",
      args: [...connection, "mv", "-Tf", "--", nextLink, remote.currentLink],
    }],
    verifyHttps: {
      label: "HTTPS manifest verification",
      command: "curl",
      args: [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--header",
        "Cache-Control: no-cache",
        "--max-time",
        "30",
        remote.publicManifestUrl,
      ],
    },
  };
}

async function defaultRunner(command, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (status) => {
      resolve({
        status: status ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

async function readPublishedState(statePath) {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      throw new Error(`invalid publisher state JSON at ${statePath}`, {
        cause: error,
      });
    }
    throw error;
  }
}

async function writePublishedState(statePath, state) {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp-${process.pid}`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(state, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await rename(temporaryPath, statePath);
}

async function runChecked(runner, spec) {
  const result = await runner(spec.command, spec.args);
  if (!result || result.status !== 0) {
    const status = result?.status ?? "unknown";
    const detail = result?.stderr?.trim();
    throw new Error(
      `${spec.label} failed with status ${status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return result;
}

function assertHttpsManifest(localManifest, responseBody) {
  let publicManifest;
  try {
    publicManifest = JSON.parse(responseBody);
  } catch (error) {
    throw new Error("HTTPS manifest response is not valid JSON", {
      cause: error,
    });
  }
  for (const field of ["schema_version", "crawl_run_id", "generated_at"]) {
    if (publicManifest?.[field] !== localManifest[field]) {
      throw new Error(
        `HTTPS manifest ${field} does not match local manifest`,
      );
    }
  }
}

export async function publishSnapshot({
  snapshotRoot,
  statePath,
  dryRun = false,
  runner = defaultRunner,
  remote,
}) {
  if (!path.isAbsolute(snapshotRoot)) {
    throw new Error("snapshotRoot must be an absolute path");
  }
  if (!path.isAbsolute(statePath)) {
    throw new Error("statePath must be an absolute path");
  }

  const { manifest } = await validateMallSnapshot(snapshotRoot);
  const normalizedRemote = normalizeRemote(remote);
  const version = versionFromManifest(manifest);
  const existingState = await readPublishedState(statePath);
  if (
    existingState?.version === version
    && existingState?.crawl_run_id === manifest.crawl_run_id
  ) {
    return {
      published: false,
      reason: "already-published",
      version,
      runId: manifest.crawl_run_id,
    };
  }

  const commands = buildPublicationCommands(
    path.resolve(snapshotRoot),
    version,
    normalizedRemote,
  );
  if (dryRun) {
    const dryRunCommands = [
      commands.upload,
      commands.verifyIncoming,
      commands.releaseExists,
      commands.finalizeRelease,
      commands.verifyRelease,
      commands.discardIncoming,
      ...commands.switchCommands,
      commands.verifyHttps,
    ];
    return {
      published: false,
      reason: "dry-run",
      version,
      runId: manifest.crawl_run_id,
      commands: dryRunCommands.map(
        ({ command, args }) => ({ command, args }),
      ),
    };
  }

  await runChecked(runner, commands.upload);
  await runChecked(runner, commands.verifyIncoming);
  const releaseStatus = await runner(
    commands.releaseExists.command,
    commands.releaseExists.args,
  );
  if (releaseStatus?.status === 0) {
    await runChecked(runner, commands.verifyRelease);
    await runChecked(runner, commands.discardIncoming);
  } else if (releaseStatus?.status === 1) {
    await runChecked(runner, commands.finalizeRelease);
  } else {
    const status = releaseStatus?.status ?? "unknown";
    const detail = releaseStatus?.stderr?.trim();
    throw new Error(
      `${commands.releaseExists.label} failed with status ${status}${detail ? `: ${detail}` : ""}`,
    );
  }
  for (const command of commands.switchCommands) {
    await runChecked(runner, command);
  }
  const httpsResult = await runChecked(runner, commands.verifyHttps);
  assertHttpsManifest(manifest, httpsResult.stdout);

  const state = {
    schema_version: manifest.schema_version,
    crawl_run_id: manifest.crawl_run_id,
    version,
    snapshot_root: path.resolve(snapshotRoot),
    published_at: new Date().toISOString(),
  };
  await writePublishedState(statePath, state);
  return {
    published: true,
    reason: "published",
    version,
    runId: manifest.crawl_run_id,
  };
}

function parseCliArguments(argv) {
  const options = { dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--snapshot-root" || argument === "--state-path") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value`);
      }
      options[argument === "--snapshot-root" ? "snapshotRoot" : "statePath"] =
        value;
      index += 1;
      continue;
    }
    throw new Error(`unknown argument ${argument}`);
  }
  if (!options.snapshotRoot || !options.statePath) {
    throw new Error(
      "Usage: publish-mall-snapshot.mjs --snapshot-root <absolute-path> --state-path <absolute-path> [--dry-run]",
    );
  }
  if (!path.isAbsolute(options.snapshotRoot) || !path.isAbsolute(options.statePath)) {
    throw new Error("--snapshot-root and --state-path must be absolute paths");
  }
  return options;
}

function remoteFromEnvironment(environment) {
  const required = [
    "JOTO_MALL_DEPLOY_HOST",
    "JOTO_MALL_DEPLOY_USER",
    "JOTO_MALL_DEPLOY_KEY",
    "JOTO_MALL_REMOTE_RELEASE_ROOT",
    "JOTO_MALL_REMOTE_CURRENT_LINK",
  ];
  for (const name of required) {
    if (!environment[name]) {
      throw new Error(`missing required environment variable ${name}`);
    }
  }
  return {
    host: environment.JOTO_MALL_DEPLOY_HOST,
    user: environment.JOTO_MALL_DEPLOY_USER,
    key: environment.JOTO_MALL_DEPLOY_KEY,
    releaseRoot: environment.JOTO_MALL_REMOTE_RELEASE_ROOT,
    currentLink: environment.JOTO_MALL_REMOTE_CURRENT_LINK,
  };
}

function printableCommand(command) {
  return [command.command, ...command.args]
    .map((part) => JSON.stringify(part))
    .join(" ");
}

async function main() {
  try {
    const options = parseCliArguments(process.argv.slice(2));
    const result = await publishSnapshot({
      ...options,
      remote: remoteFromEnvironment(process.env),
    });
    for (const command of result.commands ?? []) {
      console.log(`DRY RUN: ${printableCommand(command)}`);
    }
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Mall snapshot publication failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
