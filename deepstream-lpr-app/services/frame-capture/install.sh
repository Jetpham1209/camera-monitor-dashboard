#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking Frame Capture service dependencies"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to build the Frame Capture service image." >&2
  exit 1
fi

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
IMAGE="${FRAME_CAPTURE_IMAGE:-camera-monitor-service-frame-capture:local}"

docker build -t "$IMAGE" .

mkdir -p "${SERVICE_OUTPUT_DIR:-./outputs}"
echo "Frame Capture Docker image is ready: ${IMAGE}"
