const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const { randomUUID } = require("crypto");
const { WebSocketServer } = require("ws");
const ffmpegPath = require("ffmpeg-static");

const ROOT = __dirname;

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

const PORT = Number(process.env.PORT || 5174);
const CHECK_INTERVAL_MS = Number(process.env.CHECK_INTERVAL_MS || 15000);
const PROBE_TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS || 10000);
const PING_TIMEOUT_MS = Number(process.env.PING_TIMEOUT_MS || 3000);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_TIME_ZONE = process.env.TELEGRAM_TIME_ZONE || "Asia/Bangkok";
const TELEGRAM_TIMEOUT_MS = Number(process.env.TELEGRAM_TIMEOUT_MS || 10000);

const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");
const HLS_DIR = path.join(DATA_DIR, "hls");
const CAPTURE_DIR = path.join(DATA_DIR, "captures");
const CAMERAS_FILE = path.join(DATA_DIR, "cameras.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const streamProcesses = new Map();
let checkTimer = null;
let isChecking = false;

function newId(length = 10) {
  return randomUUID().replace(/-/g, "").slice(0, length);
}

function ensureDirectories() {
  for (const dir of [DATA_DIR, PUBLIC_DIR, HLS_DIR, CAPTURE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(CAMERAS_FILE)) fs.writeFileSync(CAMERAS_FILE, "[]\n");
  if (!fs.existsSync(STATE_FILE)) fs.writeFileSync(STATE_FILE, "{}\n");
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

async function getCameras() {
  const cameras = await readJson(CAMERAS_FILE, []);
  return Array.isArray(cameras) ? cameras : [];
}

async function saveCameras(cameras) {
  await writeJson(CAMERAS_FILE, cameras);
}

async function getState() {
  return await readJson(STATE_FILE, {});
}

async function saveState(state) {
  await writeJson(STATE_FILE, state);
}

async function listCaptures(cameraId, limit = 20) {
  const dir = path.join(CAPTURE_DIR, cameraId);
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const captures = await Promise.all(entries
      .filter((entry) => entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(dir, entry.name);
        const stats = await fsp.stat(filePath);
        return {
          fileName: entry.name,
          url: `/captures/${cameraId}/${entry.name}`,
          createdAt: stats.mtime.toISOString()
        };
      }));
    return captures.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  } catch {
    return [];
  }
}

function normalizeCamera(input, existing = {}) {
  const name = String(input.name || existing.name || "").trim();
  const rtspUrl = String(input.rtspUrl || existing.rtspUrl || "").trim();
  const enabled = input.enabled === undefined ? existing.enabled !== false : Boolean(input.enabled);
  const checkIntervalSec = Number(input.checkIntervalSec || existing.checkIntervalSec || 15);

  if (!name) throw new Error("Tên camera là bắt buộc.");
  if (!/^rtsps?:\/\//i.test(rtspUrl)) throw new Error("RTSP URL phải bắt đầu bằng rtsp:// hoặc rtsps://.");

  return {
    ...existing,
    name,
    rtspUrl,
    enabled,
    checkIntervalSec: Math.max(5, Math.min(300, checkIntervalSec))
  };
}

function summarizeOutages(cameraId, cameraState) {
  const outages = Array.isArray(cameraState.outages) ? cameraState.outages : [];
  const openOutage = cameraState.status === "offline" && cameraState.offlineSince
    ? [{
        id: `open-${cameraId}`,
        startedAt: cameraState.offlineSince,
        endedAt: null,
        durationSec: Math.max(0, Math.floor((Date.now() - new Date(cameraState.offlineSince).getTime()) / 1000))
      }]
    : [];
  return [...openOutage, ...outages].slice(0, 50);
}

async function getDashboardData() {
  const [cameras, state] = await Promise.all([getCameras(), getState()]);
  const activeStreams = new Set(streamProcesses.keys());

  return await Promise.all(cameras.map(async (camera) => {
    const cameraState = state[camera.id] || {};
    return {
      ...camera,
      rtspUrlMasked: maskUrl(camera.rtspUrl),
      status: cameraState.status || "unknown",
      lastCheckedAt: cameraState.lastCheckedAt || null,
      lastOnlineAt: cameraState.lastOnlineAt || null,
      lastOfflineAt: cameraState.lastOfflineAt || null,
      offlineSince: cameraState.offlineSince || null,
      lastError: cameraState.lastError || null,
      outages: summarizeOutages(camera.id, cameraState),
      captures: await listCaptures(camera.id),
      streaming: activeStreams.has(camera.id),
      streamUrl: `/hls/${camera.id}/index.m3u8`
    };
  }));
}

function maskUrl(value) {
  try {
    const url = new URL(value);
    if (url.username) url.username = "user";
    if (url.password) url.password = "pass";
    return url.toString();
  } catch {
    return value;
  }
}

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(message);
  }
}

async function broadcastDashboard() {
  broadcast({ type: "dashboard", cameras: await getDashboardData() });
}

function formatTelegramTime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: TELEGRAM_TIME_ZONE
  }).format(new Date(value));
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { skipped: true };

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

