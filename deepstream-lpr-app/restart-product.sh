#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.product"
RUNTIME_DIR="$SCRIPT_DIR/runtime"
RUNTIME_COMPOSE="$RUNTIME_DIR/docker-compose.generated.yml"
PRODUCT_COMPOSE="$SCRIPT_DIR/docker-compose.product.yml"
STATUS_FILE="$RUNTIME_DIR/status.json"

echo "==> Restarting DeepStream product stack"
echo "==> Repo: $REPO_ROOT"

docker_cmd() {
  if docker ps >/dev/null 2>&1; then
    docker "$@"
  else
    sudo docker "$@"
  fi
}

compose_cmd() {
  if docker ps >/dev/null 2>&1; then
    docker compose "$@"
  else
    sudo docker compose "$@"
  fi
}

write_stopped_status() {
  mkdir -p "$RUNTIME_DIR"
  local tmp
  tmp="$(mktemp)"
  cat > "$tmp" <<JSON
{
  "state": "stopped",
  "message": "DeepStream runtime was reset by restart-product.sh.",
  "containerRunning": false,
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "sources": []
}
JSON
  if cp "$tmp" "$STATUS_FILE" 2>/dev/null; then
    :
  else
    sudo cp "$tmp" "$STATUS_FILE"
  fi
  rm -f "$tmp"
}

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing $ENV_FILE. Run bash deepstream-lpr-app/run-product.sh or install.sh first." >&2
  exit 1
fi

cd "$REPO_ROOT"

echo "==> Stop DeepStream runtime container"
if [ -f "$RUNTIME_COMPOSE" ]; then
  compose_cmd -f "$RUNTIME_COMPOSE" down --remove-orphans || true
fi
docker_cmd rm -f deepstream-lpr >/dev/null 2>&1 || true
write_stopped_status

echo "==> Restart control dashboard container"
compose_cmd --env-file "$ENV_FILE" -f "$PRODUCT_COMPOSE" up -d --force-recreate deepstream-lpr-control

echo "==> Current containers"
docker_cmd ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E 'deepstream-lpr|camera-monitor' || true

HOST_IP="$(hostname -I | awk '{print $1}')"
PORT="$(grep -E '^LPR_CONTROL_PORT=' "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d= -f2-)"
PORT="${PORT:-5190}"
echo "==> Done"
echo "==> Dashboard: http://${HOST_IP}:${PORT}"
