#!/usr/bin/env bash
set -euo pipefail

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "python3 is required in the service runtime. Rebuild/update the control container." >&2
  exit 127
fi
"$PYTHON_BIN" worker.py --once
