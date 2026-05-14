const state = {
  cameras: [],
  selectedId: null,
  hls: null,
  captures: new Map(),
  frameEditor: {
    capture: null,
    image: null,
    tool: "rectangle",
    shapes: [],
    draft: null,
    polygonPoints: [],
    isDrawing: false
  }
};

const els = {
  cameraList: document.querySelector("#cameraList"),
  emptyState: document.querySelector("#emptyState"),
  viewer: document.querySelector("#viewer"),
  totalCount: document.querySelector("#totalCount"),
  onlineCount: document.querySelector("#onlineCount"),
  offlineCount: document.querySelector("#offlineCount"),
  streamingCount: document.querySelector("#streamingCount"),
  socketState: document.querySelector("#socketState"),
  refreshBtn: document.querySelector("#refreshBtn"),
  openAddBtn: document.querySelector("#openAddBtn"),
  openTelegramBtn: document.querySelector("#openTelegramBtn"),
  dialog: document.querySelector("#cameraDialog"),
  form: document.querySelector("#cameraForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogBtn: document.querySelector("#closeDialogBtn"),
  cameraId: document.querySelector("#cameraId"),
  cameraName: document.querySelector("#cameraName"),
  cameraRtsp: document.querySelector("#cameraRtsp"),
  cameraInterval: document.querySelector("#cameraInterval"),
  cameraEnabled: document.querySelector("#cameraEnabled"),
  formError: document.querySelector("#formError"),
  deleteBtn: document.querySelector("#deleteBtn"),
  frameDialog: document.querySelector("#frameDialog"),
  frameDialogTitle: document.querySelector("#frameDialogTitle"),
  closeFrameDialogBtn: document.querySelector("#closeFrameDialogBtn"),
  annotationCanvas: document.querySelector("#annotationCanvas"),
  coordinateOutput: document.querySelector("#coordinateOutput"),
  finishPolygonBtn: document.querySelector("#finishPolygonBtn"),
  undoShapeBtn: document.querySelector("#undoShapeBtn"),
  clearShapesBtn: document.querySelector("#clearShapesBtn"),
  copyCoordinatesBtn: document.querySelector("#copyCoordinatesBtn"),
  shapeToolButtons: document.querySelectorAll("[data-shape-tool]"),
  telegramDialog: document.querySelector("#telegramDialog"),
  telegramForm: document.querySelector("#telegramForm"),
  closeTelegramDialogBtn: document.querySelector("#closeTelegramDialogBtn"),
  telegramConnectionStatus: document.querySelector("#telegramConnectionStatus"),
  telegramBotToken: document.querySelector("#telegramBotToken"),
  telegramTokenHint: document.querySelector("#telegramTokenHint"),
  telegramChatId: document.querySelector("#telegramChatId"),
  telegramTimeZone: document.querySelector("#telegramTimeZone"),
  telegramTimeout: document.querySelector("#telegramTimeout"),
  telegramFormError: document.querySelector("#telegramFormError"),
  telegramFormSuccess: document.querySelector("#telegramFormSuccess"),
  testTelegramBtn: document.querySelector("#testTelegramBtn")
};

const icons = () => window.lucide?.createIcons();

function formatDate(value) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function formatDuration(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  if (hours) return `${hours} giờ ${minutes} phút`;
  if (minutes) return `${minutes} phút ${secs} giây`;
  return `${secs} giây`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request lỗi ${response.status}`);
  }
  if (response.status === 204) return null;
  return await response.json();
}

async function loadCameras() {
  state.cameras = await api("/api/cameras");
  if (!state.selectedId && state.cameras.length) state.selectedId = state.cameras[0].id;
  if (state.selectedId && !state.cameras.some((camera) => camera.id === state.selectedId)) {
    state.selectedId = state.cameras[0]?.id || null;
  }
  render();
}

function render(options = {}) {
  renderStats();
  renderList();
  if (!options.keepViewer) renderViewer();
  icons();
}

function renderStats() {
  els.totalCount.textContent = state.cameras.length;
  els.onlineCount.textContent = state.cameras.filter((camera) => camera.status === "online").length;
  els.offlineCount.textContent = state.cameras.filter((camera) => camera.status === "offline").length;
  els.streamingCount.textContent = state.cameras.filter((camera) => camera.streaming).length;
}

function renderList() {
  els.cameraList.innerHTML = "";
  els.emptyState.classList.toggle("visible", state.cameras.length === 0);

  for (const camera of state.cameras) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `camera-card${camera.id === state.selectedId ? " active" : ""}`;
    button.innerHTML = `
      <div class="camera-card-head">
        <span>
          <span class="camera-name">${escapeHtml(camera.name)}</span>
          <span class="camera-url">${escapeHtml(camera.rtspUrlMasked || camera.rtspUrl)}</span>
        </span>
        <span class="badge ${camera.status}">${statusText(camera.status)}</span>
      </div>
      <div class="camera-meta">
        <span>Check: ${formatDate(camera.lastCheckedAt)}</span>
        <span>${camera.streaming ? "Đang stream" : "Chưa stream"}</span>
      </div>
    `;
    button.addEventListener("click", () => {
      state.selectedId = camera.id;
      render();
    });
    els.cameraList.appendChild(button);
  }
}

function renderViewer() {
  const camera = state.cameras.find((item) => item.id === state.selectedId);
  if (!camera) {
    destroyHls();
    els.viewer.innerHTML = `
      <div class="viewer-placeholder">
        <i data-lucide="monitor-play"></i>
        <p>Chọn một camera để xem stream, capture frame và lịch sử gián đoạn.</p>
      </div>
    `;
    return;
  }

  const outages = camera.outages || [];
  const captures = getCapturesForCamera(camera);
  els.viewer.innerHTML = `
    <div class="viewer-header">
      <div class="viewer-title">
        <h2>${escapeHtml(camera.name)}</h2>
        <p>${escapeHtml(camera.rtspUrlMasked || camera.rtspUrl)}</p>
      </div>
      <div class="viewer-actions">
        <button class="ghost-button" id="checkBtn" type="button" title="Kiểm tra ngay">
          <i data-lucide="activity"></i><span>Check</span>
        </button>
        <button class="ghost-button" id="editBtn" type="button" title="Sửa camera">
          <i data-lucide="settings"></i><span>Sửa</span>
        </button>
        <button class="ghost-button danger-button" id="removeCameraBtn" type="button" title="Xóa camera">
          <i data-lucide="trash-2"></i><span>Xóa</span>
        </button>
        <button class="primary-button" id="streamBtn" type="button" title="${camera.streaming ? "Dừng stream" : "Bắt đầu stream"}">
          <i data-lucide="${camera.streaming ? "square" : "play"}"></i><span>${camera.streaming ? "Dừng" : "Stream"}</span>
        </button>
        <button class="ghost-button" id="captureBtn" type="button" title="Capture frame">
          <i data-lucide="camera"></i><span>Capture</span>
        </button>
      </div>
    </div>
    <div class="video-frame">
      <video id="video" controls muted playsinline></video>
      <div class="video-help" id="videoHelp">${camera.streaming ? "Đang nạp playlist HLS..." : "Bấm Stream để xem luồng RTSP trong dashboard."}</div>
    </div>
    <div class="details-grid">
      <div class="section-block">
        <h3>Lịch sử gián đoạn</h3>
        <div class="outage-list">
          ${outages.length ? outages.map((outage) => `
            <div class="outage-row">
              <strong>${outage.endedAt ? "Đã khôi phục" : "Đang gián đoạn"} - ${formatDuration(outage.durationSec)}</strong>
              <span>Từ ${formatDate(outage.startedAt)} đến ${outage.endedAt ? formatDate(outage.endedAt) : "hiện tại"}</span>
            </div>
          `).join("") : `<div class="outage-row"><strong>Chưa ghi nhận gián đoạn</strong><span>Lịch sử sẽ tự cập nhật khi camera mất kết nối.</span></div>`}
        </div>
      </div>
      <div class="section-block">
        <h3>Thông tin & capture</h3>
        <div class="outage-list">
          <div class="outage-row">
            <strong>Trạng thái: ${statusText(camera.status)}</strong>
            <span>Online gần nhất: ${formatDate(camera.lastOnlineAt)}</span>
            <span>Offline gần nhất: ${formatDate(camera.lastOfflineAt)}</span>
            ${camera.lastError ? `<span>Lỗi: ${escapeHtml(camera.lastError)}</span>` : ""}
          </div>
        </div>
        <div class="capture-list" id="captureList">
          ${captures.length ? captures.map((capture) => `
            <div class="capture-row">
              <strong>${formatDate(capture.createdAt)}</strong>
              <a href="${capture.url}" target="_blank" rel="noreferrer">${capture.url}</a>
              <div class="capture-actions">
                <button class="ghost-button" type="button" data-annotate-capture="${escapeHtml(capture.url)}" data-capture-time="${escapeHtml(capture.createdAt)}">
                  <i data-lucide="scan-line"></i><span>Vẽ shape</span>
                </button>
              </div>
            </div>
          `).join("") : ""}
        </div>
      </div>
    </div>
  `;

  document.querySelector("#checkBtn").addEventListener("click", () => checkCamera(camera.id));
  document.querySelector("#editBtn").addEventListener("click", () => openDialog(camera));
  document.querySelector("#removeCameraBtn").addEventListener("click", () => deleteCamera(camera.id, camera.name));
  document.querySelector("#streamBtn").addEventListener("click", () => toggleStream(camera));
  document.querySelector("#captureBtn").addEventListener("click", () => capture(camera.id));
  document.querySelectorAll("[data-annotate-capture]").forEach((button) => {
    button.addEventListener("click", () => {
      openFrameEditor({
        url: button.dataset.annotateCapture,
        createdAt: button.dataset.captureTime
      });
    });
  });
  setupVideo(camera);
}

function setupVideo(camera) {
  const video = document.querySelector("#video");
  const help = document.querySelector("#videoHelp");
  destroyHls();
  if (!camera.streaming) return;

  const src = `${camera.streamUrl}?t=${Date.now()}`;
  if (window.Hls?.isSupported()) {
    const hls = new window.Hls({ liveDurationInfinity: true, lowLatencyMode: true });
    state.hls = hls;
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      help.style.display = "none";
      video.play().catch(() => {});
    });
    hls.on(window.Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) help.textContent = "Chưa nhận được stream. Chờ vài giây hoặc kiểm tra RTSP URL.";
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
    video.addEventListener("loadedmetadata", () => {
      help.style.display = "none";
      video.play().catch(() => {});
    }, { once: true });
  }
}

function destroyHls() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function openDialog(camera = null) {
  els.formError.textContent = "";
  els.dialogTitle.textContent = camera ? "Sửa camera" : "Thêm camera";
  els.cameraId.value = camera?.id || "";
  els.cameraName.value = camera?.name || "";
  els.cameraRtsp.value = camera?.rtspUrl || "";
  els.cameraInterval.value = camera?.checkIntervalSec || 1;
  els.cameraEnabled.checked = camera?.enabled !== false;
  els.deleteBtn.style.display = camera ? "inline-flex" : "none";
  els.dialog.showModal();
  icons();
}

async function saveCamera(event) {
  event.preventDefault();
  els.formError.textContent = "";
  const id = els.cameraId.value;
  const payload = {
    name: els.cameraName.value,
    rtspUrl: els.cameraRtsp.value,
    enabled: els.cameraEnabled.checked,
    checkIntervalSec: Number(els.cameraInterval.value || 1)
  };

  try {
    if (id) await api(`/api/cameras/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await api("/api/cameras", { method: "POST", body: JSON.stringify(payload) });
    els.dialog.close();
    await loadCameras();
  } catch (error) {
    els.formError.textContent = error.message;
  }
}

