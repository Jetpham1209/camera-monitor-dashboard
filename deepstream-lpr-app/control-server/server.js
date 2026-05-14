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
const THIRD_PARTY_DIR = path.join(RUNTIME_DIR, "third_party");
const TEST_MEDIA_DIR = path.join(RUNTIME_DIR, "test-media");
const MODELS_DIR = path.join(APP_ROOT, "models");
const CONFIG_FILE = path.join(RUNTIME_DIR, "config.json");
const COMPOSE_FILE = path.join(RUNTIME_DIR, "docker-compose.generated.yml");
const PORT = Number(process.env.LPR_CONTROL_PORT || 5190);
const DEEPSTREAM_YOLO_REPO = process.env.DEEPSTREAM_YOLO_REPO || "https://github.com/marcoslucianops/DeepStream-Yolo.git";
const DEEPSTREAM_YOLO_REF = process.env.DEEPSTREAM_YOLO_REF || "2894babce8e75c49115dbe0c7b516289ed853565";

const app = express();
app.use(express.json({ limit: "1mb" }));

function ensureDirs() {
  for (const dir of [RUNTIME_DIR, GENERATED_DIR, THIRD_PARTY_DIR, TEST_MEDIA_DIR, MODELS_DIR]) {
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
  output.models = {
    ...base.models,
    ...(patch.models || {}),
    vehicle_front: { ...base.models.vehicle_front, ...(patch.models?.vehicle_front || {}) },
    plate_detector: { ...base.models.plate_detector, ...(patch.models?.plate_detector || {}) },
    plate_ocr: { ...base.models.plate_ocr, ...(patch.models?.plate_ocr || {}) }
  };
  output.deploy = { ...base.deploy, ...(patch.deploy || {}) };
  output.testMedia = { ...base.testMedia, ...(patch.testMedia || {}) };
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
    lines.push(`num-detected-classes=${Math.max(1, Number(model.numClasses || 1))}`);
    lines.push(
      "cluster-mode=2",
      `parse-bbox-func-name=${model.parseBboxFunc || "NvDsInferParseYolo"}`
    );
    lines.push(`engine-create-func-name=${model.engineCreateFunc || "NvDsInferYoloCudaEngineGet"}`);
  }
  lines.push("", "[class-attrs-all]", "pre-cluster-threshold=0.35", "nms-iou-threshold=0.45", "");
  return lines.join("\n");
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

async function runCheckpoint(checkpoints, id, action, successMessage = "OK") {
  const started = Date.now();
  updateCheckpoint(checkpoints, id, {
    status: "running",
    message: "",
    startedAt: new Date(started).toISOString(),
    finishedAt: null,
    durationMs: null,
    output: ""
  });
  try {
    const result = await action();
    updateCheckpoint(checkpoints, id, {
      status: "success",
      message: successMessage,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      output: typeof result?.output === "string" ? result.output.slice(-2000) : ""
    });
    return result;
  } catch (error) {
    updateCheckpoint(checkpoints, id, {
      status: "failed",
      message: error.message,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      output: typeof error.output === "string" ? error.output.slice(-2000) : ""
    });
    error.checkpoints = checkpoints;
    throw error;
  }
}

function skipCheckpoint(checkpoints, id, message) {
  updateCheckpoint(checkpoints, id, {
    status: "skipped",
    message,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 0
  });
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
    labels: path.join(dir, "labels.txt"),
    parserLib: path.join(dir, "libnvdsinfer_custom_impl_Yolo.so"),
    log: path.join(dir, "build.log")
  };
}

