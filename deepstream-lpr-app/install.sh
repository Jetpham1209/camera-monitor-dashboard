#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Installing DeepStream LPR product stack"
echo "==> This script expects a Jetson with JetPack 6.x, Docker, Docker Compose plugin, and NVIDIA container runtime."
echo "==> Host Node.js, npm, and PM2 are not required. The control UI dependencies are installed inside Docker."

bash "$SCRIPT_DIR/scripts/jetson-preflight.sh"
bash "$SCRIPT_DIR/run-product.sh"

echo "==> Install complete"
