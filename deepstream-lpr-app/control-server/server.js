const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const ffmpegStatic = require("ffmpeg-static");
const { createCameraMonitorFeature } = require("./camera-monitor-feature");
const { createAgentFeature } = require("./agent-feature");

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const RUNTIME_DIR = path.join(APP_ROOT, "runtime");
const GENERATED_DIR = path.join(RUNTIME_DIR, "generated");
const THIRD_PARTY_DIR = path.join(RUNTIME_DIR, "third_party");
const TEST_MEDIA_DIR = path.join(RUNTIME_DIR, "test-media");
const MODEL_PENDING_DIR = path.join(RUNTIME_DIR, "model-factory-pending");
const MODELS_DIR = path.join(APP_ROOT, "models");
const MODEL_ARCHIVE_DIR = path.join(APP_ROOT, "model-archive");
const PARSER_PROFILES_DIR = path.join(APP_ROOT, "parser-profiles");
const MONITOR_CAPTURE_DIR = path.join(REPO_ROOT, "data", "captures");
const ROI_CAPTURE_DIR = path.join(RUNTIME_DIR, "roi-captures");
const CONFIG_FILE = path.join(RUNTIME_DIR, "config.json");
const COMPOSE_FILE = path.join(RUNTIME_DIR, "docker-compose.generated.yml");
const PORT = Number(process.env.LPR_CONTROL_PORT || 5190);
const DEEPSTREAM_YOLO_REPO = process.env.DEEPSTREAM_YOLO_REPO || "https://github.com/marcoslucianops/DeepStream-Yolo.git";
const DEEPSTREAM_YOLO_REF = process.env.DEEPSTREAM_YOLO_REF || "2894babce8e75c49115dbe0c7b516289ed853565";
const DEEPSTREAM_YOLO_LEGACY_REF = process.env.DEEPSTREAM_YOLO_LEGACY_REF || "f630b10a8088398251bca7f2f50064b57fab06bb";
const DEEPSTREAM_YOLO_FACE_REPO = process.env.DEEPSTREAM_YOLO_FACE_REPO || "https://github.com/marcoslucianops/DeepStream-Yolo-Face.git";
const DEEPSTREAM_YOLO_FACE_REF = process.env.DEEPSTREAM_YOLO_FACE_REF || "master";
const DEEPSTREAM_YOLO_SEG_REPO = process.env.DEEPSTREAM_YOLO_SEG_REPO || "https://github.com/marcoslucianops/DeepStream-Yolo-Seg.git";
const DEEPSTREAM_YOLO_SEG_REF = process.env.DEEPSTREAM_YOLO_SEG_REF || "master";
const DEEPSTREAM_YOLO_POSE_REPO = process.env.DEEPSTREAM_YOLO_POSE_REPO || "https://github.com/marcoslucianops/DeepStream-Yolo-Pose.git";
const DEEPSTREAM_YOLO_POSE_REF = process.env.DEEPSTREAM_YOLO_POSE_REF || "master";
const DEFAULT_DEEPSTREAM_IMAGE = process.env.DEEPSTREAM_IMAGE || "camera-monitor-deepstream-runtime:local";
const MODEL_BUILDER_IMAGE = process.env.MODEL_BUILDER_IMAGE || "deepstream-lpr-model-builder:local";
const MODEL_BUILDER_BASE_IMAGE = process.env.MODEL_BUILDER_BASE_IMAGE || "ultralytics/ultralytics:latest-jetson-jetpack6";
const MODEL_BUILDER_DOCKERFILE = process.env.MODEL_BUILDER_DOCKERFILE || path.join(APP_ROOT, "docker", "model-builder.Dockerfile");
const MODEL_BUILDER_AUTO_BUILD = process.env.MODEL_BUILDER_AUTO_BUILD !== "0";
const MODEL_BUILDER_FORCE_BUILD = process.env.MODEL_BUILDER_FORCE_BUILD === "1";
const MODEL_BUILDER_WORKDIR = "/workspace/deepstream-lpr-app";
const CUDA_VER = process.env.CUDA_VER || "";
const TENSORRT_VERSION = process.env.TENSORRT_VERSION || "";
const CAPTURE_TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS || 10000);
const PING_TIMEOUT_MS = Number(process.env.PING_TIMEOUT_MS || 3000);

const app = express();
app.use(express.json({ limit: "1mb" }));
const httpServer = http.createServer(app);
const jobs = new Map();

const MODEL_PROFILE_SPECS = {
  yolo_detection: {
    label: "YOLO Detection",
    task: "detect",
    repoName: "DeepStream-Yolo",
    repo: DEEPSTREAM_YOLO_REPO,
    ref: DEEPSTREAM_YOLO_REF,
    parserDir: "nvdsinfer_custom_impl_Yolo",
    parserLib: "libnvdsinfer_custom_impl_Yolo.so",
    parseBboxFunc: "NvDsInferParseYolo",
    networkType: 0,
    clusterMode: 2,
    exportWithProfileRepo: true
  },
  yolo_face: {
    label: "YOLO Face",
    task: "detect",
    repoName: "DeepStream-Yolo-Face",
    repo: DEEPSTREAM_YOLO_FACE_REPO,
    ref: DEEPSTREAM_YOLO_FACE_REF,
    parserDir: "nvdsinfer_custom_impl_Yolo_face",
    parserLib: "libnvdsinfer_custom_impl_Yolo_face.so",
    parseInstanceMaskFunc: "NvDsInferParseYoloFace",
    networkType: 3,
    clusterMode: 4,
    outputInstanceMask: true,
    exportWithProfileRepo: true
  },
  yolo_segmentation: {
    label: "YOLO Segmentation",
    task: "segment",
    repoName: "DeepStream-Yolo-Seg",
    repo: DEEPSTREAM_YOLO_SEG_REPO,
    ref: DEEPSTREAM_YOLO_SEG_REF,
    parserDir: "nvdsinfer_custom_impl_Yolo_seg",
    parserLib: "libnvdsinfer_custom_impl_Yolo_seg.so",
    parseInstanceMaskFunc: "NvDsInferParseYoloSeg",
    networkType: 3,
    clusterMode: 4,
    outputInstanceMask: true,
    segmentationThreshold: 0.5,
    exportWithProfileRepo: true
  },
  yolo_pose: {
    label: "YOLO Pose",
    task: "pose",
    repoName: "DeepStream-Yolo-Pose",
    repo: DEEPSTREAM_YOLO_POSE_REPO,
    ref: DEEPSTREAM_YOLO_POSE_REF,
    parserDir: "nvdsinfer_custom_impl_Yolo_pose",
    parserLib: "libnvdsinfer_custom_impl_Yolo_pose.so",
    parseInstanceMaskFunc: "NvDsInferParseYoloPose",
    networkType: 3,
    clusterMode: 4,
    outputInstanceMask: true,
    exportWithProfileRepo: true
  },
  yolo_classification: {
    label: "YOLO Classification",
    task: "classify",
    networkType: 1,
    exportWithProfileRepo: false
  },
  custom_onnx: {
    label: "Custom ONNX",
    task: "auto",
    networkType: null,
    exportWithProfileRepo: false
  }
};

function ensureDirs() {
  for (const dir of [RUNTIME_DIR, GENERATED_DIR, THIRD_PARTY_DIR, TEST_MEDIA_DIR, MODEL_PENDING_DIR, MODELS_DIR, MODEL_ARCHIVE_DIR, ROI_CAPTURE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await fsp.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function listMonitorCaptures(limit = 200) {
  const imageExts = new Set([".jpg", ".jpeg", ".png", ".bmp", ".webp"]);
  const captures = [];

  async function walk(dir, cameraId = "") {
    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, entry.name);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!entry.isFile() || !imageExts.has(ext)) continue;
      const stat = await fsp.stat(fullPath);
      const dimensions = await imageDimensions(fullPath).catch(() => ({ width: 0, height: 0 }));
      const relative = path.relative(MONITOR_CAPTURE_DIR, fullPath).replace(/\\/g, "/");
      captures.push({
        cameraId: cameraId || path.dirname(relative).split("/").filter(Boolean).pop() || "unknown",
        name: entry.name,
        url: `/monitor-captures/${relative}`,
        size: stat.size,
        width: dimensions.width || 0,
        height: dimensions.height || 0,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString()
      });
    }
  }

  await walk(MONITOR_CAPTURE_DIR);
  return captures
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit);
}

async function readRuntimeEvents(limit = 1000) {
  const file = path.join(RUNTIME_DIR, "events.jsonl");
  try {
    const lines = (await fsp.readFile(file, "utf8")).trim().split(/\r?\n/).filter(Boolean);
    return lines.slice(-limit).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function readRuntimeStatus() {
  return await readJson(path.join(RUNTIME_DIR, "status.json"), {
    state: "unknown",
    message: "No runtime status file yet.",
    sources: []
  });
}

async function writeRuntimeStatus(status) {
  await fsp.mkdir(RUNTIME_DIR, { recursive: true });
  await writeJson(path.join(RUNTIME_DIR, "status.json"), {
    updatedAt: new Date().toISOString(),
    sources: [],
    ...status
  });
}

async function inspectContainer(name) {
  const result = await runCommand("docker", ["inspect", name], { cwd: APP_ROOT });
  if (result.code !== 0) {
    return { exists: false, running: false, error: tailOutput(result.output, 1000) };
  }
  try {
    const data = JSON.parse(result.output)[0];
    return {
      exists: true,
      id: data.Id,
      name: (data.Name || "").replace(/^\//, ""),
      image: data.Config?.Image || "",
      running: Boolean(data.State?.Running),
      status: data.State?.Status || "unknown",
      startedAt: data.State?.StartedAt || "",
      finishedAt: data.State?.FinishedAt || "",
      exitCode: data.State?.ExitCode,
      error: data.State?.Error || "",
      health: data.State?.Health?.Status || ""
    };
  } catch (error) {
    return { exists: true, running: false, error: error.message };
  }
}

async function listRuntimeResults({ date = "", source = "", limit = 200 } = {}) {
  const capturesRoot = path.join(RUNTIME_DIR, "captures");
  const events = await readRuntimeEvents(5000);
  const eventByRelative = new Map();
  for (const event of events) {
    if (event.imageRelativePath) eventByRelative.set(String(event.imageRelativePath).replace(/\\/g, "/"), event);
    if (event.imagePath) {
      const relative = path.relative(RUNTIME_DIR, hostPathFromWorkspace(event.imagePath)).replace(/\\/g, "/");
      if (relative && !relative.startsWith("..")) eventByRelative.set(relative, event);
    }
  }
  const results = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !/\.(jpe?g|png|webp|bmp)$/i.test(entry.name)) continue;
      const relative = path.relative(RUNTIME_DIR, fullPath).replace(/\\/g, "/");
      const parts = relative.split("/");
      const captureDate = parts[1] || "";
      const cameraId = parts[2] || "unknown";
      if (date && captureDate !== date) continue;
      if (source && cameraId !== source) continue;
      const stat = await fsp.stat(fullPath);
      const event = eventByRelative.get(relative) || {};
      results.push({
        date: captureDate,
        sourceId: event.sourceId ?? null,
        cameraId: event.cameraId || cameraId,
        cameraName: event.cameraName || cameraId,
        fileName: entry.name,
        relativePath: relative,
        url: `/runtime/${relative}`,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        eventType: event.eventType || "",
        eventId: event.eventId || path.basename(entry.name, path.extname(entry.name)),
        processorType: event.processorType || "",
        component: event.component || "",
        label: event.label || "",
        confidence: event.confidence ?? null,
        plateText: event.plateText || "",
        plateStatus: event.plateStatus || "",
        zoneId: event.zoneId || "",
        zoneName: event.zoneName || "",
        zoneMode: event.zoneMode || "",
        failedStage: event.failedStage || "",
        failedModel: event.failedModel || "",
        failureReason: event.failureReason || "",
        objectId: event.objectId ?? null,
        classId: event.classId ?? null,
        bbox: event.bbox || null
      });
    }
  }
  await walk(capturesRoot);
  const sorted = results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return sorted.slice(0, Math.max(1, Number(limit || 200)));
}

function ffmpegExecutable() {
  return process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";
}

function sanitizeCameraId(value) {
  return String(value || "camera")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "camera";
}

function tailOutput(output, max = 4000) {
  return String(output || "").slice(-max);
}

function getCameraHost(rtspUrl) {
  try {
    return new URL(rtspUrl).hostname;
  } catch {
    const raw = String(rtspUrl || "").trim();
    const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    const authority = withoutScheme.split("/")[0] || "";
    const withoutAuth = authority.includes("@") ? authority.slice(authority.lastIndexOf("@") + 1) : authority;
    return withoutAuth
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .replace(/:\d+$/, "")
      .trim();
  }
}

function getCameraPort(rtspUrl) {
  try {
    return Number(new URL(rtspUrl).port || 554);
  } catch {
    const raw = String(rtspUrl || "").trim();
    const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    const authority = withoutScheme.split("/")[0] || "";
    const withoutAuth = authority.includes("@") ? authority.slice(authority.lastIndexOf("@") + 1) : authority;
    const match = withoutAuth.match(/:(\d+)$/);
    return match ? Number(match[1]) : 554;
  }
}

function getPingArgs(host) {
  if (process.platform === "win32") {
    return ["-n", "1", "-w", String(PING_TIMEOUT_MS), host];
  }

  return ["-c", "1", "-W", String(Math.max(1, Math.ceil(PING_TIMEOUT_MS / 1000))), host];
}

function tcpProbe(host, port, timeoutMs = PING_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const done = (ok, output) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ok, output });
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true, `TCP ${host}:${port} OK.`));
    socket.on("timeout", () => done(false, `TCP ${host}:${port} timeout sau ${Math.round(timeoutMs / 1000)}s.`));
    socket.on("error", (error) => done(false, `TCP ${host}:${port} failed: ${error.message}`));
  });
}

async function checkCameraConnection(rtspUrl) {
  const host = getCameraHost(rtspUrl);
  const port = getCameraPort(rtspUrl);
  if (!host) {
    return { ok: false, output: "Khong doc duoc dia chi host tu RTSP URL." };
  }

  const result = await runCommand("ping", getPingArgs(host), {
    timeoutMs: PING_TIMEOUT_MS + 1000,
    windowsHide: true
  });
  if (result.code !== 0 && /ENOENT|not found|not recognized/i.test(result.output || "")) {
    const tcp = await tcpProbe(host, port);
    return {
      ok: tcp.ok,
      host,
      port,
      output: `Ping command is not available in this container. ${tcp.output}`
    };
  }
  return {
    ok: result.code === 0,
    host,
    port,
    output: result.code === 0
      ? `Ping ${host} OK.`
      : tailOutput(result.output || `Ping ${host} that bai.`)
  };
}

