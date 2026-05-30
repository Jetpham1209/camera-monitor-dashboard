#!/usr/bin/env bash
set -euo pipefail

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
python3 worker.py --once
