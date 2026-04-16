#!/bin/bash
# Security Pre-Scan Orchestrator - Bash Shim
# Detects runtime environment and invokes Python orchestrator
# Exit codes: 0 = success, 1 = error, 2 = no tools found

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_ORCHESTRATOR="$SCRIPT_DIR/security_prescan.py"
TARGET_DIR="${1:-.}"

# Detect runtime environment
detect_runtime() {
  local runtime="unknown"
  local has_node=0
  local has_python=0
  local has_go=0
  local has_rust=0
  local has_iac=0
  
  # Node.js detection
  if [ -f "$TARGET_DIR/package.json" ]; then
    has_node=1
    runtime="node"
  fi
  
  # Python detection
  if [ -f "$TARGET_DIR/requirements.txt" ] || [ -f "$TARGET_DIR/setup.py" ] || [ -f "$TARGET_DIR/pyproject.toml" ]; then
    has_python=1
    [ "$runtime" = "unknown" ] && runtime="python" || runtime="mixed"
  fi
  
  # Go detection
  if [ -f "$TARGET_DIR/go.mod" ]; then
    has_go=1
    [ "$runtime" = "unknown" ] && runtime="go" || runtime="mixed"
  fi
  
  # Rust detection
  if [ -f "$TARGET_DIR/Cargo.toml" ]; then
    has_rust=1
    [ "$runtime" = "unknown" ] && runtime="rust" || runtime="mixed"
  fi
  
  # IaC detection (Terraform, Docker, Kubernetes)
  if [ -f "$TARGET_DIR/Dockerfile" ] || [ -f "$TARGET_DIR/main.tf" ] || [ -f "$TARGET_DIR/deployment.yaml" ]; then
    has_iac=1
  fi
  
  # Export runtime context
  export PROJECT_TYPE="$runtime"
  export HAS_NODE=$has_node
  export HAS_PYTHON=$has_python
  export HAS_GO=$has_go
  export HAS_RUST=$has_rust
  export HAS_IAC=$has_iac
  
  # Get tool versions
  if command -v node &> /dev/null; then
    export NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
  fi
  if command -v python3 &> /dev/null; then
    export PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "unknown")
  fi
  if command -v go &> /dev/null; then
    export GO_VERSION=$(go version 2>/dev/null | awk '{print $3}' || echo "unknown")
  fi
  
  echo "$runtime"
}

# Main execution
main() {
  local runtime
  runtime=$(detect_runtime)
  
  # Check if Python orchestrator exists
  if [ ! -f "$PYTHON_ORCHESTRATOR" ]; then
    echo "ERROR: Python orchestrator not found at $PYTHON_ORCHESTRATOR" >&2
    exit 1
  fi
  
  # Check if Python is available
  if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is required but not installed" >&2
    exit 1
  fi
  
  # Invoke Python orchestrator
  export PRESCAN_TARGET_DIR="$TARGET_DIR"
  export PRESCAN_RUNTIME="$runtime"
  python3 "$PYTHON_ORCHESTRATOR" "$TARGET_DIR"
}

main