async function captureCameraFrame({ rtspUrl, cameraId }) {
  const safeId = sanitizeCameraId(cameraId);
  const targetDir = path.join(MONITOR_CAPTURE_DIR, safeId);
  await fsp.mkdir(targetDir, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
  const outputPath = path.join(targetDir, filename);
  const result = await runCommand(ffmpegExecutable(), [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-rtsp_transport", "tcp",
    "-i", rtspUrl,
    "-frames:v", "1",
    "-q:v", "2",
    outputPath
  ], { timeoutMs: CAPTURE_TIMEOUT_MS, windowsHide: true });
  if (result.code !== 0 || !fs.existsSync(outputPath)) {
    await fsp.unlink(outputPath).catch(() => {});
    throw new Error(`Capture frame failed. ${tailOutput(result.output)}`);
  }
  const stat = await fsp.stat(outputPath);
  const dimensions = await imageDimensions(outputPath).catch(() => ({ width: 0, height: 0 }));
  return {
    cameraId: safeId,
    path: outputPath,
    url: `/monitor-captures/${safeId}/${filename}`,
    fileName: filename,
    size: stat.size,
    width: dimensions.width || 0,
    height: dimensions.height || 0,
    createdAt: stat.birthtime.toISOString(),
    output: tailOutput(result.output)
  };
}

function defaultPipelineStages() {
  return [
    {
      id: "pgie",
      name: "PGIE",
      gieType: "PGIE",
      modelGroup: "",
      selectedModel: "",
      enabled: true,
      gieId: 1,
      networkType: 0,
      operateOnGieId: "",
      operateOnClassIds: "",
      role: "pgie"
    },
    {
      id: "sgie",
      name: "SGIE",
      gieType: "SGIE",
      modelGroup: "",
      selectedModel: "",
      enabled: true,
      gieId: 2,
      networkType: 0,
      operateOnGieId: 1,
      operateOnClassIds: "",
      role: "sgie"
    },
    {
      id: "tgie",
      name: "TGIE",
      gieType: "TGIE",
      modelGroup: "",
      selectedModel: "",
      enabled: true,
      gieId: 3,
      networkType: 0,
      operateOnGieId: 2,
      operateOnClassIds: "",
      role: "tgie"
    }
  ];
}

function defaultConfig() {
  return {
    rtspUrl: "",
    streams: [
      {
        id: "camera-1",
        name: "Camera 1",
        rtspUrl: "",
        enabled: true,
        roi: { polygon: [] },
        zones: [],
        rules: [],
        frontVehicleClassIds: [0],
        captureCooldownSec: 30
      }
    ],
    streamWidth: 1920,
    streamHeight: 1080,
    roi: { polygon: [] },
    frontVehicleClassIds: [0],
    captureCooldownSec: 30,
    deepstreamImage: DEFAULT_DEEPSTREAM_IMAGE,
    trackerLib: "/opt/nvidia/deepstream/deepstream/lib/libnvds_nvmultiobjecttracker.so",
    models: {},
    processor: { type: "lpr" },
    testProcessorType: "lpr",
    pipelineStages: defaultPipelineStages(),
    deploy: {
      lastStatus: "not_deployed",
      lastOutput: "",
      updatedAt: null
    },
    activeDeployAppId: "deepstream-app-1",
    deployApps: [
      {
        id: "deepstream-app-1",
        name: "DeepStream App 1",
        active: true,
        cameraIds: ["camera-1"],
        processorType: "lpr",
        selectedModels: {},
        pipelineStages: defaultPipelineStages()
      }
    ],
    ocrPostprocess: {
      maxChars: 12,
      minConfidence: 0.5,
      nmsIou: 0.5,
      minWidthRatio: 0.01,
      maxWidthRatio: 0.25,
      minHeightRatio: 0.18,
      maxHeightRatio: 1.15
    },
    testMedia: {}
  };
}

async function getConfig() {
  const current = await readJson(CONFIG_FILE, {});
  return mergeConfig(defaultConfig(), current);
}

function mergeConfig(base, patch) {
  const output = { ...base, ...patch };
  output.roi = { ...base.roi, ...(patch.roi || {}) };
  output.streams = Array.isArray(patch.streams)
    ? patch.streams
    : (patch.rtspUrl ? [{
      ...base.streams[0],
      rtspUrl: patch.rtspUrl,
      roi: patch.roi || base.roi,
      frontVehicleClassIds: patch.frontVehicleClassIds || [0],
      captureCooldownSec: patch.captureCooldownSec || 30
    }] : base.streams);
  output.models = { ...(base.models || {}) };
  for (const [group, model] of Object.entries(patch.models || {})) {
    output.models[group] = { ...(base.models?.[group] || {}), ...(model || {}) };
  }
  output.deploy = { ...base.deploy, ...(patch.deploy || {}) };
  output.deployApps = Array.isArray(patch.deployApps) ? patch.deployApps : base.deployApps;
  output.processor = normalizeProcessor(patch.processor || patch.processorType || base.processor);
  output.testProcessorType = normalizeProcessorType(patch.testProcessorType || base.testProcessorType);
  output.pipelineStages = Array.isArray(patch.pipelineStages) ? patch.pipelineStages : (base.pipelineStages || defaultPipelineStages());
  output.ocrPostprocess = { ...base.ocrPostprocess, ...(patch.ocrPostprocess || {}) };
  output.testMedia = { ...base.testMedia, ...(patch.testMedia || {}) };
  return output;
}

const PROCESSOR_TYPES = new Set(["lpr", "generic_detection"]);

function normalizeProcessorType(value) {
  const requested = typeof value === "object" && value !== null ? value.type : value;
  const normalized = String(requested || "").trim().toLowerCase();
  return PROCESSOR_TYPES.has(normalized) ? normalized : "lpr";
}

function normalizeProcessor(value) {
  return { type: normalizeProcessorType(value) };
}

function processorType(config) {
  return normalizeProcessorType(config?.processor || config?.processorType);
}

function sanitizeSlot(value) {
  const slot = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const allowed = new Set([
    "vehicle_front_onnx",
    "vehicle_front_engine",
    "vehicle_front_labels",
    "vehicle_front_custom_lib",
    "plate_detector_onnx",
    "plate_detector_engine",
    "plate_detector_labels",
    "plate_detector_custom_lib",
    "plate_ocr_onnx",
    "plate_ocr_engine",
    "plate_ocr_labels",
    "plate_ocr_custom_lib"
  ]);
  if (!allowed.has(slot)) throw new Error("Invalid upload slot.");
  return slot;
}

function sanitizeModelGroup(value) {
  const group = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!group) {
    throw new Error("Invalid model group.");
  }
  return group;
}

function normalizeModelProfile(value) {
  const profile = String(value || "").trim().toLowerCase();
  return MODEL_PROFILE_SPECS[profile] ? profile : "yolo_detection";
}

