#!/usr/bin/env sh
set -eu

APP_NAME="Camera Monitor Dashboard"
MIN_NODE_MAJOR=20

cd "$(dirname "$0")"

info() {
  printf '%s\n' "==> $*"
}

fail() {
  printf '%s\n' "ERROR: $*" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

get_node_major() {
  node -p "Number(process.versions.node.split('.')[0])"
}

get_lan_ip() {
  if command_exists hostname; then
    hostname -I 2>/dev/null | awk '{print $1}' || true
  elif command_exists ipconfig; then
    ipconfig getifaddr en0 2>/dev/null || true
  else
    true
  fi
}

info "Starting $APP_NAME setup"

command_exists node || fail "Node.js is not installed. Please install Node.js $MIN_NODE_MAJOR or newer, then run this script again."
command_exists npm || fail "npm is not installed. Please install npm, then run this script again."

NODE_MAJOR="$(get_node_major)"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node.js $MIN_NODE_MAJOR or newer is required. Current major version: $NODE_MAJOR."
fi

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp ".env.example" ".env"
    info "Created .env from .env.example"
  else
    cat > ".env" <<'EOF'
PORT=5174
CHECK_INTERVAL_MS=15000
PROBE_TIMEOUT_MS=10000
PING_TIMEOUT_MS=3000
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_TIME_ZONE=Asia/Bangkok
TELEGRAM_TIMEOUT_MS=10000
EOF
    info "Created default .env"
  fi
else
  info ".env already exists"
fi

mkdir -p data
[ -f "data/cameras.json" ] || printf '%s\n' "[]" > "data/cameras.json"
[ -f "data/state.json" ] || printf '%s\n' "{}" > "data/state.json"

if [ -f "package-lock.json" ]; then
  info "Installing dependencies with npm ci"
  npm ci
else
  info "Installing dependencies with npm install"
  npm install
fi

PORT="$(node -e "require('fs').readFileSync('.env','utf8').split(/\\r?\\n/).forEach(line=>{const m=line.match(/^PORT=(.*)$/);if(m) process.stdout.write(m[1].trim())})" 2>/dev/null || true)"
[ -n "$PORT" ] || PORT=5174
LAN_IP="$(get_lan_ip)"

info "Setup complete"
info "Local URL: http://localhost:$PORT"
if [ -n "$LAN_IP" ]; then
  info "LAN URL: http://$LAN_IP:$PORT"
fi
info "Starting server. Press Ctrl+C to stop."

npm start
