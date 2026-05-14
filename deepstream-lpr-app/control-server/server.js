const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const APP_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const RUNTIME_DIR = path.join(APP_ROOT, "runtime");
const GENERATED_DIR = path.join(RUNTIME_DIR, "generated");
const MODELS_DIR = path.join(APP_ROOT, "models");
const CONFIG_FILE = path.join(RUNTIME_DIR, "config.json");
const COMPOSE_FILE = path.join(RUNTIME_DIR, "docker-compose.generated.yml");
const PORT = Number(process.env.LPR_CONTROL_PORT || 5190);

const app = express();
app.use(express.json({ limit: "1mb" }));

function ensureDirs() {
  for (const dir of [RUNTIME_DIR, GENERATED_DIR, MODELS_DIR]) {
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

function defaultConfig() {
  return {
    rtspUrl: "",
    streamWidth: 1920,
    streamHeight: 1080,
    roi: { polygon: [[100, 100], [900, 100], [900, 700], [100, 700]] },
    frontVehicleClassIds: [0],
    captureCooldownSec: 30,
    deepstreamImage: "nvcr.io/nvidia/deepstream-l4t:7.1-samples",
    trackerLib: "/opt/nvidia/deepstream/deepstream/lib/libnvds_nvmultiobjecttracker.so",
    models: {
      vehicle_front: {},
      plate_detector: {},
      plate_ocr: {}
    },
    deploy: {
      lastStatus: "not_deployed",
      lastOutput: "",
      updatedAt: null
    }
  };
}

async function getConfig() {
  const current = await readJson(CONFIG_FILE, {});
  return mergeConfig(defaultConfig(), current);
}

function mergeConfig(base, patch) {
  const output = { ...base, ...patch };
  output.roi = { ...base.roi, ...(patch.roi || {}) };
  output.models = {
    ...base.models,
    ...(patch.models || {}),
    vehicle_front: { ...base.models.vehicle_front, ...(patch.models?.vehicle_front || {}) },
    plate_detector: { ...base.models.plate_detector, ...(patch.models?.plate_detector || {}) },
    plate_ocr: { ...base.models.plate_ocr, ...(patch.models?.plate_ocr || {}) }
  };
  output.deploy = { ...base.deploy, ...(patch.deploy || {}) };
  return output;
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
  const group = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!["vehicle_front", "plate_detector", "plate_ocr"].includes(group)) {
    throw new Error("Invalid model group.");
  }
  return group;
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
    cb(null, `${group}_source${ext}`);
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

function normalizeConfig(input, existing) {
  const config = mergeConfig(existing, input || {});
  if (!config.rtspUrl || !/^rtsp:\/\//i.test(config.rtspUrl)) {
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

function modelConfig(slot, model, gieId, networkType, operateOnGieId = null) {
  const lines = [
    "[property]",
    "gpu-id=0",
    "net-scale-factor=0.0039215697906911373",
    model.onnx ? `onnx-file=${model.onnx}` : "# onnx-file=/workspace/deepstream-lpr-app/models/model.onnx",
    model.engine ? `model-engine-file=${model.engine}` : "# model-engine-file=/workspace/deepstream-lpr-app/models/model.engine",
    model.labels ? `labelfile-path=${model.labels}` : "# labelfile-path=/workspace/deepstream-lpr-app/models/labels.txt",
    model.customLib ? `custom-lib-path=${model.customLib}` : "# custom-lib-path=/workspace/deepstream-lpr-app/models/libnvdsinfer_custom_impl_Yolo.so",
    "batch-size=1",
    "network-mode=2",
    `network-type=${networkType}`,
    `gie-unique-id=${gieId}`,
    operateOnGieId ? "process-mode=2" : "process-mode=1",
    "interval=0",
    "maintain-aspect-ratio=1",
    "symmetric-padding=1"
  ];
  if (operateOnGieId) {
    lines.push(`operate-on-gie-id=${operateOnGieId}`);
  }
  if (networkType === 0) {
    lines.push(
      "cluster-mode=2",
      "parse-bbox-func-name=NvDsInferParseYolo",
      "engine-create-func-name=NvDsInferYoloCudaEngineGet"
    );
  }
  lines.push("", "[class-attrs-all]", "pre-cluster-threshold=0.35", "nms-iou-threshold=0.45", "");
  return lines.join("\n");
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function findTrtexec() {
  const candidates = [
    process.env.TRTEXEC_PATH,
    "trtexec",
    "/usr/src/tensorrt/bin/trtexec",
    "/usr/bin/trtexec"
  ].filter(Boolean);
  return candidates[0];
}

function modelBuildPaths(group) {
  const dir = path.join(MODELS_DIR, group, "build");
  return {
    dir,
    onnx: path.join(dir, `${group}.onnx`),
    engine: path.join(dir, `${group}.engine`),
    log: path.join(dir, "build.log")
  };
}

async function buildYoloModel(group, options = {}) {
  const config = await getConfig();
  const model = config.models[group] || {};
  const source = hostPathFromWorkspace(model.source);
  if (!source || !fs.existsSync(source)) {
    throw new Error(`Chưa có source model cho ${group}. Upload .pt hoặc .onnx trước.`);
  }

  const paths = modelBuildPaths(group);
  await fsp.mkdir(paths.dir, { recursive: true });

  const imgsz = Math.max(32, Number(options.imgsz || 640));
  const opset = Math.max(11, Number(options.opset || 17));
  const task = options.task || "detect";
  const simplify = parseBool(options.simplify, true);
  const dynamic = parseBool(options.dynamic, false);
  const buildEngine = parseBool(options.buildEngine, true);
  const fp16 = parseBool(options.fp16, true);
  const workspaceMb = Math.max(256, Number(options.workspaceMb || 2048));
  let output = "";

  const exportArgs = [
    path.join(APP_ROOT, "model-builder", "export_yolo.py"),
    "--source", source,
    "--output", paths.onnx,
    "--imgsz", String(imgsz),
    "--opset", String(opset),
    "--task", task
  ];
  if (simplify) exportArgs.push("--simplify");
  if (dynamic) exportArgs.push("--dynamic");

  const exportResult = await runCommand("python3", exportArgs, { cwd: APP_ROOT });
  output += `# Export ONNX\n${exportResult.output}\n`;
  if (exportResult.code !== 0) {
    await fsp.writeFile(paths.log, output);
    throw new Error(`Export ONNX failed:\n${exportResult.output}`);
  }

  model.onnx = workspacePath(paths.onnx);

  if (buildEngine) {
    const trtexec = findTrtexec();
    const trtArgs = [
      `--onnx=${paths.onnx}`,
      `--saveEngine=${paths.engine}`,
      `--memPoolSize=workspace:${workspaceMb}`,
      "--verbose"
    ];
    if (fp16) trtArgs.push("--fp16");
    const trtResult = await runCommand(trtexec, trtArgs, { cwd: APP_ROOT });
    output += `\n# Build TensorRT engine\n${trtResult.output}\n`;
    if (trtResult.code !== 0) {
      await fsp.writeFile(paths.log, output);
      throw new Error(`TensorRT engine build failed. Make sure trtexec is installed and compatible with this Jetson.\n${trtResult.output}`);
    }
    model.engine = workspacePath(paths.engine);
  }

  model.build = {
    source: model.source,
    onnx: model.onnx,
    engine: model.engine || "",
    imgsz,
    opset,
    task,
    simplify,
    dynamic,
    fp16,
    buildEngine,
    updatedAt: new Date().toISOString(),
    log: workspacePath(paths.log)
  };
  config.models[group] = model;
  await fsp.writeFile(paths.log, output);
  await writeJson(CONFIG_FILE, config);
  await generateRuntime(config);
  return { group, model, output: output.slice(-8000) };
}

async function generateRuntime(config) {
  await fsp.mkdir(GENERATED_DIR, { recursive: true });
  await writeJson(CONFIG_FILE, config);
  await fsp.writeFile(path.join(GENERATED_DIR, "config_infer_vehicle_front.txt"), modelConfig("vehicle_front", config.models.vehicle_front, 1, 0));
  await fsp.writeFile(path.join(GENERATED_DIR, "config_infer_plate_detector.txt"), modelConfig("plate_detector", config.models.plate_detector, 2, 0, 1));
  await fsp.writeFile(path.join(GENERATED_DIR, "config_infer_plate_ocr.txt"), modelConfig("plate_ocr", config.models.plate_ocr, 3, 1, 2));
  await fsp.writeFile(path.join(GENERATED_DIR, "tracker_config.yml"), "BaseConfig:\n  minDetectorConfidence: 0.3\nTargetManagement:\n  enableBboxUnClipping: 1\n");
  const template = await fsp.readFile(path.join(APP_ROOT, "templates", "docker-compose.yml"), "utf8");
  const compose = template
    .replaceAll("${DEEPSTREAM_IMAGE}", config.deepstreamImage)
    .replaceAll("${APP_ROOT}", APP_ROOT.replace(/\\/g, "/"))
    .replaceAll("${DISPLAY}", process.env.DISPLAY || ":0");
  await fsp.writeFile(COMPOSE_FILE, compose);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, shell: process.platform === "win32" });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("close", (code) => resolve({ code, output }));
    child.on("error", (error) => resolve({ code: 1, output: error.message }));
  });
}

async function deploy(config) {
  await generateRuntime(config);
  const result = await runCommand("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d", "--force-recreate"], { cwd: APP_ROOT });
  config.deploy = {
    lastStatus: result.code === 0 ? "deployed" : "failed",
    lastOutput: result.output.slice(-5000),
    updatedAt: new Date().toISOString()
  };
  await writeJson(CONFIG_FILE, config);
  return config.deploy;
}