function modelProfileSpec(value) {
  const profile = normalizeModelProfile(value);
  return { id: profile, ...MODEL_PROFILE_SPECS[profile] };
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const slot = sanitizeSlot(req.params.slot);
      const group = slot.split("_").slice(0, -1).join("_").replace("_custom", "");
      const dir = path.join(MODELS_DIR, group);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    const slot = sanitizeSlot(req.params.slot);
    const ext = path.extname(file.originalname);
    cb(null, `${slot}${ext || path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

const sourceStorage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const group = sanitizeModelGroup(req.params.group);
      const dir = path.join(MODELS_DIR, group, "source");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    const group = sanitizeModelGroup(req.params.group);
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "source";
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const uploadSource = multer({
  storage: sourceStorage,
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pt", ".onnx"].includes(ext)) {
      cb(new Error("Source model must be a .pt or .onnx file."));
      return;
    }
    cb(null, true);
  }
});

const pendingSourceStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(MODEL_PENDING_DIR, { recursive: true });
    cb(null, MODEL_PENDING_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "source";
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const uploadPendingSource = multer({
  storage: pendingSourceStorage,
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === "labels") {
      if (ext !== ".txt") {
        cb(new Error("ONNX labels must be a .txt file."));
        return;
      }
      cb(null, true);
      return;
    }
    if (![".pt", ".onnx"].includes(ext)) {
      cb(new Error("Source model must be a .pt or .onnx file."));
      return;
    }
    cb(null, true);
  }
});

const sourceLabelStorage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const group = sanitizeModelGroup(req.params.group);
      const sourceKey = sanitizeSourceKey(req.params.sourceKey);
      const dir = path.join(MODELS_DIR, group, "labels");
      fs.mkdirSync(dir, { recursive: true });
      req.modelSourceKey = sourceKey;
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename(req, _file, cb) {
    cb(null, `${req.modelSourceKey}.txt`);
  }
});

const uploadSourceLabel = multer({
  storage: sourceLabelStorage,
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".txt") {
      cb(new Error("Labels file must be a .txt file."));
      return;
    }
    cb(null, true);
  }
});

function sanitizeSourceKey(value) {
  const sourceKey = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!sourceKey) throw new Error("Invalid source key.");
  return sourceKey;
}

function sanitizeTestKind(value) {
  const kind = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!["image", "video"].includes(kind)) {
    throw new Error("Invalid test media kind.");
  }
  return kind;
}

const testMediaStorage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const kind = sanitizeTestKind(req.params.kind);
      const dir = path.join(TEST_MEDIA_DIR, kind);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    const kind = sanitizeTestKind(req.params.kind);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `test_${kind}${ext}`);
  }
});

const uploadTestMedia = multer({
  storage: testMediaStorage,
  fileFilter(req, file, cb) {
    try {
      const kind = sanitizeTestKind(req.params.kind);
      const ext = path.extname(file.originalname).toLowerCase();
      const imageExts = new Set([".jpg", ".jpeg", ".png", ".bmp", ".webp"]);
      const videoExts = new Set([".mp4", ".mov", ".mkv", ".avi", ".m4v"]);
      if (kind === "image" && !imageExts.has(ext)) {
        cb(new Error("Test image must be .jpg, .jpeg, .png, .bmp, or .webp."));
        return;
      }
      if (kind === "video" && !videoExts.has(ext)) {
        cb(new Error("Test video must be .mp4, .mov, .mkv, .avi, or .m4v."));
        return;
      }
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});

async function imageDimensions(filePath) {
  const ext = path.extname(filePath || "").toLowerCase();
  const buffer = await fsp.readFile(filePath);
  if ((ext === ".jpg" || ext === ".jpeg") && buffer.length > 4) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5)
        };
      }
      offset += 2 + length;
    }
  }
  if (ext === ".png" && buffer.slice(1, 4).toString("ascii") === "PNG") {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  return { width: 0, height: 0 };
}

function workspacePath(filePath) {
  if (!filePath) return "";
  const relative = path.relative(APP_ROOT, filePath).replace(/\\/g, "/");
  return `/workspace/deepstream-lpr-app/${relative}`;
}

function hostPathFromWorkspace(filePath) {
  if (!filePath) return "";
  const normalized = String(filePath).replace(/\\/g, "/");
  const prefix = "/workspace/deepstream-lpr-app/";
  if (normalized.startsWith(prefix)) {
    return path.join(APP_ROOT, normalized.slice(prefix.length));
  }
  return filePath;
}

function publicUrlFromWorkspace(filePath) {
  const hostPath = hostPathFromWorkspace(filePath);
  if (!hostPath) return "";
  const relative = path.relative(APP_ROOT, hostPath).replace(/\\/g, "/");
  if (relative.startsWith("runtime/")) return `/${relative}`;
  if (relative.startsWith("models/")) return `/${relative}`;
  return "";
}

function normalizeClassIds(value) {
  const ids = Array.isArray(value) ? value : String(value || "").split(/[;,]/);
  return ids.map((item) => Number(String(item).trim())).filter((item) => Number.isInteger(item));
}

function normalizePolygon(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((point) => Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : null)
    .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

const ZONE_MODES = new Set([
  "capture_when_inside",
  "alert_when_inside",
  "lpr_only_inside",
  "detect_only_inside",
  "ignore_inside"
]);

function normalizeZone(zone, index, streamDefaults = {}) {
  const id = String(zone?.id || `zone-${index + 1}`).trim() || `zone-${index + 1}`;
  const mode = ZONE_MODES.has(zone?.mode) ? zone.mode : "capture_when_inside";
  const classIds = normalizeClassIds(zone?.classIds);
  const cooldown = zone?.cooldownSec === "" || zone?.cooldownSec === null || zone?.cooldownSec === undefined
    ? ""
    : Math.max(1, Number(zone.cooldownSec || streamDefaults.captureCooldownSec || 30));
  return {
    id,
    name: String(zone?.name || `Zone ${index + 1}`).trim() || `Zone ${index + 1}`,
    enabled: zone?.enabled !== false,
    mode,
    polygon: normalizePolygon(zone?.polygon || zone?.points || []),
    classIds,
    cooldownSec: cooldown
  };
}

function normalizeZones(stream, fallbackStream) {
  const sourceZones = Array.isArray(stream.zones) ? stream.zones : [];
  const zones = sourceZones.map((zone, index) => normalizeZone(zone, index, stream));
  if (zones.length) return zones;
  const polygon = normalizePolygon(stream.roi?.polygon || fallbackStream.roi?.polygon || []);
  if (!polygon.length) return [];
  const classIds = normalizeClassIds(stream.frontVehicleClassIds || fallbackStream.frontVehicleClassIds);
  return [normalizeZone({
    id: "zone-1",
    name: "Zone 1",
    polygon,
    classIds,
    cooldownSec: stream.captureCooldownSec || fallbackStream.captureCooldownSec || 30
  }, 0, stream)];
}

function normalizeRule(rule, index, zones = [], streamDefaults = {}) {
  const id = String(rule?.id || `rule-${index + 1}`).trim() || `rule-${index + 1}`;
  const zoneIds = new Set(zones.map((zone) => zone.id));
  const firstZoneId = String(rule?.firstZoneId || "").trim();
  const secondZoneId = String(rule?.secondZoneId || "").trim();
  const type = rule?.type === "sequence" ? "sequence" : "sequence";
  const action = ["capture", "ignore"].includes(rule?.action) ? rule.action : "capture";
  const reverseAction = ["capture", "ignore"].includes(rule?.reverseAction) ? rule.reverseAction : "ignore";
  const cooldown = rule?.cooldownSec === "" || rule?.cooldownSec === null || rule?.cooldownSec === undefined
    ? ""
    : Math.max(1, Number(rule.cooldownSec || streamDefaults.captureCooldownSec || 30));
  return {
    id,
    name: String(rule?.name || `Rule ${index + 1}`).trim() || `Rule ${index + 1}`,
    enabled: rule?.enabled !== false,
    type,
    firstZoneId: zoneIds.has(firstZoneId) ? firstZoneId : firstZoneId,
    secondZoneId: zoneIds.has(secondZoneId) ? secondZoneId : secondZoneId,
    action,
    reverseAction,
    maxTimeSec: Math.max(1, Number(rule?.maxTimeSec || 5)),
    cooldownSec: cooldown,
    classIds: normalizeClassIds(rule?.classIds)
  };
}

function normalizeRules(stream, zones) {
  const sourceRules = Array.isArray(stream.rules) ? stream.rules : [];
  return sourceRules
    .map((rule, index) => normalizeRule(rule, index, zones, stream))
    .filter((rule) => rule.firstZoneId && rule.secondZoneId && rule.firstZoneId !== rule.secondZoneId);
}

function normalizeStreams(inputStreams, fallback) {
  const sourceStreams = Array.isArray(inputStreams) ? inputStreams : null;
  const fallbackStream = {
    id: "camera-1",
    name: "Camera 1",
    rtspUrl: fallback.rtspUrl || "",
    enabled: true,
    roi: fallback.roi || { polygon: [] },
    frontVehicleClassIds: fallback.frontVehicleClassIds || [0],
    captureCooldownSec: fallback.captureCooldownSec || 30
  };
  return (sourceStreams || [fallbackStream]).map((stream, index) => {
    const zones = normalizeZones(stream, fallbackStream);
    const rules = normalizeRules(stream, zones);
    const polygon = zones.find((zone) => zone.polygon.length >= 3)?.polygon
      || normalizePolygon(stream.roi?.polygon || fallbackStream.roi.polygon);
    const classIds = normalizeClassIds(stream.frontVehicleClassIds);
    return {
      id: String(stream.id || `camera-${index + 1}`).trim() || `camera-${index + 1}`,
      name: String(stream.name || `Camera ${index + 1}`).trim() || `Camera ${index + 1}`,
      rtspUrl: String(stream.rtspUrl || "").trim(),
      enabled: stream.enabled !== false,
      roi: { polygon },
      zones,
      rules,
      frontVehicleClassIds: classIds.length ? classIds : [0],
      captureCooldownSec: Math.max(1, Number(stream.captureCooldownSec || fallbackStream.captureCooldownSec || 30))
    };
  });
}

function enabledRtspStreams(config) {
  return (config.streams || []).filter((stream) => stream.enabled !== false && /^rtsps?:\/\//i.test(stream.rtspUrl || ""));
}

function normalizeConfig(input, existing) {
  const config = mergeConfig(existing, input || {});
  if (!config.rtspUrl || !/^rtsps?:\/\//i.test(config.rtspUrl)) {
    throw new Error("RTSP URL là bắt buộc và phải bắt đầu bằng rtsp://.");
  }
  if (!Array.isArray(config.roi.polygon) || config.roi.polygon.length < 3) {
    throw new Error("ROI polygon cần ít nhất 3 điểm.");
  }
  config.frontVehicleClassIds = String(config.frontVehicleClassIds)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
  if (!config.frontVehicleClassIds.length) config.frontVehicleClassIds = [0];
  config.streamWidth = Math.max(320, Number(config.streamWidth || 1920));
  config.streamHeight = Math.max(240, Number(config.streamHeight || 1080));
  config.captureCooldownSec = Math.max(1, Number(config.captureCooldownSec || 30));
  config.appRoot = "/workspace/deepstream-lpr-app";
  return config;
}

function normalizeRuntimeConfig(input, existing) {
  const config = mergeConfig(existing, input || {});
  if (!Array.isArray(config.roi.polygon) || config.roi.polygon.length < 3) {
    throw new Error("ROI polygon needs at least 3 points.");
  }
  config.frontVehicleClassIds = String(config.frontVehicleClassIds)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
  if (!config.frontVehicleClassIds.length) config.frontVehicleClassIds = [0];
  config.streamWidth = Math.max(320, Number(config.streamWidth || 1920));
  config.streamHeight = Math.max(240, Number(config.streamHeight || 1080));
  config.captureCooldownSec = Math.max(1, Number(config.captureCooldownSec || 30));
  config.appRoot = "/workspace/deepstream-lpr-app";
  return config;
}

function normalizeMultiCameraConfig(input, existing, requireRtsp = true) {
  const config = mergeConfig(existing, input || {});
  config.streams = normalizeStreams(config.streams, config);
  const enabledStreams = enabledRtspStreams(config);
  if (requireRtsp && !enabledStreams.length) {
    throw new Error("Can it nhat 1 camera enabled va RTSP URL phai bat dau bang rtsp:// hoac rtsps://.");
  }
  const firstStream = enabledStreams[0] || config.streams[0];
  config.rtspUrl = firstStream?.rtspUrl || "";
  config.roi = firstStream?.roi || config.roi;
  config.frontVehicleClassIds = firstStream?.frontVehicleClassIds || normalizeClassIds(config.frontVehicleClassIds);
  if (!config.frontVehicleClassIds.length) config.frontVehicleClassIds = [0];
  config.streamWidth = Math.max(320, Number(config.streamWidth || 1920));
  config.streamHeight = Math.max(240, Number(config.streamHeight || 1080));
  config.captureCooldownSec = Math.max(1, Number(config.captureCooldownSec || firstStream?.captureCooldownSec || 30));
  config.processor = normalizeProcessor(config.processor);
  config.testProcessorType = normalizeProcessorType(config.testProcessorType);
  config.appRoot = "/workspace/deepstream-lpr-app";
  return config;
}

function stageHasRunnableModel(config, stage) {
  const model = config.models?.[stage.modelGroup] || {};
  return Boolean(stage.modelGroup && (model.engine || model.onnx));
}

function validateProcessorFlow(config, context = "runtime") {
  const type = processorType(config);
  const stages = normalizePipelineStages(config).filter((stage) => stage.enabled);
  const runnable = stages.filter((stage) => stageHasRunnableModel(config, stage));
  if (!runnable.length) {
    throw new Error(`${context}: Can it nhat 1 GIE stage co model da chon va artifact ONNX/engine san sang.`);
  }
  if (type === "generic_detection") {
    return {
      type,
      output: `Processor: Generic Detection\nRunnable stages: ${runnable.map((stage) => `${stage.gieType || "GIE"}#${stage.gieId} ${stage.modelGroup}`).join(", ")}`
    };
  }

  const pgie = runnable.find((stage) => Number(stage.gieId) === 1 && !stage.operateOnGieId);
  const sgie = runnable.find((stage) => Number(stage.gieId) === 2 && Number(stage.operateOnGieId) === 1);
  const tgie = runnable.find((stage) => Number(stage.gieId) === 3 && Number(stage.operateOnGieId) === 2);
  if (!pgie || !sgie || !tgie) {
    throw new Error(
      `${context}: LPR can du 3 stage san sang theo chuoi PGIE GIE ID 1 -> SGIE GIE ID 2 -> TGIE GIE ID 3. `
      + "Chuyen sang Generic Detection neu chi muon detect theo flow user config."
    );
  }
  return {
    type,
    output: `Processor: LPR\nLPR chain: ${pgie.modelGroup} -> ${sgie.modelGroup} -> ${tgie.modelGroup}`
  };
}

function modelConfig(slot, model, gieId, networkType, operateOnGieId = null, batchSize = 1, operateOnClassIds = [], stage = {}, runtimeProcessorType = "lpr") {
  const profile = modelProfileSpec(model.profile || model.build?.profile);
  const runtimeNetworkType = profile.networkType === null || profile.networkType === undefined
    ? Number(networkType ?? 0)
    : Number(profile.networkType);
  const stageRole = String(stage.role || stage.gieType || "").toLowerCase();
  const modelGroup = String(stage.modelGroup || slot || "").toLowerCase();
  const isLprCharacterDetector = runtimeProcessorType === "lpr"
    && runtimeNetworkType === 0
    && (stageRole === "tgie" || modelGroup.includes("plate_ocr") || modelGroup.includes("plate_character"));
  const labelCount = countLabelLines(hostPathFromWorkspace(model.labels));
  const configuredClasses = Number(model.numClasses || 0);
  let detectedClasses = Math.max(1, configuredClasses || 1, labelCount || 0);
  if (isLprCharacterDetector && labelCount === 37 && configuredClasses <= 37) {
    // Legacy VN plate character detector ships 37 label lines, but the
    // working DeepStream config uses 36 detected classes.
    detectedClasses = 36;
  }
  const lines = [
    "[property]",
    "gpu-id=0",
    "net-scale-factor=0.0039215697906911373",
    "model-color-format=0",
    model.onnx ? `onnx-file=${model.onnx}` : "# onnx-file=/workspace/deepstream-lpr-app/models/model.onnx",
    model.engine ? `model-engine-file=${model.engine}` : "# model-engine-file=/workspace/deepstream-lpr-app/models/model.engine",
    model.labels ? `labelfile-path=${model.labels}` : "# labelfile-path=/workspace/deepstream-lpr-app/models/labels.txt",
    model.customLib ? `custom-lib-path=${model.customLib}` : "# custom-lib-path=/workspace/deepstream-lpr-app/models/libnvdsinfer_custom_impl_Yolo.so",
    `batch-size=${Math.max(1, Number(batchSize || 1))}`,
    "network-mode=2",
    `network-type=${runtimeNetworkType}`,
    `gie-unique-id=${gieId}`,
    operateOnGieId ? "process-mode=2" : "process-mode=1",
    "interval=0",
    "maintain-aspect-ratio=1"
  ];
  if (isLprCharacterDetector) {
    lines.push("force-implicit-batch-dim=1", "scaling-filter=2");
  }
  if (profile.outputInstanceMask) {
    lines.push("symmetric-padding=1", "scaling-filter=1", "scaling-compute-hw=0", "force-implicit-batch-dim=0");
  }
  if (operateOnGieId) {
    lines.push(`operate-on-gie-id=${operateOnGieId}`);
    lines.push("input-object-min-width=1");
    lines.push("input-object-min-height=1");
    const classIds = normalizeClassIds(operateOnClassIds);
    if (classIds.length) {
      lines.push(`operate-on-class-ids=${classIds.join(";")}`);
    }
  }
  if (runtimeNetworkType === 0) {
    lines.push(`num-detected-classes=${detectedClasses}`);
    lines.push(
      "cluster-mode=2",
      `parse-bbox-func-name=${model.parseBboxFunc || "NvDsInferParseYolo"}`
    );
    lines.push(`engine-create-func-name=${model.engineCreateFunc || "NvDsInferYoloCudaEngineGet"}`);
  } else if (runtimeNetworkType === 1) {
    lines.push(`output-blob-names=${model.outputBlobName || "output0"}`);
    lines.push("output-tensor-meta=1");
    lines.push("classifier-async-mode=0");
    lines.push(`classifier-threshold=${Number(model.classifierThreshold ?? 0)}`);
  } else if (runtimeNetworkType === 3 && profile.parseInstanceMaskFunc) {
    lines.push(`num-detected-classes=${detectedClasses}`);
    lines.push(
      `cluster-mode=${profile.clusterMode || 4}`,
      `parse-bbox-instance-mask-func-name=${model.parseBboxInstanceMaskFunc || profile.parseInstanceMaskFunc}`,
      "output-instance-mask=1"
    );
    if (profile.segmentationThreshold !== undefined) {
      lines.push(`segmentation-threshold=${Number(model.segmentationThreshold ?? profile.segmentationThreshold)}`);
    }
  }
  const preClusterThreshold = isLprCharacterDetector ? 0.4 : 0.35;
  const topk = isLprCharacterDetector ? 200 : 100;
  lines.push("", "[class-attrs-all]", `pre-cluster-threshold=${preClusterThreshold}`);
  if (runtimeNetworkType === 0) lines.push("nms-iou-threshold=0.45", `topk=${topk}`);
  lines.push("");
  return lines.join("\n");
}

function firstUsableWorkspacePath(paths = []) {
  for (const item of paths) {
    const hostPath = hostPathFromWorkspace(item);
    if (usableFileStat(hostPath)) return workspacePath(hostPath);
  }
  return "";
}

function resolveModelLabels(group, sourceKey, build = {}, model = {}) {
  const paths = modelBuildPaths(group, sourceKey || model.sourceKey || "default");
  const sourceLabel = sourceLabelPath(group, sourceKey || model.sourceKey || "default");
  return firstUsableWorkspacePath([
    build.labels,
    workspacePath(paths.labels),
    workspacePath(sourceLabel),
    model.labels
  ]);
}

function sanitizeStageId(value, fallback = "gie") {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || fallback;
}

function normalizePipelineStages(config) {
  const source = Array.isArray(config.pipelineStages) && config.pipelineStages.length
    ? config.pipelineStages
    : defaultPipelineStages();
  return source.map((stage, index) => {
    const fallback = defaultPipelineStages()[Math.min(index, 2)] || {};
    const group = sanitizeModelGroup(stage.modelGroup || fallback.modelGroup || `gie_${index + 1}`);
    return {
      id: sanitizeStageId(stage.id, `gie-${index + 1}`),
      name: String(stage.name || fallback.name || `GIE ${index + 1}`),
      gieType: String(stage.gieType || fallback.gieType || stage.name || fallback.name || "GIE"),
      modelGroup: group,
      selectedModel: String(stage.selectedModel || "").trim(),
      enabled: stage.enabled !== false,
      gieId: Math.max(1, Number(stage.gieId || fallback.gieId || index + 1)),
      networkType: Number(stage.networkType ?? fallback.networkType ?? 0),
      operateOnGieId: stage.operateOnGieId === "" || stage.operateOnGieId === null || stage.operateOnGieId === undefined
        ? null
        : Number(stage.operateOnGieId),
      operateOnClassIds: stage.operateOnClassIds ?? fallback.operateOnClassIds ?? "",
      batchSize: stage.batchSize === "" || stage.batchSize === null || stage.batchSize === undefined
        ? (fallback.batchSize === undefined ? null : Math.max(1, Number(fallback.batchSize || 1)))
        : Math.max(1, Number(stage.batchSize || 1)),
      role: String(stage.role || fallback.role || group),
      configFile: `/workspace/deepstream-lpr-app/runtime/generated/config_infer_${sanitizeStageId(stage.id, `gie-${index + 1}`)}.txt`
    };
  });
}

function stageInferBatchSize(stage, sourceBatchSize, model = {}) {
  // Secondary GIEs process cropped objects, not the batched streammux input.
  // Keeping them at 1 avoids DeepStream rebuilding static YOLO engines with
  // a source-count batch size such as 2, which fails for explicit-batch engines.
  const builtBatchSize = Math.max(0, Number(model.engineBatchSize || model.build?.batchSize || 0));
  if (stage.operateOnGieId) return Math.max(1, Number(stage.batchSize || builtBatchSize || 1));
  return Math.max(1, Number(stage.batchSize || builtBatchSize || sourceBatchSize || 1));
}

function modelClassIdRange(group, model = {}) {
  const labels = resolveModelLabels(group, model.sourceKey || model.selectedBuildKey, model.build, model);
  const labelCount = countLabelLines(hostPathFromWorkspace(labels));
  const count = Math.max(0, Number(model.numClasses || model.build?.numClasses || labelCount || 0));
  return Array.from({ length: count }, (_item, index) => index);
}

function applySelectedModels(config, selectedModels = {}) {
  const next = mergeConfig(defaultConfig(), config);
  const stageSelected = {};
  for (const stage of normalizePipelineStages(next)) {
    if (stage.selectedModel) stageSelected[stage.modelGroup] = stage.selectedModel;
  }
  const allSelected = { ...stageSelected, ...(selectedModels || {}) };
  for (const group of Object.keys(allSelected)) {
    const selectedKey = String(allSelected[group] || "").trim();
    if (!selectedKey) continue;
    const model = next.models[group] || {};
    const build = model.builds?.[selectedKey];
    if (!build) continue;
    next.models[group] = {
      ...model,
      source: build.source || model.source,
      sourceKey: selectedKey,
      profile: normalizeModelProfile(build.profile || model.profile),
      onnx: build.onnx || model.onnx,
      engine: build.engine || model.engine,
      labels: resolveModelLabels(group, selectedKey, build, model),
      customLib: build.customLib || model.customLib,
      parseBboxFunc: build.parseBboxFunc || model.parseBboxFunc,
      engineCreateFunc: build.engineCreateFunc || model.engineCreateFunc,
      numClasses: build.numClasses || model.numClasses,
      engineBuildMethod: build.engineBuildMethod || model.engineBuildMethod,
      deepstreamYoloRef: build.deepstreamYoloRef || model.deepstreamYoloRef,
      build,
      selectedBuildKey: selectedKey
    };
  }
  next.selectedModels = allSelected;
  return next;
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function createCheckpoints(items) {
  return items.map((item, index) => ({
    id: item.id,
    label: item.label,
    order: index + 1,
    status: "pending",
    message: "",
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    output: ""
  }));
}

function getCheckpoint(checkpoints, id) {
  const checkpoint = checkpoints.find((item) => item.id === id);
  if (!checkpoint) throw new Error(`Unknown checkpoint: ${id}`);
  return checkpoint;
}

function updateCheckpoint(checkpoints, id, patch) {
  Object.assign(getCheckpoint(checkpoints, id), patch);
}

function cloneCheckpoints(checkpoints) {
  return checkpoints.map((checkpoint) => ({ ...checkpoint }));
}

function notifyProgress(onProgress, checkpoints) {
  if (typeof onProgress === "function") {
    onProgress(cloneCheckpoints(checkpoints));
  }
}

async function runCheckpoint(checkpoints, id, action, successMessage = "OK", onProgress = null) {
  const started = Date.now();
  updateCheckpoint(checkpoints, id, {
    status: "running",
    message: "",
    startedAt: new Date(started).toISOString(),
    finishedAt: null,
    durationMs: null,
    output: ""
  });
  notifyProgress(onProgress, checkpoints);
  try {
    const result = await action();
    updateCheckpoint(checkpoints, id, {
      status: "success",
      message: successMessage,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      output: typeof result?.output === "string" ? result.output.slice(-2000) : ""
    });
    notifyProgress(onProgress, checkpoints);
    return result;
  } catch (error) {
    updateCheckpoint(checkpoints, id, {
      status: "failed",
      message: error.message,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      output: typeof error.output === "string" ? error.output.slice(-2000) : ""
    });
    notifyProgress(onProgress, checkpoints);
    error.checkpoints = checkpoints;
    throw error;
  }
}

function skipCheckpoint(checkpoints, id, message, onProgress = null) {
  updateCheckpoint(checkpoints, id, {
    status: "skipped",
    message,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 0
  });
  notifyProgress(onProgress, checkpoints);
}

function sourceKeyFromPath(filePath) {
  const hostPath = hostPathFromWorkspace(filePath);
  const ext = path.extname(hostPath || "");
  return path.basename(hostPath || "default", ext).replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
}

function pendingIdFromPath(filePath) {
  const hostPath = hostPathFromWorkspace(filePath);
  return path.basename(hostPath || "pending", path.extname(hostPath || "")).replace(/[^a-zA-Z0-9_-]/g, "_") || `pending_${Date.now()}`;
}

function sourceLabelPath(group, sourceKey) {
  return path.join(MODELS_DIR, group, "labels", `${sanitizeSourceKey(sourceKey)}.txt`);
}

function modelBuildPaths(group, sourceKey = "default") {
  const safeKey = String(sourceKey || "default").replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  const dir = path.join(MODELS_DIR, group, "build", safeKey);
  return {
    dir,
    onnx: path.join(dir, `${group}.onnx`),
    engine: path.join(dir, `${group}.engine`),
    labels: path.join(dir, "labels.txt"),
    parserLib: path.join(dir, "libnvdsinfer_custom_impl_Yolo.so"),
    log: path.join(dir, "build.log")
  };
}

function usableFileStat(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size <= 0) return null;
    return stat;
  } catch {
    return null;
  }
}

function reusableArtifact(filePath, dependencies = [], forceRebuild = false) {
  if (forceRebuild) return false;
  const artifactStat = usableFileStat(filePath);
  if (!artifactStat) return false;
  return dependencies.every((dependency) => {
    const dependencyStat = usableFileStat(dependency);
    return dependencyStat && artifactStat.mtimeMs >= dependencyStat.mtimeMs;
  });
}

function resolveEngineBuildMethod(requested, canUseDeepStreamYolo) {
  const value = String(requested || "auto").trim().toLowerCase();
  if (["runtime-trtexec", "trtexec", "deepstream-runtime", "skip"].includes(value)) return value;
  return "runtime-trtexec";
}

function isPlateCharacterGroup(value) {
  return /plate.*(ocr|char|character)|character.*plate/i.test(String(value || ""));
}

function resolveDeepStreamYoloRef(group, sourceExt, requested = "") {
  const value = String(requested || "auto").trim();
  if (value && value !== "auto") return value;
  // This OCR model family exports ONNX with boxes/scores/classes outputs. It
  // needs the parser profile copied from the working production deployment.
  if (isPlateCharacterGroup(group) && sourceExt === ".onnx") {
    const profileName = "plate_ocr_yolov8_36";
    if (fs.existsSync(path.join(PARSER_PROFILES_DIR, profileName, "nvdsinfer_custom_impl_Yolo"))) {
      return `profile:${profileName}`;
    }
    return DEEPSTREAM_YOLO_LEGACY_REF;
  }
  return DEEPSTREAM_YOLO_REF;
}

function isParserProfile(value) {
  return String(value || "").startsWith("profile:");
}

function parserProfileName(value) {
  return String(value || "").replace(/^profile:/, "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function isDeepStreamRuntimeBuild(build) {
  return build?.engineBuildMethod === "deepstream-runtime";
}

function buildHasRunnableArtifacts(build, paths = null) {
  if (!build) return false;
  const onnxPath = hostPathFromWorkspace(build.onnx);
  const labelsPath = hostPathFromWorkspace(build.labels);
  const parserPath = hostPathFromWorkspace(build.customLib);
  const enginePath = hostPathFromWorkspace(build.engine);
  if (isDeepStreamRuntimeBuild(build)) {
    const profile = modelProfileSpec(build.profile);
    const parserRequired = Boolean(profile.parseBboxFunc || profile.parseInstanceMaskFunc);
    return Boolean(
      usableFileStat(onnxPath) &&
      usableFileStat(labelsPath) &&
      (!parserRequired || usableFileStat(parserPath))
    );
  }
  if (usableFileStat(enginePath)) return true;
  if (paths && usableFileStat(paths.engine)) return true;
  return false;
}

function countLabelLines(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

function readLabelLines(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function inferredNumClasses(group, labelCount, currentValue = 0) {
  const current = Number(currentValue || 0);
  if (isPlateCharacterGroup(group) && Number(labelCount) === 37 && current <= 37) {
    return 36;
  }
  if (current > 0) return current;
  return Math.max(1, Number(labelCount || 1));
}

async function listModelFiles(group) {
  group = sanitizeModelGroup(group);
  const groupDir = path.join(MODELS_DIR, group);
  const sourceDir = path.join(groupDir, "source");
  const config = await getConfig();
  const model = config.models[group] || {};
  const builds = model.builds || {};
  const files = [];
  let entries = [];
  try {
    entries = await fsp.readdir(sourceDir, { withFileTypes: true });
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(sourceDir, entry.name);
    const stat = await fsp.stat(fullPath);
    const relative = path.relative(groupDir, fullPath).replace(/\\/g, "/");
    const workspace = workspacePath(fullPath);
    const sourceKey = sourceKeyFromPath(workspace);
    const build = builds[sourceKey] || (model.build?.source === workspace ? model.build : null);
    const meta = model.sourceMeta?.[sourceKey] || {};
    const sourceLabel = sourceLabelPath(group, sourceKey);
    const paths = modelBuildPaths(group, sourceKey);
    const legacyPaths = modelBuildPaths(group);
    const buildDir = build?.engine ? path.dirname(hostPathFromWorkspace(build.engine)) : paths.dir;
    const enginePath = build?.engine ? hostPathFromWorkspace(build.engine) : paths.engine;
    const onnxPath = build?.onnx ? hostPathFromWorkspace(build.onnx) : paths.onnx;
    const parserPath = build?.customLib ? hostPathFromWorkspace(build.customLib) : paths.parserLib;
    const labelsPath = build?.labels ? hostPathFromWorkspace(build.labels) : usableFileStat(paths.labels) ? paths.labels : sourceLabel;
    const labels = readLabelLines(labelsPath);
    const isActive = model.source === workspace || model.engine === build?.engine;
    const isBuilt = Boolean(buildHasRunnableArtifacts(build, paths));
    files.push({
      id: Buffer.from(relative).toString("base64url"),
      group,
      sourceKey,
      name: entry.name,
      displayName: build?.modelName || meta.modelName || entry.name,
      description: build?.description || meta.description || "",
      relativePath: relative,
      path: workspace,
      url: `/models/${group}/${relative}`,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      roles: isActive ? ["active_source"] : [],
      inUse: isActive,
      built: isBuilt,
      buildStatus: isBuilt ? (isDeepStreamRuntimeBuild(build) ? "ready_for_deepstream" : "built") : "not_built",
      buildUpdatedAt: build?.updatedAt || null,
      profile: normalizeModelProfile(build?.profile || meta.profile || model.profile),
      task: build?.task || model.build?.task || "",
      inspectedAt: meta.inspect?.inspectedAt || null,
      inspectDetected: meta.inspect?.detected || null,
      inspect: meta.inspect || null,
      buildOptions: meta.buildOptions || build?.buildOptions || null,
      lastDummyTest: meta.lastDummyTest || null,
      engineBuildMethod: build?.engineBuildMethod || "",
      deepstreamYoloRef: build?.deepstreamYoloRef || "",
      labelsUploaded: Boolean(usableFileStat(sourceLabel)),
      labelsPath: usableFileStat(sourceLabel) ? workspacePath(sourceLabel) : "",
      labels,
      labelCount: labels.length,
      artifacts: {
        buildDir: workspacePath(buildDir),
        onnx: build?.onnx || (usableFileStat(onnxPath) ? workspacePath(onnxPath) : ""),
        engine: build?.engine || (usableFileStat(enginePath) ? workspacePath(enginePath) : ""),
        labels: build?.labels || (usableFileStat(paths.labels) ? workspacePath(paths.labels) : ""),
        customLib: build?.customLib || (usableFileStat(parserPath) ? workspacePath(parserPath) : ""),
        legacyBuildDir: usableFileStat(legacyPaths.engine) ? workspacePath(legacyPaths.dir) : ""
      }
    });
  }

  return files.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function findModelSourcePath(group, sourceKey, config = null) {
  group = sanitizeModelGroup(group);
  sourceKey = sanitizeSourceKey(sourceKey);
  const currentConfig = config || await getConfig();
  const model = currentConfig.models?.[group] || {};
  const directSource = hostPathFromWorkspace(model.source);
  if (directSource && fs.existsSync(directSource) && sourceKeyFromPath(directSource) === sourceKey) {
    return directSource;
  }

  const sourceDir = path.join(MODELS_DIR, group, "source");
  let entries = [];
  try {
    entries = await fsp.readdir(sourceDir, { withFileTypes: true });
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const candidate = path.join(sourceDir, entry.name);
    if (sourceKeyFromPath(candidate) === sourceKey) return candidate;
  }
  return "";
}

function modelInspectScript() {
  return String.raw`
import json
import os
import sys

path = sys.argv[1]
ext = os.path.splitext(path)[1].lower()
name_hint = os.path.basename(path).lower()
version_hint = ""
for token in ["yolov13", "yolov12", "yolo11", "yolov10", "yolov9", "yolov8", "yolov7", "yolov5"]:
    if token in name_hint:
        version_hint = token
        break
result = {
    "path": path,
    "fileName": os.path.basename(path),
    "type": ext.replace(".", ""),
    "inputs": [],
    "outputs": [],
    "metadata": {},
    "detected": {"modelVersionHint": version_hint},
    "warnings": []
}

def shape_from_value(value):
    dims = []
    tensor_type = value.type.tensor_type
    for dim in tensor_type.shape.dim:
        if dim.dim_value:
            dims.append(int(dim.dim_value))
        elif dim.dim_param:
            dims.append(str(dim.dim_param))
        else:
            dims.append(None)
    return dims

try:
    if ext == ".onnx":
        import onnx
        model = onnx.load(path)
        graph = model.graph
        result["metadata"] = {
            "irVersion": getattr(model, "ir_version", None),
            "producerName": getattr(model, "producer_name", ""),
            "producerVersion": getattr(model, "producer_version", ""),
            "opsets": [{"domain": item.domain or "ai.onnx", "version": int(item.version)} for item in model.opset_import],
        }
        initializer_names = {item.name for item in graph.initializer}
        for value in graph.input:
            if value.name in initializer_names:
                continue
            result["inputs"].append({"name": value.name, "shape": shape_from_value(value)})
        for value in graph.output:
            result["outputs"].append({"name": value.name, "shape": shape_from_value(value)})

        first_input = result["inputs"][0]["shape"] if result["inputs"] else []
        fixed_batch = isinstance(first_input[0], int) and first_input[0] > 0 if len(first_input) >= 1 else False
        image_size = None
        if len(first_input) == 4:
            h, w = first_input[2], first_input[3]
            if isinstance(h, int) and isinstance(w, int):
                image_size = max(h, w)
        output_names = [item["name"].lower() for item in result["outputs"]]
        output_shapes = [item["shape"] for item in result["outputs"]]
        output_kind = "unknown"
        if {"boxes", "scores", "classes"}.issubset(set(output_names)):
            output_kind = "boxes_scores_classes"
        elif any("mask" in name or "proto" in name for name in output_names):
            output_kind = "segmentation_like"
        elif any("keypoint" in name or "kpt" in name or "pose" in name for name in output_names):
            output_kind = "pose_like"
        elif len(output_shapes) == 1 and len(output_shapes[0]) == 3:
            output_kind = "raw_yolo_like"
        elif len(output_shapes) == 1 and len(output_shapes[0]) == 2:
            output_kind = "classification_like"
        result["detected"] = {
            "modelVersionHint": version_hint,
            "fixedBatch": bool(fixed_batch),
            "batchSize": first_input[0] if fixed_batch else None,
            "imageSize": image_size,
            "outputKind": output_kind,
            "outputCount": len(result["outputs"])
        }
    elif ext == ".pt":
        from ultralytics import YOLO
        model = YOLO(path)
        names = getattr(model, "names", None) or {}
        if isinstance(names, dict):
            labels = [names[key] for key in sorted(names.keys(), key=lambda value: int(value) if str(value).isdigit() else str(value))]
        else:
            labels = list(names or [])
        task = getattr(model, "task", "") or "detect"
        result["metadata"] = {
            "task": task,
            "labelCount": len(labels),
            "labelsPreview": labels[:20]
        }
        result["detected"] = {
            "modelVersionHint": version_hint,
            "task": task,
            "outputKind": f"ultralytics_{task}",
            "imageSize": None,
            "fixedBatch": False,
            "batchSize": None
        }
    else:
        result["warnings"].append(f"Unsupported model extension: {ext}")
except Exception as exc:
    result["error"] = str(exc)

print(json.dumps(result, ensure_ascii=False))
`;
}

function inspectRecommendations(group, sourcePath, model, inspect, labels) {
  const sourceExt = path.extname(sourcePath || "").toLowerCase();
  const sourceKey = sourceKeyFromPath(sourcePath);
  const detected = inspect.detected || {};
  const profile = normalizeModelProfile(model.profile || model.sourceMeta?.[sourceKey]?.profile);
  const labelCount = labels.length;
  const warnings = [...(inspect.warnings || [])];
  const recommendations = [];
  const suggested = {
    profile,
    task: detected.task || (profile === "yolo_segmentation" ? "segment" : profile === "yolo_pose" ? "pose" : profile === "yolo_classification" ? "classify" : "detect"),
    yoloVersion: detected.modelVersionHint || model.yoloVersion || "yolov8",
    imageSize: detected.imageSize || 640,
    buildBatchSize: detected.fixedBatch && detected.batchSize ? detected.batchSize : 1,
    numClasses: labelCount > 0 ? inferredNumClasses(group, labelCount, model.numClasses) : model.numClasses || null,
    engineBuildMethod: "runtime-trtexec",
    buildParser: !["custom_onnx", "yolo_classification"].includes(profile),
    forceImplicitBatchDim: false,
    scalingFilter: null,
    preClusterThreshold: null,
    topk: null
  };

  if (sourceExt === ".onnx" && !labelCount) {
    warnings.push("ONNX does not contain a DeepStream labels.txt. Upload labels.txt before building runtime artifacts.");
  }
  if (detected.imageSize) recommendations.push(`Set Image size to ${detected.imageSize}.`);
  if (detected.fixedBatch && detected.batchSize) {
    recommendations.push(`ONNX has fixed batch ${detected.batchSize}. Keep build/runtime batch choices deliberate and do not reuse engines across JetPack/TensorRT versions.`);
  }
  if (labelCount > 0) {
    recommendations.push(`labels.txt has ${labelCount} labels; suggested num classes is ${suggested.numClasses}.`);
  }

  if (detected.outputKind === "raw_yolo_like") {
    suggested.profile = profile === "custom_onnx" ? "yolo_detection" : profile;
    suggested.buildParser = true;
    recommendations.push("Output looks like raw YOLO detection. Use the matching YOLO profile/parser and runtime-matched trtexec.");
  } else if (detected.outputKind === "boxes_scores_classes") {
    suggested.engineBuildMethod = "deepstream-runtime";
    if (isPlateCharacterGroup(group)) {
      suggested.deepstreamYoloRef = "profile:plate_ocr_yolov8_36";
    }
    suggested.forceImplicitBatchDim = true;
    suggested.scalingFilter = 2;
    suggested.preClusterThreshold = 0.4;
    suggested.topk = 200;
    recommendations.push("Output is already boxes/scores/classes. This is not the normal raw YOLO output; use the legacy/custom parser profile that matches the training project.");
  } else if (detected.outputKind === "segmentation_like") {
    suggested.profile = "yolo_segmentation";
    suggested.task = "segment";
    recommendations.push("Output looks segmentation-like. Use YOLO Segmentation profile and segmentation parser settings.");
  } else if (detected.outputKind === "pose_like") {
    suggested.profile = "yolo_pose";
    suggested.task = "pose";
    recommendations.push("Output looks pose/keypoint-like. Use YOLO Pose profile and pose parser settings.");
  } else if (detected.outputKind === "classification_like") {
    suggested.profile = "yolo_classification";
    suggested.task = "classify";
    suggested.buildParser = false;
    recommendations.push("Output looks classification-like. Build classifier engine without a YOLO bbox parser.");
  } else if (sourceExt === ".pt") {
    recommendations.push("For .pt sources, choose the Model profile that matches the Ultralytics task, then export/build.");
  } else {
    warnings.push("Cannot confidently infer output family. Compare input/output names with the source model repo before building.");
  }

  if (isPlateCharacterGroup(group)) {
    recommendations.push("For this plate character model family, keep legacy OCR post-process assumptions: boxes/scores/classes outputs, sorted character detections, threshold around 0.4, topk around 200.");
  }

  return { suggested, warnings: [...new Set(warnings)], recommendations: [...new Set(recommendations)] };
}

function normalizeBuildConfig(group, input = {}, inspect = null, model = {}) {
  const suggested = inspect?.suggested || {};
  const profile = normalizeModelProfile(input.profile || suggested.profile || model.profile || "yolo_detection");
  const profileSpec = modelProfileSpec(profile);
  const sourceType = String(input.sourceType || "").toLowerCase();
  const ext = String(input.sourceExt || "").toLowerCase();
  const isOnnx = sourceType === "onnx" || ext === ".onnx";
  const buildParserDefault = !["custom_onnx", "yolo_classification"].includes(profile);
  return {
    sourceType: isOnnx ? "onnx" : "pt",
    profile,
    task: String(input.task || suggested.task || profileSpec.task || "detect"),
    yoloVersion: String(input.yoloVersion || suggested.yoloVersion || model.yoloVersion || "yolov8").toLowerCase(),
    imgsz: Math.max(32, Number(input.imgsz || suggested.imageSize || 640)),
    opset: Math.max(11, Number(input.opset || 17)),
    batchSize: Math.max(1, Number(input.batchSize || suggested.buildBatchSize || 1)),
    workspaceMb: Math.max(256, Number(input.workspaceMb || 2048)),
    fp16: parseBool(input.fp16, true),
    simplify: parseBool(input.simplify, !isOnnx),
    dynamic: parseBool(input.dynamic, false),
    buildEngine: parseBool(input.buildEngine, true),
    engineBuildMethod: String(input.engineBuildMethod || suggested.engineBuildMethod || "runtime-trtexec"),
    buildParser: parseBool(input.buildParser, suggested.buildParser ?? buildParserDefault),
    numClasses: Number(input.numClasses || suggested.numClasses || model.numClasses || 0) || undefined,
    deepstreamYoloRef: String(input.deepstreamYoloRef || suggested.deepstreamYoloRef || model.deepstreamYoloRef || "").trim(),
    forceImplicitBatchDim: parseBool(input.forceImplicitBatchDim, suggested.forceImplicitBatchDim || false),
    scalingFilter: input.scalingFilter ?? suggested.scalingFilter ?? "",
    preClusterThreshold: input.preClusterThreshold ?? suggested.preClusterThreshold ?? "",
    topk: input.topk ?? suggested.topk ?? ""
  };
}

function applySavedBuildOptions(options = {}, saved = {}) {
  return {
    ...saved,
    ...options,
    profile: options.profile || saved.profile,
    task: options.task || saved.task,
    yoloVersion: options.yoloVersion || saved.yoloVersion,
    imgsz: options.imgsz || saved.imgsz,
    opset: options.opset || saved.opset,
    batchSize: options.batchSize || saved.batchSize,
    workspaceMb: options.workspaceMb || saved.workspaceMb,
    engineBuildMethod: options.engineBuildMethod || saved.engineBuildMethod,
    buildParser: options.buildParser ?? saved.buildParser,
    buildEngine: options.buildEngine ?? saved.buildEngine,
    fp16: options.fp16 ?? saved.fp16,
    simplify: options.simplify ?? saved.simplify,
    dynamic: options.dynamic ?? saved.dynamic,
    numClasses: options.numClasses || saved.numClasses,
    deepstreamYoloRef: options.deepstreamYoloRef || saved.deepstreamYoloRef,
    forceImplicitBatchDim: options.forceImplicitBatchDim ?? saved.forceImplicitBatchDim,
    scalingFilter: options.scalingFilter ?? saved.scalingFilter,
    preClusterThreshold: options.preClusterThreshold ?? saved.preClusterThreshold,
    topk: options.topk ?? saved.topk
  };
}

async function inspectModelSource(group, sourceKey) {
  group = sanitizeModelGroup(group);
  sourceKey = sanitizeSourceKey(sourceKey);
  const config = await getConfig();
  const model = config.models[group] || {};
  const sourcePath = await findModelSourcePath(group, sourceKey, config);
  if (!sourcePath) throw new Error(`Cannot find source model ${sourceKey} in ${group}.`);
  const summary = await inspectSourcePath(group, sourceKey, sourcePath, model);
  model.sourceMeta = {
    ...(model.sourceMeta || {}),
    [sourceKey]: {
      ...(model.sourceMeta?.[sourceKey] || {}),
      inspect: summary,
      buildOptions: normalizeBuildConfig(group, model.sourceMeta?.[sourceKey]?.buildOptions || {}, summary, model)
    }
  };
  config.models[group] = model;
  await writeJson(CONFIG_FILE, config);
  return { group, sourceKey, inspect: summary, raw: summary.raw };
}

async function inspectSourcePath(group, sourceKey, sourcePath, model = {}, labelsPath = "") {
  await ensureModelBuilderImage();
  const result = await runModelBuilder(["python3", "-c", modelInspectScript(), workspacePath(sourcePath)]);
  if (result.code !== 0) {
    const error = new Error(`Model inspect failed:\n${result.output}`);
    error.output = result.output;
    throw error;
  }

  const jsonLine = result.output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse().find((line) => line.startsWith("{"));
  if (!jsonLine) throw new Error(`Model inspect did not return JSON.\n${result.output}`);
  const inspect = JSON.parse(jsonLine);
  const sourceLabel = sourceLabelPath(group, sourceKey);
  const buildLabels = modelBuildPaths(group, sourceKey).labels;
  const activeLabels = hostPathFromWorkspace(model.sourceLabels?.[sourceKey] || "");
  const labelPath = [labelsPath, activeLabels, sourceLabel, buildLabels].find((candidate) => candidate && usableFileStat(candidate)) || "";
  const labels = readLabelLines(labelPath);
  const advice = inspectRecommendations(group, sourcePath, model, inspect, labels);
  return {
    sourceKey,
    source: workspacePath(sourcePath),
    inspectedAt: new Date().toISOString(),
    type: inspect.type,
    inputs: inspect.inputs,
    outputs: inspect.outputs,
    metadata: inspect.metadata,
    detected: inspect.detected,
    labels: {
      path: labelPath ? workspacePath(labelPath) : "",
      count: labels.length,
      preview: labels.slice(0, 30)
    },
    ...advice,
    raw: inspect
  };
}

async function savePendingModelSource(payload = {}) {
  const group = sanitizeModelGroup(payload.group || payload.modelName);
  const pendingSource = hostPathFromWorkspace(payload.sourcePath || payload.source);
  if (!pendingSource || !fs.existsSync(pendingSource) || !pendingSource.startsWith(MODEL_PENDING_DIR)) {
    throw new Error("Pending source model was not found. Upload the source again.");
  }
  const sourceExt = path.extname(pendingSource).toLowerCase();
  const sourceBase = path.basename(pendingSource, sourceExt).replace(/[^a-zA-Z0-9_-]/g, "_");
  const sourceDir = path.join(MODELS_DIR, group, "source");
  await fsp.mkdir(sourceDir, { recursive: true });
  const finalSource = path.join(sourceDir, `${sourceBase}${sourceExt}`);
  await fsp.rename(pendingSource, finalSource);
  const sourceKey = sourceKeyFromPath(finalSource);

  const config = await getConfig();
  const model = config.models[group] || {};
  const pendingLabel = hostPathFromWorkspace(payload.labelsPath || payload.labels || "");
  let labelsWorkspace = "";
  if (pendingLabel && fs.existsSync(pendingLabel) && pendingLabel.startsWith(MODEL_PENDING_DIR)) {
    const labelsPath = sourceLabelPath(group, sourceKey);
    await fsp.mkdir(path.dirname(labelsPath), { recursive: true });
    await fsp.rename(pendingLabel, labelsPath);
    labelsWorkspace = workspacePath(labelsPath);
    model.sourceLabels = {
      ...(model.sourceLabels || {}),
      [sourceKey]: labelsWorkspace
    };
    model.labels = labelsWorkspace;
  }

  const modelName = String(payload.modelName || group).trim();
  const description = String(payload.description || "").trim();
  const inspect = await inspectSourcePath(group, sourceKey, finalSource, model, labelsWorkspace ? hostPathFromWorkspace(labelsWorkspace) : "");
  const buildOptions = normalizeBuildConfig(group, {
    ...(payload.buildOptions || {}),
    sourceExt
  }, inspect, model);
  model.source = workspacePath(finalSource);
  model.sourceKey = sourceKey;
  model.profile = buildOptions.profile;
  model.yoloVersion = buildOptions.yoloVersion;
  model.numClasses = buildOptions.numClasses || model.numClasses;
  model.sourceOriginalName = payload.originalName || path.basename(finalSource);
  model.sourceUploadedAt = new Date().toISOString();
  model.sourceMeta = {
    ...(model.sourceMeta || {}),
    [sourceKey]: {
      modelName,
      description,
      profile: buildOptions.profile,
      originalName: model.sourceOriginalName,
      uploadedAt: model.sourceUploadedAt,
      inspect,
      buildOptions
    }
  };
  config.models[group] = model;
  await writeJson(CONFIG_FILE, config);
  return { group, sourceKey, model: config.models[group], files: await listModelFiles(group), config };
}

async function updateModelSourceBuildConfig(group, sourceKey, input = {}) {
  group = sanitizeModelGroup(group);
  sourceKey = sanitizeSourceKey(sourceKey);
  const config = await getConfig();
  const model = config.models[group] || {};
  const sourcePath = await findModelSourcePath(group, sourceKey, config);
  if (!sourcePath) throw new Error(`Cannot find source model ${sourceKey} in ${group}.`);
  const meta = model.sourceMeta?.[sourceKey] || {};
  const inspect = input.inspect || meta.inspect || await inspectSourcePath(group, sourceKey, sourcePath, model);
  const buildOptions = normalizeBuildConfig(group, {
    ...(meta.buildOptions || {}),
    ...(input.buildOptions || input),
    sourceExt: path.extname(sourcePath).toLowerCase()
  }, inspect, model);
  model.profile = buildOptions.profile;
  model.yoloVersion = buildOptions.yoloVersion;
  model.numClasses = buildOptions.numClasses || model.numClasses;
  model.sourceMeta = {
    ...(model.sourceMeta || {}),
    [sourceKey]: {
      ...meta,
      modelName: String(input.modelName || meta.modelName || group).trim(),
      description: String(input.description ?? meta.description ?? "").trim(),
      profile: buildOptions.profile,
      inspect,
      buildOptions,
      updatedAt: new Date().toISOString()
    }
  };
  config.models[group] = model;
  await writeJson(CONFIG_FILE, config);
  return { group, sourceKey, buildOptions, files: await listModelFiles(group), config };
}

function modelDummyTestScript() {
  return String.raw`
import json
import os
import sys

path = sys.argv[1]
imgsz = int(sys.argv[2])
batch = int(sys.argv[3])
ext = os.path.splitext(path)[1].lower()
result = {
    "path": path,
    "imgsz": imgsz,
    "batch": batch,
    "mode": "shape_check",
    "inputs": [],
    "outputs": [],
    "warnings": []
}

def summarize_tensor(value):
    try:
        import torch
        if isinstance(value, torch.Tensor):
            return {"shape": list(value.shape), "dtype": str(value.dtype)}
        if isinstance(value, (list, tuple)):
            return [summarize_tensor(item) for item in value]
        if isinstance(value, dict):
            return {str(key): summarize_tensor(item) for key, item in value.items()}
    except Exception:
        pass
    return str(type(value))

def shape_from_value(value):
    dims = []
    tensor_type = value.type.tensor_type
    for dim in tensor_type.shape.dim:
        if dim.dim_value:
            dims.append(int(dim.dim_value))
        elif dim.dim_param:
            dims.append(str(dim.dim_param))
        else:
            dims.append(None)
    return dims

try:
    if ext == ".pt":
        import torch
        from ultralytics import YOLO
        model = YOLO(path)
        model.model.eval()
        x = torch.zeros((batch, 3, imgsz, imgsz), dtype=torch.float32)
        with torch.no_grad():
            y = model.model(x)
        result["mode"] = "torch_dummy_forward"
        result["inputs"] = [{"name": "images", "shape": list(x.shape), "dtype": str(x.dtype)}]
        result["outputs"] = summarize_tensor(y)
    elif ext == ".onnx":
        import onnx
        model = onnx.load(path)
        onnx.checker.check_model(model)
        for value in model.graph.input:
            result["inputs"].append({"name": value.name, "shape": shape_from_value(value)})
        for value in model.graph.output:
            result["outputs"].append({"name": value.name, "shape": shape_from_value(value)})
        result["mode"] = "onnx_checker_shape_check"
        result["warnings"].append("ONNX runtime execution is not required in the builder image; this validates graph and dummy-compatible tensor shapes only.")
    else:
        raise RuntimeError(f"Unsupported extension: {ext}")
except Exception as exc:
    result["error"] = str(exc)

print(json.dumps(result, ensure_ascii=False))
`;
}

async function testModelSourceBuild(group, sourceKey) {
  group = sanitizeModelGroup(group);
  sourceKey = sanitizeSourceKey(sourceKey);
  const config = await getConfig();
  const model = config.models[group] || {};
  const sourcePath = await findModelSourcePath(group, sourceKey, config);
  if (!sourcePath) throw new Error(`Cannot find source model ${sourceKey} in ${group}.`);
  const meta = model.sourceMeta?.[sourceKey] || {};
  const buildOptions = meta.buildOptions || {};
  const inspect = meta.inspect || await inspectSourcePath(group, sourceKey, sourcePath, model);
  const imgsz = Number(buildOptions.imgsz || inspect.suggested?.imageSize || inspect.detected?.imageSize || 640);
  const batch = Math.max(1, Math.min(4, Number(buildOptions.batchSize || 1)));
  await ensureModelBuilderImage();
  const result = await runModelBuilder(["python3", "-c", modelDummyTestScript(), workspacePath(sourcePath), String(imgsz), String(batch)]);
  if (result.code !== 0) {
    const error = new Error(`Model dummy test failed:\n${result.output}`);
    error.output = result.output;
    throw error;
  }
  const jsonLine = result.output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse().find((line) => line.startsWith("{"));
  if (!jsonLine) throw new Error(`Model dummy test did not return JSON.\n${result.output}`);
  const test = JSON.parse(jsonLine);
  model.sourceMeta = {
    ...(model.sourceMeta || {}),
    [sourceKey]: {
      ...meta,
      inspect,
      lastDummyTest: {
        testedAt: new Date().toISOString(),
        test
      }
    }
  };
  config.models[group] = model;
  await writeJson(CONFIG_FILE, config);
  return { group, sourceKey, test, files: await listModelFiles(group) };
}

async function listModelGroups() {
  const config = await getConfig();
  const candidates = new Set(Object.keys(config.models || {}));
  let entries = [];
  try {
    entries = await fsp.readdir(MODELS_DIR, { withFileTypes: true });
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    if (entry.isDirectory()) candidates.add(entry.name);
  }

  const groups = [];
  for (const value of candidates) {
    let group = "";
    try {
      group = sanitizeModelGroup(value);
    } catch {
      continue;
    }
    const files = await listModelFiles(group);
    if (!files.length) continue;
    groups.push({
      group,
      displayName: files[0]?.displayName || group,
      fileCount: files.length,
      builtCount: files.filter((file) => file.built).length,
      files
    });
  }
  return groups.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function decodeModelFileId(fileId) {
  const relative = Buffer.from(String(fileId || ""), "base64url").toString("utf8");
  const normalized = relative.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error("Invalid model file id.");
  }
  return normalized;
}

async function deleteModelFile(group, fileId) {
  group = sanitizeModelGroup(group);
  const relative = decodeModelFileId(fileId);
  const groupDir = path.join(MODELS_DIR, group);
  const fullPath = path.resolve(groupDir, relative);
  const resolvedGroupDir = path.resolve(groupDir);
  if (!fullPath.startsWith(`${resolvedGroupDir}${path.sep}`)) {
    throw new Error("Invalid model file path.");
  }
  if (!fs.existsSync(fullPath)) {
    throw new Error("Model file not found.");
  }

  const config = await getConfig();
  const model = config.models[group] || {};
  const deletedWorkspacePath = workspacePath(fullPath);
  const sourceKey = sourceKeyFromPath(deletedWorkspacePath);
  const build = model.builds?.[sourceKey] || (model.build?.source === deletedWorkspacePath ? model.build : null);
  let archivedBuild = "";

  if (relative.startsWith("source/") && build) {
    const buildDir = build.engine ? path.dirname(hostPathFromWorkspace(build.engine)) : modelBuildPaths(group, sourceKey).dir;
    if (fs.existsSync(buildDir)) {
      const archiveDir = path.join(MODEL_ARCHIVE_DIR, group, `${sourceKey}_${Date.now()}`);
      await fsp.mkdir(path.dirname(archiveDir), { recursive: true });
      await fsp.rename(buildDir, archiveDir);
      archivedBuild = workspacePath(archiveDir);
    }
    if (model.builds) delete model.builds[sourceKey];
    if (model.sourceMeta) delete model.sourceMeta[sourceKey];
    if (model.build?.source === deletedWorkspacePath) delete model.build;
  }

  await fsp.unlink(fullPath);

  for (const key of ["source", "onnx", "engine", "labels", "customLib"]) {
    if (model[key] === deletedWorkspacePath) delete model[key];
    if (build && model[key] === build[key]) delete model[key];
  }
  if (model.build?.log === deletedWorkspacePath) delete model.build.log;
  if (model.source === undefined) {
    delete model.sourceOriginalName;
    delete model.sourceUploadedAt;
  }
  config.models[group] = model;
  await writeJson(CONFIG_FILE, config);
  await generateRuntime(config).catch(() => {});
  return { deleted: deletedWorkspacePath, archivedBuild, files: await listModelFiles(group), config };
}

function dockerPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function dockerRuntimeArgs() {
  return String(process.env.DOCKER_RUNTIME_ARGS || "--runtime nvidia")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dockerCudaEnv() {
  return CUDA_VER ? ["-e", `CUDA_VER=${CUDA_VER}`] : [];
}

function builderContainerArgs(command) {
  return [
    "run",
    "--rm",
    "--network", "host",
    ...dockerRuntimeArgs(),
    ...dockerCudaEnv(),
    "-e", "PYTHONUNBUFFERED=1",
    "-v", `${dockerPath(APP_ROOT)}:${MODEL_BUILDER_WORKDIR}`,
    "-w", MODEL_BUILDER_WORKDIR,
    MODEL_BUILDER_IMAGE,
    ...command
  ];
}

async function dockerImageExists(image) {
  const inspect = await runCommand("docker", ["image", "inspect", image], { cwd: APP_ROOT });
  return inspect.code === 0;
}

async function ensureModelBuilderImage() {
  if (!MODEL_BUILDER_FORCE_BUILD && await dockerImageExists(MODEL_BUILDER_IMAGE)) {
    return { output: `Image exists: ${MODEL_BUILDER_IMAGE}` };
  }
  if (!MODEL_BUILDER_AUTO_BUILD) {
    throw new Error(`Model builder image is missing: ${MODEL_BUILDER_IMAGE}. Enable MODEL_BUILDER_AUTO_BUILD or build it manually.`);
  }
  if (!fs.existsSync(MODEL_BUILDER_DOCKERFILE)) {
    throw new Error(`Model builder Dockerfile not found: ${MODEL_BUILDER_DOCKERFILE}`);
  }

  const build = await runCommand("docker", [
    "build",
    "-f", MODEL_BUILDER_DOCKERFILE,
    "--build-arg", `BASE_IMAGE=${MODEL_BUILDER_BASE_IMAGE}`,
    "-t", MODEL_BUILDER_IMAGE,
    APP_ROOT
  ], { cwd: APP_ROOT });
  if (build.code !== 0) {
    const error = new Error(`Model builder image build failed:\n${build.output}`);
    error.output = build.output;
    throw error;
  }
  return { output: `Built image: ${MODEL_BUILDER_IMAGE}\nBase image: ${MODEL_BUILDER_BASE_IMAGE}\nForce build: ${MODEL_BUILDER_FORCE_BUILD ? "yes" : "no"}\n${build.output}` };
}

async function runModelBuilder(command) {
  return await runCommand("docker", builderContainerArgs(command), { cwd: APP_ROOT });
}

function trtexecCommand() {
  return process.env.TRTEXEC_PATH_IN_BUILDER || process.env.TRTEXEC_PATH || "/usr/src/tensorrt/bin/trtexec";
}

function tensorRtMajorMinor(value) {
  const match = String(value || "").match(/(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}` : "";
}

async function modelBuilderTensorRtVersion() {
  const result = await runModelBuilder([
    "bash",
    "-lc",
    [
      "set -e",
      "python3 - <<'PY'",
      "try:",
      "    import tensorrt as trt",
      "    print(trt.__version__)",
      "except Exception:",
      "    pass",
      "PY"
    ].join("\n")
  ]);
  if (result.code !== 0) {
    const error = new Error(`Cannot read TensorRT version from model-builder image ${MODEL_BUILDER_IMAGE}.\n${result.output}`);
    error.output = result.output;
    throw error;
  }
  const version = result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^\d+\.\d+/.test(line));
  return { version: version || "", output: result.output };
}