async function notifyCameraOffline(camera, offlineAt) {
  const message = [
    "Camera bi ngat ket noi",
    `Ten camera: ${camera.name}`,
    `Thoi gian ngat ket noi: ${formatTelegramTime(offlineAt)}`
  ].join("\n");

  try {
    await sendTelegramMessage(message);
    return { ok: true, sentAt: new Date().toISOString(), error: null };
  } catch (error) {
    console.error(`Telegram notification failed for camera ${camera.id}:`, error.message);
    return { ok: false, sentAt: null, error: error.message };
  }
}

function getCameraHost(rtspUrl) {
  try {
    return new URL(rtspUrl).hostname;
  } catch {
    return "";
  }
}

function getPingArgs(host) {
  if (process.platform === "win32") {
    return ["-n", "1", "-w", String(PING_TIMEOUT_MS), host];
  }

  return ["-c", "1", "-W", String(Math.max(1, Math.ceil(PING_TIMEOUT_MS / 1000))), host];
}

function probeCamera(rtspUrl) {
  return new Promise((resolve) => {
    const host = getCameraHost(rtspUrl);
    if (!host) {
      resolve({ ok: false, error: "Không đọc được địa chỉ host từ RTSP URL." });
      return;
    }

    const child = spawn("ping", getPingArgs(host), { windowsHide: true });
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ ok: false, error: `Ping ${host} timeout sau ${Math.round(PING_TIMEOUT_MS / 1000)}s` });
    }, PING_TIMEOUT_MS + 1000);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: error.message });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        resolve({ ok: false, error: stderr.trim() || `Ping ${host} thất bại với mã ${code}` });
        return;
      }

      resolve({ ok: true, error: null });
    });
  });
}

async function checkAllCameras(options = {}) {
  if (isChecking) return;
  isChecking = true;
  const forceIds = options.forceIds || new Set();

  try {
    const cameras = await getCameras();
    const state = await getState();
    let changed = false;

    for (const camera of cameras) {
      if (!camera.enabled) continue;

      const now = new Date().toISOString();
      const current = state[camera.id] || { status: "unknown", outages: [] };
      const intervalMs = Math.max(5, Number(camera.checkIntervalSec || 15)) * 1000;
      const lastCheckedMs = current.lastCheckedAt ? new Date(current.lastCheckedAt).getTime() : 0;
      if (!forceIds.has(camera.id) && lastCheckedMs && Date.now() - lastCheckedMs < intervalMs) continue;

      const result = await probeCamera(camera.rtspUrl);
      const previousStatus = current.status || "unknown";
      const nextStatus = result.ok ? "online" : "offline";

      current.status = nextStatus;
      current.lastCheckedAt = now;
      current.lastError = result.ok ? null : result.error;

      if (nextStatus === "online") {
        current.lastOnlineAt = now;
        if (previousStatus === "offline" && current.offlineSince) {
          const startedAt = current.offlineSince;
          const endedAt = now;
          const durationSec = Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
          current.outages = [
            { id: newId(8), startedAt, endedAt, durationSec },
            ...(Array.isArray(current.outages) ? current.outages : [])
          ].slice(0, 100);
        }
        current.offlineSince = null;
      } else {
        current.lastOfflineAt = now;
        if (previousStatus !== "offline" || !current.offlineSince) {
          current.offlineSince = now;
          const telegramResult = await notifyCameraOffline(camera, now);
          current.lastTelegramOfflineNotificationAt = telegramResult.sentAt;
          current.lastTelegramOfflineNotificationError = telegramResult.error;
        }
      }

      state[camera.id] = current;
      changed = true;
    }

    if (changed) {
      await saveState(state);
      await broadcastDashboard();
    }
  } finally {
    isChecking = false;
  }
}

async function removeDirectoryContents(dir) {
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
}

async function findCamera(cameraId) {
  const cameras = await getCameras();
  return cameras.find((camera) => camera.id === cameraId);
}

async function startStream(camera) {
  if (streamProcesses.has(camera.id)) return;

  const outputDir = path.join(HLS_DIR, camera.id);
  await removeDirectoryContents(outputDir);
  const playlistPath = path.join(outputDir, "index.m3u8");
  const segmentPath = path.join(outputDir, "segment_%05d.ts");

  const args = [
    "-hide_banner",
    "-loglevel", "warning",
    "-rtsp_transport", "tcp",
    "-i", camera.rtspUrl,
    "-an",
    "-c:v", "copy",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "6",
    "-hls_flags", "delete_segments+omit_endlist",
    "-hls_segment_filename", segmentPath,
    playlistPath
  ];

  const child = spawn(ffmpegPath, args, { windowsHide: true });
  const record = { child, startedAt: new Date().toISOString(), lastLog: "" };
  streamProcesses.set(camera.id, record);

  child.stderr.on("data", (chunk) => {
    record.lastLog = chunk.toString().trim().slice(-500);
  });

  child.on("close", async () => {
    streamProcesses.delete(camera.id);
    await broadcastDashboard();
  });

  child.on("error", async (error) => {
    record.lastLog = error.message;
    streamProcesses.delete(camera.id);
    await broadcastDashboard();
  });
}