function countLabelLines(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

async function ensureDeepStreamYoloRepo() {
  const repoDir = path.join(THIRD_PARTY_DIR, "DeepStream-Yolo");
  const gitDir = path.join(repoDir, ".git");
  if (!fs.existsSync(gitDir)) {
    await fsp.rm(repoDir, { recursive: true, force: true });
    const clone = await runCommand("git", ["clone", "--depth", "1", DEEPSTREAM_YOLO_REPO, repoDir], { cwd: APP_ROOT });
    if (clone.code !== 0) {
      throw new Error(`Cannot clone DeepStream-Yolo repo.\n${clone.output}`);
    }
  }

  const fetch = await runCommand("git", ["fetch", "--depth", "1", "origin", DEEPSTREAM_YOLO_REF], { cwd: repoDir });
  if (fetch.code !== 0) {
    throw new Error(`Cannot fetch DeepStream-Yolo ref ${DEEPSTREAM_YOLO_REF}.\n${fetch.output}`);
  }
  const checkout = await runCommand("git", ["checkout", "--detach", DEEPSTREAM_YOLO_REF], { cwd: repoDir });
  if (checkout.code !== 0) {
    throw new Error(`Cannot checkout DeepStream-Yolo ref ${DEEPSTREAM_YOLO_REF}.\n${checkout.output}`);
  }
  return repoDir;
}

async function buildDeepStreamYoloParser(config, group, paths, repoDir = null) {
  repoDir = repoDir || await ensureDeepStreamYoloRepo();
  const mountedRepoDir = "/workspace/deepstream-lpr-app/runtime/third_party/DeepStream-Yolo";
  const mountedOutput = `/workspace/deepstream-lpr-app/models/${group}/build/libnvdsinfer_custom_impl_Yolo.so`;
  const compileCommand = [
    "set -e",
    "command -v g++ >/dev/null || (apt-get update && apt-get install -y build-essential)",
    "command -v make >/dev/null || (apt-get update && apt-get install -y make)",
    "CUDA_VER=${CUDA_VER:-$(nvcc --version | sed -n 's/.*release \\([0-9][0-9]*\\.[0-9][0-9]*\\).*/\\1/p' | head -n1)}",
    "test -n \"$CUDA_VER\"",
    "if [ ! -d \"/usr/local/cuda-$CUDA_VER\" ] && [ -d /usr/local/cuda ]; then ln -sfn /usr/local/cuda \"/usr/local/cuda-$CUDA_VER\"; fi",
    `make -C ${mountedRepoDir}/nvdsinfer_custom_impl_Yolo clean CUDA_VER=$CUDA_VER`,
    `make -C ${mountedRepoDir}/nvdsinfer_custom_impl_Yolo CUDA_VER=$CUDA_VER`,
    `cp ${mountedRepoDir}/nvdsinfer_custom_impl_Yolo/libnvdsinfer_custom_impl_Yolo.so ${mountedOutput}`
  ].join(" && ");
  const result = await runCommand("docker", [
    "run",
    "--rm",
    "--network", "host",
    "-v", `${APP_ROOT.replace(/\\/g, "/")}:/workspace/deepstream-lpr-app`,
    "-v", `${repoDir.replace(/\\/g, "/")}:${mountedRepoDir}`,
    "-w", "/workspace/deepstream-lpr-app",
    config.deepstreamImage,
    "bash",
    "-lc",
    compileCommand
  ], { cwd: APP_ROOT });

  if (result.code !== 0) {
    throw new Error(`DeepStream-Yolo parser build failed. Make sure Docker can run the DeepStream image and CUDA_VER matches your Jetson/DeepStream image.\n${result.output}`);
  }

  if (!fs.existsSync(paths.parserLib)) {
    throw new Error("DeepStream-Yolo parser build finished but output .so was not found.");
  }
  return `DeepStream-Yolo ref: ${DEEPSTREAM_YOLO_REF}\n${result.output}`;
}

async function buildYoloModel(group, options = {}) {
  const checkpoints = createCheckpoints([
    { id: "validate_source", label: "Validate source model" },
    { id: "prepare_workspace", label: "Prepare build workspace" },
    { id: "sync_deepstream_yolo", label: "Sync DeepStream-Yolo repo" },
    { id: "export_onnx", label: "Export ONNX" },
    { id: "build_tensorrt", label: "Build TensorRT engine" },
    { id: "build_parser", label: "Build DeepStream parser" },
    { id: "write_runtime_config", label: "Write runtime config" }
  ]);
  const config = await getConfig();
  const model = config.models[group] || {};
  const source = hostPathFromWorkspace(model.source);
  await runCheckpoint(checkpoints, "validate_source", async () => {
    if (!source || !fs.existsSync(source)) {
      throw new Error(`Chua co source model cho ${group}. Upload .pt hoac .onnx truoc.`);
    }
    return { output: `Source: ${source}` };
  }, "Source model exists.");
  if (!source || !fs.existsSync(source)) {
    throw new Error(`Chưa có source model cho ${group}. Upload .pt hoặc .onnx trước.`);
  }

  const paths = modelBuildPaths(group);
  await runCheckpoint(checkpoints, "prepare_workspace", async () => {
    await fsp.mkdir(paths.dir, { recursive: true });
    return { output: `Build dir: ${paths.dir}` };
  }, "Build workspace ready.");
  await fsp.mkdir(paths.dir, { recursive: true });

  const imgsz = Math.max(32, Number(options.imgsz || 640));
  const opset = Math.max(11, Number(options.opset || 17));
  const task = options.task || "detect";
  const yoloVersion = String(options.yoloVersion || model.yoloVersion || "yolov8").toLowerCase();
  const simplify = parseBool(options.simplify, true);
  const dynamic = parseBool(options.dynamic, false);
  const buildEngine = parseBool(options.buildEngine, true);
  const fp16 = parseBool(options.fp16, true);
  const workspaceMb = Math.max(256, Number(options.workspaceMb || 2048));
  const canUseDeepStreamYolo = group !== "plate_ocr" && (task === "detect" || task === "auto");
  const buildParser = parseBool(options.buildParser, canUseDeepStreamYolo);
  const numClassesFromLabels = countLabelLines(hostPathFromWorkspace(model.labels));
  let numClasses = Math.max(1, Number(options.numClasses || model.numClasses || numClassesFromLabels || 1));
  let output = "";
  let repoDir = "";

  const sourceExt = path.extname(source).toLowerCase();
  if ((canUseDeepStreamYolo && sourceExt === ".pt") || (canUseDeepStreamYolo && buildParser)) {
    repoDir = (await runCheckpoint(checkpoints, "sync_deepstream_yolo", async () => {
      const syncedRepoDir = await ensureDeepStreamYoloRepo();
      return { repoDir: syncedRepoDir, output: `Repo: ${syncedRepoDir}\nRef: ${DEEPSTREAM_YOLO_REF}` };
    }, "DeepStream-Yolo repo ready.")).repoDir;
  } else {
    skipCheckpoint(checkpoints, "sync_deepstream_yolo", "No DeepStream-Yolo repo needed for this model/task.");
  }
  const exportArgs = [];
  if (canUseDeepStreamYolo && sourceExt === ".pt") {
    exportArgs.push(
      path.join(APP_ROOT, "model-builder", "export_deepstream_yolo.py"),
      "--source", source,
      "--output", paths.onnx,
      "--repo-dir", repoDir,
      "--version", yoloVersion,
      "--imgsz", String(imgsz),
      "--opset", String(opset),
      "--labels-output", paths.labels
    );
  } else {
    exportArgs.push(
      path.join(APP_ROOT, "model-builder", "export_yolo.py"),
      "--source", source,
      "--output", paths.onnx,
      "--imgsz", String(imgsz),
      "--opset", String(opset),
      "--task", task
    );
  }
  if (simplify) exportArgs.push("--simplify");
  if (dynamic) exportArgs.push("--dynamic");

  const exportResult = await runCheckpoint(checkpoints, "export_onnx", async () => {
    const result = await runCommand("python3", exportArgs, { cwd: APP_ROOT });
    if (result.code !== 0) {
      const error = new Error(`Export ONNX failed:\n${result.output}`);
      error.output = result.output;
      throw error;
    }
    return result;
  }, "ONNX exported.");
  output += `# Export ONNX\n${exportResult.output}\n`;
  if (exportResult.code !== 0) {
    await fsp.writeFile(paths.log, output);
    throw new Error(`Export ONNX failed:\n${exportResult.output}`);
  }

  model.onnx = workspacePath(paths.onnx);
  model.yoloVersion = yoloVersion;
  if (!model.labels && fs.existsSync(paths.labels)) {
    model.labels = workspacePath(paths.labels);
  }
  const generatedLabelCount = countLabelLines(paths.labels);
  if (!options.numClasses && generatedLabelCount > 0) {
    numClasses = generatedLabelCount;
  }

  if (buildEngine) {
    const trtResult = await runCheckpoint(checkpoints, "build_tensorrt", async () => {
      const trtexec = findTrtexec();
      const trtArgs = [
        `--onnx=${paths.onnx}`,
        `--saveEngine=${paths.engine}`,
        `--memPoolSize=workspace:${workspaceMb}`,
        "--verbose"
      ];
      if (fp16) trtArgs.push("--fp16");
      const result = await runCommand(trtexec, trtArgs, { cwd: APP_ROOT });
      if (result.code !== 0) {
        const error = new Error(`TensorRT engine build failed. Make sure trtexec is installed and compatible with this Jetson.\n${result.output}`);
        error.output = result.output;
        throw error;
      }
      return result;
    }, "TensorRT engine built.");
    output += `\n# Build TensorRT engine\n${trtResult.output}\n`;
    if (trtResult.code !== 0) {
      await fsp.writeFile(paths.log, output);
      throw new Error(`TensorRT engine build failed. Make sure trtexec is installed and compatible with this Jetson.\n${trtResult.output}`);
    }
    model.engine = workspacePath(paths.engine);
  } else {
    skipCheckpoint(checkpoints, "build_tensorrt", "Build TensorRT engine is disabled.");
  }

  model.numClasses = numClasses;

  if (buildParser && canUseDeepStreamYolo) {
    let parserOutput = "";
    try {
      const parserResult = await runCheckpoint(checkpoints, "build_parser", async () => {
        const builtParserOutput = await buildDeepStreamYoloParser(config, group, paths, repoDir || null);
        return { output: builtParserOutput };
      }, "DeepStream parser built.");
      parserOutput = parserResult.output || "";
    } catch (error) {
      output += `\n# Build DeepStream-Yolo parser\n${error.message}\n`;
      await fsp.writeFile(paths.log, output);
      throw error;
    }
    output += `\n# Build DeepStream-Yolo parser\n${parserOutput}\n`;
    model.customLib = workspacePath(paths.parserLib);
    model.parseBboxFunc = "NvDsInferParseYolo";
    model.engineCreateFunc = "NvDsInferYoloCudaEngineGet";
  } else {
    skipCheckpoint(checkpoints, "build_parser", "Build parser is disabled or not applicable for this model/task.");
  }

  model.build = {
    source: model.source,
    onnx: model.onnx,
    engine: model.engine || "",
    customLib: model.customLib || "",
    parseBboxFunc: model.parseBboxFunc || "",
    numClasses,
    yoloVersion,
    imgsz,
    opset,
    task,
    simplify,
    dynamic,
    fp16,
    buildEngine,
    buildParser,
    updatedAt: new Date().toISOString(),
    log: workspacePath(paths.log),
    checkpoints
  };
  config.models[group] = model;
  await runCheckpoint(checkpoints, "write_runtime_config", async () => {
    await fsp.writeFile(paths.log, output);
    await writeJson(CONFIG_FILE, config);
    await generateRuntime(config);
    return { output: `Log: ${paths.log}` };
  }, "Runtime config generated.");
  await writeJson(CONFIG_FILE, config);
  return { group, model, checkpoints, output: output.slice(-8000) };
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
  const checkpoints = createCheckpoints([
    { id: "validate_config", label: "Validate deploy config" },
    { id: "generate_runtime", label: "Generate DeepStream runtime files" },
    { id: "docker_compose_up", label: "Start DeepStream container" },
    { id: "verify_container", label: "Verify container is running" },
    { id: "save_deploy_state", label: "Save deploy state" }
  ]);
  let composeOutput = "";
  try {
    await runCheckpoint(checkpoints, "validate_config", async () => {
      if (!config.rtspUrl || !/^rtsp:\/\//i.test(config.rtspUrl)) {
        throw new Error("RTSP URL is required and must start with rtsp://.");
      }
      return { output: `RTSP: ${config.rtspUrl}` };
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
    await runCheckpoint(checkpoints, "validate_test_media", async () => {
      if (!mediaPath || !fs.existsSync(mediaPath)) {
        throw new Error(`No uploaded test ${kind}. Upload a ${kind} first.`);
      }
      return { output: `Media: ${mediaPath}` };
    }, `Test ${kind} exists.`);

    await runCheckpoint(checkpoints, "generate_runtime", async () => {
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
        "--runtime", "nvidia",
        "-e", `DISPLAY=${process.env.DISPLAY || ":0"}`,
        "-e", "NVIDIA_VISIBLE_DEVICES=all",
        "-e", "NVIDIA_DRIVER_CAPABILITIES=all",
        "-v", `${APP_ROOT.replace(/\\/g, "/")}:/workspace/deepstream-lpr-app`,
        "-v", "/tmp/.X11-unix:/tmp/.X11-unix",
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
    return { kind, status: "success", checkpoints, output: commandOutput.slice(-8000), events: events.events || [] };
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
    if (kind === "labels") {
      const labelCount = countLabelLines(req.file.path);
      if (labelCount > 0) config.models[group].numClasses = labelCount;
    }
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
    const config = normalizeRuntimeConfig(req.body, await getConfig());
    const result = await runTestMedia(kind, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, checkpoints: error.checkpoints || [] });
  }
});

app.post("/api/build/:group", async (req, res) => {
  try {
    const group = sanitizeModelGroup(req.params.group);
    const result = await buildYoloModel(group, req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, checkpoints: error.checkpoints || [] });
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
    res.status(500).json({ error: error.message, checkpoints: error.checkpoints || [] });
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
