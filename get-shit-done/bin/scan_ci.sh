#!/usr/bin/env bash
# scan_ci.sh — Shared CI helper for GSD security/threat scan workflows
#
# Usage (sourced):
#   source "$(dirname "$0")/../bin/scan_ci.sh"
#   detect_lockfile_changes /path/to/repo
#   # CI_LOCKFILES_CHANGED is now set (space-separated, empty if none)
#   write_ci_results "security" 3 "FINDINGS_PRESENT"
#
# Usage (called directly):
#   bash scan_ci.sh detect /path/to/repo
#   bash scan_ci.sh write /path/to/target security 3 FINDINGS_PRESENT

# All known lockfile patterns
_LOCKFILE_PATTERNS=(
  "package-lock.json"
  "yarn.lock"
  "pnpm-lock.yaml"
  "requirements.txt"
  "Pipfile.lock"
  "poetry.lock"
  "Gemfile.lock"
  "Cargo.lock"
  "go.sum"
  "composer.lock"
)

# detect_lockfile_changes <target_dir>
# Sets CI_LOCKFILES_CHANGED (space-separated list of changed lockfiles, or empty)
detect_lockfile_changes() {
  local target_dir="${1:-$PWD}"
  CI_LOCKFILES_CHANGED=""

  # In CI (detached HEAD), compare HEAD~1..HEAD; otherwise compare working tree vs HEAD
  local diff_cmd
  if git -C "${target_dir}" rev-parse HEAD~1 >/dev/null 2>&1; then
    # Has at least one prior commit — use HEAD~1..HEAD for CI detached-HEAD safety
    if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] || [ -n "${GITLAB_CI:-}" ] || [ -n "${CIRCLECI:-}" ]; then
      diff_cmd="git -C ${target_dir} diff --name-only HEAD~1 HEAD"
    else
      diff_cmd="git -C ${target_dir} diff --name-only HEAD"
    fi
  else
    # First commit — compare against empty tree
    diff_cmd="git -C ${target_dir} diff --name-only HEAD"
  fi

  local changed_files
  changed_files=$(eval "${diff_cmd}" 2>/dev/null || echo "")

  local matched=()
  for pattern in "${_LOCKFILE_PATTERNS[@]}"; do
    if echo "${changed_files}" | grep -qF "${pattern}"; then
      matched+=("${pattern}")
    fi
  done

  CI_LOCKFILES_CHANGED="${matched[*]}"
  export CI_LOCKFILES_CHANGED
}

# write_ci_results <scan_type> <findings_count> <verdict> [target_dir]
# Writes CI_RESULTS.json to target_dir (default: $TARGET_DIR or $PWD)
# Also sets and exports CI_EXIT_CODE: 0=clean/skipped, 1=findings, 2=error
write_ci_results() {
  local scan_type="${1:-unknown}"
  local findings_count="${2:-0}"
  local verdict="${3:-UNKNOWN}"
  local output_dir="${4:-${TARGET_DIR:-$PWD}}"

  # Validate findings_count is an integer (security: no arbitrary injection)
  if ! echo "${findings_count}" | grep -qE '^[0-9]+$'; then
    findings_count=0
  fi

  # Determine exit code from verdict
  case "${verdict}" in
    CLEAN|SKIPPED)
      CI_EXIT_CODE=0
      ;;
    FINDINGS_PRESENT|SUSPICIOUS|COMPROMISED)
      CI_EXIT_CODE=1
      ;;
    *)
      CI_EXIT_CODE=2
      ;;
  esac
  export CI_EXIT_CODE

  # Build scan_id: short git hash + epoch (no user-controlled input in scan_id)
  local git_short
  git_short=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")
  local epoch
  epoch=$(date +%s)
  local scan_id="${git_short}-${epoch}"

  # ISO8601 timestamp
  local ts
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Build lockfiles_changed JSON array (values are hardcoded pattern names — safe)
  local lf_json="[]"
  if [ -n "${CI_LOCKFILES_CHANGED:-}" ]; then
    lf_json="["
    local first=true
    for lf in ${CI_LOCKFILES_CHANGED}; do
      # Escape any special chars from the matched pattern (should only be alphanumeric+punct)
      local safe_lf
      safe_lf=$(echo "${lf}" | tr -cd 'a-zA-Z0-9._-')
      if $first; then first=false; else lf_json+=","; fi
      lf_json+="\"${safe_lf}\""
    done
    lf_json+="]"
  fi

  local skipped="false"
  [ "${verdict}" = "SKIPPED" ] && skipped="true"

  local output_file="${output_dir}/CI_RESULTS.json"

  cat > "${output_file}" <<EOF
{
  "scan_id": "${scan_id}",
  "timestamp": "${ts}",
  "scan_type": "${scan_type}",
  "lockfiles_changed": ${lf_json},
  "skipped": ${skipped},
  "findings_count": ${findings_count},
  "verdict": "${verdict}",
  "exit_code": ${CI_EXIT_CODE}
}
EOF

  echo "CI: Results written to ${output_file} (verdict=${verdict}, exit_code=${CI_EXIT_CODE})" >&2
}

# Direct execution mode
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-}" in
    detect)
      detect_lockfile_changes "${2:-$PWD}"
      echo "${CI_LOCKFILES_CHANGED}"
      ;;
    write)
      # write <target_dir> <scan_type> <findings_count> <verdict>
      TARGET_DIR="${2:-$PWD}"
      detect_lockfile_changes "${TARGET_DIR}"
      write_ci_results "${3:-unknown}" "${4:-0}" "${5:-UNKNOWN}" "${TARGET_DIR}"
      exit "${CI_EXIT_CODE}"
      ;;
    *)
      echo "Usage: scan_ci.sh detect <dir> | scan_ci.sh write <dir> <type> <count> <verdict>" >&2
      exit 1
      ;;
  esac
fi
