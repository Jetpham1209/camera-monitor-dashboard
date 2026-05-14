const slots = [
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
];

const modelBuilderGroups = [
  {
    group: "vehicle_front",
    title: "Vehicle Front Detector",
    subtitle: "Model phat hien dau xe trong ROI.",
    defaultTask: "detect",
    defaultClasses: 1,
    defaultParser: true
  },
  {
    group: "plate_detector",
    title: "Plate Detector",
    subtitle: "Model phat hien bien so tren dau xe.",
    defaultTask: "detect",
    defaultClasses: 1,
    defaultParser: true
  },
  {
    group: "plate_ocr",
    title: "Plate OCR",
    subtitle: "Model doc ky tu bien so hoac classifier OCR.",
    defaultTask: "classify",
    defaultClasses: 36,
    defaultParser: false
  }
];

const els = {
  rtspUrl: document.querySelector("#rtspUrl"),
  streamWidth: document.querySelector("#streamWidth"),
  streamHeight: document.querySelector("#streamHeight"),
  captureCooldownSec: document.querySelector("#captureCooldownSec"),
  roiPolygon: document.querySelector("#roiPolygon"),
  frontVehicleClassIds: document.querySelector("#frontVehicleClassIds"),
  deepstreamImage: document.querySelector("#deepstreamImage"),
  uploads: document.querySelector("#uploads"),
  modelBuilders: document.querySelector("#modelBuilders"),
  checkpointList: document.querySelector("#checkpointList"),
  output: document.querySelector("#output"),
  saveBtn: document.querySelector("#saveBtn"),
  deployBtn: document.querySelector("#deployBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  eventsBtn: document.querySelector("#eventsBtn"),
  testImageFile: document.querySelector("#testImageFile"),
  testVideoFile: document.querySelector("#testVideoFile"),
  uploadTestImageBtn: document.querySelector("#uploadTestImageBtn"),
  uploadTestVideoBtn: document.querySelector("#uploadTestVideoBtn"),
  runTestImageBtn: document.querySelector("#runTestImageBtn"),
  runTestVideoBtn: document.querySelector("#runTestVideoBtn")
};

function print(value) {
  els.output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `HTTP ${response.status}`);
    error.body = body;
    throw error;
  }
  return body;
}

async function apiText(path) {
  const response = await fetch(path);
  const body = await response.text();
  if (!response.ok) throw new Error(body || `HTTP ${response.status}`);
  return body;
}

function formConfig() {
  return {
    rtspUrl: els.rtspUrl.value.trim(),
    streamWidth: Number(els.streamWidth.value),
    streamHeight: Number(els.streamHeight.value),
    captureCooldownSec: Number(els.captureCooldownSec.value),
    roi: { polygon: JSON.parse(els.roiPolygon.value) },
    frontVehicleClassIds: els.frontVehicleClassIds.value,
    deepstreamImage: els.deepstreamImage.value.trim()
  };
}

function builderControl(group, key) {
  return document.querySelector(`[data-builder="${group}"][data-key="${key}"]`);
}

function buildOptions(group) {
  return {
    imgsz: Number(builderControl(group, "imgsz").value),
    opset: Number(builderControl(group, "opset").value),
    task: builderControl(group, "task").value,
    yoloVersion: builderControl(group, "yoloVersion").value,
    workspaceMb: Number(builderControl(group, "workspaceMb").value),
    numClasses: Number(builderControl(group, "numClasses").value),
    fp16: builderControl(group, "fp16").checked,
    simplify: builderControl(group, "simplify").checked,
    dynamic: builderControl(group, "dynamic").checked,
    buildEngine: builderControl(group, "buildEngine").checked,
    buildParser: builderControl(group, "buildParser").checked
  };
}

function renderConfig(config) {
  els.rtspUrl.value = config.rtspUrl || "";
  els.streamWidth.value = config.streamWidth || 1920;
  els.streamHeight.value = config.streamHeight || 1080;
  els.captureCooldownSec.value = config.captureCooldownSec || 30;
  els.roiPolygon.value = JSON.stringify(config.roi?.polygon || [], null, 2);
  els.frontVehicleClassIds.value = (config.frontVehicleClassIds || [0]).join(",");
  els.deepstreamImage.value = config.deepstreamImage || "nvcr.io/nvidia/deepstream-l4t:7.1-samples";
  print(config);
}

