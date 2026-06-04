#!/usr/bin/env bash
set -euo pipefail

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
IMAGE="${FRAME_CAPTURE_IMAGE:-camera-monitor-service-frame-capture:local}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to test this service." >&2
  exit 127
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker build -t "$IMAGE" .
fi

mkdir -p "${SERVICE_INSTANCE_DIR:-./runtime}" "${SERVICE_OUTPUT_DIR:-./outputs}"

docker run --rm \
  --network host \
  -e SERVICE_CONFIG_PATH=/runtime/config.json \
  -e SERVICE_INSTANCE_DIR=/runtime/instance \
  -e SERVICE_OUTPUT_DIR=/runtime/outputs \
  -v "${SERVICE_CONFIG_PATH:?SERVICE_CONFIG_PATH is required}:/runtime/config.json:ro" \
  -v "${SERVICE_INSTANCE_DIR:-./runtime}:/runtime/instance" \
  -v "${SERVICE_OUTPUT_DIR:-./outputs}:/runtime/outputs" \
  "$IMAGE" \
  python3 /service/worker.py --once
