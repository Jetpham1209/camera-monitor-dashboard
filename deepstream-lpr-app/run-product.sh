#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.product"
DETECTED_ENV="$SCRIPT_DIR/.env.product.detected"
PREFLIGHT="$SCRIPT_DIR/scripts/jetson-preflight.sh"

if [ ! -f "$ENV_FILE" ]; then
  bash "$PREFLIGHT" --write-env "$DETECTED_ENV"
  {
    echo "HOST_REPO_ROOT=$REPO_ROOT"
    echo "LPR_CONTROL_PORT=5190"
    cat "$DETECTED_ENV"
  } > "$ENV_FILE"
else
  bash "$PREFLIGHT" --write-env "$DETECTED_ENV"
fi

read_env_file() {
  local file="$1"
  local key="$2"
  local value
  value="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
  value="${value%\"}"
  value="${value#\"}"
  printf "%s" "$value"
}

read_env() {
  local key="$1"
  local fallback="$2"
  local value
  value="$(read_env_file "$ENV_FILE" "$key")"
  if [ -z "$value" ]; then
    value="$(read_env_file "$DETECTED_ENV" "$key")"
  fi
  printf "%s" "${value:-$fallback}"
}

export HOST_REPO_ROOT="$(read_env HOST_REPO_ROOT "$REPO_ROOT")"
export LPR_CONTROL_PORT="$(read_env LPR_CONTROL_PORT "5190")"
export DEEPSTREAM_PROFILE="$(read_env DEEPSTREAM_PROFILE "unknown")"
export JETPACK_VERSION="$(read_env JETPACK_VERSION "unknown")"
export L4T_VERSION="$(read_env L4T_VERSION "unknown")"
export CUDA_VER="$(read_env CUDA_VER "12.2")"
export TENSORRT_VERSION="$(read_env TENSORRT_VERSION "unknown")"
export DEEPSTREAM_VERSION="$(read_env DEEPSTREAM_VERSION "7.0")"
export MODEL_BUILDER_IMAGE="$(read_env MODEL_BUILDER_IMAGE "deepstream-lpr-model-builder:local")"
export MODEL_BUILDER_BASE_IMAGE="$(read_env MODEL_BUILDER_BASE_IMAGE "ultralytics/ultralytics:latest-jetson-jetpack6")"
export MODEL_BUILDER_AUTO_BUILD="$(read_env MODEL_BUILDER_AUTO_BUILD "1")"
export DOCKER_RUNTIME_ARGS="$(read_env DOCKER_RUNTIME_ARGS "--runtime nvidia")"
export DEEPSTREAM_YOLO_REPO="$(read_env DEEPSTREAM_YOLO_REPO "https://github.com/marcoslucianops/DeepStream-Yolo.git")"
export DEEPSTREAM_YOLO_REF="$(read_env DEEPSTREAM_YOLO_REF "2894babce8e75c49115dbe0c7b516289ed853565")"

DEEPSTREAM_IMAGE="$(read_env DEEPSTREAM_IMAGE "camera-monitor-deepstream-runtime:local")"
DEEPSTREAM_BASE_IMAGE="$(read_env DEEPSTREAM_BASE_IMAGE "nvcr.io/nvidia/deepstream:7.0-triton-multiarch")"
PYDS_WHEEL_URL="$(read_env PYDS_WHEEL_URL "https://github.com/NVIDIA-AI-IOT/deepstream_python_apps/releases/download/v1.1.11/pyds-1.1.11-py3-none-linux_aarch64.whl")"
export DEEPSTREAM_IMAGE DEEPSTREAM_BASE_IMAGE PYDS_WHEEL_URL

if docker ps >/dev/null 2>&1; then
  docker build \
    -f "$SCRIPT_DIR/docker/deepstream-runtime.Dockerfile" \
    --build-arg "BASE_IMAGE=$DEEPSTREAM_BASE_IMAGE" \
    --build-arg "PYDS_WHEEL_URL=$PYDS_WHEEL_URL" \
    --build-arg "CUDA_VER=$CUDA_VER" \
    --build-arg "DEEPSTREAM_VERSION=$DEEPSTREAM_VERSION" \
    -t "$DEEPSTREAM_IMAGE" \
    "$SCRIPT_DIR"
  docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.product.yml" up -d --build
else
  SUDO_ENV=HOST_REPO_ROOT,LPR_CONTROL_PORT,DEEPSTREAM_PROFILE,JETPACK_VERSION,L4T_VERSION,CUDA_VER,TENSORRT_VERSION,DEEPSTREAM_VERSION,DEEPSTREAM_IMAGE,DEEPSTREAM_BASE_IMAGE,PYDS_WHEEL_URL,MODEL_BUILDER_IMAGE,MODEL_BUILDER_BASE_IMAGE,MODEL_BUILDER_AUTO_BUILD,DOCKER_RUNTIME_ARGS,DEEPSTREAM_YOLO_REPO,DEEPSTREAM_YOLO_REF
  sudo --preserve-env="$SUDO_ENV" docker build \
    -f "$SCRIPT_DIR/docker/deepstream-runtime.Dockerfile" \
    --build-arg "BASE_IMAGE=$DEEPSTREAM_BASE_IMAGE" \
    --build-arg "PYDS_WHEEL_URL=$PYDS_WHEEL_URL" \
    --build-arg "CUDA_VER=$CUDA_VER" \
    --build-arg "DEEPSTREAM_VERSION=$DEEPSTREAM_VERSION" \
    -t "$DEEPSTREAM_IMAGE" \
    "$SCRIPT_DIR"
  sudo --preserve-env="$SUDO_ENV" docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.product.yml" up -d --build
fi

echo "DeepStream LPR control UI: http://$(hostname -I | awk '{print $1}'):$LPR_CONTROL_PORT"
