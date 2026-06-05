#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to build the Weight Reader service image." >&2
  exit 1
fi

cd "${SERVICE_PACKAGE_DIR:-$(dirname "$0")}"
IMAGE="${WEIGHT_READER_IMAGE:-camera-monitor-service-weight-reader:local}"
docker build -t "$IMAGE" .

mkdir -p "${SERVICE_OUTPUT_DIR:-./outputs}"
echo "Weight Reader Docker image is ready: ${IMAGE}"
