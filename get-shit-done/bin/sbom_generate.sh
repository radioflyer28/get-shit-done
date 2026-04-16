#!/usr/bin/env bash
# sbom_generate.sh — SBOM (Software Bill of Materials) generator for GSD scanner
#
# Usage:
#   bash sbom_generate.sh <target_dir> [output_file]
#
# Generates SBOM.json in CycloneDX JSON format using syft (preferred) or cyclonedx-cli (fallback).
# Writes output to <target_dir>/SBOM.json by default, or to the specified output path.
#
# Exit codes:
#   0 — SBOM generated successfully
#   1 — No supported tool found (prints install instructions)
#   2 — Tool found but generation failed

set -euo pipefail

TARGET_DIR="${1:-.}"
OUTPUT_FILE="${2:-${TARGET_DIR}/SBOM.json}"

# Resolve absolute paths
TARGET_DIR=$(realpath "${TARGET_DIR}" 2>/dev/null || echo "${TARGET_DIR}")
OUTPUT_DIR=$(dirname "${OUTPUT_FILE}")
if [ ! -d "${OUTPUT_DIR}" ]; then
  mkdir -p "${OUTPUT_DIR}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GSD > SBOM GENERATION"
echo "  Target: ${TARGET_DIR}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Tool detection ────────────────────────────────────────────────────────────

SBOM_TOOL=""
SBOM_VERSION=""

if command -v syft >/dev/null 2>&1; then
  SBOM_TOOL="syft"
  SBOM_VERSION=$(syft version --output text 2>/dev/null | head -1 || echo "unknown")
  echo "✓ Found syft: ${SBOM_VERSION}"
elif command -v cyclonedx-cli >/dev/null 2>&1; then
  SBOM_TOOL="cyclonedx-cli"
  SBOM_VERSION=$(cyclonedx-cli --version 2>/dev/null || echo "unknown")
  echo "✓ Found cyclonedx-cli: ${SBOM_VERSION}"
else
  echo ""
  echo "✗ No SBOM generation tool found."
  echo ""
  echo "Install one of the following:"
  echo ""
  echo "  Option 1 — syft (recommended, multi-ecosystem):"
  echo "    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin"
  echo "    # Or: brew install syft"
  echo ""
  echo "  Option 2 — cyclonedx-cli:"
  echo "    # Download from: https://github.com/CycloneDX/cyclonedx-cli/releases"
  echo "    # Or: dotnet tool install --global CycloneDX"
  echo ""
  exit 1
fi

# ── SBOM generation ───────────────────────────────────────────────────────────

echo ""
echo "Generating SBOM in CycloneDX JSON format..."

case "${SBOM_TOOL}" in
  syft)
    if syft "${TARGET_DIR}" -o cyclonedx-json="${OUTPUT_FILE}" 2>&1; then
      SBOM_EXIT=0
    else
      SBOM_EXIT=$?
    fi
    ;;
  cyclonedx-cli)
    if cyclonedx-cli analyze --directory "${TARGET_DIR}" --output-format json --output-file "${OUTPUT_FILE}" 2>&1; then
      SBOM_EXIT=0
    else
      SBOM_EXIT=$?
    fi
    ;;
esac

if [ "${SBOM_EXIT:-0}" -ne 0 ]; then
  echo ""
  echo "✗ SBOM generation failed (exit code: ${SBOM_EXIT})"
  exit 2
fi

# ── Validation ────────────────────────────────────────────────────────────────

if [ ! -f "${OUTPUT_FILE}" ]; then
  echo "✗ SBOM file not found after generation: ${OUTPUT_FILE}"
  exit 2
fi

COMPONENT_COUNT=0
if command -v python3 >/dev/null 2>&1; then
  COMPONENT_COUNT=$(python3 -c "
import json, sys
try:
    data = json.load(open('${OUTPUT_FILE}'))
    comps = data.get('components', [])
    print(len(comps))
except Exception as e:
    print(0)
" 2>/dev/null || echo "0")
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GSD > SBOM GENERATION COMPLETE ✓"
echo "  Tool:       ${SBOM_TOOL} ${SBOM_VERSION}"
echo "  Format:     CycloneDX JSON"
echo "  Components: ${COMPONENT_COUNT}"
echo "  Output:     ${OUTPUT_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