async function assertBuilderTrtexecMatchesRuntime() {
  if (!tensorRtMajorMinor(TENSORRT_VERSION)) {
    return "Detected runtime TensorRT version is unknown; builder trtexec compatibility check skipped.";
  }
  const builder = await modelBuilderTensorRtVersion();
  const builderVersion = tensorRtMajorMinor(builder.version);
  const runtimeVersion = tensorRtMajorMinor(TENSORRT_VERSION);
  if (!builderVersion) {
    throw new Error(
      `Cannot verify TensorRT in model-builder image ${MODEL_BUILDER_IMAGE}. ` +
      "Use Auto / Runtime trtexec, or provide a builder image with Python TensorRT installed."
    );
  }
  if (builderVersion !== runtimeVersion) {
    throw new Error(
      `Builder trtexec TensorRT ${builder.version} does not match detected DeepStream runtime TensorRT ${TENSORRT_VERSION}. ` +
      "Use Auto / Runtime trtexec so the engine is built by trtexec inside the selected DeepStream runtime image, " +
      "or replace MODEL_BUILDER_BASE_IMAGE with a builder image that matches this Jetson profile."
    );
  }
  return `Builder TensorRT ${builder.version} matches runtime TensorRT ${TENSORRT_VERSION}.`;
}

async function ensureDeepStreamYoloRepo() {
  return await ensureDeepStreamYoloRepoAtRef(DEEPSTREAM_YOLO_REF);
}