async function deleteSelectedCamera() {
  const id = els.cameraId.value;
  if (!id) return;
  const name = els.cameraName.value || "camera này";
  const deleted = await deleteCamera(id, name);
  if (!deleted) return;
  els.dialog.close();
}

async function deleteCamera(id, name = "camera này") {
  if (!confirm(`Xóa ${name}?`)) return false;
  await api(`/api/cameras/${id}`, { method: "DELETE" });
  state.selectedId = null;
  state.captures.delete(id);
  await loadCameras();
  return true;
}

async function checkCamera(id) {
  await api(`/api/cameras/${id}/check`, { method: "POST" });
  await loadCameras();
}

async function toggleStream(camera) {
  const action = camera.streaming ? "stop" : "start";
  await api(`/api/cameras/${camera.id}/stream/${action}`, { method: "POST" });
  await loadCameras();
}

async function capture(id) {
  const result = await api(`/api/cameras/${id}/capture`, { method: "POST" });
  const camera = state.cameras.find((item) => item.id === id);
  const captures = camera ? getCapturesForCamera(camera) : state.captures.get(id) || [];
  state.captures.set(id, mergeCaptures([result, ...captures]).slice(0, 20));
  renderViewer();
  icons();
}

async function openTelegramDialog() {
  clearTelegramMessages();
  const settings = await api("/api/settings/telegram");
  renderTelegramSettings(settings);
  els.telegramDialog.showModal();
  icons();
}

