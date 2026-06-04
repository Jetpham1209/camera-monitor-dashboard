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
export MODEL_BUILDER_FORCE_BUILD="$(read_env MODEL_BUILDER_FORCE_BUILD "0")"
export DOCKER_RUNTIME_ARGS="$(read_env DOCKER_RUNTIME_ARGS "--runtime nvidia")"
export DEEPSTREAM_YOLO_REPO="$(read_env DEEPSTREAM_YOLO_REPO "https://github.com/marcoslucianops/DeepStream-Yolo.git")"
export DEEPSTREAM_YOLO_REF="$(read_env DEEPSTREAM_YOLO_REF "2894babce8e75c49115dbe0c7b516289ed853565")"
export TRITON_IMAGE="$(read_env TRITON_IMAGE "nvcr.io/nvidia/tritonserver:24.03-py3-igpu")"
export TRITON_CONTAINER_NAME="$(read_env TRITON_CONTAINER_NAME "jetson-triton-server")"
export TRITON_HTTP_PORT="$(read_env TRITON_HTTP_PORT "8010")"
export TRITON_GRPC_PORT="$(read_env TRITON_GRPC_PORT "8011")"
export TRITON_METRICS_PORT="$(read_env TRITON_METRICS_PORT "8012")"
export AGENT_ENABLED="$(read_env AGENT_ENABLED "1")"
export AGENT_PROVIDER="$(read_env AGENT_PROVIDER "openai")"
export AGENT_MODEL="$(read_env AGENT_MODEL "gpt-4.1-mini")"
export AGENT_TEMPERATURE="$(read_env AGENT_TEMPERATURE "")"
export AGENT_MAX_TOKENS="$(read_env AGENT_MAX_TOKENS "")"
export AGENT_TOP_P="$(read_env AGENT_TOP_P "")"
export AGENT_REASONING_EFFORT="$(read_env AGENT_REASONING_EFFORT "")"
export AGENT_BASE_URL="$(read_env AGENT_BASE_URL "")"
export AGENT_TIME_ZONE="$(read_env AGENT_TIME_ZONE "Asia/Bangkok")"
export AGENT_MEMORY_FILE="$(read_env AGENT_MEMORY_FILE "runtime/agent-memory.json")"
export AGENT_SETTINGS_FILE="$(read_env AGENT_SETTINGS_FILE "runtime/agent-settings.json")"
export AGENT_SKILLS_DIR="$(read_env AGENT_SKILLS_DIR "agent-skills")"
export OPENAI_API_KEY="$(read_env OPENAI_API_KEY "")"
export FRAME_CAPTURE_IMAGE="$(read_env FRAME_CAPTURE_IMAGE "camera-monitor-service-frame-capture:local")"

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
  docker build \
    -t "$FRAME_CAPTURE_IMAGE" \
    "$SCRIPT_DIR/services/frame-capture"
  docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.product.yml" up -d --build
else
  SUDO_ENV=HOST_REPO_ROOT,LPR_CONTROL_PORT,DEEPSTREAM_PROFILE,JETPACK_VERSION,L4T_VERSION,CUDA_VER,TENSORRT_VERSION,DEEPSTREAM_VERSION,DEEPSTREAM_IMAGE,DEEPSTREAM_BASE_IMAGE,PYDS_WHEEL_URL,MODEL_BUILDER_IMAGE,MODEL_BUILDER_BASE_IMAGE,MODEL_BUILDER_AUTO_BUILD,MODEL_BUILDER_FORCE_BUILD,DOCKER_RUNTIME_ARGS,DEEPSTREAM_YOLO_REPO,DEEPSTREAM_YOLO_REF,TRITON_IMAGE,TRITON_CONTAINER_NAME,TRITON_HTTP_PORT,TRITON_GRPC_PORT,TRITON_METRICS_PORT,AGENT_ENABLED,AGENT_PROVIDER,AGENT_MODEL,AGENT_TEMPERATURE,AGENT_MAX_TOKENS,AGENT_TOP_P,AGENT_REASONING_EFFORT,AGENT_BASE_URL,AGENT_TIME_ZONE,AGENT_MEMORY_FILE,AGENT_SETTINGS_FILE,AGENT_SKILLS_DIR,OPENAI_API_KEY,FRAME_CAPTURE_IMAGE
  sudo --preserve-env="$SUDO_ENV" docker build \
    -f "$SCRIPT_DIR/docker/deepstream-runtime.Dockerfile" \
    --build-arg "BASE_IMAGE=$DEEPSTREAM_BASE_IMAGE" \
    --build-arg "PYDS_WHEEL_URL=$PYDS_WHEEL_URL" \
    --build-arg "CUDA_VER=$CUDA_VER" \
    --build-arg "DEEPSTREAM_VERSION=$DEEPSTREAM_VERSION" \
    -t "$DEEPSTREAM_IMAGE" \
    "$SCRIPT_DIR"
  sudo --preserve-env="$SUDO_ENV" docker build \
    -t "$FRAME_CAPTURE_IMAGE" \
    "$SCRIPT_DIR/services/frame-capture"
  sudo --preserve-env="$SUDO_ENV" docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.product.yml" up -d --build
fi

echo "DeepStream LPR control UI: http://$(hostname -I | awk '{print $1}'):$LPR_CONTROL_PORT"