async function ensureDeepStreamYoloRepoAtRef(ref = DEEPSTREAM_YOLO_REF) {
  return await ensureModelProfileRepo(modelProfileSpec("yolo_detection"), ref);
}

async function ensureModelProfileRepo(profile, ref = profile.ref) {
  if (!profile.repo || !profile.repoName) {
    throw new Error(`Model profile ${profile.id || "unknown"} does not have an automatic parser/export repo.`);
  }
  const repoDir = path.join(THIRD_PARTY_DIR, profile.repoName);
  const gitDir = path.join(repoDir, ".git");
  const safeDir = await runCommand("git", ["config", "--global", "--add", "safe.directory", repoDir], { cwd: APP_ROOT });
  if (safeDir.code !== 0) {
    throw new Error(`Cannot mark ${profile.repoName} repo as a safe Git directory.\n${safeDir.output}`);
  }

  if (!fs.existsSync(gitDir)) {
    await fsp.rm(repoDir, { recursive: true, force: true });
    const clone = await runCommand("git", ["clone", "--depth", "1", profile.repo, repoDir], { cwd: APP_ROOT });
    if (clone.code !== 0) {
      throw new Error(`Cannot clone ${profile.repoName} repo.\n${clone.output}`);
    }
  }

  const fetch = await runCommand("git", ["fetch", "--depth", "1", "origin", ref], { cwd: repoDir });
  if (fetch.code !== 0) {
    throw new Error(`Cannot fetch ${profile.repoName} ref ${ref}.\n${fetch.output}`);
  }
  const checkout = await runCommand("git", ["checkout", "--detach", ref], { cwd: repoDir });
  if (checkout.code !== 0) {
    const fetchedHead = await runCommand("git", ["checkout", "--detach", "FETCH_HEAD"], { cwd: repoDir });
    if (fetchedHead.code !== 0) {
      throw new Error(`Cannot checkout ${profile.repoName} ref ${ref}.\n${checkout.output}\n${fetchedHead.output}`);
    }
  }
  return repoDir;
}