function renderCheckpoints(checkpoints = []) {
  if (!checkpoints.length) {
    els.checkpointList.innerHTML = '<div class="empty">No checkpoints yet.</div>';
    return;
  }
  els.checkpointList.innerHTML = checkpoints.map((checkpoint) => `
    <div class="checkpoint ${checkpoint.status}">
      <div class="checkpoint-main">
        <span class="checkpoint-order">${checkpoint.order}</span>
        <strong>${escapeHtml(checkpoint.label)}</strong>
        <span class="status">${escapeHtml(checkpoint.status)}</span>
      </div>
      <div class="checkpoint-message">${escapeHtml(checkpoint.message || "")}</div>
      ${checkpoint.durationMs !== null ? `<div class="checkpoint-time">${checkpoint.durationMs} ms</div>` : ""}
      ${checkpoint.output ? `<pre class="checkpoint-output">${escapeHtml(checkpoint.output)}</pre>` : ""}
    </div>
  `).join("");
}

function renderUploads() {
  els.uploads.innerHTML = slots.map((slot) => `
    <div class="upload-card">
      <strong>${slot}</strong>
      <input type="file" data-slot="${slot}" />
      <button type="button" data-upload="${slot}">Upload</button>
    </div>
  `).join("");
  document.querySelectorAll("[data-upload]").forEach((button) => {
    button.addEventListener("click", () => uploadSlot(button.dataset.upload));
  });
}

function renderModelBuilders() {
  const taskOptions = ["detect", "auto", "classify", "segment", "pose", "obb"];
  const versionOptions = [
    ["yolov8", "YOLOv8"],
    ["yolov9", "YOLOv9"],
    ["yolov10", "YOLOv10"],
    ["yolo11", "YOLO11"],
    ["yolov12", "YOLOv12"],
    ["yolov13", "YOLOv13"]
  ];
  els.modelBuilders.innerHTML = modelBuilderGroups.map((item) => `
    <article class="model-builder-card">
      <div class="model-builder-head">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.subtitle)}</p>
        </div>
        <code>${escapeHtml(item.group)}</code>
      </div>
      <div class="grid">
        <label>Image size <input data-builder="${item.group}" data-key="imgsz" type="number" value="640" /></label>
        <label>ONNX opset <input data-builder="${item.group}" data-key="opset" type="number" value="17" /></label>
        <label>TensorRT workspace MB <input data-builder="${item.group}" data-key="workspaceMb" type="number" value="2048" /></label>
      </div>
      <div class="grid">
        <label>
          YOLO task
          <select data-builder="${item.group}" data-key="task">
            ${taskOptions.map((task) => `<option value="${task}" ${task === item.defaultTask ? "selected" : ""}>${task}</option>`).join("")}
          </select>
        </label>
        <label>
          YOLO version
          <select data-builder="${item.group}" data-key="yoloVersion">
            ${versionOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
        </label>
        <label>Number of classes <input data-builder="${item.group}" data-key="numClasses" type="number" value="${item.defaultClasses}" min="1" /></label>
      </div>
      <div class="grid one">
        <label>Source .pt/.onnx <input data-builder="${item.group}" data-key="source" type="file" accept=".pt,.onnx" /></label>
      </div>
      <div class="checks">
        <label><input data-builder="${item.group}" data-key="fp16" type="checkbox" checked /> FP16 engine</label>
        <label><input data-builder="${item.group}" data-key="simplify" type="checkbox" checked /> Simplify ONNX</label>
        <label><input data-builder="${item.group}" data-key="dynamic" type="checkbox" /> Dynamic shape</label>
        <label><input data-builder="${item.group}" data-key="buildEngine" type="checkbox" checked /> Build TensorRT engine</label>
        <label><input data-builder="${item.group}" data-key="buildParser" type="checkbox" ${item.defaultParser ? "checked" : ""} /> Build DeepStream-Yolo parser</label>
      </div>
      <div class="actions inline-actions">
        <button type="button" data-upload-source="${item.group}">Upload ${escapeHtml(item.group)}</button>
        <button type="button" data-build-model="${item.group}">Build ${escapeHtml(item.group)}</button>
        <button type="button" data-build-log="${item.group}">View log</button>
      </div>
    </article>
  `).join("");
  document.querySelectorAll("[data-upload-source]").forEach((button) => {
    button.addEventListener("click", () => uploadSource(button.dataset.uploadSource).catch((error) => print(error.message)));
  });
  document.querySelectorAll("[data-build-model]").forEach((button) => {
    button.addEventListener("click", () => buildModel(button.dataset.buildModel).catch((error) => {
      renderCheckpoints(error.body?.checkpoints || []);
      print(error.message);
    }));
  });
  document.querySelectorAll("[data-build-log]").forEach((button) => {
    button.addEventListener("click", () => viewBuildLog(button.dataset.buildLog).catch((error) => print(error.message)));
  });
}