function renderTelegramSettings(settings) {
  const connected = Boolean(settings.connected);
  els.telegramConnectionStatus.innerHTML = `<span class="badge ${connected ? "online" : "unknown"}">${connected ? "Đã cấu hình" : "Chưa cấu hình"}</span>`;
  els.telegramBotToken.value = "";
  els.telegramBotToken.placeholder = connected ? "Để trống để giữ token hiện tại" : "123456789:bot-token";
  els.telegramTokenHint.textContent = settings.botTokenMasked ? `Token hiện tại: ${settings.botTokenMasked}` : "Chưa có token.";
  els.telegramChatId.value = settings.chatId || "";
  els.telegramTimeZone.value = settings.timeZone || "Asia/Bangkok";
  els.telegramTimeout.value = settings.timeoutMs || 10000;
}

function clearTelegramMessages() {
  els.telegramFormError.textContent = "";
  els.telegramFormSuccess.textContent = "";
}

async function saveTelegramSettings(event) {
  event.preventDefault();
  clearTelegramMessages();
  try {
    const settings = await persistTelegramSettings();
    renderTelegramSettings(settings);
    els.telegramFormSuccess.textContent = "Đã lưu Telegram connection.";
  } catch (error) {
    els.telegramFormError.textContent = error.message;
  }
}