function stopStream(cameraId) {
  const record = streamProcesses.get(cameraId);
  if (!record) return false;
  record.child.kill("SIGKILL");
  streamProcesses.delete(cameraId);
  return true;
}

async function captureFrame(camera) {
  const dir = path.join(CAPTURE_DIR, camera.id);
  await fsp.mkdir(dir, { recursive: true });
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
  const filePath = path.join(dir, fileName);
  const publicUrl = `/captures/${camera.id}/${fileName}`;

  await new Promise((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-y",
      "-rtsp_transport", "tcp",
      "-i", camera.rtspUrl,
      "-frames:v", "1",
      "-q:v", "2",
      filePath
    ];
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Capture timeout sau ${Math.round(PROBE_TIMEOUT_MS / 1000)}s`));
    }, PROBE_TIMEOUT_MS);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(filePath)) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg thoát với mã ${code}`));
    });
  });

  return { fileName, url: publicUrl, createdAt: new Date().toISOString() };
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/hls", express.static(HLS_DIR, {
  setHeaders(res) {
    res.setHeader("Cache-Control", "no-store");
  }
}));
app.use("/captures", express.static(CAPTURE_DIR));
app.get("/vendor/hls.min.js", (_req, res) => {
  res.sendFile(path.join(ROOT, "node_modules", "hls.js", "dist", "hls.min.js"));
});
app.get("/vendor/lucide.min.js", (_req, res) => {
  res.sendFile(path.join(ROOT, "node_modules", "lucide", "dist", "umd", "lucide.min.js"));
});

app.get("/api/cameras", async (_req, res) => {
  res.json(await getDashboardData());
});

app.post("/api/cameras", async (req, res) => {
  try {
    const cameras = await getCameras();
    const camera = normalizeCamera(req.body);
    camera.id = newId(10);
    camera.createdAt = new Date().toISOString();
    cameras.push(camera);
    await saveCameras(cameras);
    await broadcastDashboard();
    setTimeout(() => checkAllCameras({ forceIds: new Set([camera.id]) }), 250);
    res.status(201).json(camera);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/cameras/:id", async (req, res) => {
  try {
    const cameras = await getCameras();
    const index = cameras.findIndex((camera) => camera.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Không tìm thấy camera." });
    const camera = normalizeCamera(req.body, cameras[index]);
    cameras[index] = camera;
    await saveCameras(cameras);
    stopStream(camera.id);
    await broadcastDashboard();
    setTimeout(() => checkAllCameras({ forceIds: new Set([camera.id]) }), 250);
    res.json(camera);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/cameras/:id", async (req, res) => {
  const cameras = await getCameras();
  const next = cameras.filter((camera) => camera.id !== req.params.id);
  if (next.length === cameras.length) return res.status(404).json({ error: "Không tìm thấy camera." });
  await saveCameras(next);
  const state = await getState();
  delete state[req.params.id];
  await saveState(state);
  stopStream(req.params.id);
  await fsp.rm(path.join(HLS_DIR, req.params.id), { recursive: true, force: true });
  await fsp.rm(path.join(CAPTURE_DIR, req.params.id), { recursive: true, force: true });
  await broadcastDashboard();
  res.status(204).end();
});

app.post("/api/cameras/:id/check", async (req, res) => {
  const camera = await findCamera(req.params.id);
  if (!camera) return res.status(404).json({ error: "Không tìm thấy camera." });
  await checkAllCameras({ forceIds: new Set([camera.id]) });
  res.json((await getDashboardData()).find((item) => item.id === camera.id));
});

app.post("/api/cameras/:id/stream/start", async (req, res) => {
  try {
    const camera = await findCamera(req.params.id);
    if (!camera) return res.status(404).json({ error: "Không tìm thấy camera." });
    await startStream(camera);
    await broadcastDashboard();
    res.json({ streamUrl: `/hls/${camera.id}/index.m3u8` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/cameras/:id/stream/stop", async (req, res) => {
  stopStream(req.params.id);
  await broadcastDashboard();
  res.json({ ok: true });
});

app.get("/api/cameras/:id/stream/status", (req, res) => {
  const record = streamProcesses.get(req.params.id);
  res.json(record ? { running: true, startedAt: record.startedAt, lastLog: record.lastLog } : { running: false });
});

app.post("/api/cameras/:id/capture", async (req, res) => {
  try {
    const camera = await findCamera(req.params.id);
    if (!camera) return res.status(404).json({ error: "Không tìm thấy camera." });
    res.json(await captureFrame(camera));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

process.on("SIGINT", () => {
  for (const cameraId of streamProcesses.keys()) stopStream(cameraId);
  process.exit(0);
});

ensureDirectories();
server.listen(PORT, () => {
  console.log(`Camera monitor dashboard: http://localhost:${PORT}`);
  checkAllCameras();
  checkTimer = setInterval(checkAllCameras, CHECK_INTERVAL_MS);
});
