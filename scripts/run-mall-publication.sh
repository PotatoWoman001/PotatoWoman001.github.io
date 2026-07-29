#!/bin/bash

set -euo pipefail

publication_lock_directory=""
publication_log_path=""
publication_run_id=""
publication_version=""
publication_owns_lock=0
publication_logged=0

resolve_snapshot_root() {
  local ready_root="$1"
  local export_root="$2"
  local version

  if [[ "$ready_root" != /* ]]; then
    echo "latest-ready root must be absolute: $ready_root" >&2
    return 1
  fi
  case "/$ready_root/" in
    *"/../"*)
      echo "latest-ready root must not contain '..': $ready_root" >&2
      return 1
      ;;
  esac

  case "$ready_root" in
    /app/data/exports/jotoglobal/*)
      version="${ready_root#/app/data/exports/jotoglobal/}"
      ;;
    "$export_root"/*)
      version="${ready_root#"$export_root"/}"
      ;;
    *)
      echo "latest-ready root is outside the Mall export root: $ready_root" >&2
      return 1
      ;;
  esac

  if [[ ! "$version" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "latest-ready version is not a safe single directory: $version" >&2
    return 1
  fi
  printf '%s/%s\n' "$export_root" "$version"
}

read_ready_field() {
  local ready_file="$1"
  local field="$2"
  node -e '
    const fs = require("node:fs");
    const ready = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const field = process.argv[2];
    const value = field === "run_id"
      ? (ready.run_id ?? ready.crawl_run_id)
      : ready[field];
    if (
      value === undefined
      || value === null
      || (typeof value === "string" && value.length === 0)
    ) {
      throw new Error(`latest-ready.json is missing ${field}`);
    }
    process.stdout.write(String(value));
  ' "$ready_file" "$field"
}

append_publication_log() {
  local log_path="$1"
  local run_id="$2"
  local version="$3"
  local result="$4"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  node -e '
    const fs = require("node:fs");
    const [logPath, runId, version, result, timestamp] = process.argv.slice(1);
    const numericRunId = /^\d+$/.test(runId) ? Number(runId) : null;
    fs.appendFileSync(logPath, `${JSON.stringify({
      run_id: numericRunId,
      version: version || null,
      result,
      timestamp,
    })}\n`, { encoding: "utf8", mode: 0o600 });
  ' "$log_path" "$run_id" "$version" "$result" "$timestamp"
}

cleanup_publication() {
  local status="$1"
  if [[ "$status" -ne 0 && "$publication_logged" -eq 0 ]]; then
    append_publication_log \
      "$publication_log_path" \
      "$publication_run_id" \
      "$publication_version" \
      "failed-exit-$status" || true
  fi
  if [[ "$publication_owns_lock" -eq 1 ]]; then
    rmdir "$publication_lock_directory" 2>/dev/null || true
  fi
  return "$status"
}

main() {
  local script_directory
  local website_root
  local publisher_env_file
  local crawler_root
  local export_root
  local lock_directory
  local state_path
  local log_path
  local ready_file
  local ready_root
  local snapshot_root
  local publisher_output
  local publication_result

  script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
  website_root="$(cd "$script_directory/.." && pwd -P)"
  publisher_env_file="${JOTO_MALL_PUBLISHER_ENV_FILE:-$website_root/deploy/mall-publisher/publisher.env}"
  if [[ ! -f "$publisher_env_file" ]]; then
    echo "Publisher environment file not found: $publisher_env_file" >&2
    return 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$publisher_env_file"
  set +a

  : "${JOTO_MALL_CRAWLER_ROOT:?JOTO_MALL_CRAWLER_ROOT is required}"
  if [[ "$JOTO_MALL_CRAWLER_ROOT" != /* ]]; then
    echo "JOTO_MALL_CRAWLER_ROOT must be absolute" >&2
    return 1
  fi
  crawler_root="$(cd "$JOTO_MALL_CRAWLER_ROOT" && pwd -P)"
  export_root="$crawler_root/data/exports/jotoglobal"
  mkdir -p "$export_root"
  lock_directory="$export_root/publication.lock"
  state_path="$export_root/published-state.json"
  log_path="$export_root/publication.jsonl"
  ready_file="$export_root/latest-ready.json"

  if ! mkdir "$lock_directory" 2>/dev/null; then
    echo "Mall publication is already running; skipping this interval." >&2
    return 0
  fi
  publication_lock_directory="$lock_directory"
  publication_log_path="$log_path"
  publication_owns_lock=1
  trap 'cleanup_publication "$?"' EXIT

  (
    cd "$crawler_root"
    docker compose --profile ops run --rm --no-deps ops \
      python scripts/build_jotoglobal_snapshot.py \
      --output-root /app/data/exports/jotoglobal
  )

  if [[ ! -f "$ready_file" ]]; then
    echo "Snapshot builder did not write $ready_file" >&2
    return 1
  fi
  ready_root="$(read_ready_field "$ready_file" root)"
  publication_run_id="$(read_ready_field "$ready_file" run_id)"
  publication_version="$(read_ready_field "$ready_file" version)"
  if [[ ! "$publication_run_id" =~ ^[1-9][0-9]*$ ]]; then
    echo "latest-ready run_id must be a positive integer" >&2
    return 1
  fi
  if [[ ! "$publication_version" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "latest-ready version is invalid: $publication_version" >&2
    return 1
  fi
  snapshot_root="$(resolve_snapshot_root "$ready_root" "$export_root")"
  if [[ "$(basename "$snapshot_root")" != "$publication_version" ]]; then
    echo "latest-ready root and version do not match" >&2
    return 1
  fi
  if [[ ! -d "$snapshot_root" ]]; then
    echo "Snapshot directory does not exist: $snapshot_root" >&2
    return 1
  fi

  publisher_output="$(
    node "$website_root/scripts/publish-mall-snapshot.mjs" \
      --snapshot-root "$snapshot_root" \
      --state-path "$state_path"
  )"
  printf '%s\n' "$publisher_output"
  publication_result="$(
    node -e '
      const lines = process.argv[1].trim().split(/\n/);
      const result = JSON.parse(lines.at(-1));
      process.stdout.write(result.reason);
    ' "$publisher_output"
  )"
  append_publication_log \
    "$log_path" \
    "$publication_run_id" \
    "$publication_version" \
    "$publication_result"
  publication_logged=1
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