async function persistTelegramSettings() {
  const payload = {
    chatId: els.telegramChatId.value,
    timeZone: els.telegramTimeZone.value,
    timeoutMs: Number(els.telegramTimeout.value || 10000)
  };
  if (els.telegramBotToken.value.trim()) payload.botToken = els.telegramBotToken.value.trim();
  return await api("/api/settings/telegram", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

async function testTelegramConnection() {
  clearTelegramMessages();
  els.testTelegramBtn.disabled = true;
  try {
    const settings = await persistTelegramSettings();
    renderTelegramSettings(settings);
    await api("/api/settings/telegram/test", { method: "POST" });
    els.telegramFormSuccess.textContent = "Đã gửi tin nhắn test tới Telegram.";
  } catch (error) {
    els.telegramFormError.textContent = error.message;
  } finally {
    els.testTelegramBtn.disabled = false;
  }
}

function getCapturesForCamera(camera) {
  return mergeCaptures([
    ...(state.captures.get(camera.id) || []),
    ...(camera.captures || [])
  ]);
}

function mergeCaptures(captures) {
  const byUrl = new Map();
  for (const capture of captures) {
    if (!capture?.url || byUrl.has(capture.url)) continue;
    byUrl.set(capture.url, capture);
  }
  return [...byUrl.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function openFrameEditor(capture) {
  state.frameEditor.capture = capture;
  state.frameEditor.image = null;
  state.frameEditor.shapes = [];
  state.frameEditor.draft = null;
  state.frameEditor.polygonPoints = [];
  state.frameEditor.isDrawing = false;
  state.frameEditor.tool = "rectangle";
  updateToolButtons();
  updateCoordinateOutput();
  els.frameDialogTitle.textContent = `Frame capture - ${formatDate(capture.createdAt)}`;
  els.frameDialog.showModal();
  icons();

  const image = new Image();
  image.onload = () => {
    state.frameEditor.image = image;
    els.annotationCanvas.width = image.naturalWidth;
    els.annotationCanvas.height = image.naturalHeight;
    drawFrameEditor();
    updateCoordinateOutput();
  };
  image.onerror = () => {
    els.coordinateOutput.value = "Không tải được ảnh capture.";
  };
  image.src = capture.url;
}

function setShapeTool(tool) {
  state.frameEditor.tool = tool;
  state.frameEditor.draft = null;
  if (tool !== "polygon") state.frameEditor.polygonPoints = [];
  updateToolButtons();
  drawFrameEditor();
}

function updateToolButtons() {
  els.shapeToolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.shapeTool === state.frameEditor.tool);
  });
}

function getCanvasPoint(event) {
  const canvas = els.annotationCanvas;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: clamp(Math.round((event.clientX - rect.left) * scaleX), 0, canvas.width),
    y: clamp(Math.round((event.clientY - rect.top) * scaleY), 0, canvas.height)
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRectangle(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    type: "rectangle",
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

function normalizeCircle(start, end) {
  const radius = Math.round(Math.hypot(end.x - start.x, end.y - start.y));
  return {
    type: "circle",
    center: { x: start.x, y: start.y },
    radius
  };
}

function createShapeFromDraft(draft) {
  if (!draft) return null;
  const shape = draft.type === "circle"
    ? normalizeCircle(draft.start, draft.end)
    : normalizeRectangle(draft.start, draft.end);

  if (shape.type === "circle" && shape.radius < 2) return null;
  if (shape.type === "rectangle" && (shape.width < 2 || shape.height < 2)) return null;
  return shape;
}

function finishPolygon() {
  const points = state.frameEditor.polygonPoints;
  if (points.length < 3) return;
  state.frameEditor.shapes.push({
    type: "polygon",
    points: points.map((point) => ({ x: point.x, y: point.y }))
  });
  state.frameEditor.polygonPoints = [];
  drawFrameEditor();
  updateCoordinateOutput();
}

function undoShape() {
  if (state.frameEditor.polygonPoints.length) {
    state.frameEditor.polygonPoints.pop();
  } else {
    state.frameEditor.shapes.pop();
  }
  state.frameEditor.draft = null;
  drawFrameEditor();
  updateCoordinateOutput();
}

function clearShapes() {
  state.frameEditor.shapes = [];
  state.frameEditor.draft = null;
  state.frameEditor.polygonPoints = [];
  drawFrameEditor();
  updateCoordinateOutput();
}

function serializeShapes() {
  const image = state.frameEditor.image;
  return {
    image: {
      url: state.frameEditor.capture?.url || null,
      width: image?.naturalWidth || 0,
      height: image?.naturalHeight || 0
    },
    shapes: state.frameEditor.shapes.map((shape, index) => ({
      id: index + 1,
      ...shape
    }))
  };
}

function updateCoordinateOutput() {
  els.coordinateOutput.value = JSON.stringify(serializeShapes(), null, 2);
}

function drawFrameEditor() {
  const canvas = els.annotationCanvas;
  const context = canvas.getContext("2d");
  const image = state.frameEditor.image;
  if (!context || !image) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  state.frameEditor.shapes.forEach((shape, index) => {
    drawShape(context, shape, "#22c55e", index + 1);
  });

  if (state.frameEditor.draft) {
    const draftShape = createShapeFromDraft(state.frameEditor.draft);
    if (draftShape) drawShape(context, draftShape, "#38bdf8");
  }

  drawPolygonDraft(context, state.frameEditor.polygonPoints);
}

function drawShape(context, shape, color, label = "") {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, Math.round(els.annotationCanvas.width / 640));

  if (shape.type === "rectangle") {
    context.strokeRect(shape.x, shape.y, shape.width, shape.height);
    drawLabel(context, label, shape.x, shape.y, color);
  }

  if (shape.type === "circle") {
    context.beginPath();
    context.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
    context.stroke();
    drawLabel(context, label, shape.center.x, shape.center.y - shape.radius, color);
  }

  if (shape.type === "polygon") {
    drawPolygonPath(context, shape.points);
    context.closePath();
    context.stroke();
    drawLabel(context, label, shape.points[0].x, shape.points[0].y, color);
  }

  context.restore();
}

function drawPolygonDraft(context, points) {
  if (!points.length) return;
  context.save();
  context.strokeStyle = "#38bdf8";
  context.fillStyle = "#38bdf8";
  context.lineWidth = Math.max(2, Math.round(els.annotationCanvas.width / 640));
  drawPolygonPath(context, points);
  context.stroke();
  for (const point of points) {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawPolygonPath(context, points) {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
}

function drawLabel(context, label, x, y, color) {
  if (!label) return;
  const size = Math.max(14, Math.round(els.annotationCanvas.width / 90));
  context.font = `${size}px sans-serif`;
  context.textBaseline = "top";
  const text = String(label);
  const metrics = context.measureText(text);
  const labelX = clamp(x, 0, els.annotationCanvas.width - metrics.width - 10);
  const labelY = clamp(y - size - 6, 0, els.annotationCanvas.height - size - 8);
  context.fillStyle = color;
  context.fillRect(labelX, labelY, metrics.width + 10, size + 6);
  context.fillStyle = "#ffffff";
  context.fillText(text, labelX + 5, labelY + 3);
}

function handleCanvasPointerDown(event) {
  if (!state.frameEditor.image) return;
  const point = getCanvasPoint(event);
  if (state.frameEditor.tool === "polygon") {
    state.frameEditor.polygonPoints.push(point);
    drawFrameEditor();
    updateCoordinateOutput();
    return;
  }

  els.annotationCanvas.setPointerCapture(event.pointerId);
  state.frameEditor.isDrawing = true;
  state.frameEditor.draft = {
    type: state.frameEditor.tool,
    start: point,
    end: point
  };
  drawFrameEditor();
}

function handleCanvasPointerMove(event) {
  if (!state.frameEditor.isDrawing || !state.frameEditor.draft) return;
  state.frameEditor.draft.end = getCanvasPoint(event);
  drawFrameEditor();
}

function handleCanvasPointerUp(event) {
  if (!state.frameEditor.isDrawing || !state.frameEditor.draft) return;
  state.frameEditor.draft.end = getCanvasPoint(event);
  const shape = createShapeFromDraft(state.frameEditor.draft);
  if (shape) state.frameEditor.shapes.push(shape);
  state.frameEditor.draft = null;
  state.frameEditor.isDrawing = false;
  drawFrameEditor();
  updateCoordinateOutput();
}

async function copyCoordinates() {
  await navigator.clipboard.writeText(els.coordinateOutput.value);
  els.copyCoordinatesBtn.querySelector("span").textContent = "Đã copy";
  setTimeout(() => {
    els.copyCoordinatesBtn.querySelector("span").textContent = "Copy JSON";
  }, 1200);
}

function statusText(status) {
  if (status === "online") return "Sống";
  if (status === "offline") return "Mất";
  return "Chưa rõ";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function connectSocket() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${window.location.host}`);
  ws.addEventListener("open", () => {
    els.socketState.textContent = "Live";
  });
  ws.addEventListener("close", () => {
    els.socketState.textContent = "Mất kết nối";
    setTimeout(connectSocket, 1500);
  });
  ws.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === "dashboard") {
      const previous = state.cameras.find((camera) => camera.id === state.selectedId);
      state.cameras = payload.cameras;
      if (!state.selectedId && state.cameras.length) state.selectedId = state.cameras[0].id;
      const current = state.cameras.find((camera) => camera.id === state.selectedId);
      const keepViewer = Boolean(previous && current && previous.id === current.id && previous.streaming && current.streaming);
      render({ keepViewer });
    }
  });
}

els.refreshBtn.addEventListener("click", loadCameras);
els.openAddBtn.addEventListener("click", () => openDialog());
els.openTelegramBtn.addEventListener("click", openTelegramDialog);
els.closeDialogBtn.addEventListener("click", () => els.dialog.close());
els.form.addEventListener("submit", saveCamera);
els.deleteBtn.addEventListener("click", deleteSelectedCamera);
els.closeTelegramDialogBtn.addEventListener("click", () => els.telegramDialog.close());
els.telegramForm.addEventListener("submit", saveTelegramSettings);
els.testTelegramBtn.addEventListener("click", testTelegramConnection);
els.closeFrameDialogBtn.addEventListener("click", () => els.frameDialog.close());
els.shapeToolButtons.forEach((button) => {
  button.addEventListener("click", () => setShapeTool(button.dataset.shapeTool));
});
els.finishPolygonBtn.addEventListener("click", finishPolygon);
els.undoShapeBtn.addEventListener("click", undoShape);
els.clearShapesBtn.addEventListener("click", clearShapes);
els.copyCoordinatesBtn.addEventListener("click", copyCoordinates);
els.annotationCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
els.annotationCanvas.addEventListener("pointermove", handleCanvasPointerMove);
els.annotationCanvas.addEventListener("pointerup", handleCanvasPointerUp);
els.annotationCanvas.addEventListener("pointercancel", handleCanvasPointerUp);
els.annotationCanvas.addEventListener("dblclick", (event) => {
  if (state.frameEditor.tool === "polygon") {
    event.preventDefault();
    finishPolygon();
  }
});

connectSocket();
loadCameras();
icons();
