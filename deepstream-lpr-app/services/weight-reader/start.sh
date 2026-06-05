#!/usr/bin/env bash
set -euo pipefail

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
mkdir -p "${SERVICE_INSTANCE_DIR:-./runtime}" "${SERVICE_OUTPUT_DIR:-./outputs}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to start this service." >&2
  exit 127
fi

IMAGE="${WEIGHT_READER_IMAGE:-camera-monitor-service-weight-reader:local}"
INSTANCE_ID="${SERVICE_INSTANCE_ID:-$(basename "${SERVICE_INSTANCE_DIR:-runtime}")}"
CONTAINER_NAME="${WEIGHT_READER_CONTAINER_NAME:-camera-monitor-service-weight-reader-${INSTANCE_ID}}"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker build -t "$IMAGE" .
fi

legacy_pid_file="${SERVICE_INSTANCE_DIR:-./runtime}/service.pid"
if [ -f "$legacy_pid_file" ]; then
  legacy_pid="$(cat "$legacy_pid_file" || true)"
  if [ -n "$legacy_pid" ] && kill -0 "$legacy_pid" >/dev/null 2>&1; then
    kill "$legacy_pid" || true
    sleep 1
    if kill -0 "$legacy_pid" >/dev/null 2>&1; then
      kill -9 "$legacy_pid" || true
    fi
    echo "Stopped legacy Weight Reader PID ${legacy_pid} before starting Docker service."
  fi
  rm -f "$legacy_pid_file"
fi

if docker ps --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null 2>&1; then
  echo "Weight Reader service container is already running: ${CONTAINER_NAME}"
  exit 0
fi

if docker ps -a --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null 2>&1; then
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --network host \
  -e SERVICE_CONFIG_PATH=/runtime/config.json \
  -e SERVICE_INSTANCE_DIR=/runtime/instance \
  -e SERVICE_OUTPUT_DIR=/runtime/outputs \
  -v "${SERVICE_CONFIG_PATH:?SERVICE_CONFIG_PATH is required}:/runtime/config.json:ro" \
  -v "${SERVICE_INSTANCE_DIR:-./runtime}:/runtime/instance" \
  -v "${SERVICE_OUTPUT_DIR:-./outputs}:/runtime/outputs" \
  "$IMAGE" \
  python3 /service/worker.py --loop

echo "$CONTAINER_NAME" > "${SERVICE_INSTANCE_DIR}/service.container"
rm -f "${SERVICE_INSTANCE_DIR}/service.pid"
echo "Weight Reader listener started in Docker container ${CONTAINER_NAME}."
