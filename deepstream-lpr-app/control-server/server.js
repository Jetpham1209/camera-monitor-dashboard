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
const RUNTIME_APPS_DIR = path.join(RUNTIME_DIR, "apps");
const GENERATED_DIR = path.join(RUNTIME_DIR, "generated");
const THIRD_PARTY_DIR = path.join(RUNTIME_DIR, "third_party");
const TEST_MEDIA_DIR = path.join(RUNTIME_DIR, "test-media");
const MODEL_PENDING_DIR = path.join(RUNTIME_DIR, "model-factory-pending");
const TRITON_UPLOAD_DIR = path.join(RUNTIME_DIR, "triton-uploads");
const SERVICES_DIR = path.join(APP_ROOT, "services");
const SERVICE_RUNTIME_DIR = path.join(RUNTIME_DIR, "services");
const SERVICE_OUTPUT_DIR = path.join(SERVICE_RUNTIME_DIR, "outputs");
const MODELS_DIR = path.join(APP_ROOT, "models");
const MODEL_ARCHIVE_DIR = path.join(APP_ROOT, "model-archive");
const TRITON_MODELS_DIR = path.join(APP_ROOT, "triton-models");
const PARSER_PROFILES_DIR = path.join(APP_ROOT, "parser-profiles");
const MONITOR_CAPTURE_DIR = path.join(REPO_ROOT, "data", "captures");
const ROI_CAPTURE_DIR = path.join(RUNTIME_DIR, "roi-captures");
const CONFIG_FILE = path.join(RUNTIME_DIR, "config.json");
const AUTOMATION_FILE = path.join(RUNTIME_DIR, "automation.json");
const AUTOMATION_RUNS_FILE = path.join(RUNTIME_DIR, "automation-runs.json");
const CONNECTIONS_FILE = path.join(RUNTIME_DIR, "connections.json");
const SERVICE_INSTANCES_FILE = path.join(RUNTIME_DIR, "service-instances.json");
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
const TRITON_IMAGE = process.env.TRITON_IMAGE || "nvcr.io/nvidia/tritonserver:24.03-py3-igpu";
const TRITON_CONTAINER_NAME = process.env.TRITON_CONTAINER_NAME || "jetson-triton-server";
const TRITON_HTTP_PORT = Number(process.env.TRITON_HTTP_PORT || 8010);
const TRITON_GRPC_PORT = Number(process.env.TRITON_GRPC_PORT || 8011);
const TRITON_METRICS_PORT = Number(process.env.TRITON_METRICS_PORT || 8012);
const REDIS_IMAGE = process.env.REDIS_IMAGE || "redis:7-alpine";
const KAFKA_IMAGE = process.env.KAFKA_IMAGE || "bitnami/kafka:3.7";
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

const TRITON_DECODER_PROFILES = new Set([
  "raw",
  "ultralytics_yolo_detect",
  "legacy_boxes_scores_classes"
]);

const app = express();
app.use(express.json({ limit: "25mb" }));
const httpServer = http.createServer(app);
const jobs = new Map();
const automationSeenEvents = new Set();
const automationStartedAt = Date.now();
let automationTimer = null;
let automationPollInFlight = false;

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
  for (const dir of [RUNTIME_DIR, RUNTIME_APPS_DIR, GENERATED_DIR, THIRD_PARTY_DIR, TEST_MEDIA_DIR, MODEL_PENDING_DIR, TRITON_UPLOAD_DIR, SERVICES_DIR, SERVICE_RUNTIME_DIR, SERVICE_OUTPUT_DIR, MODELS_DIR, MODEL_ARCHIVE_DIR, TRITON_MODELS_DIR, ROI_CAPTURE_DIR]) {
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

function sanitizeServiceId(value) {
  return String(value || "service")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "service";
}

function normalizeServiceField(field = {}) {
  const type = String(field.type || "text").trim();
  return {
    key: String(field.key || "").trim(),
    label: String(field.label || field.key || "").trim(),
    type,
    required: field.required === true,
    default: field.default ?? "",
    placeholder: String(field.placeholder || "").trim(),
    help: String(field.help || "").trim(),
    options: Array.isArray(field.options) ? field.options.map((option) => ({
      value: String(typeof option === "object" ? option.value : option),
      label: String(typeof option === "object" ? option.label : option)
    })) : [],
    rows: Math.max(2, Number(field.rows || 4)),
    min: field.min,
    max: field.max,
    step: field.step
  };
}

function normalizeServiceManifest(value = {}, serviceDir = "") {
  const id = sanitizeServiceId(value.id || path.basename(serviceDir));
  const scripts = typeof value.scripts === "object" && value.scripts ? value.scripts : {};
  return {
    id,
    name: String(value.name || id).trim(),
    version: String(value.version || "0.1.0").trim(),
    description: String(value.description || "").trim(),
    runtime: String(value.runtime || "local").trim(),
    packageDir: serviceDir,
    entrypoint: String(value.entrypoint || "").trim(),
    configSchema: Array.isArray(value.configSchema) ? value.configSchema.map(normalizeServiceField).filter((field) => field.key) : [],
    messageBus: typeof value.messageBus === "object" && value.messageBus ? value.messageBus : { optional: true },
    scripts: {
      install: String(scripts.install || "install.sh").trim(),
      start: String(scripts.start || "start.sh").trim(),
      stop: String(scripts.stop || "stop.sh").trim(),
      test: String(scripts.test || "test.sh").trim()
    }
  };
}

async function listServiceCatalog() {
  let entries = [];
  try {
    entries = await fsp.readdir(SERVICES_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const serviceDir = path.join(SERVICES_DIR, entry.name);
    const manifestPath = path.join(serviceDir, "service.json");
    const raw = await readJson(manifestPath, null);
    if (!raw) continue;
    manifests.push(normalizeServiceManifest(raw, serviceDir));
  }
  return manifests.sort((a, b) => a.name.localeCompare(b.name));
}

async function readServiceInstances() {
  const raw = await readJson(SERVICE_INSTANCES_FILE, []);
  return (Array.isArray(raw) ? raw : []).map((item, index) => ({
    id: sanitizeServiceId(item.id || `svc-instance-${index + 1}`),
    serviceId: sanitizeServiceId(item.serviceId || ""),
    name: String(item.name || `Service Instance ${index + 1}`).trim(),
    enabled: item.enabled !== false,
    config: typeof item.config === "object" && item.config && !Array.isArray(item.config) ? item.config : {},
    status: typeof item.status === "object" && item.status && !Array.isArray(item.status) ? item.status : {},
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString())
  })).filter((item) => item.serviceId);
}

async function writeServiceInstances(instances) {
  const normalized = (Array.isArray(instances) ? instances : []).map((item) => ({
    ...item,
    id: sanitizeServiceId(item.id),
    serviceId: sanitizeServiceId(item.serviceId),
    updatedAt: new Date().toISOString()
  }));
  await writeJson(SERVICE_INSTANCES_FILE, normalized);
  return normalized;
}

function serviceInstancePaths(instanceId) {
  const id = sanitizeServiceId(instanceId);
  const instanceDir = path.join(SERVICE_RUNTIME_DIR, "instances", id);
  return {
    id,
    instanceDir,
    configFile: path.join(instanceDir, "config.json"),
    pidFile: path.join(instanceDir, "service.pid"),
    outputDir: path.join(SERVICE_OUTPUT_DIR, id)
  };
}

function serviceScriptPath(manifest, scriptName) {
  const script = manifest?.scripts?.[scriptName];
  if (!script) return "";
  const target = path.resolve(manifest.packageDir, script);
  if (!target.startsWith(path.resolve(manifest.packageDir))) return "";
  return target;
}

async function writeServiceRuntimeConfig(manifest, instance, extra = {}) {
  const paths = serviceInstancePaths(instance.id);
  await fsp.mkdir(paths.instanceDir, { recursive: true });
  await fsp.mkdir(paths.outputDir, { recursive: true });
  const payload = {
    instanceId: instance.id,
    serviceId: manifest.id,
    serviceName: manifest.name,
    instanceName: instance.name,
    packageDir: manifest.packageDir,
    outputDir: paths.outputDir,
    config: instance.config || {},
    ...extra
  };
  await writeJson(paths.configFile, payload);
  return { paths, payload };
}

async function runServiceScript(manifest, instance, scriptName, extra = {}) {
  const scriptPath = serviceScriptPath(manifest, scriptName);
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    throw new Error(`Service script not found: ${scriptName}`);
  }
  const { paths } = await writeServiceRuntimeConfig(manifest, instance, extra);
  const env = {
    ...process.env,
    SERVICE_CONFIG_PATH: paths.configFile,
    SERVICE_INSTANCE_DIR: paths.instanceDir,
    SERVICE_OUTPUT_DIR: paths.outputDir,
    SERVICE_PACKAGE_DIR: manifest.packageDir
  };
  const command = process.platform === "win32" ? "bash" : "bash";
  const result = await runCommand(command, [scriptPath], {
    cwd: manifest.packageDir,
    env,
    timeoutMs: Number(extra.timeoutMs || 60000),
    windowsHide: true
  });
  return {
    ok: result.code === 0,
    code: result.code,
    output: tailOutput(result.output, 12000),
    paths: {
      instanceDir: paths.instanceDir,
      outputDir: paths.outputDir
    }
  };
}

