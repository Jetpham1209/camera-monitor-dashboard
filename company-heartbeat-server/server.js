const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DEVICES_FILE = path.join(DATA_DIR, "devices.json");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    const rawValue = trimmed.slice(equalIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 8080);
const HEARTBEAT_SECRET = process.env.HEARTBEAT_SECRET || "";
const HEARTBEAT_TIMEOUT_MS = Number(process.env.HEARTBEAT_TIMEOUT_MS || 180000);
const HEARTBEAT_CHECK_INTERVAL_MS = Number(process.env.HEARTBEAT_CHECK_INTERVAL_MS || 30000);
const HEARTBEAT_TIME_ZONE = process.env.HEARTBEAT_TIME_ZONE || "Asia/Bangkok";
const SEND_RECOVERY_ALERT = String(process.env.SEND_RECOVERY_ALERT || "true").toLowerCase() !== "false";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_TIMEOUT_MS = Number(process.env.TELEGRAM_TIMEOUT_MS || 10000);

const app = express();
app.use(express.json({ limit: "256kb" }));

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DEVICES_FILE)) fs.writeFileSync(DEVICES_FILE, "{}\n");
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  const tempFile = `${file}.tmp`;
  await fsp.writeFile(tempFile, `${JSON.stringify(value, null, 2)}\n`);
  await fsp.rename(tempFile, file);
}

async function getDevices() {
  const devices = await readJson(DEVICES_FILE, {});
  return devices && typeof devices === "object" && !Array.isArray(devices) ? devices : {};
}

async function saveDevices(devices) {
  await writeJson(DEVICES_FILE, devices);
}

function requireSecret(req, res, next) {
  if (!HEARTBEAT_SECRET) {
    res.status(500).json({ error: "HEARTBEAT_SECRET is not configured on server." });
    return;
  }

  const auth = req.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (token !== HEARTBEAT_SECRET) {
    res.status(401).json({ error: "Unauthorized heartbeat token." });
    return;
  }

  next();
}

function normalizeDeviceId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, "-")
    .slice(0, 80);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: HEARTBEAT_TIME_ZONE
  }).format(new Date(value));
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours) return `${hours}h ${minutes % 60}m`;
  if (minutes) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram is not configured. Skipping alert:", text);
    return { skipped: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true
    })
  }).finally(() => clearTimeout(timer));

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram API ${response.status}: ${body || response.statusText}`);
  }

  return await response.json();
}

async function alertDeviceDown(device) {
  const text = [
    "Jetson heartbeat LOST",
    `Device: ${device.deviceId}`,
    `Last seen: ${formatTime(device.lastSeenAt)}`,
    `Down since: ${formatTime(device.downSince)}`,
    device.lastIp ? `IP: ${device.lastIp}` : null,
    device.app ? `App: ${device.app}` : null
  ].filter(Boolean).join("\n");

  await sendTelegramMessage(text);
}

async function alertDeviceRecovered(device) {
  const downMs = device.downSince ? new Date(device.lastSeenAt).getTime() - new Date(device.downSince).getTime() : 0;
  const text = [
    "Jetson heartbeat RECOVERED",
    `Device: ${device.deviceId}`,
    `Seen at: ${formatTime(device.lastSeenAt)}`,
    `Downtime: ${formatDuration(downMs)}`,
    device.lastIp ? `IP: ${device.lastIp}` : null,
    device.app ? `App: ${device.app}` : null
  ].filter(Boolean).join("\n");

  await sendTelegramMessage(text);
}

function publicDevice(device) {
  return {
    deviceId: device.deviceId,
    status: device.status,
    lastSeenAt: device.lastSeenAt,
    downSince: device.downSince || null,
    lastIp: device.lastIp || null,
    app: device.app || null,
    payload: device.payload || {},
    updatedAt: device.updatedAt
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "company-heartbeat-server" });
});

app.post("/api/heartbeat/:deviceId", requireSecret, async (req, res) => {
  const deviceId = normalizeDeviceId(req.params.deviceId);
  if (!deviceId) return res.status(400).json({ error: "Invalid device id." });

  const now = new Date().toISOString();
  const devices = await getDevices();
  const previous = devices[deviceId] || {};
  const wasDown = previous.status === "down";

  const device = {
    ...previous,
    deviceId,
    status: "up",
    lastSeenAt: now,
    downSince: null,
    lastIp: req.ip,
    app: typeof req.body?.app === "string" ? req.body.app : previous.app || null,
    payload: req.body && typeof req.body === "object" ? req.body : {},
    updatedAt: now
  };

  devices[deviceId] = device;
  await saveDevices(devices);

  if (wasDown && SEND_RECOVERY_ALERT) {
    alertDeviceRecovered({ ...device, downSince: previous.downSince }).catch((error) => {
      console.error(`Recovery alert failed for ${deviceId}:`, error.message);
    });
  }

  res.json({ ok: true, device: publicDevice(device) });
});

app.get("/api/devices", requireSecret, async (_req, res) => {
  const devices = await getDevices();
  res.json(Object.values(devices).map(publicDevice));
});

app.get("/api/devices/:deviceId", requireSecret, async (req, res) => {
  const deviceId = normalizeDeviceId(req.params.deviceId);
  const devices = await getDevices();
  const device = devices[deviceId];
  if (!device) return res.status(404).json({ error: "Device not found." });
  res.json(publicDevice(device));
});

async function checkDeviceTimeouts() {
  const devices = await getDevices();
  const nowMs = Date.now();
  let changed = false;

  for (const device of Object.values(devices)) {
    if (!device.lastSeenAt) continue;
    if (device.status === "down") continue;

    const lastSeenMs = new Date(device.lastSeenAt).getTime();
    if (Number.isNaN(lastSeenMs)) continue;
    if (nowMs - lastSeenMs < HEARTBEAT_TIMEOUT_MS) continue;

    device.status = "down";
    device.downSince = new Date().toISOString();
    device.updatedAt = device.downSince;
    changed = true;

    alertDeviceDown(device).catch((error) => {
      console.error(`Down alert failed for ${device.deviceId}:`, error.message);
    });
  }

  if (changed) await saveDevices(devices);
}

ensureDataFiles();
app.listen(PORT, () => {
  console.log(`Company heartbeat server: http://localhost:${PORT}`);
  console.log(`Heartbeat timeout: ${HEARTBEAT_TIMEOUT_MS}ms`);
  setInterval(() => {
    checkDeviceTimeouts().catch((error) => console.error("Timeout check failed:", error));
  }, HEARTBEAT_CHECK_INTERVAL_MS);
});
