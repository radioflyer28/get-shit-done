#!/usr/bin/env bash
# git_forensics.sh — Git history forensics for supply chain attack detection
# Usage: bash git_forensics.sh [/path/to/repo] [/path/to/output.md]
# Output: GIT-FORENSICS.md written to TARGET directory (or OUTPUT path if specified)
# Static analysis only — never executes target code.

set -u

TARGET="${1:-$(pwd)}"
OUTPUT="${2:-${TARGET}/GIT-FORENSICS.md}"
TMPDIR_FORENSICS="/tmp/gsd-forensics-$$"

# Cleanup on exit
trap 'rm -rf "$TMPDIR_FORENSICS"' EXIT

# Validate target is a git repository
if ! git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not a git repository: $TARGET" >&2
  exit 1
fi

mkdir -p "$TMPDIR_FORENSICS"

echo "Git forensics: collecting history from $TARGET"

# 1. Full commit log (all branches)
git -C "$TARGET" log --all \
  --format="%H|%an|%ae|%ai|%s" 2>/dev/null \
  > "$TMPDIR_FORENSICS/git_log.txt" || true

# 2. Reflog (detects force-pushes, rebases, amends)
git -C "$TARGET" reflog --all \
  --format="%H|%gd|%gs|%ai" 2>/dev/null \
  > "$TMPDIR_FORENSICS/git_reflog.txt" || true

# 3. All branches with metadata
git -C "$TARGET" branch -a \
  --format="%(refname:short)|%(objectname:short)|%(authordate:iso)" 2>/dev/null \
  > "$TMPDIR_FORENSICS/git_branches.txt" || true

# 4. Binary blob detection
# Get all blob objects with type and size
BLOB_LIST="$TMPDIR_FORENSICS/git_objects_binary.txt"
> "$BLOB_LIST"

git -C "$TARGET" cat-file --batch-all-objects \
  --batch-check='%(objecttype) %(objectname) %(objectsize)' 2>/dev/null \
  | awk '$1=="blob" && $3>0 {print $2, $3}' \
  | sort -k2 -rn \
  | head -200 \
  > "$TMPDIR_FORENSICS/blob_candidates.txt" || true

# For each large blob, check if it looks binary via file command
while IFS=' ' read -r sha size; do
  if [ -z "$sha" ]; then continue; fi
  # Check content type — use git cat-file piped to file
  FTYPE=$(git -C "$TARGET" cat-file blob "$sha" 2>/dev/null | file - 2>/dev/null || echo "unknown")
  if echo "$FTYPE" | grep -qi "binary\|ELF\|PE32\|Mach-O\|archive\|compressed\|executable\|data"; then
    # Find which commits introduced this blob
    COMMIT_INFO=$(git -C "$TARGET" log --all --find-object="$sha" \
      --format="%H %s" 2>/dev/null | head -3 || echo "unknown unknown")
    echo "${sha}|${size}|${COMMIT_INFO}" >> "$BLOB_LIST"
  fi
done < "$TMPDIR_FORENSICS/blob_candidates.txt"

# 5. .gitattributes files (execution vector detection)
find "$TARGET" -name ".gitattributes" \
  -not -path "*/.git/*" \
  -exec cat {} \; 2>/dev/null \
  > "$TMPDIR_FORENSICS/gitattributes.txt" || true

# 6. Git hooks listing (active hooks — no .sample suffix)
ls -la "$TARGET/.git/hooks/" 2>/dev/null \
  | grep -v "^total\|\.sample$" \
  > "$TMPDIR_FORENSICS/git_hooks.txt" || true

echo "Git forensics: running detection engine"

# Invoke Python detection engine
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "${SCRIPT_DIR}/git_forensics_report.py" "$TARGET" "$TMPDIR_FORENSICS" "$OUTPUT"
STATUS=$?

if [ $STATUS -eq 0 ] && [ -f "$OUTPUT" ]; then
  echo "✓ GIT-FORENSICS.md written to $OUTPUT"
else
  echo "✗ git_forensics_report.py failed (exit $STATUS)" >&2
  exit 1
fi

exit 0