async function updateServiceInstanceStatus(instanceId, statusPatch) {
  const instances = await readServiceInstances();
  const index = instances.findIndex((item) => item.id === sanitizeServiceId(instanceId));
  if (index < 0) return null;
  instances[index] = {
    ...instances[index],
    status: {
      ...(instances[index].status || {}),
      ...statusPatch,
      updatedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };
  await writeServiceInstances(instances);
  return instances[index];
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

async function readRuntimeEvents(limit = 1000, runtimeDir = RUNTIME_DIR) {
  const file = path.join(runtimeDir, "events.jsonl");
  try {
    const lines = (await fsp.readFile(file, "utf8")).trim().split(/\r?\n/).filter(Boolean);
    return lines.slice(-limit).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function readRuntimeStatus(runtimeDir = RUNTIME_DIR) {
  return await readJson(path.join(runtimeDir, "status.json"), {
    state: "unknown",
    message: "No runtime status file yet.",
    sources: []
  });
}

async function writeRuntimeStatus(status, runtimeDir = RUNTIME_DIR) {
  await fsp.mkdir(runtimeDir, { recursive: true });
  await writeJson(path.join(runtimeDir, "status.json"), {
    updatedAt: new Date().toISOString(),
    sources: [],
    ...status
  });
}

function appRuntimeId(value = "default") {
  return sanitizeStageId(value || "default", "default").toLowerCase();
}

function appContainerName(appId = "default") {
  return `deepstream-lpr-${appRuntimeId(appId)}`;
}

function appRuntimePaths(appId = "default") {
  const id = appRuntimeId(appId);
  const runtimeDir = path.join(RUNTIME_APPS_DIR, id);
  return {
    id,
    runtimeDir,
    generatedDir: path.join(runtimeDir, "generated"),
    configFile: path.join(runtimeDir, "config.json"),
    composeFile: path.join(runtimeDir, "docker-compose.yml"),
    containerName: appContainerName(id),
    runtimeWorkspaceDir: workspacePath(runtimeDir),
    configWorkspacePath: workspacePath(path.join(runtimeDir, "config.json")),
    connectionsWorkspacePath: workspacePath(CONNECTIONS_FILE)
  };
}

function automationId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultAutomationConfig() {
  return {
    version: 1,
    services: [],
    environments: [],
    workflows: []
  };
}

function normalizeAutomationConfig(value = {}) {
  const environments = Array.isArray(value.environments) ? value.environments : [];
  const services = Array.isArray(value.services) ? value.services : [];
  const workflows = Array.isArray(value.workflows) ? value.workflows : [];
  return {
    version: 1,
    environments: environments.map((item, index) => ({
      id: String(item.id || automationId("env")),
      name: String(item.name || `Environment ${index + 1}`).trim(),
      type: String(item.type || "local").trim(),
      workingDir: String(item.workingDir || "").trim(),
      pythonPath: String(item.pythonPath || "python3").trim(),
      env: typeof item.env === "object" && item.env && !Array.isArray(item.env) ? item.env : {},
      description: String(item.description || "").trim()
    })),
    services: services.map((item, index) => ({
      id: String(item.id || automationId("svc")),
      name: String(item.name || `Service ${index + 1}`).trim(),
      type: ["http", "python", "shell"].includes(item.type) ? item.type : "http",
      environmentId: String(item.environmentId || "").trim(),
      endpoint: String(item.endpoint || "").trim(),
      method: String(item.method || "POST").toUpperCase(),
      command: String(item.command || "").trim(),
      scriptPath: String(item.scriptPath || "").trim(),
      timeoutMs: Math.max(1000, Number(item.timeoutMs || 30000)),
      params: typeof item.params === "object" && item.params && !Array.isArray(item.params) ? item.params : {},
      description: String(item.description || "").trim()
    })),
    workflows: workflows.map((item, index) => ({
      id: String(item.id || automationId("flow")),
      name: String(item.name || `Workflow ${index + 1}`).trim(),
      enabled: item.enabled !== false,
      triggerEventType: String(item.triggerEventType || "vehicle_capture").trim(),
      filters: typeof item.filters === "object" && item.filters && !Array.isArray(item.filters) ? item.filters : {},
      delaySec: Math.max(0, Number(item.delaySec || 0)),
      serviceId: String(item.serviceId || "").trim(),
      params: typeof item.params === "object" && item.params && !Array.isArray(item.params) ? item.params : {},
      description: String(item.description || "").trim()
    }))
  };
}

async function readAutomationConfig() {
  return normalizeAutomationConfig(await readJson(AUTOMATION_FILE, defaultAutomationConfig()));
}

async function writeAutomationConfig(config) {
  const normalized = normalizeAutomationConfig(config);
  await writeJson(AUTOMATION_FILE, normalized);
  return normalized;
}

async function readAutomationRuns(limit = 100) {
  const runs = await readJson(AUTOMATION_RUNS_FILE, []);
  return (Array.isArray(runs) ? runs : []).slice(0, Math.min(Number(limit) || 100, 500));
}

async function appendAutomationRun(run) {
  const runs = await readAutomationRuns(500);
  const existing = runs.findIndex((item) => item.id === run.id);
  if (existing >= 0) runs.splice(existing, 1);
  runs.unshift(run);
  await writeJson(AUTOMATION_RUNS_FILE, runs.slice(0, 500));
  return run;
}

function automationEventId(event = {}) {
  return String(event.eventId || [event.eventType, event.sourceId, event.objectId, event.frameNum, event.ts].join("|"));
}

function automationEventTime(event = {}) {
  const value = Date.parse(event.ts || event.timestamp || "");
  return Number.isFinite(value) ? value : Date.now();
}

function automationMatchesFilter(event = {}, filters = {}) {
  for (const [key, expected] of Object.entries(filters || {})) {
    if (expected === "" || expected === null || expected === undefined) continue;
    const actual = key.split(".").reduce((value, part) => value?.[part], event);
    if (Array.isArray(expected)) {
      if (!expected.map(String).includes(String(actual))) return false;
      continue;
    }
    if (String(actual) !== String(expected)) return false;
  }
  return true;
}

function mergeEnv(base = {}, extra = {}) {
  return Object.fromEntries(Object.entries({ ...base, ...extra }).map(([key, value]) => [key, String(value)]));
}

function runCommandWithInput(command, args, options = {}) {
  return new Promise((resolve) => {
    const { timeoutMs = 30000, input = "", ...spawnOptions } = options;
    const child = spawn(command, args, {
      ...spawnOptions,
      shell: process.platform === "win32"
    });
    let output = "";
    let settled = false;
    const timer = setTimeout(() => {
      output += `\nCommand timed out after ${timeoutMs}ms.`;
      child.kill("SIGKILL");
    }, timeoutMs);
    const finish = (code, extra = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (extra) output += extra;
      resolve({ code, output });
    };
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("close", (code) => finish(code));
    child.on("error", (error) => finish(1, error.message));
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function runBinaryCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const { timeoutMs = 30000, maxBufferBytes = 100 * 1024 * 1024, ...spawnOptions } = options;
    const child = spawn(command, args, {
      ...spawnOptions,
      shell: process.platform === "win32"
    });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let settled = false;
    const timer = setTimeout(() => {
      stderr.push(Buffer.from(`\nCommand timed out after ${timeoutMs}ms.`));
      child.kill("SIGKILL");
    }, timeoutMs);
    const finish = (code, extra = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (extra) stderr.push(Buffer.from(extra));
      resolve({
        code,
        stdout: Buffer.concat(stdout, stdoutBytes),
        stderr: Buffer.concat(stderr).toString("utf8")
      });
    };
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxBufferBytes) {
        stderr.push(Buffer.from(`\nCommand exceeded max buffer ${maxBufferBytes} bytes.`));
        child.kill("SIGKILL");
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => { stderr.push(chunk); });
    child.on("close", (code) => finish(code));
    child.on("error", (error) => finish(1, error.message));
  });
}

async function executeAutomationService(service, environment, payload) {
  const started = Date.now();
  const servicePayload = {
    event: payload.event || {},
    params: {
      ...(service.params || {}),
      ...(payload.params || {})
    },
    workflow: payload.workflow || null,
    invokedAt: new Date().toISOString()
  };
  if (service.type === "http") {
    if (!/^https?:\/\//i.test(service.endpoint || "")) throw new Error("HTTP service endpoint is required.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), service.timeoutMs);
    try {
      const response = await fetch(service.endpoint, {
        method: service.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servicePayload),
        signal: controller.signal
      });
      const text = await response.text();
      return {
        ok: response.ok,
        statusCode: response.status,
        durationMs: Date.now() - started,
        output: text.slice(-8000)
      };
    } finally {
      clearTimeout(timer);
    }
  }

  const input = `${JSON.stringify(servicePayload)}\n`;
  const cwd = environment?.workingDir || APP_ROOT;
  const env = mergeEnv(process.env, environment?.env || {});
  if (service.type === "python") {
    if (!service.scriptPath) throw new Error("Python service script path is required.");
    const command = environment?.pythonPath || "python3";
    const result = await runCommandWithInput(command, [service.scriptPath], {
      cwd,
      env,
      input,
      timeoutMs: service.timeoutMs,
      windowsHide: true
    });
    return {
      ok: result.code === 0,
      exitCode: result.code,
      durationMs: Date.now() - started,
      output: tailOutput(result.output, 8000)
    };
  }

  if (service.type === "shell") {
    if (!service.command) throw new Error("Shell service command is required.");
    const result = await runCommandWithInput(service.command, [], {
      cwd,
      env,
      input,
      timeoutMs: service.timeoutMs,
      windowsHide: true
    });
    return {
      ok: result.code === 0,
      exitCode: result.code,
      durationMs: Date.now() - started,
      output: tailOutput(result.output, 8000)
    };
  }

  throw new Error(`Unsupported service type: ${service.type}`);
}

async function runAutomationWorkflow(workflow, event = {}, manual = false) {
  const config = await readAutomationConfig();
  const service = config.services.find((item) => item.id === workflow.serviceId);
  if (!service) throw new Error(`Automation service not found: ${workflow.serviceId}`);
  const environment = config.environments.find((item) => item.id === service.environmentId) || null;
  const run = {
    id: automationId("run"),
    workflowId: workflow.id,
    workflowName: workflow.name,
    serviceId: service.id,
    serviceName: service.name,
    eventId: automationEventId(event),
    eventType: event.eventType || workflow.triggerEventType,
    status: "running",
    manual,
    startedAt: new Date().toISOString(),
    finishedAt: "",
    delaySec: Number(workflow.delaySec || 0),
    output: ""
  };
  await appendAutomationRun(run);
  if (run.delaySec > 0) await new Promise((resolve) => setTimeout(resolve, run.delaySec * 1000));
  try {
    const result = await executeAutomationService(service, environment, {
      event,
      params: workflow.params,
      workflow
    });
    run.status = result.ok ? "success" : "failed";
    run.finishedAt = new Date().toISOString();
    run.durationMs = result.durationMs;
    run.output = result.output || "";
    run.result = result;
  } catch (error) {
    run.status = "failed";
    run.finishedAt = new Date().toISOString();
    run.output = error.message;
  }
  await appendAutomationRun(run);
  return run;
}

async function pollAutomationEvents() {
  if (automationPollInFlight) return;
  automationPollInFlight = true;
  try {
    const config = await readAutomationConfig();
    const workflows = config.workflows.filter((workflow) => workflow.enabled && workflow.serviceId);
    if (!workflows.length) return;
    const events = await readRuntimeEvents(200);
    for (const event of events) {
      const eventId = automationEventId(event);
      if (automationSeenEvents.has(eventId)) continue;
      if (automationEventTime(event) < automationStartedAt - 5000) {
        automationSeenEvents.add(eventId);
        continue;
      }
      automationSeenEvents.add(eventId);
      for (const workflow of workflows) {
        if (workflow.triggerEventType && event.eventType !== workflow.triggerEventType) continue;
        if (!automationMatchesFilter(event, workflow.filters)) continue;
        runAutomationWorkflow(workflow, event, false).catch((error) => {
          appendAutomationRun({
            id: automationId("run"),
            workflowId: workflow.id,
            workflowName: workflow.name,
            serviceId: workflow.serviceId,
            eventId,
            eventType: event.eventType || workflow.triggerEventType,
            status: "failed",
            manual: false,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            output: error.message
          }).catch(() => {});
        });
      }
    }
    while (automationSeenEvents.size > 1000) automationSeenEvents.delete(automationSeenEvents.values().next().value);
  } finally {
    automationPollInFlight = false;
  }
}

function startAutomationLoop() {
  if (automationTimer) clearInterval(automationTimer);
  automationTimer = setInterval(() => {
    pollAutomationEvents().catch(() => {});
  }, 2000);
}

function defaultConnectionsConfig() {
  return {
    version: 1,
    providers: {
      redis: {
        enabled: false,
        mode: "managed",
        host: "127.0.0.1",
        port: 6379,
        image: REDIS_IMAGE,
        containerName: "jetson-redis-bus",
        description: "Lightweight pub/sub, streams and cache bus for local Jetson services."
      },
      kafka: {
        enabled: false,
        mode: "external",
        host: "127.0.0.1",
        port: 9092,
        image: KAFKA_IMAGE,
        containerName: "jetson-kafka-bus",
        description: "Durable event bus for larger multi-service pipelines."
      }
    },
    channels: []
  };
}

function normalizeConnectionProvider(name, value = {}) {
  const base = defaultConnectionsConfig().providers[name] || {};
  return {
    enabled: value.enabled === true,
    mode: ["managed", "external"].includes(value.mode) ? value.mode : base.mode || "external",
    host: String(value.host || base.host || "127.0.0.1").trim(),
    port: Math.max(1, Math.min(65535, Number(value.port || base.port || 0))),
    image: String(value.image || base.image || "").trim(),
    containerName: sanitizeCameraId(value.containerName || base.containerName || `jetson-${name}-bus`),
    description: String(value.description || base.description || "").trim()
  };
}

function normalizeConnectionsConfig(value = {}) {
  const base = defaultConnectionsConfig();
  const providers = {
    redis: normalizeConnectionProvider("redis", value.providers?.redis || {}),
    kafka: normalizeConnectionProvider("kafka", value.providers?.kafka || {})
  };
  const channels = Array.isArray(value.channels) ? value.channels : [];
  return {
    version: 1,
    providers,
    channels: channels.map((item, index) => ({
      id: String(item.id || automationId("channel")),
      name: String(item.name || `channel-${index + 1}`).trim(),
      provider: ["redis", "kafka"].includes(item.provider) ? item.provider : "redis",
      type: ["pubsub", "stream", "topic", "queue"].includes(item.type) ? item.type : "topic",
      enabled: item.enabled !== false,
      description: String(item.description || "").trim()
    })).filter((item) => item.name)
  };
}

async function readConnectionsConfig() {
  return normalizeConnectionsConfig(await readJson(CONNECTIONS_FILE, defaultConnectionsConfig()));
}

async function writeConnectionsConfig(config) {
  const normalized = normalizeConnectionsConfig(config);
  await writeJson(CONNECTIONS_FILE, normalized);
  return normalized;
}

async function tcpProbe(host, port, timeoutMs = 1500) {
  return await new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (ok, message = "") => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ok, message });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true, "TCP connection ok."));
    socket.once("timeout", () => finish(false, `TCP timeout after ${timeoutMs}ms.`));
    socket.once("error", (error) => finish(false, error.message));
    socket.connect(Number(port), host);
  });
}

function redisEncodeCommand(args = []) {
  return `*${args.length}\r\n${args.map((arg) => {
    const value = String(arg);
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  }).join("")}`;
}

function redisReadLine(buffer, offset) {
  const end = buffer.indexOf("\r\n", offset, "utf8");
  if (end < 0) return null;
  return {
    line: buffer.toString("utf8", offset, end),
    offset: end + 2
  };
}

function parseRedisResp(buffer, offset = 0) {
  if (offset >= buffer.length) return null;
  const prefix = String.fromCharCode(buffer[offset]);
  const start = offset + 1;
  if (prefix === "+" || prefix === "-" || prefix === ":") {
    const item = redisReadLine(buffer, start);
    if (!item) return null;
    if (prefix === "-") throw new Error(item.line);
    return {
      value: prefix === ":" ? Number(item.line) : item.line,
      offset: item.offset
    };
  }
  if (prefix === "$") {
    const item = redisReadLine(buffer, start);
    if (!item) return null;
    const length = Number(item.line);
    if (length < 0) return { value: null, offset: item.offset };
    const end = item.offset + length;
    if (buffer.length < end + 2) return null;
    return {
      value: buffer.toString("utf8", item.offset, end),
      offset: end + 2
    };
  }
  if (prefix === "*") {
    const item = redisReadLine(buffer, start);
    if (!item) return null;
    const count = Number(item.line);
    if (count < 0) return { value: null, offset: item.offset };
    const values = [];
    let nextOffset = item.offset;
    for (let index = 0; index < count; index += 1) {
      const parsed = parseRedisResp(buffer, nextOffset);
      if (!parsed) return null;
      values.push(parsed.value);
      nextOffset = parsed.offset;
    }
    return { value: values, offset: nextOffset };
  }
  throw new Error(`Unsupported Redis response prefix: ${prefix}`);
}

async function redisCommand(provider, args = [], timeoutMs = 3000) {
  return await new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = Buffer.alloc(0);
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => socket.write(redisEncodeCommand(args)));
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const parsed = parseRedisResp(buffer);
        if (parsed) finish(null, parsed.value);
      } catch (error) {
        finish(error);
      }
    });
    socket.once("timeout", () => finish(new Error(`Redis command timeout after ${timeoutMs}ms.`)));
    socket.once("error", (error) => finish(error));
    socket.connect(Number(provider.port), provider.host);
  });
}