ensureDirs();
app.use(express.static(PUBLIC_DIR));
app.use("/models", express.static(MODELS_DIR));
app.use("/runtime", express.static(RUNTIME_DIR));

app.get("/api/config", async (_req, res) => {
  res.json(await getConfig());
});

app.put("/api/config", async (req, res) => {
  try {
    const config = normalizeConfig(req.body, await getConfig());
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
    config.models[group][kind] = workspacePath(req.file.path);
    await writeJson(CONFIG_FILE, config);
    res.json({ slot, path: config.models[group][kind], config });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/model-source/:group", uploadSource.single("file"), async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const config = await getConfig();
    config.models[group].source = workspacePath(req.file.path);
    config.models[group].sourceOriginalName = req.file.originalname;
    config.models[group].sourceUploadedAt = new Date().toISOString();
    await writeJson(CONFIG_FILE, config);
    res.json({ group, model: config.models[group], config });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/build/:group", async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    const result = await buildYoloModel(group, req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/build/:group/log", async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    const log = await fsp.readFile(modelBuildPaths(group).log, "utf8");
    res.type("text/plain").send(log);
  } catch (error) {
    res.status(404).type("text/plain").send(error.message);
  }
});

app.post("/api/deploy", async (req, res) => {
  try {
    const config = normalizeConfig(req.body, await getConfig());
    const result = await deploy(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/stop", async (_req, res) => {
  const result = await runCommand("docker", ["compose", "-f", COMPOSE_FILE, "down"], { cwd: APP_ROOT });
  res.status(result.code === 0 ? 200 : 500).json(result);
});

app.get("/api/events", async (_req, res) => {
  const file = path.join(RUNTIME_DIR, "events.jsonl");
  try {
    const lines = (await fsp.readFile(file, "utf8")).trim().split(/\r?\n/).filter(Boolean);
    res.json(lines.slice(-100).map((line) => JSON.parse(line)));
  } catch {
    res.json([]);
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message || "Request failed." });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`DeepStream LPR control UI: http://localhost:${PORT}`);
});
