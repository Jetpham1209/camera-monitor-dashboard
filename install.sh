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

run_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command_exists sudo; then
    sudo "$@"
  else
    fail "This step needs root permission. Please install sudo or run this script as root."
  fi
}

install_node_ubuntu() {
  info "Node.js is missing. Installing Node.js $MIN_NODE_MAJOR on Ubuntu/Debian."
  command_exists apt-get || return 1

  run_as_root apt-get update
  run_as_root apt-get install -y ca-certificates curl gnupg
  run_as_root install -d -m 0755 /etc/apt/keyrings
  run_as_root rm -f /etc/apt/keyrings/nodesource.gpg

  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | run_as_root gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

  NODE_MAJOR_VERSION="$MIN_NODE_MAJOR"
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR_VERSION}.x nodistro main" | run_as_root tee /etc/apt/sources.list.d/nodesource.list >/dev/null

  run_as_root apt-get update
  run_as_root apt-get install -y nodejs
}

ensure_node() {
  if command_exists node && command_exists npm && [ "$(get_node_major)" -ge "$MIN_NODE_MAJOR" ]; then
    return
  fi

  if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    case "${ID:-}" in
      ubuntu|debian|linuxmint)
        install_node_ubuntu || fail "Could not install Node.js automatically."
        ;;
      *)
        fail "Node.js is not installed. Please install Node.js $MIN_NODE_MAJOR or newer, then run this script again."
        ;;
    esac
  else
    fail "Node.js is not installed. Please install Node.js $MIN_NODE_MAJOR or newer, then run this script again."
  fi
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

ensure_node

NODE_MAJOR="$(get_node_major)"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node.js $MIN_NODE_MAJOR or newer is required. Current major version: $NODE_MAJOR. Automatic install did not complete."
fi

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp ".env.example" ".env"
    info "Created .env from .env.example"
  else
    cat > ".env" <<'EOF'
PORT=5174
CHECK_INTERVAL_MS=1000
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

node <<'NODE'
const fs = require("fs");
const file = ".env";
const required = {
  CHECK_INTERVAL_MS: "1000"
};
let content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
for (const [key, value] of Object.entries(required)) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = `${content.trimEnd()}\n${line}\n`;
  }
}
fs.writeFileSync(file, content);
NODE
info "Ensured CHECK_INTERVAL_MS=1000"

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
info "Starting server with PM2. The process will auto-restart if it crashes."

if npx pm2 describe camera-monitor-dashboard >/dev/null 2>&1; then
  npx pm2 restart camera-monitor-dashboard --update-env
else
  npx pm2 start ecosystem.config.cjs --update-env
fi

npx pm2 save >/dev/null 2>&1 || true

info "Server is running in the background."
info "View logs: npx pm2 logs camera-monitor-dashboard"
info "Restart: npx pm2 restart camera-monitor-dashboard --update-env"
info "Stop: npx pm2 stop camera-monitor-dashboard"
info "Optional reboot startup: npx pm2 startup"
