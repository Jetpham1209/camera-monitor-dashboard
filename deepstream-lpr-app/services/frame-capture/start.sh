#!/usr/bin/env bash
set -euo pipefail

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
mkdir -p "${SERVICE_INSTANCE_DIR:-./runtime}"

if [ -f "${SERVICE_INSTANCE_DIR}/service.pid" ]; then
  old_pid="$(cat "${SERVICE_INSTANCE_DIR}/service.pid" || true)"
  if [ -n "$old_pid" ] && kill -0 "$old_pid" >/dev/null 2>&1; then
    echo "Frame Capture service is already running with PID ${old_pid}."
    exit 0
  fi
fi

nohup python3 worker.py --loop > "${SERVICE_INSTANCE_DIR}/service.log" 2>&1 &
echo "$!" > "${SERVICE_INSTANCE_DIR}/service.pid"
echo "Frame Capture service started with PID $(cat "${SERVICE_INSTANCE_DIR}/service.pid")."
