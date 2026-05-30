#!/usr/bin/env bash
set -euo pipefail

pid_file="${SERVICE_INSTANCE_DIR:-./runtime}/service.pid"
if [ ! -f "$pid_file" ]; then
  echo "Frame Capture service is not running."
  exit 0
fi

pid="$(cat "$pid_file" || true)"
if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
  kill "$pid" || true
  sleep 1
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill -9 "$pid" || true
  fi
  echo "Stopped Frame Capture service PID ${pid}."
else
  echo "Frame Capture service PID ${pid:-unknown} was not running."
fi

rm -f "$pid_file"