async function buildDeepStreamYoloParser(config, group, paths, repoDir = null, ref = DEEPSTREAM_YOLO_REF, profile = modelProfileSpec("yolo_detection")) {
  if (isParserProfile(ref)) {
    return await buildParserProfile(config, paths, parserProfileName(ref));
  }
  repoDir = repoDir || await ensureModelProfileRepo(profile, ref);
  const mountedRepoDir = `/workspace/deepstream-lpr-app/runtime/third_party/${profile.repoName}`;
  const mountedOutput = workspacePath(paths.parserLib);
  const compileCommand = [
    "set -e",
    "command -v g++ >/dev/null || (apt-get update && apt-get install -y build-essential)",
    "command -v make >/dev/null || (apt-get update && apt-get install -y make)",
    "CUDA_VER=${CUDA_VER:-$(nvcc --version | sed -n 's/.*release \\([0-9][0-9]*\\.[0-9][0-9]*\\).*/\\1/p' | head -n1)}",
    "test -n \"$CUDA_VER\"",
    "if [ ! -d \"/usr/local/cuda-$CUDA_VER\" ] && [ -d /usr/local/cuda ]; then ln -sfn /usr/local/cuda \"/usr/local/cuda-$CUDA_VER\"; fi",
    `make -C ${mountedRepoDir}/${profile.parserDir} clean CUDA_VER=$CUDA_VER`,
    `make -C ${mountedRepoDir}/${profile.parserDir} CUDA_VER=$CUDA_VER`,
    `cp ${mountedRepoDir}/${profile.parserDir}/${profile.parserLib} ${mountedOutput}`
  ].join(" && ");
  const result = await runCommand("docker", [
    "run",
    "--rm",
    "--network", "host",
    ...dockerRuntimeArgs(),
    ...dockerCudaEnv(),
    "-v", `${dockerPath(APP_ROOT)}:/workspace/deepstream-lpr-app`,
    "-v", `${dockerPath(repoDir)}:${mountedRepoDir}`,
    "-w", "/workspace/deepstream-lpr-app",
    config.deepstreamImage,
    "bash",
    "-lc",
    compileCommand
  ], { cwd: APP_ROOT });

  if (result.code !== 0) {
    throw new Error(`${profile.label} parser build failed. Make sure Docker can run the DeepStream image and CUDA_VER matches your Jetson/DeepStream image.\n${result.output}`);
  }

  if (!fs.existsSync(paths.parserLib)) {
    throw new Error(`${profile.label} parser build finished but output .so was not found.`);
  }
  return `${profile.repoName} ref: ${ref}\n${result.output}`;
}

async function buildParserProfile(config, paths, profileName) {
  const profileDir = path.join(PARSER_PROFILES_DIR, profileName, "nvdsinfer_custom_impl_Yolo");
  if (!fs.existsSync(profileDir)) {
    throw new Error(`Parser profile not found: ${profileName}`);
  }
  const mountedProfileDir = `/workspace/deepstream-lpr-app/parser-profiles/${profileName}/nvdsinfer_custom_impl_Yolo`;
  const mountedOutput = workspacePath(paths.parserLib);
  const compileCommand = [
    "set -e",
    "command -v g++ >/dev/null || (apt-get update && apt-get install -y build-essential)",
    "command -v make >/dev/null || (apt-get update && apt-get install -y make)",
    "CUDA_VER=${CUDA_VER:-$(nvcc --version | sed -n 's/.*release \\([0-9][0-9]*\\.[0-9][0-9]*\\).*/\\1/p' | head -n1)}",
    "test -n \"$CUDA_VER\"",
    "if [ ! -d \"/usr/local/cuda-$CUDA_VER\" ] && [ -d /usr/local/cuda ]; then ln -sfn /usr/local/cuda \"/usr/local/cuda-$CUDA_VER\"; fi",
    "rm -rf /tmp/deepstream-lpr-parser-profile",
    `cp -a ${mountedProfileDir} /tmp/deepstream-lpr-parser-profile`,
    "make -C /tmp/deepstream-lpr-parser-profile clean CUDA_VER=$CUDA_VER",
    "make -C /tmp/deepstream-lpr-parser-profile CUDA_VER=$CUDA_VER",
    `cp /tmp/deepstream-lpr-parser-profile/libnvdsinfer_custom_impl_Yolo.so ${mountedOutput}`
  ].join(" && ");
  const result = await runCommand("docker", [
    "run",
    "--rm",
    "--network", "host",
    ...dockerRuntimeArgs(),
    ...dockerCudaEnv(),
    "-v", `${dockerPath(APP_ROOT)}:/workspace/deepstream-lpr-app`,
    "-w", "/workspace/deepstream-lpr-app",
    config.deepstreamImage,
    "bash",
    "-lc",
    compileCommand
  ], { cwd: APP_ROOT });

  if (result.code !== 0) {
    throw new Error(`Parser profile build failed for ${profileName}.\n${result.output}`);
  }
  if (!fs.existsSync(paths.parserLib)) {
    throw new Error(`Parser profile build finished but output .so was not found for ${profileName}.`);
  }
  return `Parser profile: ${profileName}\n${result.output}`;
}

async function buildRuntimeTrtexecEngine(config, paths, options = {}) {
  const fp16 = parseBool(options.fp16, true);
  const workspaceMb = Math.max(256, Number(options.workspaceMb || 1024));
  const mountedOnnx = workspacePath(paths.onnx);
  const mountedEngine = workspacePath(paths.engine);
  const command = [
    "set -e",
    "TR=$(command -v trtexec || find / -name trtexec 2>/dev/null | head -1)",
    "test -n \"$TR\"",
    [
      "\"$TR\"",
      `--onnx=${mountedOnnx}`,
      `--saveEngine=${mountedEngine}`,
      `--memPoolSize=workspace:${workspaceMb}`,
      "--builderOptimizationLevel=0",
      "--avgTiming=1",
      fp16 ? "--fp16" : ""
    ].filter(Boolean).join(" ")
  ].join(" && ");
  const result = await runCommand("docker", [
    "run",
    "--rm",
    "--network", "host",
    "--ipc", "host",
    "--privileged",
    ...dockerRuntimeArgs(),
    ...dockerCudaEnv(),
    "-e", "NVIDIA_VISIBLE_DEVICES=all",
    "-e", "NVIDIA_DRIVER_CAPABILITIES=all",
    "-v", `${dockerPath(APP_ROOT)}:/workspace/deepstream-lpr-app`,
    "-w", "/workspace/deepstream-lpr-app",
    config.deepstreamImage,
    "bash",
    "-lc",
    command
  ], { cwd: APP_ROOT });

  if (result.code !== 0) {
    throw new Error(`TensorRT engine build failed in DeepStream runtime image.\n${result.output}`);
  }
  if (!fs.existsSync(paths.engine)) {
    throw new Error("TensorRT engine build finished but output engine was not found.");
  }
  return result.output;
}

async function buildYoloModel(group, options = {}, onProgress = null) {
  const checkpoints = createCheckpoints([
    { id: "validate_source", label: "Validate source model" },
    { id: "prepare_workspace", label: "Prepare build workspace" },
    { id: "prepare_model_builder", label: "Prepare model-builder container" },
    { id: "sync_deepstream_yolo", label: "Sync DeepStream-Yolo repo" },
    { id: "export_onnx", label: "Export ONNX" },
    { id: "build_tensorrt", label: "Build TensorRT engine" },
    { id: "build_parser", label: "Build DeepStream parser" },
    { id: "write_runtime_config", label: "Write runtime config" }
  ]);
  notifyProgress(onProgress, checkpoints);
  const config = await getConfig();
  const model = config.models[group] || {};
  if (options.sourcePath) {
    model.source = options.sourcePath;
    model.sourceOriginalName = path.basename(hostPathFromWorkspace(options.sourcePath));
  }
  const source = hostPathFromWorkspace(model.source);
  await runCheckpoint(checkpoints, "validate_source", async () => {
    if (!source || !fs.existsSync(source)) {
      throw new Error(`Chua co source model cho ${group}. Upload .pt hoac .onnx truoc.`);
    }
    return { output: `Source: ${source}` };
  }, "Source model exists.", onProgress);
  if (!source || !fs.existsSync(source)) {
    throw new Error(`Chưa có source model cho ${group}. Upload .pt hoặc .onnx trước.`);
  }

  const sourceKey = sourceKeyFromPath(source);
  model.sourceKey = sourceKey;
  const sourceMeta = model.sourceMeta?.[sourceKey] || {};
  options = applySavedBuildOptions(options, sourceMeta.buildOptions || {});
  const profile = modelProfileSpec(options.profile || sourceMeta.profile || model.profile);
  const modelName = String(options.modelName || sourceMeta.modelName || model.sourceOriginalName || path.basename(source)).trim();
  const description = String(options.description || sourceMeta.description || "").trim();
  model.profile = profile.id;
  model.sourceMeta = {
    ...(model.sourceMeta || {}),
    [sourceKey]: {
      ...sourceMeta,
      modelName,
      description,
      profile: profile.id,
      originalName: model.sourceOriginalName || path.basename(source),
      updatedAt: new Date().toISOString()
    }
  };
  const paths = modelBuildPaths(group, sourceKey);
  const previousBuild = model.builds?.[sourceKey] || {};
  await runCheckpoint(checkpoints, "prepare_workspace", async () => {
    await fsp.mkdir(paths.dir, { recursive: true });
    return { output: `Build dir: ${paths.dir}` };
  }, "Build workspace ready.", onProgress);
  await fsp.mkdir(paths.dir, { recursive: true });

  await runCheckpoint(checkpoints, "prepare_model_builder", async () => {
    return await ensureModelBuilderImage();
  }, "Model-builder container ready.", onProgress);

  const imgsz = Math.max(32, Number(options.imgsz || 640));
  const opset = Math.max(11, Number(options.opset || 17));
  const batchSize = Math.max(1, Number(options.batchSize || previousBuild.batchSize || model.engineBatchSize || 1));
  const task = profile.task || options.task || "detect";
  const yoloVersion = String(options.yoloVersion || model.yoloVersion || "yolov8").toLowerCase();
  const simplify = parseBool(options.simplify, true);
  const dynamic = parseBool(options.dynamic, false);
  const buildEngine = parseBool(options.buildEngine, true);
  const fp16 = parseBool(options.fp16, true);
  const workspaceMb = Math.max(256, Number(options.workspaceMb || 2048));
  const sourceExt = path.extname(source).toLowerCase();
  const canUseProfileRepo = Boolean(profile.repo && profile.repoName && profile.parserDir && profile.parserLib);
  const canUseProfileParser = canUseProfileRepo && profile.networkType !== 1;
  const buildParser = parseBool(options.buildParser, canUseProfileParser);
  const engineBuildMethod = buildEngine
    ? resolveEngineBuildMethod(options.engineBuildMethod || "auto", canUseProfileParser && buildParser)
    : "skip";
  const forceRebuild = parseBool(options.forceRebuild, false);
  const numClassesFromLabels = countLabelLines(hostPathFromWorkspace(model.labels));
  let numClasses = Math.max(1, Number(options.numClasses || model.numClasses || numClassesFromLabels || 1));
  let output = "";
  let repoDir = "";

  if (profile.id === "custom_onnx" && sourceExt !== ".onnx") {
    throw new Error("Custom ONNX profile only accepts .onnx sources. Use a YOLO profile for .pt export.");
  }
  if (dynamic && batchSize > 1 && canUseProfileRepo && sourceExt === ".pt") {
    throw new Error("DeepStream-Yolo export does not allow Dynamic shape and static batch size > 1 at the same time. Disable Dynamic shape or set build batch size to 1.");
  }

  const requestedRepoRef = options.deepstreamYoloRef || options.deepStreamYoloRef || "";
  const normalizedRequestedRepoRef = isPlateCharacterGroup(group) && sourceExt === ".onnx" && !isParserProfile(requestedRepoRef)
    ? "auto"
    : requestedRepoRef;
  const deepstreamYoloRef = profile.id === "yolo_detection"
    ? resolveDeepStreamYoloRef(group, sourceExt, normalizedRequestedRepoRef)
    : String(normalizedRequestedRepoRef || profile.ref || "").trim();
  output += [
    "# Build plan",
    `Model profile: ${profile.label} (${profile.id})`,
    `Source type: ${sourceExt || "unknown"}`,
    canUseProfileRepo ? `${profile.repoName} parser ref: ${deepstreamYoloRef}` : "Automatic parser repo: none",
    `Engine build method: ${engineBuildMethod}`,
    `DeepStream runtime image: ${config.deepstreamImage}`,
    `Detected runtime TensorRT: ${TENSORRT_VERSION || "unknown"}`,
    `Build batch size: ${batchSize}`,
    ""
  ].join("\n");
  const labelSource = sourceLabelPath(group, sourceKey);
  const onnxNeedsGeneratedLabels = sourceExt === ".pt";
  const onnxIsReusable = reusableArtifact(paths.onnx, [source], forceRebuild) && (!onnxNeedsGeneratedLabels || Boolean(usableFileStat(paths.labels)));
  const parserUsesLocalProfile = profile.id === "yolo_detection" && isParserProfile(deepstreamYoloRef);
  const buildEngineWithTrtexec = buildEngine && engineBuildMethod === "trtexec";
  const buildEngineWithRuntimeTrtexec = buildEngine && (
    engineBuildMethod === "runtime-trtexec" ||
    (engineBuildMethod === "deepstream-runtime" && parserUsesLocalProfile)
  );
  const deferEngineToDeepStream = buildEngine && engineBuildMethod === "deepstream-runtime" && !parserUsesLocalProfile;
  const engineIsReusable = (buildEngineWithTrtexec || buildEngineWithRuntimeTrtexec) && reusableArtifact(paths.engine, [paths.onnx], forceRebuild);
  const parserRefMatches = previousBuild.deepstreamYoloRef === deepstreamYoloRef
    && normalizeModelProfile(previousBuild.profile || profile.id) === profile.id;
  const parserIsReusable = buildParser && canUseProfileParser && parserRefMatches && reusableArtifact(paths.parserLib, [], forceRebuild);
  const needsProfileRepo = canUseProfileRepo && !parserUsesLocalProfile && (
    (sourceExt === ".pt" && profile.exportWithProfileRepo && !onnxIsReusable) ||
    (buildParser && !parserIsReusable)
  );
  if (needsProfileRepo) {
    repoDir = (await runCheckpoint(checkpoints, "sync_deepstream_yolo", async () => {
      const syncedRepoDir = await ensureModelProfileRepo(profile, deepstreamYoloRef);
      return { repoDir: syncedRepoDir, output: `Profile: ${profile.label}\nRepo: ${syncedRepoDir}\nRef: ${deepstreamYoloRef}` };
    }, `${profile.repoName} repo ready.`, onProgress)).repoDir;
  } else {
    const message = parserIsReusable
      ? `Using cached ${profile.label} parser built from ref ${deepstreamYoloRef}.`
      : `No automatic parser repo needed for ${profile.label}.`;
    skipCheckpoint(checkpoints, "sync_deepstream_yolo", message, onProgress);
  }
  const exportArgs = [];
  if (canUseProfileRepo && profile.exportWithProfileRepo && sourceExt === ".pt") {
    exportArgs.push(
      `${MODEL_BUILDER_WORKDIR}/model-builder/export_deepstream_yolo.py`,
      "--source", workspacePath(source),
      "--output", workspacePath(paths.onnx),
      "--repo-dir", `${MODEL_BUILDER_WORKDIR}/runtime/third_party/${profile.repoName}`,
      "--profile", profile.id,
      "--version", yoloVersion,
      "--imgsz", String(imgsz),
      "--opset", String(opset),
      "--batch", String(batchSize),
      "--labels-output", workspacePath(paths.labels)
    );
  } else {
    exportArgs.push(
      `${MODEL_BUILDER_WORKDIR}/model-builder/export_yolo.py`,
      "--source", workspacePath(source),
      "--output", workspacePath(paths.onnx),
      "--imgsz", String(imgsz),
      "--opset", String(opset),
      "--batch", String(batchSize),
      "--task", task
    );
    if (sourceExt === ".pt") {
      exportArgs.push("--labels-output", workspacePath(paths.labels));
    }
  }
  if (simplify) exportArgs.push("--simplify");
  if (dynamic) exportArgs.push("--dynamic");

  if (onnxIsReusable) {
    const message = `Using cached ONNX: ${paths.onnx}`;
    skipCheckpoint(checkpoints, "export_onnx", message, onProgress);
    output += `# Export ONNX\n${message}\n`;
  } else {
    const exportResult = await runCheckpoint(checkpoints, "export_onnx", async () => {
      const result = await runModelBuilder(["python3", ...exportArgs]);
      if (result.code !== 0) {
        const error = new Error(`Export ONNX failed:\n${result.output}`);
        error.output = result.output;
        throw error;
      }
      return result;
    }, "ONNX exported.", onProgress);
    output += `# Export ONNX\n${exportResult.output}\n`;
    if (exportResult.code !== 0) {
      await fsp.writeFile(paths.log, output);
      throw new Error(`Export ONNX failed:\n${exportResult.output}`);
    }
  }

  if (sourceExt === ".onnx") {
    if (!usableFileStat(labelSource)) {
      throw new Error(`ONNX source requires labels.txt before build. Upload labels for ${path.basename(source)} first.`);
    }
    await fsp.copyFile(labelSource, paths.labels);
    model.labels = workspacePath(paths.labels);
  }

  model.onnx = workspacePath(paths.onnx);
  model.yoloVersion = yoloVersion;
  if (usableFileStat(paths.labels)) {
    model.labels = workspacePath(paths.labels);
  }
  const generatedLabelCount = countLabelLines(paths.labels);
  if (!options.numClasses && generatedLabelCount > 0) {
    numClasses = inferredNumClasses(group, generatedLabelCount, model.numClasses);
  }

  if (buildEngineWithRuntimeTrtexec) {
    if (engineIsReusable) {
      const message = `Using cached TensorRT engine: ${paths.engine}`;
      skipCheckpoint(checkpoints, "build_tensorrt", message, onProgress);
      output += `\n# Build TensorRT engine\n${message}\n`;
    } else {
      const trtResult = await runCheckpoint(checkpoints, "build_tensorrt", async () => {
        const resultOutput = await buildRuntimeTrtexecEngine(config, paths, { fp16, workspaceMb });
        return { output: resultOutput };
      }, "TensorRT engine built in DeepStream runtime.", onProgress);
      output += `\n# Build TensorRT engine\n${trtResult.output}\n`;
    }
    model.engine = workspacePath(paths.engine);
  } else if (buildEngineWithTrtexec) {
    if (engineIsReusable) {
      const message = `Using cached TensorRT engine: ${paths.engine}`;
      skipCheckpoint(checkpoints, "build_tensorrt", message, onProgress);
      output += `\n# Build TensorRT engine\n${message}\n`;
    } else {
      const trtResult = await runCheckpoint(checkpoints, "build_tensorrt", async () => {
        const compatibility = await assertBuilderTrtexecMatchesRuntime();
        const trtexec = trtexecCommand();
        const trtArgs = [
          `--onnx=${workspacePath(paths.onnx)}`,
          `--saveEngine=${workspacePath(paths.engine)}`,
          `--memPoolSize=workspace:${workspaceMb}`,
          "--verbose"
        ];
        if (fp16) trtArgs.push("--fp16");
        const result = await runModelBuilder([trtexec, ...trtArgs]);
        if (result.code !== 0) {
          const error = new Error(`TensorRT engine build failed inside model-builder container. Make sure the builder image contains trtexec and matches this Jetson.\n${result.output}`);
          error.output = result.output;
          throw error;
        }
        return { ...result, output: `${compatibility}\n${result.output}` };
      }, "TensorRT engine built.", onProgress);
      output += `\n# Build TensorRT engine\n${trtResult.output}\n`;
      if (trtResult.code !== 0) {
        await fsp.writeFile(paths.log, output);
        throw new Error(`TensorRT engine build failed inside model-builder container. Make sure the builder image contains trtexec and matches this Jetson.\n${trtResult.output}`);
      }
    }
    model.engine = workspacePath(paths.engine);
  } else if (deferEngineToDeepStream) {
    await fsp.rm(paths.engine, { force: true }).catch(() => {});
    const message = [
      "Engine build delegated to DeepStream nvinfer.",
      `Reason: ${profile.label} is configured for DeepStream nvinfer engine creation.`,
      `Runtime engine target: ${paths.engine}`
    ].join("\n");
    skipCheckpoint(checkpoints, "build_tensorrt", message, onProgress);
    output += `\n# Build TensorRT engine\n${message}\n`;
    model.engine = workspacePath(paths.engine);
  } else {
    skipCheckpoint(checkpoints, "build_tensorrt", "Build TensorRT engine is disabled.", onProgress);
    output += "\n# Build TensorRT engine\nBuild TensorRT engine is disabled.\n";
  }

  model.numClasses = numClasses;
  model.engineBatchSize = batchSize;
  model.engineBuildMethod = engineBuildMethod;
  model.deepstreamYoloRef = deepstreamYoloRef;

  if (buildParser && canUseProfileParser) {
    let parserOutput = "";
    if (parserIsReusable) {
      parserOutput = `Using cached ${profile.label} parser: ${paths.parserLib}\n${profile.repoName} ref: ${deepstreamYoloRef}`;
      skipCheckpoint(checkpoints, "build_parser", parserOutput, onProgress);
    } else {
      try {
        const parserResult = await runCheckpoint(checkpoints, "build_parser", async () => {
          const builtParserOutput = await buildDeepStreamYoloParser(config, group, paths, repoDir || null, deepstreamYoloRef, profile);
          return { output: builtParserOutput };
        }, "DeepStream parser built.", onProgress);
        parserOutput = parserResult.output || "";
      } catch (error) {
        output += `\n# Build DeepStream-Yolo parser\n${error.message}\n`;
        await fsp.writeFile(paths.log, output);
        throw error;
      }
    }
    output += `\n# Build DeepStream-Yolo parser\n${parserOutput}\n`;
    model.customLib = workspacePath(paths.parserLib);
    model.parseBboxFunc = profile.parseBboxFunc || "";
    model.parseBboxInstanceMaskFunc = profile.parseInstanceMaskFunc || "";
    model.engineCreateFunc = "NvDsInferYoloCudaEngineGet";
  } else {
    skipCheckpoint(checkpoints, "build_parser", "Build parser is disabled or not applicable for this model/task.", onProgress);
    model.customLib = "";
    model.parseBboxFunc = "";
    model.parseBboxInstanceMaskFunc = "";
    model.engineCreateFunc = "";
  }

  model.build = {
    source: model.source,
    sourceKey,
    onnx: model.onnx,
    engine: model.engine || "",
    labels: usableFileStat(paths.labels) ? workspacePath(paths.labels) : model.labels || "",
    customLib: model.customLib || "",
    profile: profile.id,
    parseBboxFunc: model.parseBboxFunc || "",
    parseBboxInstanceMaskFunc: model.parseBboxInstanceMaskFunc || "",
    numClasses,
    batchSize,
    yoloVersion,
    deepstreamYoloRef,
    imgsz,
    opset,
    task,
    simplify,
    dynamic,
    fp16,
    buildEngine: buildEngine && engineBuildMethod !== "skip",
    engineBuildMethod,
    buildParser,
    forceRebuild,
    modelName,
    description,
    buildOptions: normalizeBuildConfig(group, options, sourceMeta.inspect, model),
    updatedAt: new Date().toISOString(),
    log: workspacePath(paths.log),
    checkpoints
  };
  model.builds = {
    ...(model.builds || {}),
    [sourceKey]: model.build
  };
  config.models[group] = model;
  await runCheckpoint(checkpoints, "write_runtime_config", async () => {
    await fsp.writeFile(paths.log, output);
    await writeJson(CONFIG_FILE, config);
    await generateRuntime(config);
    return { output: `Log: ${paths.log}` };
  }, "Runtime config generated.", onProgress);
  await writeJson(CONFIG_FILE, config);
  return { group, model, checkpoints, output: output.slice(-8000) };
}