async function uploadSlot(slot) {
  const input = document.querySelector(`[data-slot="${slot}"]`);
  if (!input.files.length) return print("Chon file truoc khi upload.");
  const form = new FormData();
  form.append("file", input.files[0]);
  const result = await api(`/api/upload/${slot}`, { method: "POST", body: form });
  print(result);
}

async function uploadSource(group) {
  const sourceInput = builderControl(group, "source");
  if (!sourceInput.files.length) return print(`Chon file .pt hoac .onnx cho ${group} truoc khi upload.`);
  const form = new FormData();
  form.append("file", sourceInput.files[0]);
  const result = await api(`/api/model-source/${group}`, { method: "POST", body: form });
  print(result);
}

async function uploadTestMedia(kind) {
  const input = kind === "image" ? els.testImageFile : els.testVideoFile;
  if (!input.files.length) return print(`Chon ${kind} file truoc khi upload.`);
  const form = new FormData();
  form.append("file", input.files[0]);
  const result = await api(`/api/test-media/${kind}`, { method: "POST", body: form });
  print(result);
}

async function runTestMedia(kind) {
  renderCheckpoints([
    { order: 1, label: `${kind} test requested`, status: "running", message: `Running ${kind} test...`, durationMs: null }
  ]);
  print(`Running ${kind} test...`);
  const result = await api(`/api/test/${kind}`, {
    method: "POST",
    body: JSON.stringify(formConfig())
  });
  renderCheckpoints(result.checkpoints || []);
  print(result);
}

async function buildModel(group) {
  renderCheckpoints([
    { order: 1, label: "Build requested", status: "running", message: `Building ${group}...`, durationMs: null }
  ]);
  print(`Building ${group}. Viec nay co the mat vai phut tren Jetson...`);
  const result = await api(`/api/build/${group}`, {
    method: "POST",
    body: JSON.stringify(buildOptions(group))
  });
  renderCheckpoints(result.checkpoints || []);
  print(result);
}

async function viewBuildLog(group) {
  print(await apiText(`/api/build/${group}/log`));
}

async function saveConfig() {
  const result = await api("/api/config", { method: "PUT", body: JSON.stringify(formConfig()) });
  renderConfig(result);
}

async function deploy() {
  renderCheckpoints([
    { order: 1, label: "Deploy requested", status: "running", message: "Starting deploy...", durationMs: null }
  ]);
  print("Deploying...");
  const result = await api("/api/deploy", { method: "POST", body: JSON.stringify(formConfig()) });
  renderCheckpoints(result.checkpoints || []);
  print(result);
}

async function stop() {
  const result = await api("/api/stop", { method: "POST" });
  print(result);
}

async function loadEvents() {
  print(await api("/api/events"));
}

async function init() {
  renderUploads();
  renderModelBuilders();
  renderCheckpoints();
  renderConfig(await api("/api/config"));
}

els.saveBtn.addEventListener("click", () => saveConfig().catch((error) => print(error.message)));
els.deployBtn.addEventListener("click", () => deploy().catch((error) => {
  renderCheckpoints(error.body?.checkpoints || []);
  print(error.message);
}));
els.stopBtn.addEventListener("click", () => stop().catch((error) => print(error.message)));
els.eventsBtn.addEventListener("click", () => loadEvents().catch((error) => print(error.message)));
els.uploadTestImageBtn.addEventListener("click", () => uploadTestMedia("image").catch((error) => print(error.message)));
els.uploadTestVideoBtn.addEventListener("click", () => uploadTestMedia("video").catch((error) => print(error.message)));
els.runTestImageBtn.addEventListener("click", () => runTestMedia("image").catch((error) => {
  renderCheckpoints(error.body?.checkpoints || []);
  print(error.message);
}));
els.runTestVideoBtn.addEventListener("click", () => runTestMedia("video").catch((error) => {
  renderCheckpoints(error.body?.checkpoints || []);
  print(error.message);
}));
init().catch((error) => print(error.message));
