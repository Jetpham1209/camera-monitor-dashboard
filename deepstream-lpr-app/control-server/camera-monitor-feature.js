const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");
const { WebSocketServer } = require("ws");

function createCameraMonitorFeature({
  app,
  server,
  repoRoot,
  basePath = "/camera-monitor",
  ffmpegPath = "ffmpeg",
  publicDir = path.join(repoRoot, "public"),
  nodeModulesDir = path.join(repoRoot, "node_modules")
}) {
  const dataDir = path.join(repoRoot, "data");
  const hlsDir = path.join(dataDir, "hls");
  const captureDir = path.join(dataDir, "captures");
  const camerasFile = path.join(dataDir, "cameras.json");
  const stateFile = path.join(dataDir, "state.json");
  const settingsFile = path.join(dataDir, "settings.json");
  const checkIntervalMs = Number(process.env.CHECK_INTERVAL_MS || 1000);
  const probeTimeoutMs = Number(process.env.PROBE_TIMEOUT_MS || 10000);
  const pingTimeoutMs = Number(process.env.PING_TIMEOUT_MS || 3000);
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || "";
  const telegramTimeZone = process.env.TELEGRAM_TIME_ZONE || "Asia/Bangkok";
  const telegramTimeoutMs = Number(process.env.TELEGRAM_TIMEOUT_MS || 10000);
  const streamProcesses = new Map();
  const router = express.Router();
  const wss = new WebSocketServer({ server, path: `${basePath}/ws` });
  let checkTimer = null;
  let isChecking = false;

  function newId(length = 10) {
    return randomUUID().replace(/-/g, "").slice(0, length);
  }

  function publicPath(segment = "") {
    return `${basePath}${segment}`;
  }

  function ensureDirectories() {
    for (const dir of [dataDir, publicDir, hlsDir, captureDir]) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(camerasFile)) fs.writeFileSync(camerasFile, "[]\n");
    if (!fs.existsSync(stateFile)) fs.writeFileSync(stateFile, "{}\n");
    if (!fs.existsSync(settingsFile)) fs.writeFileSync(settingsFile, "{}\n");
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
    const cameras = await readJson(camerasFile, []);
    return Array.isArray(cameras) ? cameras : [];
  }

  async function getState() {
    return await readJson(stateFile, {});
  }

  async function getSettings() {
    const settings = await readJson(settingsFile, {});
    return settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  }

  async function getTelegramSettings() {
    const settings = await getSettings();
    return {
      botToken: String(settings.telegram?.botToken || telegramBotToken || "").trim(),
      chatId: String(settings.telegram?.chatId || telegramChatId || "").trim(),
      timeZone: String(settings.telegram?.timeZone || telegramTimeZone || "Asia/Bangkok").trim(),
      timeoutMs: Number(settings.telegram?.timeoutMs || telegramTimeoutMs || 10000)
    };
  }

  function maskSecret(value) {
    if (!value) return "";
    if (value.length <= 8) return "********";
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
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

  async function getTelegramPublicSettings() {
    const telegram = await getTelegramSettings();
    return {
      connected: Boolean(telegram.botToken && telegram.chatId),
      botTokenMasked: maskSecret(telegram.botToken),
      chatId: telegram.chatId,
      timeZone: telegram.timeZone,
      timeoutMs: telegram.timeoutMs
    };
  }

  async function saveTelegramSettings(input = {}) {
    const settings = await getSettings();
    const current = await getTelegramSettings();
    const botTokenInput = input.botToken === undefined ? current.botToken : String(input.botToken || "").trim();
    const botToken = botTokenInput || current.botToken;
    const chatId = String(input.chatId || current.chatId || "").trim();
    const timeZone = String(input.timeZone || current.timeZone || "Asia/Bangkok").trim();
    const timeoutMs = Math.max(1000, Math.min(60000, Number(input.timeoutMs || current.timeoutMs || 10000)));
    if (!botToken) throw new Error("Telegram bot token is required.");
    if (!chatId) throw new Error("Telegram chat id is required.");
    try {
      new Intl.DateTimeFormat("vi-VN", { timeZone }).format(new Date());
    } catch {
      throw new Error("Telegram timezone is invalid.");
    }
    settings.telegram = { botToken, chatId, timeZone, timeoutMs };
    await writeJson(settingsFile, settings);
    return await getTelegramPublicSettings();
  }

  async function listCaptures(cameraId, limit = 20) {
    const dir = path.join(captureDir, cameraId);
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      const captures = await Promise.all(entries
        .filter((entry) => entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name))
        .map(async (entry) => {
          const filePath = path.join(dir, entry.name);
          const stat = await fsp.stat(filePath);
          return {
            fileName: entry.name,
            url: publicPath(`/captures/${cameraId}/${entry.name}`),
            createdAt: stat.mtime.toISOString()
          };
        }));
      return captures.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
    } catch {
      return [];
    }
  }

  function normalizeCamera(input = {}, existing = {}) {
    const name = String(input.name || existing.name || "").trim();
    const rtspUrl = String(input.rtspUrl || existing.rtspUrl || "").trim();
    const enabled = input.enabled === undefined ? existing.enabled !== false : Boolean(input.enabled);
    const checkIntervalSec = Number(input.checkIntervalSec || existing.checkIntervalSec || 1);
    if (!name) throw new Error("Camera name is required.");
    if (!/^rtsps?:\/\//i.test(rtspUrl)) throw new Error("RTSP URL must start with rtsp:// or rtsps://.");
    return {
      ...existing,
      name,
      rtspUrl,
      enabled,
      checkIntervalSec: Math.max(1, Math.min(300, checkIntervalSec))
    };
  }

  function summarizeOutages(cameraId, cameraState = {}) {
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
        streamUrl: publicPath(`/hls/${camera.id}/index.m3u8`)
      };
    }));
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

  function formatTelegramTime(value, timeZone) {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone
    }).format(new Date(value));
  }

  async function sendTelegramMessage(text) {
    const telegram = await getTelegramSettings();
    if (!telegram.botToken || !telegram.chatId) return { skipped: true };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), telegram.timeoutMs);
    const response = await fetch(`https://api.telegram.org/bot${telegram.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: telegram.chatId,
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
    const telegram = await getTelegramSettings();
    const message = [
      "Camera bi ngat ket noi",
      `Ten camera: ${camera.name}`,
      `Thoi gian ngat ket noi: ${formatTelegramTime(offlineAt, telegram.timeZone)}`
    ].join("\n");
    try {
      await sendTelegramMessage(message);
      return { ok: true, sentAt: new Date().toISOString(), error: null };
    } catch (error) {
      console.error(`Monitor Telegram notification failed for camera ${camera.id}:`, error.message);
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
    if (process.platform === "win32") return ["-n", "1", "-w", String(pingTimeoutMs), host];
    return ["-c", "1", "-W", String(Math.max(1, Math.ceil(pingTimeoutMs / 1000))), host];
  }

  function probeCamera(rtspUrl) {
    return new Promise((resolve) => {
      const host = getCameraHost(rtspUrl);
      if (!host) {
        resolve({ ok: false, error: "Cannot read camera host from RTSP URL." });
        return;
      }
      const child = spawn("ping", getPingArgs(host), { windowsHide: true });
      let stderr = "";
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGKILL");
        resolve({ ok: false, error: `Ping ${host} timeout after ${Math.round(pingTimeoutMs / 1000)}s.` });
      }, pingTimeoutMs + 1000);
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
        resolve(code === 0
          ? { ok: true, error: null }
          : { ok: false, error: stderr.trim() || `Ping ${host} failed with code ${code}.` });
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
        const intervalMs = Math.max(1, Number(camera.checkIntervalSec || 1)) * 1000;
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
            const durationSec = Math.max(0, Math.floor((new Date(now).getTime() - new Date(startedAt).getTime()) / 1000));
            current.outages = [{ id: newId(8), startedAt, endedAt: now, durationSec }, ...(current.outages || [])].slice(0, 100);
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
        await writeJson(stateFile, state);
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
    return (await getCameras()).find((camera) => camera.id === cameraId);
  }

  async function startStream(camera) {
    if (streamProcesses.has(camera.id)) return;
    const outputDir = path.join(hlsDir, camera.id);
    await removeDirectoryContents(outputDir);
    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPath = path.join(outputDir, "segment_%05d.ts");
    const child = spawn(ffmpegPath, [
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
    ], { windowsHide: true });
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
    const dir = path.join(captureDir, camera.id);
    await fsp.mkdir(dir, { recursive: true });
    const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
    const filePath = path.join(dir, fileName);
    await new Promise((resolve, reject) => {
      const child = spawn(ffmpegPath, [
        "-hide_banner",
        "-loglevel", "error",
        "-y",
        "-rtsp_transport", "tcp",
        "-i", camera.rtspUrl,
        "-frames:v", "1",
        "-q:v", "2",
        filePath
      ], { windowsHide: true });
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`Capture timeout after ${Math.round(probeTimeoutMs / 1000)}s.`));
      }, probeTimeoutMs);
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
        else reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}.`));
      });
    });
    return {
      fileName,
      url: publicPath(`/captures/${camera.id}/${fileName}`),
      createdAt: new Date().toISOString()
    };
  }

  router.use(express.json({ limit: "1mb" }));
  router.use(express.static(publicDir));
  router.use("/hls", express.static(hlsDir, {
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-store");
    }
  }));
  router.use("/captures", express.static(captureDir));
  router.get("/vendor/hls.min.js", (_req, res) => {
    res.sendFile(path.join(nodeModulesDir, "hls.js", "dist", "hls.min.js"));
  });
  router.get("/vendor/lucide.min.js", (_req, res) => {
    res.sendFile(path.join(nodeModulesDir, "lucide", "dist", "umd", "lucide.min.js"));
  });
  router.get("/api/cameras", async (_req, res) => {
    res.json(await getDashboardData());
  });
  router.get("/api/settings/telegram", async (_req, res) => {
    res.json(await getTelegramPublicSettings());
  });
  router.put("/api/settings/telegram", async (req, res) => {
    try {
      res.json(await saveTelegramSettings(req.body || {}));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/api/settings/telegram/test", async (_req, res) => {
    try {
      const telegram = await getTelegramSettings();
      const result = await sendTelegramMessage(`Camera Monitor Dashboard test\nThoi gian: ${formatTelegramTime(new Date().toISOString(), telegram.timeZone)}`);
      if (result.skipped) return res.status(400).json({ error: "Telegram is not configured." });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.post("/api/cameras", async (req, res) => {
    try {
      const cameras = await getCameras();
      const camera = normalizeCamera(req.body);
      camera.id = newId(10);
      camera.createdAt = new Date().toISOString();
      cameras.push(camera);
      await writeJson(camerasFile, cameras);
      await broadcastDashboard();
      setTimeout(() => checkAllCameras({ forceIds: new Set([camera.id]) }), 250);
      res.status(201).json(camera);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.put("/api/cameras/:id", async (req, res) => {
    try {
      const cameras = await getCameras();
      const index = cameras.findIndex((camera) => camera.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: "Camera not found." });
      const camera = normalizeCamera(req.body, cameras[index]);
      cameras[index] = camera;
      await writeJson(camerasFile, cameras);
      stopStream(camera.id);
      await broadcastDashboard();
      setTimeout(() => checkAllCameras({ forceIds: new Set([camera.id]) }), 250);
      res.json(camera);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.delete("/api/cameras/:id", async (req, res) => {
    const cameras = await getCameras();
    const next = cameras.filter((camera) => camera.id !== req.params.id);
    if (next.length === cameras.length) return res.status(404).json({ error: "Camera not found." });
    await writeJson(camerasFile, next);
    const state = await getState();
    delete state[req.params.id];
    await writeJson(stateFile, state);
    stopStream(req.params.id);
    await fsp.rm(path.join(hlsDir, req.params.id), { recursive: true, force: true });
    await fsp.rm(path.join(captureDir, req.params.id), { recursive: true, force: true });
    await broadcastDashboard();
    res.status(204).end();
  });
  router.post("/api/cameras/:id/check", async (req, res) => {
    const camera = await findCamera(req.params.id);
    if (!camera) return res.status(404).json({ error: "Camera not found." });
    await checkAllCameras({ forceIds: new Set([camera.id]) });
    res.json((await getDashboardData()).find((item) => item.id === camera.id));
  });
  router.post("/api/cameras/:id/stream/start", async (req, res) => {
    try {
      const camera = await findCamera(req.params.id);
      if (!camera) return res.status(404).json({ error: "Camera not found." });
      await startStream(camera);
      await broadcastDashboard();
      res.json({ streamUrl: publicPath(`/hls/${camera.id}/index.m3u8`) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.post("/api/cameras/:id/stream/stop", async (req, res) => {
    stopStream(req.params.id);
    await broadcastDashboard();
    res.json({ ok: true });
  });
  router.get("/api/cameras/:id/stream/status", (req, res) => {
    const record = streamProcesses.get(req.params.id);
    res.json(record ? { running: true, startedAt: record.startedAt, lastLog: record.lastLog } : { running: false });
  });
  router.post("/api/cameras/:id/capture", async (req, res) => {
    try {
      const camera = await findCamera(req.params.id);
      if (!camera) return res.status(404).json({ error: "Camera not found." });
      res.json(await captureFrame(camera));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  ensureDirectories();
  app.use(basePath, router);

  return {
    start() {
      checkAllCameras();
      if (!checkTimer) checkTimer = setInterval(checkAllCameras, checkIntervalMs);
    },
    stop() {
      if (checkTimer) clearInterval(checkTimer);
      checkTimer = null;
      for (const cameraId of streamProcesses.keys()) stopStream(cameraId);
      wss.close();
    }
  };
}

module.exports = { createCameraMonitorFeature };