async function generateRuntime(config) {
  await fsp.mkdir(GENERATED_DIR, { recursive: true });
  const runtimeProcessorType = processorType(config);
  const sourceBatchSize = Math.max(1, enabledRtspStreams(config).length || (config.streams || []).length || 1);
  const imageTestVehicleIds = normalizeClassIds(config.imageTest?.vehicleClassIds);
  const stages = normalizePipelineStages(config).filter((stage) => stage.enabled);
  const stageByGieId = new Map(stages.map((stage) => [Number(stage.gieId), stage]));
  const primaryStage = stages.find((stage) => Number(stage.gieId) === 1 || !stage.operateOnGieId) || {};
  const primaryStageId = Number(primaryStage.gieId || 1);
  const primaryVehicleClassIds = (
    config.testMode === "image-debug" && imageTestVehicleIds.length
      ? imageTestVehicleIds
      : normalizeClassIds(primaryStage.operateOnClassIds).length
        ? normalizeClassIds(primaryStage.operateOnClassIds)
        : normalizeClassIds(config.frontVehicleClassIds)
  );
  config.pipelineStages = stages.map((stage) => {
    const model = config.models[stage.modelGroup] || {};
    let networkType = Number(stage.networkType ?? 0);
    const stageRole = String(stage.role || stage.gieType || "").toLowerCase();
    const isTgieStage = stageRole === "tgie" || String(stage.gieType || "").toLowerCase() === "tgie";
    if (runtimeProcessorType === "lpr" && isTgieStage) {
      const task = model.build?.task || model.task || "classify";
      const isDetector = task === "detect" || task === "auto" || model.ocrMode === "char_detector";
      networkType = isDetector ? 0 : 1;
    }
    let operateClassIds = normalizeClassIds(stage.operateOnClassIds);
    if (runtimeProcessorType === "lpr" && stage.operateOnGieId) {
      const parentStage = stageByGieId.get(Number(stage.operateOnGieId));
      if (Number(stage.operateOnGieId) === primaryStageId && primaryVehicleClassIds.length) {
        operateClassIds = primaryVehicleClassIds;
      } else if (isTgieStage && parentStage) {
        const parentModel = config.models[parentStage.modelGroup] || {};
        const parentClassIds = modelClassIdRange(parentStage.modelGroup, parentModel);
        if (parentClassIds.length) operateClassIds = parentClassIds;
      }
    }
    const configFile = path.join(GENERATED_DIR, `config_infer_${stage.id}.txt`);
    return {
      ...stage,
      networkType,
      configFile: workspacePath(configFile),
      ready: Boolean(model.engine || model.onnx),
      operateOnClassIds: operateClassIds
    };
  });
  for (const stage of config.pipelineStages) {
    const model = config.models[stage.modelGroup] || {};
    if (!stage.ready) continue;
    if (!model.labels) {
      model.labels = resolveModelLabels(stage.modelGroup, model.sourceKey || model.selectedBuildKey, model.build, model);
    }
    await fsp.writeFile(
      hostPathFromWorkspace(stage.configFile),
      modelConfig(
        stage.modelGroup,
        model,
        stage.gieId,
        stage.networkType,
        stage.operateOnGieId,
        stageInferBatchSize(stage, sourceBatchSize, model),
        stage.operateOnClassIds,
        stage,
        runtimeProcessorType
      )
    );
  }
  await writeJson(CONFIG_FILE, config);
  await fsp.writeFile(path.join(GENERATED_DIR, "tracker_config.yml"), "BaseConfig:\n  minDetectorConfidence: 0.3\nTargetManagement:\n  enableBboxUnClipping: 1\n");
  const template = await fsp.readFile(path.join(APP_ROOT, "templates", "docker-compose.yml"), "utf8");
  const compose = template
    .replaceAll("${DEEPSTREAM_IMAGE}", config.deepstreamImage)
    .replaceAll("${APP_ROOT}", dockerPath(APP_ROOT))
    .replaceAll("${CUDA_VER}", process.env.CUDA_VER || "")
    .replaceAll("${DEEPSTREAM_VERSION}", process.env.DEEPSTREAM_VERSION || "");
  await fsp.writeFile(COMPOSE_FILE, compose);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const { timeoutMs = 0, ...spawnOptions } = options;
    const child = spawn(command, args, { ...spawnOptions, shell: process.platform === "win32" });
    let output = "";
    let settled = false;
    const timer = timeoutMs > 0 ? setTimeout(() => {
      output += `\nCommand timed out after ${timeoutMs}ms.`;
      child.kill("SIGKILL");
    }, timeoutMs) : null;
    const finish = (code, extra = "") => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (extra) output += extra;
      resolve({ code, output });
    };
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("close", (code) => finish(code));
    child.on("error", (error) => finish(1, error.message));
  });
}

function createJob(type, group) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const job = {
    id,
    type,
    group,
    status: "queued",
    message: "Queued.",
    checkpoints: [],
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finishedAt: null
  };
  jobs.set(id, job);
  pruneJobs();
  return job;
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function publicJob(job) {
  return {
    id: job.id,
    type: job.type,
    group: job.group,
    status: job.status,
    message: job.message,
    checkpoints: job.checkpoints,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt
  };
}

function pruneJobs() {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (new Date(job.updatedAt).getTime() < cutoff) jobs.delete(id);
  }
}

function startBuildJob(group, options) {
  const job = createJob("build-model", group);
  setImmediate(async () => {
    try {
      updateJob(job, { status: "running", message: `Building ${group}...` });
      const result = await buildYoloModel(group, options, (checkpoints) => {
        updateJob(job, { status: "running", checkpoints, message: currentCheckpointMessage(checkpoints) });
      });
      updateJob(job, {
        status: "success",
        message: `Build completed for ${group}.`,
        checkpoints: result.checkpoints || job.checkpoints,
        result,
        finishedAt: new Date().toISOString()
      });
    } catch (error) {
      updateJob(job, {
        status: "failed",
        message: error.message,
        checkpoints: error.checkpoints || job.checkpoints,
        error: { message: error.message, output: error.output || "" },
        finishedAt: new Date().toISOString()
      });
    }
  });
  return job;
}

function currentCheckpointMessage(checkpoints = []) {
  const running = checkpoints.find((checkpoint) => checkpoint.status === "running");
  if (running) return `${running.label} is running...`;
  const failed = checkpoints.find((checkpoint) => checkpoint.status === "failed");
  if (failed) return `${failed.label} failed.`;
  const completed = checkpoints.filter((checkpoint) => ["success", "skipped"].includes(checkpoint.status)).pop();
  return completed ? `${completed.label} completed.` : "Build started.";
}

async function deploy(config) {
  const checkpoints = createCheckpoints([
    { id: "validate_config", label: "Validate deploy config" },
    { id: "generate_runtime", label: "Generate DeepStream runtime files" },
    { id: "docker_compose_up", label: "Start DeepStream container" },
    { id: "verify_container", label: "Verify container is running" },
    { id: "save_deploy_state", label: "Save deploy state" }
  ]);
  let composeOutput = "";
  try {
    config.testMode = "pipeline";
    delete config.inputUri;
    delete config.imageTest;
    await runCheckpoint(checkpoints, "validate_config", async () => {
      const streams = enabledRtspStreams(config);
      if (!streams.length) {
        throw new Error("Select at least one camera for this deploy app and make sure its RTSP URL starts with rtsp:// or rtsps://.");
      }
      const processor = validateProcessorFlow(config, "Deploy");
      return {
        output: `App: ${config.activeDeployAppId || "default"}\nStreams: ${streams.map((stream) => `${stream.name} (${stream.id})`).join(", ")}\n${processor.output}`
      };
    }, "Deploy config looks valid.");

    await runCheckpoint(checkpoints, "generate_runtime", async () => {
      await generateRuntime(config);
      return { output: `Compose: ${COMPOSE_FILE}` };
    }, "Runtime files generated.");

    const composeResult = await runCheckpoint(checkpoints, "docker_compose_up", async () => {
      const result = await runCommand("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d", "--force-recreate"], { cwd: APP_ROOT });
      if (result.code !== 0) {
        const error = new Error(`Docker Compose failed:\n${result.output}`);
        error.output = result.output;
        throw error;
      }
      return result;
    }, "Docker Compose started.");
    composeOutput = composeResult.output || "";

    await runCheckpoint(checkpoints, "verify_container", async () => {
      const result = await runCommand("docker", ["inspect", "-f", "{{.State.Running}}", "deepstream-lpr"], { cwd: APP_ROOT });
      if (result.code !== 0 || !result.output.trim().includes("true")) {
        const error = new Error(`DeepStream container is not running:\n${result.output}`);
        error.output = result.output;
        throw error;
      }
      return result;
    }, "DeepStream container is running.");

    config.deploy = {
      lastStatus: "deployed",
      lastOutput: composeOutput.slice(-5000),
      updatedAt: new Date().toISOString(),
      checkpoints
    };
    await runCheckpoint(checkpoints, "save_deploy_state", async () => {
      await writeJson(CONFIG_FILE, config);
      return { output: `Saved: ${CONFIG_FILE}` };
    }, "Deploy state saved.");
    await writeJson(CONFIG_FILE, config);
    return { ...config.deploy, checkpoints };
  } catch (error) {
    config.deploy = {
      lastStatus: "failed",
      lastOutput: (error.output || error.message || "").slice(-5000),
      updatedAt: new Date().toISOString(),
      checkpoints
    };
    await writeJson(CONFIG_FILE, config).catch(() => {});
    error.checkpoints = checkpoints;
    throw error;
  }
}

