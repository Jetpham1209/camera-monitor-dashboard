#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to stop this service." >&2
  exit 127
fi

INSTANCE_ID="${SERVICE_INSTANCE_ID:-$(basename "${SERVICE_INSTANCE_DIR:-runtime}")}"
CONTAINER_FILE="${SERVICE_INSTANCE_DIR:-./runtime}/service.container"
CONTAINER_NAME="${WEIGHT_READER_CONTAINER_NAME:-camera-monitor-service-weight-reader-${INSTANCE_ID}}"

legacy_pid_file="${SERVICE_INSTANCE_DIR:-./runtime}/service.pid"
if [ -f "$legacy_pid_file" ]; then
  legacy_pid="$(cat "$legacy_pid_file" || true)"
  if [ -n "$legacy_pid" ] && kill -0 "$legacy_pid" >/dev/null 2>&1; then
    kill "$legacy_pid" || true
    sleep 1
    if kill -0 "$legacy_pid" >/dev/null 2>&1; then
      kill -9 "$legacy_pid" || true
    fi
    echo "Stopped legacy Weight Reader PID ${legacy_pid}."
  fi
  rm -f "$legacy_pid_file"
fi

if [ -f "$CONTAINER_FILE" ]; then
  saved_name="$(cat "$CONTAINER_FILE" || true)"
  if [ -n "$saved_name" ]; then
    CONTAINER_NAME="$saved_name"
  fi
fi

if docker ps -a --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null 2>&1; then
  docker rm -f "$CONTAINER_NAME" >/dev/null
  rm -f "$CONTAINER_FILE" "${SERVICE_INSTANCE_DIR:-./runtime}/service.pid"
  echo "Stopped Weight Reader service container ${CONTAINER_NAME}."
  exit 0
fi

echo "Weight Reader service container is not running: ${CONTAINER_NAME}"