function redisStreamMessageToObject(item) {
  const [id, pairs] = Array.isArray(item) ? item : ["", []];
  const fields = {};
  if (Array.isArray(pairs)) {
    for (let index = 0; index < pairs.length; index += 2) {
      fields[pairs[index]] = pairs[index + 1] ?? "";
    }
  }
  return {
    id,
    fields,
    text: Object.entries(fields).map(([key, value]) => `${key}=${value}`).join(" ")
  };
}

async function readConnectionsStatus(config = null) {
  const current = config || await readConnectionsConfig();
  const providers = {};
  for (const [name, provider] of Object.entries(current.providers || {})) {
    const container = provider.mode === "managed"
      ? await inspectContainer(provider.containerName).catch((error) => ({ exists: false, running: false, error: error.message }))
      : { exists: false, running: false };
    const probe = provider.enabled
      ? await tcpProbe(provider.host, provider.port).catch((error) => ({ ok: false, message: error.message }))
      : { ok: false, message: "disabled" };
    providers[name] = {
      ...provider,
      container,
      reachable: Boolean(probe.ok),
      message: probe.message
    };
  }
  return {
    providers,
    channels: current.channels || [],
    activeChannels: (current.channels || []).filter((channel) => channel.enabled).length,
    updatedAt: new Date().toISOString()
  };
}

async function startManagedConnection(providerName) {
  const config = await readConnectionsConfig();
  const provider = config.providers?.[providerName];
  if (!provider) throw new Error(`Unknown connection provider: ${providerName}`);
  if (provider.mode !== "managed") throw new Error(`${providerName} is configured as external. Switch to managed Docker before starting it here.`);
  await runCommand("docker", ["rm", "-f", provider.containerName], { cwd: APP_ROOT }).catch(() => {});
  let args;
  if (providerName === "redis") {
    args = [
      "run", "-d",
      "--name", provider.containerName,
      "--network", "host",
      "--restart", "always",
      provider.image || REDIS_IMAGE,
      "redis-server",
      "--appendonly", "yes",
      "--port", String(provider.port)
    ];
  } else if (providerName === "kafka") {
    args = [
      "run", "-d",
      "--name", provider.containerName,
      "--network", "host",
      "--restart", "always",
      "-e", "ALLOW_PLAINTEXT_LISTENER=yes",
      "-e", "KAFKA_CFG_NODE_ID=0",
      "-e", "KAFKA_CFG_PROCESS_ROLES=controller,broker",
      "-e", "KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER",
      "-e", "KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@127.0.0.1:9093",
      "-e", `KAFKA_CFG_LISTENERS=PLAINTEXT://:${provider.port},CONTROLLER://:9093`,
      "-e", `KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://${provider.host}:${provider.port}`,
      "-e", "KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT",
      "-e", "KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true",
      provider.image || KAFKA_IMAGE
    ];
  } else {
    throw new Error(`Cannot start provider: ${providerName}`);
  }
  const result = await runCommand("docker", args, { cwd: APP_ROOT, timeoutMs: 120000 });
  if (result.code !== 0) throw new Error(`Cannot start ${providerName}.\n${result.output}`);
  config.providers[providerName].enabled = true;
  await writeConnectionsConfig(config);
  return result;
}

async function stopManagedConnection(providerName) {
  const config = await readConnectionsConfig();
  const provider = config.providers?.[providerName];
  if (!provider) throw new Error(`Unknown connection provider: ${providerName}`);
  const result = await runCommand("docker", ["rm", "-f", provider.containerName], { cwd: APP_ROOT, timeoutMs: 30000 });
  config.providers[providerName].enabled = false;
  await writeConnectionsConfig(config);
  return result;
}

async function testConnectionChannel(channelId) {
  const config = await readConnectionsConfig();
  const channel = config.channels.find((item) => item.id === channelId);
  if (!channel) throw new Error(`Channel not found: ${channelId}`);
  const provider = config.providers[channel.provider];
  if (!provider?.enabled) throw new Error(`${channel.provider} is disabled.`);
  const probe = await tcpProbe(provider.host, provider.port, 2500);
  if (!probe.ok) throw new Error(`${channel.provider} is not reachable: ${probe.message}`);
  return {
    ok: true,
    provider: channel.provider,
    channel: channel.name,
    message: channel.provider === "redis"
      ? "Redis TCP is reachable. Pub/sub and stream names are configuration-ready."
      : "Kafka TCP is reachable. Topic creation is left to broker auto-create or external admin tools."
  };
}