async function runTestMedia(kind, config) {
  const checkpoints = createCheckpoints([
    { id: "validate_test_media", label: "Validate test media" },
    { id: "generate_runtime", label: "Generate DeepStream runtime files" },
    { id: "run_test_container", label: `Run ${kind} test container` },
    { id: "load_events", label: "Load test events" }
  ]);
  const mediaPath = hostPathFromWorkspace(config.testMedia?.[kind]?.path);
  let commandOutput = "";
  try {
    const mediaDimensions = kind === "image" && mediaPath
      ? await imageDimensions(mediaPath).catch(() => ({ width: 0, height: 0 }))
      : { width: 0, height: 0 };
    if (kind === "image") {
      config.testMode = "image-debug";
      if (processorType(config) === "lpr") {
        config.imageTest = config.imageTest || {};
        const imageVehicleIds = normalizeClassIds(config.imageTest.vehicleClassIds);
        config.imageTest.vehicleClassIds = imageVehicleIds.length ? imageVehicleIds : [2, 3, 5, 7];
      } else {
        delete config.imageTest;
      }
      if (mediaDimensions.width && mediaDimensions.height) {
        config.streamWidth = mediaDimensions.width;
        config.streamHeight = mediaDimensions.height;
      }
    } else {
      config.testMode = "pipeline";
    }

    await runCheckpoint(checkpoints, "validate_test_media", async () => {
      if (!mediaPath || !fs.existsSync(mediaPath)) {
        throw new Error(`No uploaded test ${kind}. Upload a ${kind} first.`);
      }
      const processor = validateProcessorFlow(config, `${kind} test`);
      return { output: `Media: ${mediaPath}\n${processor.output}` };
    }, `Test ${kind} exists.`);

    await runCheckpoint(checkpoints, "generate_runtime", async () => {
      await fsp.rm(path.join(RUNTIME_DIR, "events.jsonl"), { force: true });
      await generateRuntime(config);
      return { output: `Config: ${CONFIG_FILE}` };
    }, "Runtime files generated.");

    const inputUri = `file://${workspacePath(mediaPath)}`;
    const result = await runCheckpoint(checkpoints, "run_test_container", async () => {
      const dockerResult = await runCommand("docker", [
        "run",
        "--rm",
        "--network", "host",
        "--ipc", "host",
        "--privileged",
        ...dockerRuntimeArgs(),
        ...dockerCudaEnv(),
        "-e", "NVIDIA_VISIBLE_DEVICES=all",
        "-e", "NVIDIA_DRIVER_CAPABILITIES=all",
        "-v", `${dockerPath(APP_ROOT)}:/workspace/deepstream-lpr-app`,
        "-w", "/workspace/deepstream-lpr-app",
        config.deepstreamImage,
        "python3",
        "deepstream/deepstream_lpr_app.py",
        "--config",
        "runtime/config.json",
        "--input-uri",
        inputUri
      ], { cwd: APP_ROOT });
      if (dockerResult.code !== 0) {
        const error = new Error(`DeepStream ${kind} test failed:\n${dockerResult.output}`);
        error.output = dockerResult.output;
        throw error;
      }
      return dockerResult;
    }, `${kind} test finished.`);
    commandOutput = result.output || "";

    const events = await runCheckpoint(checkpoints, "load_events", async () => {
      const file = path.join(RUNTIME_DIR, "events.jsonl");
      let content = "";
      try {
        content = await fsp.readFile(file, "utf8");
      } catch {
        return { events: [], output: "No events file yet." };
      }
      const lines = content.trim().split(/\r?\n/).filter(Boolean);
      return { events: lines.slice(-20).map((line) => JSON.parse(line)), output: `Loaded ${Math.min(lines.length, 20)} recent events.` };
    }, "Events loaded.");

    config.lastTest = {
      kind,
      status: "success",
      media: workspacePath(mediaPath),
      updatedAt: new Date().toISOString(),
      checkpoints
    };
    await writeJson(CONFIG_FILE, config);
    return {
      kind,
      status: "success",
      checkpoints,
      output: commandOutput.slice(-8000),
      processorType: processorType(config),
      events: events.events || [],
      media: workspacePath(mediaPath),
      mediaUrl: publicUrlFromWorkspace(workspacePath(mediaPath)),
      mediaWidth: mediaDimensions.width,
      mediaHeight: mediaDimensions.height
    };
  } catch (error) {
    config.lastTest = {
      kind,
      status: "failed",
      media: mediaPath ? workspacePath(mediaPath) : "",
      output: (error.output || error.message || "").slice(-5000),
      updatedAt: new Date().toISOString(),
      checkpoints
    };
    await writeJson(CONFIG_FILE, config).catch(() => {});
    error.checkpoints = checkpoints;
    throw error;
  }
}

ensureDirs();
const cameraMonitorFeature = createCameraMonitorFeature({
  app,
  server: httpServer,
  repoRoot: REPO_ROOT,
  ffmpegPath: ffmpegExecutable()
});
const agentFeature = createAgentFeature({
  app,
  appRoot: APP_ROOT,
  runtimeDir: RUNTIME_DIR,
  getConfig,
  readRuntimeEvents,
  readRuntimeStatus,
  inspectContainer,
  listRuntimeResults,
  listMonitorCaptures,
  listModelGroups,
  runCommand,
  tailOutput
});
agentFeature.mount();
app.use(express.static(PUBLIC_DIR));
app.use("/models", express.static(MODELS_DIR));
app.use("/runtime", express.static(RUNTIME_DIR));
app.use("/monitor-captures", express.static(MONITOR_CAPTURE_DIR));
app.use("/roi-captures", express.static(ROI_CAPTURE_DIR));

app.get("/api/config", async (_req, res) => {
  res.json(await getConfig());
});

app.get("/api/system/profile", async (_req, res) => {
  res.json({
    deepstreamProfile: process.env.DEEPSTREAM_PROFILE || "unknown",
    jetpackVersion: process.env.JETPACK_VERSION || "unknown",
    l4tVersion: process.env.L4T_VERSION || "unknown",
    cudaVersion: process.env.CUDA_VER || "unknown",
    tensorrtVersion: process.env.TENSORRT_VERSION || "unknown",
    deepstreamVersion: process.env.DEEPSTREAM_VERSION || "unknown",
    deepstreamImage: DEFAULT_DEEPSTREAM_IMAGE,
    modelBuilderImage: MODEL_BUILDER_IMAGE,
    modelBuilderBaseImage: MODEL_BUILDER_BASE_IMAGE,
    dockerRuntimeArgs: dockerRuntimeArgs()
  });
});

app.get("/api/monitor-captures", async (_req, res) => {
  res.json(await listMonitorCaptures());
});

app.post("/api/cameras/check", async (req, res) => {
  try {
    const rtspUrl = String(req.body?.rtspUrl || "").trim();
    if (!/^rtsps?:\/\//i.test(rtspUrl)) {
      return res.status(400).json({ error: "RTSP URL phai bat dau bang rtsp:// hoac rtsps://." });
    }
    const result = await checkCameraConnection(rtspUrl);
    res.status(200).json({
      ok: result.ok,
      status: result.ok ? "online" : "offline",
      host: result.host || getCameraHost(rtspUrl),
      message: result.ok ? "Camera ping OK." : "Camera ping failed.",
      output: result.output
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/cameras/capture", async (req, res) => {
  try {
    const rtspUrl = String(req.body?.rtspUrl || "").trim();
    if (!/^rtsps?:\/\//i.test(rtspUrl)) {
      return res.status(400).json({ error: "RTSP URL phai bat dau bang rtsp:// hoac rtsps://." });
    }
    const frame = await captureCameraFrame({
      rtspUrl,
      cameraId: req.body?.cameraId || req.body?.id || "camera"
    });
    res.json({
      status: "success",
      message: "Sample frame captured.",
      frame
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/config", async (req, res) => {
  try {
    const config = normalizeMultiCameraConfig(req.body, await getConfig(), false);
    await generateRuntime(config);
    res.json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/upload/:slot", upload.single("file"), async (req, res) => {
  try {
    const slot = sanitizeSlot(req.params.slot);
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const config = await getConfig();
    const [prefix, ...rest] = slot.split("_");
    const group = slot.startsWith("vehicle_front") ? "vehicle_front" : `${prefix}_${rest[0]}`;
    const kind = slot.replace(`${group}_`, "").replace("custom_lib", "customLib");
    config.models[group] = config.models[group] || {};
    config.models[group][kind] = workspacePath(req.file.path);
    if (kind === "labels") {
      const labelCount = countLabelLines(req.file.path);
      if (labelCount > 0) config.models[group].numClasses = inferredNumClasses(group, labelCount, config.models[group].numClasses);
    }
    await writeJson(CONFIG_FILE, config);
    res.json({ slot, path: config.models[group][kind], config });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/model-source/pending", uploadPendingSource.fields([
  { name: "file", maxCount: 1 },
  { name: "labels", maxCount: 1 }
]), async (req, res) => {
  try {
    const sourceFile = req.files?.file?.[0];
    if (!sourceFile) return res.status(400).json({ error: "No source model uploaded." });
    const labelsFile = req.files?.labels?.[0] || null;
    const modelName = String(req.body?.modelName || "").trim();
    const group = sanitizeModelGroup(modelName || path.basename(sourceFile.originalname, path.extname(sourceFile.originalname)));
    const model = {
      profile: normalizeModelProfile(req.body?.profile),
      yoloVersion: String(req.body?.yoloVersion || "yolov8").toLowerCase()
    };
    const pendingId = pendingIdFromPath(sourceFile.path);
    const sourceKey = sourceKeyFromPath(sourceFile.path);
    const inspect = await inspectSourcePath(group, sourceKey, sourceFile.path, model, labelsFile?.path || "");
    const buildOptions = normalizeBuildConfig(group, {
      ...req.body,
      sourceExt: path.extname(sourceFile.path).toLowerCase()
    }, inspect, model);
    const payload = {
      pendingId,
      group,
      sourceKey,
      source: workspacePath(sourceFile.path),
      labels: labelsFile ? workspacePath(labelsFile.path) : "",
      originalName: sourceFile.originalname,
      modelName: modelName || group,
      description: String(req.body?.description || "").trim(),
      inspect,
      buildOptions
    };
    await fsp.writeFile(path.join(MODEL_PENDING_DIR, `${pendingId}.json`), `${JSON.stringify(payload, null, 2)}\n`);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/model-source/save-config", async (req, res) => {
  try {
    res.json(await savePendingModelSource(req.body || {}));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/model-source/:group", uploadSource.single("file"), async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const config = await getConfig();
    const model = config.models[group] || {};
    const sourceKey = sourceKeyFromPath(req.file.path);
    const modelName = String(req.body?.modelName || "").trim();
    const description = String(req.body?.description || "").trim();
    const profile = normalizeModelProfile(req.body?.profile);
    model.source = workspacePath(req.file.path);
    model.sourceKey = sourceKey;
    model.profile = profile;
    model.sourceOriginalName = req.file.originalname;
    model.sourceUploadedAt = new Date().toISOString();
    model.sourceMeta = {
      ...(model.sourceMeta || {}),
      [sourceKey]: {
        modelName,
        description,
        profile,
        originalName: req.file.originalname,
        uploadedAt: model.sourceUploadedAt
      }
    };
    config.models[group] = model;
    await writeJson(CONFIG_FILE, config);
    res.json({ group, model: config.models[group], config });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/model-source/:group/:sourceKey/labels", uploadSourceLabel.single("file"), async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    const sourceKey = sanitizeSourceKey(req.params.sourceKey);
    if (!req.file) return res.status(400).json({ error: "No labels file uploaded." });
    const labelCount = countLabelLines(req.file.path);
    if (labelCount <= 0) {
      await fsp.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Labels file is empty." });
    }
    const config = await getConfig();
    const model = config.models[group] || {};
    model.sourceLabels = {
      ...(model.sourceLabels || {}),
      [sourceKey]: workspacePath(req.file.path)
    };
    if (model.sourceKey === sourceKey) {
      model.labels = workspacePath(req.file.path);
      model.numClasses = inferredNumClasses(group, labelCount, model.numClasses);
    }
    config.models[group] = model;
    await writeJson(CONFIG_FILE, config);
    res.json({
      group,
      sourceKey,
      labels: workspacePath(req.file.path),
      labelCount,
      files: await listModelFiles(group),
      config
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/model-source/:group/:sourceKey/inspect", async (req, res) => {
  try {
    res.json(await inspectModelSource(req.params.group, req.params.sourceKey));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/model-source/:group/:sourceKey/config", async (req, res) => {
  try {
    res.json(await updateModelSourceBuildConfig(req.params.group, req.params.sourceKey, req.body || {}));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/model-source/:group/:sourceKey/test-build", async (req, res) => {
  try {
    res.json(await testModelSourceBuild(req.params.group, req.params.sourceKey));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/models/:group/files", async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    res.json({ group, files: await listModelFiles(group) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/models/groups", async (_req, res) => {
  try {
    res.json({ groups: await listModelGroups() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/models/:group/files/:fileId", async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    res.json(await deleteModelFile(group, req.params.fileId));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/test-media/:kind", uploadTestMedia.single("file"), async (req, res) => {
  try {
    const kind = sanitizeTestKind(req.params.kind);
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const config = await getConfig();
    config.testMedia = config.testMedia || {};
    config.testMedia[kind] = {
      path: workspacePath(req.file.path),
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString()
    };
    await writeJson(CONFIG_FILE, config);
    res.json({ kind, media: config.testMedia[kind], config });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/test/:kind", async (req, res) => {
  try {
    const kind = sanitizeTestKind(req.params.kind);
    const config = applySelectedModels(
      normalizeMultiCameraConfig(req.body, await getConfig(), false),
      req.body?.selectedModels || {}
    );
    const result = await runTestMedia(kind, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, checkpoints: error.checkpoints || [] });
  }
});

app.post("/api/build/:group", async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    const job = startBuildJob(group, req.body || {});
    res.status(202).json(publicJob(job));
  } catch (error) {
    res.status(500).json({ error: error.message, checkpoints: error.checkpoints || [] });
  }
});

app.get("/api/jobs/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json(publicJob(job));
});

app.get("/api/build/:group/log", async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    const config = await getConfig();
    const model = config.models[group] || {};
    const logPath = hostPathFromWorkspace(model.build?.log) || modelBuildPaths(group, model.sourceKey || "default").log;
    const log = await fsp.readFile(logPath, "utf8");
    res.type("text/plain").send(log);
  } catch (error) {
    res.status(404).type("text/plain").send(error.message);
  }
});

app.post("/api/deploy", async (req, res) => {
  try {
    const config = applySelectedModels(
      normalizeMultiCameraConfig(req.body, await getConfig(), true),
      req.body?.selectedModels || {}
    );
    const result = await deploy(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, checkpoints: error.checkpoints || [] });
  }
});

app.post("/api/stop", async (_req, res) => {
  const composeResult = await runCommand("docker", ["compose", "-f", COMPOSE_FILE, "down", "--remove-orphans"], { cwd: APP_ROOT });
  const removeResult = await runCommand("docker", ["rm", "-f", "deepstream-lpr"], { cwd: APP_ROOT });
  const result = {
    code: composeResult.code === 0 || removeResult.code === 0 ? 0 : composeResult.code,
    output: `${composeResult.output || ""}${removeResult.output || ""}`
  };
  await writeRuntimeStatus({
    state: "stopped",
    message: result.code === 0 ? "DeepStream container stopped." : "Failed to stop DeepStream container.",
    containerRunning: false,
    output: tailOutput(result.output || "", 5000)
  }).catch(() => {});
  if (result.code === 0) {
    const config = await getConfig().catch(() => null);
    if (config) {
      config.deploy = {
        ...(config.deploy || {}),
        lastStatus: "stopped",
        lastOutput: tailOutput(result.output || "", 5000),
        updatedAt: new Date().toISOString()
      };
      await writeJson(CONFIG_FILE, config).catch(() => {});
    }
  }
  res.status(result.code === 0 ? 200 : 500).json(result);
});

app.get("/api/deploy/status", async (_req, res) => {
  const [container, rawRuntimeStatus, logs] = await Promise.all([
    inspectContainer("deepstream-lpr"),
    readRuntimeStatus(),
    runCommand("docker", ["logs", "--tail", "120", "deepstream-lpr"], { cwd: APP_ROOT }).catch((error) => ({ code: 1, output: error.message }))
  ]);
  const runtimeStatus = container.running
    ? rawRuntimeStatus
    : {
      ...rawRuntimeStatus,
      state: container.exists ? "stopped" : "missing",
      message: container.exists
        ? "DeepStream container is not running."
        : "DeepStream container is missing. Deploy an app to start runtime.",
      sources: [],
      staleStatus: rawRuntimeStatus.state === "playing"
    };
  res.json({
    container,
    deepstream: {
      started: container.running && runtimeStatus.state === "playing",
      ...runtimeStatus
    },
    logs: tailOutput(logs.output || "", 12000),
    updatedAt: new Date().toISOString()
  });
});

app.get("/api/deploy/results", async (req, res) => {
  res.json({
    results: await listRuntimeResults({
      date: String(req.query.date || ""),
      source: String(req.query.source || ""),
      limit: Number(req.query.limit || 200)
    })
  });
});

app.get("/api/events", async (_req, res) => {
  res.json(await readRuntimeEvents(100));
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message || "Request failed." });
});

app.get("/results", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "results.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

httpServer.listen(PORT, () => {
  cameraMonitorFeature.start();
  console.log(`DeepStream LPR control UI: http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  cameraMonitorFeature.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cameraMonitorFeature.stop();
  process.exit(0);
});
