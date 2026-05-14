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

const els = {
  rtspUrl: document.querySelector("#rtspUrl"),
  streamWidth: document.querySelector("#streamWidth"),
  streamHeight: document.querySelector("#streamHeight"),
  captureCooldownSec: document.querySelector("#captureCooldownSec"),
  roiPolygon: document.querySelector("#roiPolygon"),
  frontVehicleClassIds: document.querySelector("#frontVehicleClassIds"),
  deepstreamImage: document.querySelector("#deepstreamImage"),
  uploads: document.querySelector("#uploads"),
  checkpointList: document.querySelector("#checkpointList"),
  output: document.querySelector("#output"),
  saveBtn: document.querySelector("#saveBtn"),
  deployBtn: document.querySelector("#deployBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  eventsBtn: document.querySelector("#eventsBtn"),
  buildGroup: document.querySelector("#buildGroup"),
  buildImgsz: document.querySelector("#buildImgsz"),
  buildOpset: document.querySelector("#buildOpset"),
  buildTask: document.querySelector("#buildTask"),
  buildYoloVersion: document.querySelector("#buildYoloVersion"),
  buildWorkspaceMb: document.querySelector("#buildWorkspaceMb"),
  buildNumClasses: document.querySelector("#buildNumClasses"),
  sourceModelFile: document.querySelector("#sourceModelFile"),
  buildFp16: document.querySelector("#buildFp16"),
  buildSimplify: document.querySelector("#buildSimplify"),
  buildDynamic: document.querySelector("#buildDynamic"),
  buildEngine: document.querySelector("#buildEngine"),
  buildParser: document.querySelector("#buildParser"),
  uploadSourceBtn: document.querySelector("#uploadSourceBtn"),
  buildModelBtn: document.querySelector("#buildModelBtn"),
  buildLogBtn: document.querySelector("#buildLogBtn")
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

function buildOptions() {
  return {
    imgsz: Number(els.buildImgsz.value),
    opset: Number(els.buildOpset.value),
    task: els.buildTask.value,
    yoloVersion: els.buildYoloVersion.value,
    workspaceMb: Number(els.buildWorkspaceMb.value),
    numClasses: Number(els.buildNumClasses.value),
    fp16: els.buildFp16.checked,
    simplify: els.buildSimplify.checked,
    dynamic: els.buildDynamic.checked,
    buildEngine: els.buildEngine.checked,
    buildParser: els.buildParser.checked
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

async function uploadSlot(slot) {
  const input = document.querySelector(`[data-slot="${slot}"]`);
  if (!input.files.length) return print("Chon file truoc khi upload.");
  const form = new FormData();
  form.append("file", input.files[0]);
  const result = await api(`/api/upload/${slot}`, { method: "POST", body: form });
  print(result);
}

async function uploadSource() {
  if (!els.sourceModelFile.files.length) return print("Chon file .pt hoac .onnx truoc khi upload.");
  const group = els.buildGroup.value;
  const form = new FormData();
  form.append("file", els.sourceModelFile.files[0]);
  const result = await api(`/api/model-source/${group}`, { method: "POST", body: form });
  print(result);
}

async function buildModel() {
  const group = els.buildGroup.value;
  renderCheckpoints([
    { order: 1, label: "Build requested", status: "running", message: `Building ${group}...`, durationMs: null }
  ]);
  print(`Building ${group}. Viec nay co the mat vai phut tren Jetson...`);
  const result = await api(`/api/build/${group}`, {
    method: "POST",
    body: JSON.stringify(buildOptions())
  });
  renderCheckpoints(result.checkpoints || []);
  print(result);
}

async function viewBuildLog() {
  const group = els.buildGroup.value;
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
els.uploadSourceBtn.addEventListener("click", () => uploadSource().catch((error) => print(error.message)));
els.buildModelBtn.addEventListener("click", () => buildModel().catch((error) => {
  renderCheckpoints(error.body?.checkpoints || []);
  print(error.message);
}));
els.buildLogBtn.addEventListener("click", () => viewBuildLog().catch((error) => print(error.message)));
init().catch((error) => print(error.message));