async function inspectConnectionChannelMessages(channelId, options = {}) {
  const config = await readConnectionsConfig();
  const channel = config.channels.find((item) => item.id === channelId);
  if (!channel) throw new Error(`Channel not found: ${channelId}`);
  const provider = config.providers[channel.provider];
  if (!provider?.enabled) throw new Error(`${channel.provider} is disabled.`);
  const limit = Math.max(1, Math.min(500, Number(options.limit || 50)));
  const sort = options.sort === "oldest" ? "oldest" : "latest";
  const probe = await tcpProbe(provider.host, provider.port, 2500);
  if (!probe.ok) throw new Error(`${channel.provider} is not reachable: ${probe.message}`);

  if (channel.provider === "redis") {
    if (channel.type === "stream") {
      const count = Number(await redisCommand(provider, ["XLEN", channel.name]));
      const command = sort === "oldest"
        ? ["XRANGE", channel.name, "-", "+", "COUNT", String(limit)]
        : ["XREVRANGE", channel.name, "+", "-", "COUNT", String(limit)];
      const rawMessages = await redisCommand(provider, command);
      const messages = (Array.isArray(rawMessages) ? rawMessages : []).map(redisStreamMessageToObject);
      if (sort === "oldest") messages.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return {
        ok: true,
        provider: "redis",
        channel,
        sort,
        limit,
        count,
        messages,
        note: "Redis Stream keeps message history, so these are retained entries from the stream."
      };
    }
    const numsub = await redisCommand(provider, ["PUBSUB", "NUMSUB", channel.name]).catch(() => []);
    const subscriberCount = Array.isArray(numsub) ? Number(numsub[1] || 0) : 0;
    return {
      ok: true,
      provider: "redis",
      channel,
      sort,
      limit,
      count: 0,
      subscriberCount,
      messages: [],
      note: "Redis Pub/Sub does not retain message history. Use Redis Stream when you need to view past messages in the UI."
    };
  }

  return {
    ok: true,
    provider: channel.provider,
    channel,
    sort,
    limit,
    count: null,
    messages: [],
    note: "Kafka/topic browsing is configuration-ready, but retained message inspection is not enabled in this lightweight UI yet."
  };
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

async function listRuntimeResults({ date = "", source = "", limit = 200, runtimeDir = RUNTIME_DIR, urlBase = "/runtime" } = {}) {
  const capturesRoot = path.join(runtimeDir, "captures");
  const events = await readRuntimeEvents(5000, runtimeDir);
  const eventByRelative = new Map();
  const detectionsByFrame = new Map();
  const lprFrameKeys = new Set();
  const results = [];

  function frameKey(event = {}) {
    return [
      event.processorType || "",
      event.sourceId ?? "",
      event.frameNum ?? "",
      event.cameraId || ""
    ].join("|");
  }

  function relativeFromEventImage(event = {}) {
    if (event.imageRelativePath) return String(event.imageRelativePath).replace(/\\/g, "/");
    if (event.imagePath) {
      const relative = path.relative(runtimeDir, hostPathFromWorkspace(event.imagePath)).replace(/\\/g, "/");
      if (relative && !relative.startsWith("..")) return relative;
    }
    return "";
  }

  function resultFromEventImage(event = {}, fallback = {}) {
    const relative = relativeFromEventImage(event) || relativeFromEventImage(fallback);
    const parts = relative ? relative.split("/") : [];
    const captureDate = parts[1] || String(event.ts || fallback.ts || new Date().toISOString()).slice(0, 10);
    const cameraId = event.cameraId || fallback.cameraId || parts[2] || "unknown";
    return { relative, captureDate, cameraId };
  }

  for (const event of events) {
    const relative = relativeFromEventImage(event);
    if (relative) eventByRelative.set(relative, event);
    if (event.eventType === "image_detection") {
      const key = frameKey(event);
      if (!detectionsByFrame.has(key)) detectionsByFrame.set(key, []);
      detectionsByFrame.get(key).push(event);
    }
  }

  for (const event of events) {
    if (event.eventType !== "image_lpr_result") continue;
    const key = frameKey(event);
    lprFrameKeys.add(key);
    const related = detectionsByFrame.get(key) || [];
    const preferredImage = [
      event,
      event.vehicle,
      ...(event.plates || []),
      ...related.filter((item) => item.componentId === 1 || item.isVehicle),
      ...related
    ].find((item) => relativeFromEventImage(item));
    const imageInfo = resultFromEventImage(preferredImage || {}, event);
    if (date && imageInfo.captureDate !== date) continue;
    if (source && imageInfo.cameraId !== source) continue;
    const fullPath = imageInfo.relative ? path.join(runtimeDir, imageInfo.relative) : "";
    const stat = fullPath ? await fsp.stat(fullPath).catch(() => null) : null;
    const plate = (event.plates || []).find((item) => item.plateText) || (event.plates || [])[0] || {};
    results.push({
      date: imageInfo.captureDate,
      sourceId: event.sourceId ?? null,
      cameraId: event.cameraId || imageInfo.cameraId,
      cameraName: event.cameraName || event.vehicle?.cameraName || imageInfo.cameraId,
      fileName: fullPath ? path.basename(fullPath) : "",
      relativePath: imageInfo.relative,
      url: imageInfo.relative ? `${urlBase}/${imageInfo.relative}` : "",
      size: stat?.size || 0,
      createdAt: event.ts || stat?.mtime?.toISOString() || new Date().toISOString(),
      eventType: event.eventType,
      eventId: event.eventId || key,
      processorType: event.processorType || "lpr",
      component: "lpr",
      label: event.vehicle?.label || plate.label || "",
      confidence: plate.confidence ?? event.vehicle?.confidence ?? null,
      plateText: event.plateText || plate.plateText || "",
      plateStatus: event.plateStatus || "",
      zoneId: event.zoneId || event.vehicle?.zoneId || "",
      zoneName: event.zoneName || event.vehicle?.zoneName || "",
      zoneMode: event.zoneMode || event.vehicle?.zoneMode || "",
      failedStage: event.failedStage || "",
      failedModel: event.failedModel || "",
      failureReason: event.failureReason || "",
      objectId: event.vehicle?.objectId ?? null,
      classId: event.vehicle?.classId ?? null,
      bbox: event.vehicle?.bbox || null,
      vehicleLabel: event.vehicle?.label || "",
      plateLabel: plate.label || "",
      plateCount: (event.plates || []).length,
      charCount: plate.keptCharCount ?? plate.charDetections?.length ?? plate.ocrObjects?.length ?? null
    });
  }

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
      const relative = path.relative(runtimeDir, fullPath).replace(/\\/g, "/");
      const parts = relative.split("/");
      const captureDate = parts[1] || "";
      const cameraId = parts[2] || "unknown";
      if (date && captureDate !== date) continue;
      if (source && cameraId !== source) continue;
      const stat = await fsp.stat(fullPath);
      const event = eventByRelative.get(relative) || {};
      if (cameraId === "image-test" && (!event.eventType || event.eventType === "image_detection")) continue;
      if (event.eventType === "image_detection" && lprFrameKeys.has(frameKey(event))) continue;
      results.push({
        date: captureDate,
        sourceId: event.sourceId ?? null,
        cameraId: event.cameraId || cameraId,
        cameraName: event.cameraName || cameraId,
        fileName: entry.name,
        relativePath: relative,
        url: `${urlBase}/${relative}`,
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

function sanitizeTritonName(value) {
  const name = String(value || "").trim().replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 120);
  if (!name || name === "." || name === "..") throw new Error("Invalid Triton model name.");
  return name;
}

function sanitizeTritonVersion(value) {
  const version = String(value || "1").trim().replace(/[^0-9]/g, "");
  if (!version) throw new Error("Invalid Triton model version.");
  return version;
}

function tritonPlatformFromFile(fileName, requested = "") {
  const value = String(requested || "").trim();
  if (value) return value;
  const ext = path.extname(fileName || "").toLowerCase();
  if (ext === ".onnx") return "onnxruntime_onnx";
  if (ext === ".plan" || ext === ".engine") return "tensorrt_plan";
  if (ext === ".py") return "python";
  return "onnxruntime_onnx";
}

function tritonTargetFileName(fileName, platform) {
  const ext = path.extname(fileName || "").toLowerCase();
  if (platform === "onnxruntime_onnx") return "model.onnx";
  if (platform === "tensorrt_plan") return "model.plan";
  if (platform === "python") return "model.py";
  return `model${ext || ".bin"}`;
}

function tritonConfigTemplate(name, platform, maxBatchSize = 0) {
  const batch = Math.max(0, Number(maxBatchSize || 0));
  if (platform === "python") {
    return `name: "${name}"\nbackend: "python"\nmax_batch_size: ${batch}\n`;
  }
  return `name: "${name}"\nplatform: "${platform}"\nmax_batch_size: ${batch}\n`;
}

function sanitizeTritonDecoderProfile(value) {
  const profile = String(value || "raw").trim();
  return TRITON_DECODER_PROFILES.has(profile) ? profile : "raw";
}

function tritonLabelsPath(name) {
  return path.join(TRITON_MODELS_DIR, sanitizeTritonName(name), "labels.txt");
}

function tritonMetaPath(name) {
  return path.join(TRITON_MODELS_DIR, sanitizeTritonName(name), "model.meta.json");
}

function parseLabelsText(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function readTritonLabels(name) {
  const text = await fsp.readFile(tritonLabelsPath(name), "utf8").catch(() => "");
  return { text, labels: parseLabelsText(text) };
}

async function readTritonModelMeta(name) {
  const meta = await readJson(tritonMetaPath(name), {});
  return {
    decoderProfile: sanitizeTritonDecoderProfile(meta.decoderProfile),
    description: String(meta.description || ""),
    updatedAt: meta.updatedAt || ""
  };
}

async function writeTritonModelMeta(name, patch = {}) {
  const safeName = sanitizeTritonName(name);
  const modelDir = path.join(TRITON_MODELS_DIR, safeName);
  await fsp.mkdir(modelDir, { recursive: true });
  const current = await readTritonModelMeta(safeName);
  const next = {
    ...current,
    ...patch,
    decoderProfile: sanitizeTritonDecoderProfile(patch.decoderProfile ?? current.decoderProfile),
    updatedAt: new Date().toISOString()
  };
  await writeJson(tritonMetaPath(safeName), next);
  return next;
}

async function inferTritonPlatformFromRepo(name) {
  const modelDir = path.join(TRITON_MODELS_DIR, sanitizeTritonName(name));
  const entries = await fsp.readdir(modelDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries.filter((item) => item.isDirectory() && /^\d+$/.test(item.name))) {
    const files = await fsp.readdir(path.join(modelDir, entry.name)).catch(() => []);
    if (files.includes("model.onnx")) return "onnxruntime_onnx";
    if (files.includes("model.plan")) return "tensorrt_plan";
    if (files.includes("model.py")) return "python";
  }
  const config = await fsp.readFile(path.join(modelDir, "config.pbtxt"), "utf8").catch(() => "");
  const platform = config.match(/platform:\s*"([^"]+)"/)?.[1];
  if (platform) return platform;
  if (/backend:\s*"python"/.test(config)) return "python";
  return "onnxruntime_onnx";
}

async function rewriteTritonModelConfig(name, options = {}) {
  const safeName = sanitizeTritonName(name);
  const platform = tritonPlatformFromFile("", options.platform || await inferTritonPlatformFromRepo(safeName));
  const maxBatchSize = Math.max(0, Number(options.maxBatchSize ?? 0));
  const modelDir = path.join(TRITON_MODELS_DIR, safeName);
  await fsp.mkdir(modelDir, { recursive: true });
  await fsp.writeFile(path.join(modelDir, "config.pbtxt"), tritonConfigTemplate(safeName, platform, maxBatchSize));
  return { name: safeName, platform, maxBatchSize };
}

async function listTritonModels() {
  await fsp.mkdir(TRITON_MODELS_DIR, { recursive: true });
  const entries = await fsp.readdir(TRITON_MODELS_DIR, { withFileTypes: true }).catch(() => []);
  const models = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const name = entry.name;
    const modelDir = path.join(TRITON_MODELS_DIR, name);
    const children = await fsp.readdir(modelDir, { withFileTypes: true }).catch(() => []);
    const versions = [];
    for (const child of children.filter((item) => item.isDirectory() && /^\d+$/.test(item.name))) {
      const versionDir = path.join(modelDir, child.name);
      const files = await fsp.readdir(versionDir).catch(() => []);
      versions.push({ version: child.name, files });
    }
    const configPath = path.join(modelDir, "config.pbtxt");
    const config = await fsp.readFile(configPath, "utf8").catch(() => "");
    const labels = await readTritonLabels(name);
    const meta = await readTritonModelMeta(name);
    models.push({
      name,
      versions: versions.sort((a, b) => Number(a.version) - Number(b.version)),
      hasConfig: Boolean(config),
      configPreview: config.slice(0, 1200),
      labels: {
        count: labels.labels.length,
        preview: labels.labels.slice(0, 20),
        text: labels.text
      },
      decoderProfile: meta.decoderProfile,
      meta,
      inferPath: `/v2/models/${encodeURIComponent(name)}/infer`,
      path: modelDir
    });
  }
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

function tritonInferPath(name, version = "") {
  const safeName = encodeURIComponent(sanitizeTritonName(name));
  const safeVersion = String(version || "").trim();
  return safeVersion
    ? `/v2/models/${safeName}/versions/${encodeURIComponent(sanitizeTritonVersion(safeVersion))}/infer`
    : `/v2/models/${safeName}/infer`;
}

function tritonMetadataPath(name, version = "") {
  const safeName = encodeURIComponent(sanitizeTritonName(name));
  const safeVersion = String(version || "").trim();
  return safeVersion
    ? `/v2/models/${safeName}/versions/${encodeURIComponent(sanitizeTritonVersion(safeVersion))}`
    : `/v2/models/${safeName}`;
}

function zeroValueForTritonDatatype(datatype = "") {
  const value = String(datatype || "").toUpperCase();
  if (value === "BOOL") return false;
  if (value === "BYTES" || value === "STRING") return "";
  return 0;
}

function dummyTritonPayloadFromMetadata(metadata = {}, maxElements = 2000000) {
  const inputs = Array.isArray(metadata.inputs) ? metadata.inputs : [];
  if (!inputs.length) throw new Error("Triton model metadata has no inputs.");
  return {
    inputs: inputs.map((input) => {
      const shape = (input.shape || []).map((dim) => Number(dim) > 0 ? Number(dim) : 1);
      const elements = shape.reduce((total, dim) => total * Math.max(1, Number(dim || 1)), 1);
      if (elements > maxElements) {
        throw new Error(`Dummy input '${input.name}' is too large (${elements} elements). Paste a smaller payload manually.`);
      }
      return {
        name: input.name,
        shape,
        datatype: input.datatype || "FP32",
        data: Array.from({ length: elements }, () => zeroValueForTritonDatatype(input.datatype))
      };
    })
  };
}

function imageInputSpecFromMetadata(metadata = {}) {
  const inputs = Array.isArray(metadata.inputs) ? metadata.inputs : [];
  const input = inputs.find((item) => {
    const shape = Array.isArray(item.shape) ? item.shape.map(Number) : [];
    return shape.length === 4 && (shape[1] === 3 || shape[3] === 3);
  }) || inputs[0];
  if (!input) throw new Error("Triton model metadata has no inputs.");
  const shape = (input.shape || []).map((dim) => Number(dim) > 0 ? Number(dim) : 1);
  if (shape.length !== 4) {
    throw new Error(`Image infer currently supports 4D image inputs only. Found ${input.name}: [${shape.join(", ")}].`);
  }
  const nchw = shape[1] === 3;
  const nhwc = shape[3] === 3;
  if (!nchw && !nhwc) {
    throw new Error(`Image infer expects channel dimension 3. Found ${input.name}: [${shape.join(", ")}].`);
  }
  const height = nchw ? shape[2] : shape[1];
  const width = nchw ? shape[3] : shape[2];
  if (height <= 0 || width <= 0) throw new Error(`Invalid image input shape for ${input.name}.`);
  return {
    name: input.name,
    datatype: input.datatype || "FP32",
    shape,
    layout: nchw ? "NCHW" : "NHWC",
    height,
    width
  };
}

async function tritonImagePayloadFromFile(imagePath, metadata = {}, options = {}) {
  const input = imageInputSpecFromMetadata(metadata);
  const datatype = String(input.datatype || "").toUpperCase();
  if (datatype !== "FP32") {
    throw new Error(`Image infer currently supports FP32 image inputs. Found ${input.name}: ${input.datatype}.`);
  }
  const channelOrder = String(options.channelOrder || "rgb").toLowerCase() === "bgr" ? "bgr" : "rgb";
  const scaleMode = String(options.scaleMode || "0-1");
  const resizeMode = String(options.resizeMode || "letterbox").toLowerCase() === "stretch" ? "stretch" : "letterbox";
  const scale = scaleMode === "0-255" ? 1 : 1 / 255;
  const expectedBytes = input.width * input.height * 3;
  const originalDimensions = await imageDimensions(imagePath).catch(() => ({ width: 0, height: 0 }));
  const originalWidth = Number(originalDimensions.width || input.width);
  const originalHeight = Number(originalDimensions.height || input.height);
  const ratio = resizeMode === "letterbox"
    ? Math.min(input.width / originalWidth, input.height / originalHeight)
    : 1;
  const resizedWidth = resizeMode === "letterbox" ? Math.round(originalWidth * ratio) : input.width;
  const resizedHeight = resizeMode === "letterbox" ? Math.round(originalHeight * ratio) : input.height;
  const padX = resizeMode === "letterbox" ? (input.width - resizedWidth) / 2 : 0;
  const padY = resizeMode === "letterbox" ? (input.height - resizedHeight) / 2 : 0;
  const filter = resizeMode === "letterbox"
    ? `scale=${input.width}:${input.height}:force_original_aspect_ratio=decrease,pad=${input.width}:${input.height}:(ow-iw)/2:(oh-ih)/2:color=0x727272,format=rgb24`
    : `scale=${input.width}:${input.height},format=rgb24`;
  const result = await runBinaryCommand(ffmpegExecutable(), [
    "-v", "error",
    "-i", imagePath,
    "-frames:v", "1",
    "-vf", filter,
    "-f", "rawvideo",
    "pipe:1"
  ], {
    cwd: APP_ROOT,
    timeoutMs: 30000,
    maxBufferBytes: expectedBytes + 1024
  });
  if (result.code !== 0) {
    throw new Error(`Cannot preprocess image with ffmpeg.\n${result.stderr}`);
  }
  if (result.stdout.length !== expectedBytes) {
    throw new Error(`Unexpected preprocessed image size: ${result.stdout.length} bytes, expected ${expectedBytes}.`);
  }
  const rgb = result.stdout;
  const pixels = input.width * input.height;
  let data;
  if (input.layout === "NCHW") {
    data = new Array(pixels * 3);
    for (let i = 0; i < pixels; i += 1) {
      const base = i * 3;
      const r = rgb[base];
      const g = rgb[base + 1];
      const b = rgb[base + 2];
      data[i] = (channelOrder === "bgr" ? b : r) * scale;
      data[pixels + i] = g * scale;
      data[(pixels * 2) + i] = (channelOrder === "bgr" ? r : b) * scale;
    }
  } else {
    data = new Array(pixels * 3);
    for (let i = 0; i < pixels; i += 1) {
      const base = i * 3;
      const r = rgb[base];
      const g = rgb[base + 1];
      const b = rgb[base + 2];
      data[base] = (channelOrder === "bgr" ? b : r) * scale;
      data[base + 1] = g * scale;
      data[base + 2] = (channelOrder === "bgr" ? r : b) * scale;
    }
  }
  return {
    payload: {
      inputs: [{
        name: input.name,
        shape: input.shape,
        datatype: input.datatype || "FP32",
        data
      }]
    },
    preprocessing: {
      inputName: input.name,
      shape: input.shape,
      layout: input.layout,
      width: input.width,
      height: input.height,
      datatype: input.datatype || "FP32",
      channelOrder,
      scaleMode,
      resizeMode,
      originalWidth,
      originalHeight,
      resizedWidth,
      resizedHeight,
      letterbox: {
        ratio,
        padX,
        padY
      },
      elements: data.length
    }
  };
}

function summarizeTritonBody(body, maxOutputItems = 64) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const next = { ...body };
  if (Array.isArray(body.outputs)) {
    next.outputs = body.outputs.map((output) => {
      if (!Array.isArray(output.data)) return output;
      const dataLength = output.data.length;
      return {
        ...output,
        dataLength,
        dataPreview: output.data.slice(0, maxOutputItems),
        data: dataLength > maxOutputItems ? undefined : output.data
      };
    });
  }
  return next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersectionOverUnion(a, b) {
  const ax2 = a.left + a.width;
  const ay2 = a.top + a.height;
  const bx2 = b.left + b.width;
  const by2 = b.top + b.height;
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(ax2, bx2);
  const bottom = Math.min(ay2, by2);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const intersection = width * height;
  const union = (a.width * a.height) + (b.width * b.height) - intersection;
  return union > 0 ? intersection / union : 0;
}

function nonMaxSuppression(detections, iouThreshold = 0.45, maxDetections = 100) {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept = [];
  for (const detection of sorted) {
    if (kept.length >= maxDetections) break;
    const overlaps = kept.some((item) => (
      item.classId === detection.classId
      && intersectionOverUnion(item.bboxResized, detection.bboxResized) > iouThreshold
    ));
    if (!overlaps) kept.push(detection);
  }
  return kept;
}

function mapResizedBoxToOriginal(bboxResized, options = {}) {
  const inputWidth = Number(options.inputWidth || 640);
  const inputHeight = Number(options.inputHeight || 640);
  const originalWidth = Number(options.originalWidth || inputWidth);
  const originalHeight = Number(options.originalHeight || inputHeight);
  const resizeMode = String(options.resizeMode || "stretch").toLowerCase();
  if (resizeMode === "letterbox") {
    const ratio = Number(options.letterbox?.ratio || Math.min(inputWidth / originalWidth, inputHeight / originalHeight));
    const padX = Number(options.letterbox?.padX || 0);
    const padY = Number(options.letterbox?.padY || 0);
    const left = (bboxResized.left - padX) / ratio;
    const top = (bboxResized.top - padY) / ratio;
    const right = (bboxResized.left + bboxResized.width - padX) / ratio;
    const bottom = (bboxResized.top + bboxResized.height - padY) / ratio;
    const clippedLeft = clamp(left, 0, originalWidth);
    const clippedTop = clamp(top, 0, originalHeight);
    const clippedRight = clamp(right, 0, originalWidth);
    const clippedBottom = clamp(bottom, 0, originalHeight);
    return {
      left: clippedLeft,
      top: clippedTop,
      width: Math.max(0, clippedRight - clippedLeft),
      height: Math.max(0, clippedBottom - clippedTop)
    };
  }
  const xScale = originalWidth / inputWidth;
  const yScale = originalHeight / inputHeight;
  return {
    left: bboxResized.left * xScale,
    top: bboxResized.top * yScale,
    width: bboxResized.width * xScale,
    height: bboxResized.height * yScale
  };
}

function summarizeDetectionReading(detections = []) {
  const sorted = [...detections]
    .filter((detection) => detection?.bboxOriginal && Number.isFinite(Number(detection.bboxOriginal.left)))
    .sort((a, b) => Number(a.bboxOriginal.left) - Number(b.bboxOriginal.left));
  return {
    text: sorted.map((detection) => detection.label || `class_${detection.classId}`).join(""),
    labels: sorted.map((detection) => detection.label || `class_${detection.classId}`),
    count: sorted.length
  };
}

function outputByName(body = {}, name = "") {
  const outputs = Array.isArray(body.outputs) ? body.outputs : [];
  return outputs.find((output) => String(output.name || "").toLowerCase() === String(name).toLowerCase());
}

function decodeUltralyticsYoloDetect(body = {}, labels = [], options = {}) {
  const outputs = Array.isArray(body.outputs) ? body.outputs : [];
  const output = outputs.find((item) => Array.isArray(item.data) && Array.isArray(item.shape) && item.shape.length === 3);
  if (!output) return { profile: "ultralytics_yolo_detect", detections: [], warnings: ["No 3D YOLO output tensor found."] };
  const shape = output.shape.map(Number);
  const data = output.data;
  const channelFirst = shape[1] <= shape[2];
  const channels = channelFirst ? shape[1] : shape[2];
  const boxes = channelFirst ? shape[2] : shape[1];
  const classCount = Math.max(0, channels - 4);
  const confidenceThreshold = Number(options.confidenceThreshold ?? 0.25);
  const iouThreshold = Number(options.iouThreshold ?? 0.45);
  const maxDetections = Math.max(1, Number(options.maxDetections || 100));
  const inputWidth = Number(options.inputWidth || 640);
  const inputHeight = Number(options.inputHeight || 640);
  const originalWidth = Number(options.originalWidth || inputWidth);
  const originalHeight = Number(options.originalHeight || inputHeight);
  const detections = [];
  const valueAt = (channel, box) => channelFirst
    ? data[(channel * boxes) + box]
    : data[(box * channels) + channel];
  for (let box = 0; box < boxes; box += 1) {
    let classId = -1;
    let confidence = -Infinity;
    for (let classIndex = 0; classIndex < classCount; classIndex += 1) {
      const score = Number(valueAt(4 + classIndex, box));
      if (score > confidence) {
        confidence = score;
        classId = classIndex;
      }
    }
    if (!Number.isFinite(confidence) || confidence < confidenceThreshold) continue;
    const cx = Number(valueAt(0, box));
    const cy = Number(valueAt(1, box));
    const width = Number(valueAt(2, box));
    const height = Number(valueAt(3, box));
    if (![cx, cy, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;
    const left = clamp(cx - (width / 2), 0, inputWidth);
    const top = clamp(cy - (height / 2), 0, inputHeight);
    const right = clamp(cx + (width / 2), 0, inputWidth);
    const bottom = clamp(cy + (height / 2), 0, inputHeight);
    const bboxResized = {
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
    detections.push({
      classId,
      label: labels[classId] || `class_${classId}`,
      confidence,
      bboxResized,
      bboxOriginal: mapResizedBoxToOriginal(bboxResized, { ...options, inputWidth, inputHeight, originalWidth, originalHeight })
    });
  }
  const finalDetections = nonMaxSuppression(detections, iouThreshold, maxDetections);
  const warnings = [];
  if (!labels.length) warnings.push("No labels.txt found; labels are shown as class_0, class_1, ...");
  if (labels.length && labels.length !== classCount) warnings.push(`labels.txt has ${labels.length} labels, YOLO output suggests ${classCount} classes.`);
  return {
    profile: "ultralytics_yolo_detect",
    tensor: { name: output.name, shape, layout: channelFirst ? "[batch, channels, boxes]" : "[batch, boxes, channels]", boxes, channels, classCount },
    thresholds: { confidenceThreshold, iouThreshold, maxDetections },
    detections: finalDetections,
    reading: summarizeDetectionReading(finalDetections),
    rawCandidates: detections.length,
    warnings
  };
}

function decodeLegacyBoxesScoresClasses(body = {}, labels = [], options = {}) {
  const boxesOutput = outputByName(body, "boxes");
  const scoresOutput = outputByName(body, "scores");
  const classesOutput = outputByName(body, "classes");
  const warnings = [];
  if (!boxesOutput || !scoresOutput || !classesOutput) {
    return { profile: "legacy_boxes_scores_classes", detections: [], warnings: ["Expected outputs named boxes, scores and classes."] };
  }
  const boxes = boxesOutput.data || [];
  const scores = scoresOutput.data || [];
  const classes = classesOutput.data || [];
  const count = Math.min(scores.length, classes.length, Math.floor(boxes.length / 4));
  const confidenceThreshold = Number(options.confidenceThreshold ?? 0.25);
  const maxDetections = Math.max(1, Number(options.maxDetections || 100));
  const inputWidth = Number(options.inputWidth || 640);
  const inputHeight = Number(options.inputHeight || 640);
  const originalWidth = Number(options.originalWidth || inputWidth);
  const originalHeight = Number(options.originalHeight || inputHeight);
  const detections = [];
  for (let index = 0; index < count; index += 1) {
    const confidence = Number(scores[index]);
    if (!Number.isFinite(confidence) || confidence < confidenceThreshold) continue;
    const classId = Math.max(0, Math.round(Number(classes[index])));
    const base = index * 4;
    const x1 = clamp(Number(boxes[base]), 0, inputWidth);
    const y1 = clamp(Number(boxes[base + 1]), 0, inputHeight);
    const x2 = clamp(Number(boxes[base + 2]), 0, inputWidth);
    const y2 = clamp(Number(boxes[base + 3]), 0, inputHeight);
    const bboxResized = {
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1)
    };
    detections.push({
      classId,
      label: labels[classId] || `class_${classId}`,
      confidence,
      bboxResized,
      bboxOriginal: mapResizedBoxToOriginal(bboxResized, { ...options, inputWidth, inputHeight, originalWidth, originalHeight })
    });
  }
  const finalDetections = detections.slice(0, maxDetections);
  if (!labels.length) warnings.push("No labels.txt found; labels are shown as class_0, class_1, ...");
  return {
    profile: "legacy_boxes_scores_classes",
    tensor: {
      boxes: boxesOutput.shape,
      scores: scoresOutput.shape,
      classes: classesOutput.shape
    },
    thresholds: { confidenceThreshold, maxDetections },
    detections: finalDetections,
    reading: summarizeDetectionReading(finalDetections),
    rawCandidates: detections.length,
    warnings
  };
}

function decodeTritonDetections(body = {}, labels = [], options = {}) {
  const profile = sanitizeTritonDecoderProfile(options.decoderProfile);
  if (profile === "ultralytics_yolo_detect") return decodeUltralyticsYoloDetect(body, labels, options);
  if (profile === "legacy_boxes_scores_classes") return decodeLegacyBoxesScoresClasses(body, labels, options);
  return {
    profile: "raw",
    detections: [],
    warnings: ["Decoder profile is raw, so no detection post-process was applied."]
  };
}

async function tritonHttp(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${TRITON_HTTP_PORT}${pathname}`, options);
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // keep text body
  }
  return { ok: response.ok, status: response.status, body };
}

async function readTritonStatus() {
  const container = await inspectContainer(TRITON_CONTAINER_NAME);
  let ready = false;
  let server = {};
  let logs = "";
  if (container.exists) {
    const logResult = await runCommand("docker", ["logs", "--tail", "80", TRITON_CONTAINER_NAME], { cwd: APP_ROOT }).catch((error) => ({ output: error.message }));
    logs = tailOutput(logResult.output || "", 8000);
  }
  if (container.running && container.status === "running") {
    const health = await tritonHttp("/v2/health/ready").catch((error) => ({ ok: false, body: error.message }));
    ready = Boolean(health.ok);
    server = await tritonHttp("/v2").then((result) => result.body).catch((error) => ({ error: error.message }));
  } else if (container.status === "restarting") {
    server = { error: "Managed Triton container is restarting. Check logs and model config." };
  }
  return {
    container,
    ready,
    server,
    logs,
    image: TRITON_IMAGE,
    modelRepository: TRITON_MODELS_DIR,
    httpPort: TRITON_HTTP_PORT,
    grpcPort: TRITON_GRPC_PORT,
    metricsPort: TRITON_METRICS_PORT
  };
}

async function startTritonContainer() {
  await fsp.mkdir(TRITON_MODELS_DIR, { recursive: true });
  await runCommand("docker", ["rm", "-f", TRITON_CONTAINER_NAME], { cwd: APP_ROOT }).catch(() => {});
  const runtimeArgs = dockerRuntimeArgs();
  const args = [
    "run", "-d",
    "--name", TRITON_CONTAINER_NAME,
    "--network", "host",
    "--restart", "always",
    ...runtimeArgs,
    "-v", `${dockerPath(TRITON_MODELS_DIR)}:/models`,
    TRITON_IMAGE,
    "tritonserver",
    "--model-repository=/models",
    "--model-control-mode=poll",
    "--repository-poll-secs=5",
    "--exit-on-error=false",
    "--allow-http=true",
    "--allow-grpc=true",
    "--allow-metrics=true",
    `--http-port=${TRITON_HTTP_PORT}`,
    `--grpc-port=${TRITON_GRPC_PORT}`,
    `--metrics-port=${TRITON_METRICS_PORT}`
  ];
  const result = await runCommand("docker", args, { cwd: APP_ROOT, timeoutMs: 120000 });
  if (result.code !== 0) throw new Error(`Cannot start Triton container.\n${result.output}`);
  return result;
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

const uploadTritonModel = multer({
  dest: TRITON_UPLOAD_DIR,
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === "labels") {
      if (ext !== ".txt") {
        cb(new Error("Triton labels must be a .txt file."));
        return;
      }
      cb(null, true);
      return;
    }
    if (file.fieldname === "config") {
      if (file.originalname !== "config.pbtxt" && ext !== ".pbtxt" && ext !== ".txt") {
        cb(new Error("Triton config must be config.pbtxt."));
        return;
      }
      cb(null, true);
      return;
    }
    if (![".onnx", ".plan", ".engine", ".py"].includes(ext)) {
      cb(new Error("Triton model file must be .onnx, .plan, .engine or .py."));
      return;
    }
    cb(null, true);
  }
});

const uploadTritonInferImage = multer({
  dest: TRITON_UPLOAD_DIR,
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".bmp", ".webp"].includes(ext)) {
      cb(new Error("Triton infer image must be .jpg, .jpeg, .png, .bmp, or .webp."));
      return;
    }
    cb(null, true);
  }
});

const uploadTritonLabels = multer({
  dest: TRITON_UPLOAD_DIR,
  fileFilter(_req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() !== ".txt") {
      cb(new Error("Triton labels must be a .txt file."));
      return;
    }
    cb(null, true);
  }
});

async function imageDimensions(filePath) {
  const buffer = await fsp.readFile(filePath);
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer.length > 24 && buffer[0] === 0x89 && buffer.slice(1, 4).toString("ascii") === "PNG";
  if (isJpeg && buffer.length > 4) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
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
  if (isPng) {
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
  const gieId = zone?.gieId === "" || zone?.gieId === null || zone?.gieId === undefined
    ? ""
    : Math.max(1, Number(zone.gieId || 1));
  const cooldown = zone?.cooldownSec === "" || zone?.cooldownSec === null || zone?.cooldownSec === undefined
    ? ""
    : Math.max(1, Number(zone.cooldownSec || streamDefaults.captureCooldownSec || 30));
  return {
    id,
    name: String(zone?.name || `Zone ${index + 1}`).trim() || `Zone ${index + 1}`,
    enabled: zone?.enabled !== false,
    mode,
    polygon: normalizePolygon(zone?.polygon || zone?.points || []),
    gieId,
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
  const gieId = rule?.gieId === "" || rule?.gieId === null || rule?.gieId === undefined
    ? ""
    : Math.max(1, Number(rule.gieId || 1));
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
    maxTimeSec: Math.max(1, Number(rule?.maxTimeSec || 30)),
    cooldownSec: cooldown,
    gieId,
    classIds: []
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
    if (isLprCharacterDetector) {
      lines.push("input-object-min-width=12");
      lines.push("input-object-min-height=8");
    } else {
      lines.push("input-object-min-width=1");
      lines.push("input-object-min-height=1");
    }
    if (!profile.outputInstanceMask) {
      lines.push("scaling-compute-hw=1");
      if (!lines.includes("scaling-filter=2")) lines.push("scaling-filter=2");
    }
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
  const buildOptions = model.build?.buildOptions || {};
  const configuredPreClusterThreshold = model.preClusterThreshold ?? model.build?.preClusterThreshold ?? buildOptions.preClusterThreshold;
  const configuredTopk = model.topk ?? model.build?.topk ?? buildOptions.topk;
  const preClusterThreshold = configuredPreClusterThreshold !== undefined && configuredPreClusterThreshold !== null && configuredPreClusterThreshold !== ""
    ? Number(configuredPreClusterThreshold)
    : isLprCharacterDetector ? 0.4 : 0.35;
  const topk = configuredTopk !== undefined && configuredTopk !== null && configuredTopk !== ""
    ? Math.max(1, Number(configuredTopk))
    : isLprCharacterDetector ? 200 : 100;
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

const MODEL_FAMILY_RULES = {
  boxes_scores_classes_yolov8_xywh: {
    id: "boxes_scores_classes_yolov8_xywh",
    label: "Postprocessed YOLO boxes/scores/classes",
    parserProfile: "profile:boxes_scores_classes_xywh",
    reason: "ONNX already exports boxes, scores and classes tensors. It needs the local BSC parser instead of the raw DeepStream-Yolo parser.",
    lockedOptions: [
      "profile",
      "task",
      "deepstreamYoloRef",
      "engineBuildMethod",
      "buildParser"
    ],
    suggested: {
      profile: "yolo_detection",
      task: "detect",
      engineBuildMethod: "runtime-trtexec",
      buildParser: true,
      deepstreamYoloRef: "profile:boxes_scores_classes_xywh",
      preClusterThreshold: 0.4,
      topk: 200
    }
  },
  plate_character_legacy_yolov8: {
    id: "plate_character_legacy_yolov8",
    label: "Plate character legacy YOLOv8",
    parserProfile: "profile:plate_ocr_yolov8_36",
    reason: "Fixed 32x3x224x224 ONNX with boxes/scores/classes outputs from the legacy plate OCR project.",
    lockedOptions: [
      "profile",
      "task",
      "deepstreamYoloRef",
      "numClasses",
      "forceImplicitBatchDim",
      "scalingFilter",
      "preClusterThreshold",
      "topk"
    ],
    suggested: {
      profile: "yolo_detection",
      task: "detect",
      imageSize: 224,
      buildBatchSize: 32,
      numClasses: 36,
      engineBuildMethod: "runtime-trtexec",
      buildParser: true,
      deepstreamYoloRef: "profile:plate_ocr_yolov8_36",
      forceImplicitBatchDim: true,
      scalingFilter: 2,
      preClusterThreshold: 0.4,
      topk: 200
    }
  }
};

function firstInputShape(inspect = {}) {
  return Array.isArray(inspect.inputs?.[0]?.shape) ? inspect.inputs[0].shape : [];
}

function firstInputName(inspect = {}) {
  return String(inspect.inputs?.[0]?.name || "input").trim() || "input";
}

function isDynamicDim(value) {
  return value === null || value === undefined || value === "" || Number(value) <= 0 || typeof value === "string";
}

function trtexecShapeArg(inspect = {}, batchSize = 1, imageSize = 640) {
  const shape = firstInputShape(inspect);
  if (shape.length !== 4 || !shape.some(isDynamicDim)) return "";
  const inputName = firstInputName(inspect);
  const channels = Number(shape[1]) > 0 ? Number(shape[1]) : 3;
  const height = Number(shape[2]) > 0 ? Number(shape[2]) : Number(imageSize || 640);
  const width = Number(shape[3]) > 0 ? Number(shape[3]) : Number(imageSize || 640);
  return `--shapes=${inputName}:${Math.max(1, Number(batchSize || 1))}x${channels}x${height}x${width}`;
}

function looksLikePlateCharacterLabels(labels = []) {
  const clean = labels.map((label) => String(label || "").trim().toUpperCase()).filter(Boolean);
  const hasDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].every((value) => clean.includes(value));
  const hasLetters = ["A", "B", "C", "D", "E", "F"].every((value) => clean.includes(value));
  return clean.length >= 36 && clean.length <= 37 && hasDigits && hasLetters;
}

function detectModelFamilyRule(group, sourcePath, inspect = {}, labels = []) {
  const detected = inspect.detected || {};
  const shape = firstInputShape(inspect);
  const sourceHint = `${group || ""} ${sourcePath || ""}`.toLowerCase();
  const plateHint = /plate|ocr|char|character|pl_32_224|plate_recognition/.test(sourceHint);
  const hasLegacyShape = shape.length === 4 && Number(shape[0]) === 32 && Number(shape[1]) === 3 && Number(shape[2]) === 224 && Number(shape[3]) === 224;
  const hasLegacyOutput = detected.outputKind === "boxes_scores_classes"
    && Array.isArray(inspect.outputs)
    && inspect.outputs.some((item) => String(item.name || "").toLowerCase() === "boxes")
    && inspect.outputs.some((item) => String(item.name || "").toLowerCase() === "scores")
    && inspect.outputs.some((item) => String(item.name || "").toLowerCase() === "classes");
  if ((isPlateCharacterGroup(group) || plateHint) && hasLegacyShape && hasLegacyOutput && looksLikePlateCharacterLabels(labels)) {
    return MODEL_FAMILY_RULES.plate_character_legacy_yolov8;
  }
  if (hasLegacyOutput && labels.length > 0) {
    return MODEL_FAMILY_RULES.boxes_scores_classes_yolov8_xywh;
  }
  return null;
}

function applyModelFamilyRule(buildConfig, familyRule = null) {
  if (!familyRule) return buildConfig;
  if (familyRule.id === "boxes_scores_classes_yolov8_xywh") {
    return {
      ...buildConfig,
      ...familyRule.suggested,
      imgsz: buildConfig.imgsz,
      batchSize: buildConfig.batchSize,
      sourceType: buildConfig.sourceType,
      yoloVersion: buildConfig.yoloVersion || "yolov8",
      opset: buildConfig.opset,
      workspaceMb: buildConfig.workspaceMb,
      fp16: buildConfig.fp16,
      simplify: buildConfig.simplify,
      dynamic: buildConfig.dynamic,
      buildEngine: buildConfig.buildEngine,
      numClasses: buildConfig.numClasses,
      forceImplicitBatchDim: buildConfig.forceImplicitBatchDim,
      scalingFilter: buildConfig.scalingFilter,
      family: familyRule.id
    };
  }
  if (familyRule.id === "plate_character_legacy_yolov8") {
    return {
      ...buildConfig,
      ...familyRule.suggested,
      imgsz: familyRule.suggested.imageSize,
      batchSize: familyRule.suggested.buildBatchSize,
      sourceType: buildConfig.sourceType,
      yoloVersion: buildConfig.yoloVersion || "yolov8",
      opset: buildConfig.opset,
      workspaceMb: buildConfig.workspaceMb,
      fp16: buildConfig.fp16,
      simplify: buildConfig.simplify,
      dynamic: buildConfig.dynamic,
      buildEngine: buildConfig.buildEngine,
      family: familyRule.id
    };
  }
  return buildConfig;
}

async function validateModelFamilyBuild(paths, familyRule, buildState = {}) {
  if (!familyRule) return "No model family rule matched.";
  if (familyRule.id === "boxes_scores_classes_yolov8_xywh") {
    const problems = [];
    if (buildState.deepstreamYoloRef !== familyRule.parserProfile) {
      problems.push(`parser ref must be ${familyRule.parserProfile}, got ${buildState.deepstreamYoloRef || "empty"}`);
    }
    if (!usableFileStat(paths.parserLib)) {
      problems.push(`parser library missing: ${paths.parserLib}`);
    }
    const labelCount = countLabelLines(paths.labels);
    if (labelCount <= 0) {
      problems.push("labels.txt is required for boxes/scores/classes detector outputs");
    }
    if (Number(buildState.numClasses || 0) !== labelCount) {
      problems.push(`numClasses should match labels count ${labelCount}, got ${buildState.numClasses}`);
    }
    if (problems.length) {
      throw new Error(`Model family validation failed:\n- ${problems.join("\n- ")}`);
    }
    return [
      `${familyRule.label} validation OK.`,
      `Parser: ${familyRule.parserProfile}`,
      `labels.txt: ${labelCount} labels`
    ].join("\n");
  }
  if (familyRule.id !== "plate_character_legacy_yolov8") return `No validation rules for ${familyRule.id}.`;
  const problems = [];
  if (buildState.deepstreamYoloRef !== familyRule.parserProfile) {
    problems.push(`parser ref must be ${familyRule.parserProfile}, got ${buildState.deepstreamYoloRef || "empty"}`);
  }
  if (!usableFileStat(paths.parserLib)) {
    problems.push(`parser library missing: ${paths.parserLib}`);
  }
  const labelCount = countLabelLines(paths.labels);
  if (labelCount < 36 || labelCount > 37) {
    problems.push(`labels count should be 36 or 37, got ${labelCount}`);
  }
  if (Number(buildState.numClasses) !== 36) {
    problems.push(`numClasses should be 36, got ${buildState.numClasses}`);
  }
  if (!buildState.forceImplicitBatchDim) {
    problems.push("forceImplicitBatchDim must be enabled");
  }
  if (problems.length) {
    throw new Error(`Model family validation failed:\n- ${problems.join("\n- ")}`);
  }
  return [
    `${familyRule.label} validation OK.`,
    `Parser: ${familyRule.parserProfile}`,
    `labels.txt: ${labelCount} labels`,
    "force-implicit-batch-dim: enabled"
  ].join("\n");
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
      familyRule: meta.inspect?.familyRule || null,
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
  const familyRule = detectModelFamilyRule(group, sourcePath, inspect, labels);
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

  if (familyRule) {
    Object.assign(suggested, familyRule.suggested);
    suggested.family = familyRule.id;
    recommendations.push(`Matched ${familyRule.label}. ${familyRule.reason}`);
    recommendations.push(`Build config is locked to parser ${familyRule.parserProfile} to avoid the standard YOLO parser misreading boxes/scores/classes outputs.`);
  }

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

  if (familyRule) {
    recommendations.push("For future builds of this model family, save the suggested config and keep the generated parser profile unchanged.");
  } else if (detected.outputKind === "raw_yolo_like") {
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

  return {
    suggested,
    familyRule: familyRule ? {
      id: familyRule.id,
      label: familyRule.label,
      reason: familyRule.reason,
      parserProfile: familyRule.parserProfile,
      lockedOptions: familyRule.lockedOptions,
      suggested: familyRule.suggested
    } : null,
    warnings: [...new Set(warnings)],
    recommendations: [...new Set(recommendations)]
  };
}

function normalizeBuildConfig(group, input = {}, inspect = null, model = {}) {
  const suggested = inspect?.suggested || {};
  const familyRule = inspect?.familyRule?.id ? MODEL_FAMILY_RULES[inspect.familyRule.id] : null;
  const profile = normalizeModelProfile(input.profile || suggested.profile || model.profile || "yolo_detection");
  const profileSpec = modelProfileSpec(profile);
  const sourceType = String(input.sourceType || "").toLowerCase();
  const ext = String(input.sourceExt || "").toLowerCase();
  const isOnnx = sourceType === "onnx" || ext === ".onnx";
  const buildParserDefault = !["custom_onnx", "yolo_classification"].includes(profile);
  const buildConfig = {
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
  return applyModelFamilyRule(buildConfig, familyRule);
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
  const shapeArg = String(options.shapeArg || "").trim();
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
      shapeArg,
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
    { id: "validate_family_rule", label: "Validate model family rule" },
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
  const sourceExt = path.extname(source).toLowerCase();
  options = applySavedBuildOptions(options, sourceMeta.buildOptions || {});
  if (sourceMeta.inspect?.familyRule?.id) {
    options = normalizeBuildConfig(group, {
      ...options,
      sourceExt
    }, sourceMeta.inspect, model);
  }
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
  const shapeArg = trtexecShapeArg(sourceMeta.inspect || {}, batchSize, imgsz);
  const task = profile.task || options.task || "detect";
  const yoloVersion = String(options.yoloVersion || model.yoloVersion || "yolov8").toLowerCase();
  const simplify = parseBool(options.simplify, true);
  const dynamic = parseBool(options.dynamic, false);
  const buildEngine = parseBool(options.buildEngine, true);
  const fp16 = parseBool(options.fp16, true);
  const workspaceMb = Math.max(256, Number(options.workspaceMb || 2048));
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
  const familyRule = sourceMeta.inspect?.familyRule?.id ? MODEL_FAMILY_RULES[sourceMeta.inspect.familyRule.id] : null;
  const familyLocksParser = Boolean(familyRule?.parserProfile);
  const normalizedRequestedRepoRef = familyLocksParser && !isParserProfile(requestedRepoRef)
    ? familyRule.parserProfile
    : isPlateCharacterGroup(group) && sourceExt === ".onnx" && !isParserProfile(requestedRepoRef)
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
    shapeArg ? `TensorRT input shape: ${shapeArg}` : "TensorRT input shape: static/default",
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
        const resultOutput = await buildRuntimeTrtexecEngine(config, paths, { fp16, workspaceMb, shapeArg });
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
        if (shapeArg) trtArgs.push(shapeArg);
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

  let familyValidation = null;
  if (familyRule) {
    const validation = await runCheckpoint(checkpoints, "validate_family_rule", async () => {
      const validationOutput = await validateModelFamilyBuild(paths, familyRule, {
        deepstreamYoloRef,
        numClasses,
        forceImplicitBatchDim: parseBool(options.forceImplicitBatchDim, false)
      });
      return { output: validationOutput };
    }, "Model family rule validated.", onProgress);
    familyValidation = {
      family: familyRule.id,
      label: familyRule.label,
      output: validation.output || ""
    };
    output += `\n# Validate model family rule\n${validation.output || ""}\n`;
  } else {
    skipCheckpoint(checkpoints, "validate_family_rule", "No model family rule matched.", onProgress);
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
    family: familyRule?.id || "",
    familyValidation,
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
    config.testMode = "pipeline";
    delete config.inputUri;
    delete config.imageTest;
    await fsp.writeFile(paths.log, output);
    await writeJson(CONFIG_FILE, config);
    await generateRuntime(config);
    return { output: `Log: ${paths.log}` };
  }, "Runtime config generated.", onProgress);
  await writeJson(CONFIG_FILE, config);
  return { group, model, checkpoints, output: output.slice(-8000) };
}

async function generateRuntime(config, runtimeOptions = {}) {
  const runtimeDir = runtimeOptions.runtimeDir || RUNTIME_DIR;
  const generatedDir = runtimeOptions.generatedDir || GENERATED_DIR;
  const composeFile = runtimeOptions.composeFile || COMPOSE_FILE;
  const configFile = runtimeOptions.configFile || CONFIG_FILE;
  const containerName = runtimeOptions.containerName || "deepstream-lpr";
  const runtimeConfigPath = runtimeOptions.configWorkspacePath || workspacePath(configFile);
  await fsp.mkdir(generatedDir, { recursive: true });
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
    const stageConfigFile = path.join(generatedDir, `config_infer_${stage.id}.txt`);
    return {
      ...stage,
      networkType,
      configFile: workspacePath(stageConfigFile),
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
  config.runtimeDir = runtimeOptions.runtimeWorkspaceDir || workspacePath(runtimeDir);
  config.connectionsFile = runtimeOptions.connectionsWorkspacePath || workspacePath(CONNECTIONS_FILE);
  await writeJson(configFile, config);
  await fsp.writeFile(path.join(generatedDir, "tracker_config.yml"), "BaseConfig:\n  minDetectorConfidence: 0.3\nTargetManagement:\n  enableBboxUnClipping: 1\n");
  const template = await fsp.readFile(path.join(APP_ROOT, "templates", "docker-compose.yml"), "utf8");
  const compose = template
    .replaceAll("${DEEPSTREAM_IMAGE}", config.deepstreamImage)
    .replaceAll("${CONTAINER_NAME}", containerName)
    .replaceAll("${APP_ROOT}", dockerPath(APP_ROOT))
    .replaceAll("${RUNTIME_CONFIG}", runtimeConfigPath)
    .replaceAll("${CUDA_VER}", process.env.CUDA_VER || "")
    .replaceAll("${DEEPSTREAM_VERSION}", process.env.DEEPSTREAM_VERSION || "");
  await fsp.writeFile(composeFile, compose);
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

async function deploy(config, deployOptions = {}) {
  const appId = deployOptions.appId || config.activeDeployAppId || "default";
  const paths = deployOptions.paths || appRuntimePaths(appId);
  const containerName = deployOptions.containerName || paths.containerName;
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
      await fsp.mkdir(paths.runtimeDir, { recursive: true });
      await generateRuntime(config, paths);
      return { output: `App runtime: ${paths.runtimeDir}\nCompose: ${paths.composeFile}\nContainer: ${containerName}` };
    }, "Runtime files generated.");

    const composeResult = await runCheckpoint(checkpoints, "docker_compose_up", async () => {
      const result = await runCommand("docker", ["compose", "-f", paths.composeFile, "up", "-d", "--force-recreate"], { cwd: APP_ROOT });
      if (result.code !== 0) {
        const error = new Error(`Docker Compose failed:\n${result.output}`);
        error.output = result.output;
        throw error;
      }
      return result;
    }, "Docker Compose started.");
    composeOutput = composeResult.output || "";

    await runCheckpoint(checkpoints, "verify_container", async () => {
      const result = await runCommand("docker", ["inspect", "-f", "{{.State.Running}}", containerName], { cwd: APP_ROOT });
      if (result.code !== 0 || !result.output.trim().includes("true")) {
        const error = new Error(`DeepStream container is not running:\n${result.output}`);
        error.output = result.output;
        throw error;
      }
      return result;
    }, "DeepStream container is running.");

    config.deploy = {
      lastStatus: "deployed",
      appId: paths.id,
      containerName,
      lastOutput: composeOutput.slice(-5000),
      updatedAt: new Date().toISOString(),
      checkpoints
    };
    await runCheckpoint(checkpoints, "save_deploy_state", async () => {
      await writeJson(CONFIG_FILE, config);
      return { output: `Saved: ${CONFIG_FILE}\nRuntime config: ${paths.configFile}` };
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

async function stopDeployApp(appId = "default") {
  const paths = appRuntimePaths(appId);
  const composeResult = await runCommand("docker", ["compose", "-f", paths.composeFile, "down", "--remove-orphans"], { cwd: APP_ROOT });
  const removeResult = await runCommand("docker", ["rm", "-f", paths.containerName], { cwd: APP_ROOT });
  const code = composeResult.code === 0 || removeResult.code === 0 ? 0 : composeResult.code;
  const output = `${composeResult.output || ""}${removeResult.output || ""}`;
  await writeRuntimeStatus({
    state: "stopped",
    message: code === 0 ? "DeepStream container stopped." : "Failed to stop DeepStream container.",
    containerRunning: false,
    output: tailOutput(output || "", 5000)
  }, paths.runtimeDir).catch(() => {});
  return { code, output, appId: paths.id, containerName: paths.containerName };
}

async function deployAppStatus(app = {}) {
  const paths = appRuntimePaths(app.id || "default");
  const [container, rawRuntimeStatus, logs] = await Promise.all([
    inspectContainer(paths.containerName),
    readRuntimeStatus(paths.runtimeDir),
    runCommand("docker", ["logs", "--tail", "120", paths.containerName], { cwd: APP_ROOT }).catch((error) => ({ code: 1, output: error.message }))
  ]);
  const runtimeStatus = container.running
    ? rawRuntimeStatus
    : {
      ...rawRuntimeStatus,
      state: container.exists ? "stopped" : "missing",
      message: container.exists
        ? "DeepStream container is not running."
        : "DeepStream container is missing. Deploy this app to start runtime.",
      sources: [],
      staleStatus: rawRuntimeStatus.state === "playing"
    };
  return {
    appId: paths.id,
    appName: app.name || paths.id,
    containerName: paths.containerName,
    container,
    deepstream: {
      started: container.running && runtimeStatus.state === "playing",
      ...runtimeStatus
    },
    logs: tailOutput(logs.output || "", 12000),
    runtimeDir: path.relative(RUNTIME_DIR, paths.runtimeDir).replace(/\\/g, "/"),
    updatedAt: new Date().toISOString()
  };
}

async function allDeployAppStatuses(config = null) {
  const current = config || await getConfig().catch(() => ({}));
  const apps = Array.isArray(current.deployApps) && current.deployApps.length
    ? current.deployApps
    : [{ id: current.activeDeployAppId || "default", name: "DeepStream App" }];
  return await Promise.all(apps.map((app) => deployAppStatus(app)));
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
    tritonImage: TRITON_IMAGE,
    modelBuilderImage: MODEL_BUILDER_IMAGE,
    modelBuilderBaseImage: MODEL_BUILDER_BASE_IMAGE,
    dockerRuntimeArgs: dockerRuntimeArgs()
  });
});

app.get("/api/connections", async (_req, res) => {
  try {
    const config = await readConnectionsConfig();
    const status = await readConnectionsStatus(config);
    res.json({ config, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/connections", async (req, res) => {
  try {
    const config = await writeConnectionsConfig(req.body || {});
    const status = await readConnectionsStatus(config);
    res.json({ config, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/connections/providers/:provider/start", async (req, res) => {
  try {
    const provider = String(req.params.provider || "").toLowerCase();
    const result = await startManagedConnection(provider);
    res.json({
      output: tailOutput(result.output, 4000),
      status: await readConnectionsStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/connections/providers/:provider/stop", async (req, res) => {
  try {
    const provider = String(req.params.provider || "").toLowerCase();
    const result = await stopManagedConnection(provider);
    res.json({
      output: tailOutput(result.output, 4000),
      status: await readConnectionsStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/connections/channels/:id/test", async (req, res) => {
  try {
    res.json(await testConnectionChannel(req.params.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/connections/channels/:id/messages", async (req, res) => {
  try {
    res.json(await inspectConnectionChannelMessages(req.params.id, {
      sort: req.query.sort,
      limit: req.query.limit
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/services", async (_req, res) => {
  const [catalog, instances] = await Promise.all([listServiceCatalog(), readServiceInstances()]);
  res.json({ catalog, instances });
});

app.get("/api/services/catalog", async (_req, res) => {
  res.json({ catalog: await listServiceCatalog() });
});

app.get("/api/services/instances", async (_req, res) => {
  res.json({ instances: await readServiceInstances() });
});

app.post("/api/services/instances", async (req, res) => {
  try {
    const catalog = await listServiceCatalog();
    const serviceId = sanitizeServiceId(req.body?.serviceId);
    const manifest = catalog.find((item) => item.id === serviceId);
    if (!manifest) return res.status(404).json({ error: "Service package not found." });
    const instances = await readServiceInstances();
    const id = sanitizeServiceId(req.body?.id || `${serviceId}-${Date.now().toString(36)}`);
    if (instances.some((item) => item.id === id)) return res.status(409).json({ error: "Service instance already exists." });
    const now = new Date().toISOString();
    const instance = {
      id,
      serviceId,
      name: String(req.body?.name || manifest.name).trim(),
      enabled: req.body?.enabled !== false,
      config: typeof req.body?.config === "object" && req.body.config && !Array.isArray(req.body.config) ? req.body.config : {},
      status: { state: "saved", message: "Instance saved.", updatedAt: now },
      createdAt: now,
      updatedAt: now
    };
    instances.push(instance);
    await writeServiceInstances(instances);
    res.json({ instance, instances, catalog });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/services/instances/:id", async (req, res) => {
  try {
    const id = sanitizeServiceId(req.params.id);
    const instances = await readServiceInstances();
    const index = instances.findIndex((item) => item.id === id);
    if (index < 0) return res.status(404).json({ error: "Service instance not found." });
    instances[index] = {
      ...instances[index],
      name: String(req.body?.name || instances[index].name).trim(),
      enabled: req.body?.enabled !== false,
      config: typeof req.body?.config === "object" && req.body.config && !Array.isArray(req.body.config) ? req.body.config : instances[index].config,
      updatedAt: new Date().toISOString()
    };
    await writeServiceInstances(instances);
    res.json({ instance: instances[index], instances });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/services/instances/:id", async (req, res) => {
  const id = sanitizeServiceId(req.params.id);
  const instances = await readServiceInstances();
  const next = instances.filter((item) => item.id !== id);
  await writeServiceInstances(next);
  res.json({ instances: next });
});

app.post("/api/services/instances/:id/:action", async (req, res) => {
  try {
    const id = sanitizeServiceId(req.params.id);
    const action = String(req.params.action || "").trim();
    if (!["install", "test", "start", "stop"].includes(action)) {
      return res.status(400).json({ error: "Unsupported service action." });
    }
    const [catalog, instances] = await Promise.all([listServiceCatalog(), readServiceInstances()]);
    const instance = instances.find((item) => item.id === id);
    if (!instance) return res.status(404).json({ error: "Service instance not found." });
    const manifest = catalog.find((item) => item.id === instance.serviceId);
    if (!manifest) return res.status(404).json({ error: "Service package not found." });
    await updateServiceInstanceStatus(id, { state: "running", action, message: `${action} running...` });
    const result = await runServiceScript(manifest, instance, action, {
      action,
      request: req.body || {},
      timeoutMs: Number(req.body?.timeoutMs || (action === "start" ? 10000 : 60000))
    });
    const state = result.ok
      ? (action === "start" ? "started" : action === "stop" ? "stopped" : "success")
      : "failed";
    const updated = await updateServiceInstanceStatus(id, {
      state,
      action,
      ok: result.ok,
      code: result.code,
      message: result.ok ? `${action} finished.` : `${action} failed.`,
      output: result.output
    });
    res.json({ result, instance: updated });
  } catch (error) {
    await updateServiceInstanceStatus(req.params.id, {
      state: "failed",
      action: req.params.action,
      ok: false,
      message: error.message
    }).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/triton/status", async (_req, res) => {
  res.json(await readTritonStatus());
});

app.get("/api/triton/models", async (_req, res) => {
  try {
    const [status, models] = await Promise.all([readTritonStatus(), listTritonModels()]);
    res.json({ status, models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/triton/start", async (_req, res) => {
  try {
    const result = await startTritonContainer();
    res.json({ output: tailOutput(result.output, 4000), status: await readTritonStatus() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/triton/stop", async (_req, res) => {
  const result = await runCommand("docker", ["rm", "-f", TRITON_CONTAINER_NAME], { cwd: APP_ROOT });
  res.status(result.code === 0 ? 200 : 500).json({
    output: tailOutput(result.output, 4000),
    status: await readTritonStatus()
  });
});

app.post("/api/triton/models", uploadTritonModel.fields([
  { name: "model", maxCount: 1 },
  { name: "config", maxCount: 1 },
  { name: "labels", maxCount: 1 }
]), async (req, res) => {
  try {
    const modelFile = req.files?.model?.[0];
    if (!modelFile) return res.status(400).json({ error: "No Triton model file uploaded." });
    const name = sanitizeTritonName(req.body?.name || path.basename(modelFile.originalname, path.extname(modelFile.originalname)));
    const version = sanitizeTritonVersion(req.body?.version || "1");
    const platform = tritonPlatformFromFile(modelFile.originalname, req.body?.platform);
    const modelDir = path.join(TRITON_MODELS_DIR, name);
    const versionDir = path.join(modelDir, version);
    await fsp.mkdir(versionDir, { recursive: true });
    const targetName = tritonTargetFileName(modelFile.originalname, platform);
    await fsp.rename(modelFile.path, path.join(versionDir, targetName));
    const configFile = req.files?.config?.[0] || null;
    if (configFile) {
      await fsp.rename(configFile.path, path.join(modelDir, "config.pbtxt"));
    } else {
      const configText = tritonConfigTemplate(name, platform, req.body?.maxBatchSize || 0);
      await fsp.writeFile(path.join(modelDir, "config.pbtxt"), configText);
    }
    const labelsFile = req.files?.labels?.[0] || null;
    if (labelsFile) {
      await fsp.rename(labelsFile.path, path.join(modelDir, "labels.txt"));
    }
    await writeTritonModelMeta(name, {
      decoderProfile: req.body?.decoderProfile,
      description: req.body?.description
    });
    res.json({
      model: { name, version, platform, file: targetName },
      models: await listTritonModels(),
      status: await readTritonStatus()
    });
  } catch (error) {
    for (const files of Object.values(req.files || {})) {
      for (const file of files || []) await fsp.unlink(file.path).catch(() => {});
    }
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/triton/models/:name", async (req, res) => {
  try {
    const name = sanitizeTritonName(req.params.name);
    await fsp.rm(path.join(TRITON_MODELS_DIR, name), { recursive: true, force: true });
    res.json({ models: await listTritonModels(), status: await readTritonStatus() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/triton/models/:name/config", async (req, res) => {
  try {
    const config = await rewriteTritonModelConfig(req.params.name, {
      platform: req.body?.platform,
      maxBatchSize: req.body?.maxBatchSize ?? 0
    });
    res.json({ config, models: await listTritonModels(), status: await readTritonStatus() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/triton/models/:name/labels", async (req, res) => {
  try {
    const name = sanitizeTritonName(req.params.name);
    const labels = await readTritonLabels(name);
    const meta = await readTritonModelMeta(name);
    res.json({ name, labels: labels.labels, text: labels.text, meta });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/triton/models/:name/labels", uploadTritonLabels.single("labels"), async (req, res) => {
  try {
    const name = sanitizeTritonName(req.params.name);
    if (!req.file) return res.status(400).json({ error: "No labels file uploaded." });
    if (path.extname(req.file.originalname).toLowerCase() !== ".txt") {
      return res.status(400).json({ error: "Labels file must be .txt." });
    }
    await fsp.mkdir(path.join(TRITON_MODELS_DIR, name), { recursive: true });
    await fsp.rename(req.file.path, tritonLabelsPath(name));
    res.json({ labels: await readTritonLabels(name), models: await listTritonModels() });
  } catch (error) {
    if (req.file?.path) await fsp.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/triton/models/:name/meta", async (req, res) => {
  try {
    const name = sanitizeTritonName(req.params.name);
    const modelDir = path.join(TRITON_MODELS_DIR, name);
    await fsp.mkdir(modelDir, { recursive: true });
    if (typeof req.body?.labelsText === "string") {
      await fsp.writeFile(tritonLabelsPath(name), req.body.labelsText.trim() ? `${req.body.labelsText.trim()}\n` : "");
    }
    const meta = await writeTritonModelMeta(name, {
      decoderProfile: req.body?.decoderProfile,
      description: req.body?.description
    });
    res.json({ meta, labels: await readTritonLabels(name), models: await listTritonModels() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/triton/models/:name/metadata", async (req, res) => {
  try {
    const pathName = tritonMetadataPath(req.params.name, req.query.version || "");
    const result = await tritonHttp(pathName);
    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      metadataPath: pathName,
      body: result.body
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/triton/models/:name/infer", async (req, res) => {
  try {
    const name = sanitizeTritonName(req.params.name);
    const version = String(req.body?.version || "").trim();
    const payload = req.body?.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ error: "Triton infer payload must be a JSON object." });
    }
    const pathName = tritonInferPath(name, version);
    const started = Date.now();
    const result = await tritonHttp(pathName, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      durationMs: Date.now() - started,
      inferPath: pathName,
      body: summarizeTritonBody(result.body)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/triton/models/:name/infer-dummy", async (req, res) => {
  try {
    const name = sanitizeTritonName(req.params.name);
    const version = String(req.body?.version || "").trim();
    const metadataResult = await tritonHttp(tritonMetadataPath(name, version));
    if (!metadataResult.ok) {
      return res.status(502).json({
        ok: false,
        status: metadataResult.status,
        error: "Could not load Triton model metadata.",
        body: metadataResult.body
      });
    }
    const payload = dummyTritonPayloadFromMetadata(metadataResult.body, Number(req.body?.maxElements || 2000000));
    const pathName = tritonInferPath(name, version);
    const started = Date.now();
    const result = await tritonHttp(pathName, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      durationMs: Date.now() - started,
      inferPath: pathName,
      payloadSummary: payload.inputs.map((input) => ({
        name: input.name,
        shape: input.shape,
        datatype: input.datatype,
        elements: input.data.length
      })),
      body: summarizeTritonBody(result.body)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/triton/models/:name/infer-image", uploadTritonInferImage.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded." });
    const name = sanitizeTritonName(req.params.name);
    const version = String(req.body?.version || "").trim();
    const modelLabels = await readTritonLabels(name);
    const modelMeta = await readTritonModelMeta(name);
    const decoderProfile = sanitizeTritonDecoderProfile(req.body?.decoderProfile || modelMeta.decoderProfile);
    const originalDimensions = await imageDimensions(req.file.path).catch(() => ({ width: 0, height: 0 }));
    const metadataResult = await tritonHttp(tritonMetadataPath(name, version));
    if (!metadataResult.ok) {
      return res.status(502).json({
        ok: false,
        status: metadataResult.status,
        error: "Could not load Triton model metadata.",
        body: metadataResult.body
      });
    }
    const { payload, preprocessing } = await tritonImagePayloadFromFile(req.file.path, metadataResult.body, {
      channelOrder: req.body?.channelOrder,
      scaleMode: req.body?.scaleMode,
      resizeMode: req.body?.resizeMode
    });
    const pathName = tritonInferPath(name, version);
    const started = Date.now();
    const result = await tritonHttp(pathName, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const decode = result.ok
      ? decodeTritonDetections(result.body, modelLabels.labels, {
        decoderProfile,
        confidenceThreshold: req.body?.confidenceThreshold,
        iouThreshold: req.body?.iouThreshold,
        maxDetections: req.body?.maxDetections,
        inputWidth: preprocessing.width,
        inputHeight: preprocessing.height,
        originalWidth: originalDimensions.width || preprocessing.width,
        originalHeight: originalDimensions.height || preprocessing.height,
        resizeMode: preprocessing.resizeMode,
        letterbox: preprocessing.letterbox
      })
      : null;
    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      status: result.status,
      durationMs: Date.now() - started,
      inferPath: pathName,
      image: {
        originalName: req.file.originalname,
        size: req.file.size,
        width: originalDimensions.width || 0,
        height: originalDimensions.height || 0
      },
      preprocessing,
      decoder: {
        profile: decoderProfile,
        labelsCount: modelLabels.labels.length
      },
      decode,
      body: summarizeTritonBody(result.body)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (req.file?.path) await fsp.unlink(req.file.path).catch(() => {});
  }
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

app.post("/api/deploy/apps/:appId/deploy", async (req, res) => {
  try {
    const appId = appRuntimeId(req.params.appId);
    const config = applySelectedModels(
      normalizeMultiCameraConfig({
        ...(req.body || {}),
        activeDeployAppId: appId,
        deployApps: Array.isArray(req.body?.deployApps)
          ? req.body.deployApps.map((app) => ({ ...app, active: appRuntimeId(app.id) === appId }))
          : req.body?.deployApps
      }, await getConfig(), true),
      req.body?.selectedModels || {}
    );
    const result = await deploy(config, { appId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, checkpoints: error.checkpoints || [] });
  }
});

app.post("/api/stop", async (_req, res) => {
  const current = await getConfig().catch(() => ({}));
  const activeId = current.activeDeployAppId || current.deployApps?.find((app) => app.active)?.id;
  const result = activeId
    ? await stopDeployApp(activeId)
    : await (async () => {
      const composeResult = await runCommand("docker", ["compose", "-f", COMPOSE_FILE, "down", "--remove-orphans"], { cwd: APP_ROOT });
      const removeResult = await runCommand("docker", ["rm", "-f", "deepstream-lpr"], { cwd: APP_ROOT });
      const code = composeResult.code === 0 || removeResult.code === 0 ? 0 : composeResult.code;
      const output = `${composeResult.output || ""}${removeResult.output || ""}`;
      await writeRuntimeStatus({
        state: "stopped",
        message: code === 0 ? "DeepStream container stopped." : "Failed to stop DeepStream container.",
        containerRunning: false,
        output: tailOutput(output || "", 5000)
      }).catch(() => {});
      return { code, output };
    })();
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

app.post("/api/deploy/apps/:appId/stop", async (req, res) => {
  const result = await stopDeployApp(req.params.appId || "default");
  if (result.code === 0) {
    const config = await getConfig().catch(() => null);
    if (config) {
      const id = appRuntimeId(req.params.appId || "default");
      config.deployApps = (config.deployApps || []).map((app) => appRuntimeId(app.id) === id
        ? {
          ...app,
          deploy: {
            ...(app.deploy || {}),
            lastStatus: "stopped",
            lastOutput: tailOutput(result.output || "", 5000),
            updatedAt: new Date().toISOString()
          }
        }
        : app);
      await writeJson(CONFIG_FILE, config).catch(() => {});
    }
  }
  res.status(result.code === 0 ? 200 : 500).json(result);
});

app.get("/api/deploy/status", async (_req, res) => {
  const config = await getConfig().catch(() => ({}));
  const apps = await allDeployAppStatuses(config);
  const activeId = appRuntimeId(config.activeDeployAppId || apps[0]?.appId || "default");
  const active = apps.find((item) => item.appId === activeId) || apps[0] || await deployAppStatus({ id: activeId });
  res.json({
    ...active,
    apps,
    container: active.container,
    deepstream: active.deepstream,
    logs: active.logs,
    updatedAt: new Date().toISOString()
  });
});

app.get("/api/deploy/apps/:appId/status", async (req, res) => {
  const config = await getConfig().catch(() => ({}));
  const app = (config.deployApps || []).find((item) => appRuntimeId(item.id) === appRuntimeId(req.params.appId)) || { id: req.params.appId };
  res.json(await deployAppStatus(app));
});

app.get("/api/deploy/results", async (req, res) => {
  try {
    const config = await getConfig().catch(() => ({}));
    const apps = Array.isArray(config.deployApps) ? config.deployApps : [];
    const requestedAppId = req.query.appId ? appRuntimeId(req.query.appId) : "";
    const activeAppId = appRuntimeId(config.activeDeployAppId || apps.find((app) => app.active)?.id || apps[0]?.id || "");
    const appId = requestedAppId || activeAppId;
    const paths = appId ? appRuntimePaths(appId) : null;
    res.json({
      appId: appId || "",
      results: await listRuntimeResults({
        date: String(req.query.date || ""),
        source: String(req.query.source || ""),
        limit: Number(req.query.limit || 200),
        runtimeDir: paths?.runtimeDir || RUNTIME_DIR,
        urlBase: paths ? `/runtime/apps/${paths.id}` : "/runtime"
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load deploy results." });
  }
});

app.get("/api/events", async (_req, res) => {
  res.json(await readRuntimeEvents(100));
});

app.get("/api/automation", async (_req, res) => {
  res.json(await readAutomationConfig());
});

app.put("/api/automation", async (req, res) => {
  try {
    res.json(await writeAutomationConfig(req.body || {}));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/automation/runs", async (req, res) => {
  res.json({ runs: await readAutomationRuns(Number(req.query.limit || 100)) });
});

app.delete("/api/automation/runs", async (_req, res) => {
  await writeJson(AUTOMATION_RUNS_FILE, []);
  res.json({ runs: [] });
});

app.post("/api/automation/services/:serviceId/test", async (req, res) => {
  try {
    const config = await readAutomationConfig();
    const service = config.services.find((item) => item.id === req.params.serviceId);
    if (!service) return res.status(404).json({ error: "Automation service not found." });
    const environment = config.environments.find((item) => item.id === service.environmentId) || null;
    const result = await executeAutomationService(service, environment, {
      event: req.body?.event || { eventType: "manual_test", ts: new Date().toISOString() },
      params: req.body?.params || {}
    });
    const run = await appendAutomationRun({
      id: automationId("run"),
      workflowId: "",
      workflowName: "Manual service test",
      serviceId: service.id,
      serviceName: service.name,
      eventId: "manual",
      eventType: "manual_test",
      status: result.ok ? "success" : "failed",
      manual: true,
      startedAt: new Date(Date.now() - result.durationMs).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      output: result.output,
      result
    });
    res.json({ result, run });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/automation/workflows/:workflowId/test", async (req, res) => {
  try {
    const config = await readAutomationConfig();
    const workflow = config.workflows.find((item) => item.id === req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: "Automation workflow not found." });
    const event = req.body?.event || {
      eventType: workflow.triggerEventType || "vehicle_capture",
      eventId: automationId("manual-event"),
      ts: new Date().toISOString(),
      cameraId: "manual",
      sourceId: 0,
      plateText: "MANUAL"
    };
    res.json(await runAutomationWorkflow(workflow, event, true));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
  startAutomationLoop();
  console.log(`DeepStream LPR control UI: http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  if (automationTimer) clearInterval(automationTimer);
  cameraMonitorFeature.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (automationTimer) clearInterval(automationTimer);
  cameraMonitorFeature.stop();
  process.exit(0);
});
