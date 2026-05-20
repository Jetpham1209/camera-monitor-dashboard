#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Updating DeepStream LPR product stack"
cd "$REPO_ROOT"

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only
else
  echo "WARN: Not a git worktree or git is missing; skipping git pull." >&2
fi

bash "$SCRIPT_DIR/scripts/jetson-preflight.sh"
bash "$SCRIPT_DIR/run-product.sh"

echo "==> Update complete"
