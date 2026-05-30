#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking Frame Capture service dependencies"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required." >&2
  exit 1
fi

if python3 - <<'PY' >/dev/null 2>&1
import cv2
PY
then
  echo "OpenCV is available."
elif command -v ffmpeg >/dev/null 2>&1; then
  echo "OpenCV is not available; ffmpeg fallback is available."
else
  echo "Neither OpenCV nor ffmpeg is available. Install python3-opencv or ffmpeg." >&2
  exit 1
fi

mkdir -p "${SERVICE_OUTPUT_DIR:-./outputs}"
echo "Frame Capture service is ready."
