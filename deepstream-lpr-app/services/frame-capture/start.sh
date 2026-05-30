#!/usr/bin/env bash
set -euo pipefail

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
mkdir -p "${SERVICE_INSTANCE_DIR:-./runtime}"

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "python3 is required in the service runtime. Rebuild/update the control container." >&2
  exit 127
fi

has_input_binding="$("$PYTHON_BIN" - <<'PY'
import json, os
path = os.environ.get("SERVICE_CONFIG_PATH")
try:
    data = json.load(open(path, encoding="utf-8"))
    b = data.get("bindings") or {}
    print("1" if b.get("enabled") and b.get("inputChannelId") else "0")
except Exception:
    print("0")
PY
)"

if [ "$has_input_binding" != "1" ]; then
  "$PYTHON_BIN" worker.py --once
  exit 0
fi

if [ -f "${SERVICE_INSTANCE_DIR}/service.pid" ]; then
  old_pid="$(cat "${SERVICE_INSTANCE_DIR}/service.pid" || true)"
  if [ -n "$old_pid" ] && kill -0 "$old_pid" >/dev/null 2>&1; then
    echo "Frame Capture service is already running with PID ${old_pid}."
    exit 0
  fi
fi

nohup "$PYTHON_BIN" worker.py --loop > "${SERVICE_INSTANCE_DIR}/service.log" 2>&1 &
echo "$!" > "${SERVICE_INSTANCE_DIR}/service.pid"
echo "Frame Capture listener started with PID $(cat "${SERVICE_INSTANCE_DIR}/service.pid")."
