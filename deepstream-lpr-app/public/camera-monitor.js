(() => {
  const state = {
    cameras: [],
    selectedId: null,
    hls: null,
    socket: null,
    captures: new Map(),
    frame: {
      capture: null,
      image: null,
      tool: "rectangle",
      shapes: [],
      draft: null,
      polygon: [],
      drawing: false
    }
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const els = {
    list: $("#monitorCameraList"),
    empty: $("#monitorEmptyState"),
    viewer: $("#monitorViewer"),
    total: $("#monitorTotalCount"),
    online: $("#monitorOnlineCount"),
    offline: $("#monitorOfflineCount"),
    streaming: $("#monitorStreamingCount"),
    socketState: $("#monitorSocketState"),
    refresh: $("#monitorRefreshBtn"),
    add: $("#monitorAddBtn"),
    telegram: $("#monitorTelegramBtn"),
    cameraDialog: $("#monitorCameraDialog"),
    cameraForm: $("#monitorCameraForm"),
    cameraDialogTitle: $("#monitorCameraDialogTitle"),
    closeCameraDialog: $("#monitorCloseCameraDialogBtn"),
    cameraId: $("#monitorCameraId"),
    cameraName: $("#monitorCameraName"),
    cameraRtsp: $("#monitorCameraRtsp"),
    cameraInterval: $("#monitorCameraInterval"),
    cameraEnabled: $("#monitorCameraEnabled"),
    cameraError: $("#monitorCameraError"),
    deleteCamera: $("#monitorDeleteCameraBtn"),
    telegramDialog: $("#monitorTelegramDialog"),
    telegramForm: $("#monitorTelegramForm"),
    closeTelegram: $("#monitorCloseTelegramDialogBtn"),
    telegramStatus: $("#monitorTelegramStatus"),
    telegramToken: $("#monitorTelegramToken"),
    telegramTokenHint: $("#monitorTelegramTokenHint"),
    telegramChatId: $("#monitorTelegramChatId"),
    telegramTimeZone: $("#monitorTelegramTimeZone"),
    telegramTimeout: $("#monitorTelegramTimeout"),
    telegramError: $("#monitorTelegramError"),
    telegramSuccess: $("#monitorTelegramSuccess"),
    testTelegram: $("#monitorTestTelegramBtn"),
    frameDialog: $("#monitorFrameDialog"),
    frameTitle: $("#monitorFrameTitle"),
    closeFrame: $("#monitorCloseFrameBtn"),
    canvas: $("#monitorAnnotationCanvas"),
    coordinateOutput: $("#monitorCoordinateOutput"),
    finishPolygon: $("#monitorFinishPolygonBtn"),
    undoShape: $("#monitorUndoShapeBtn"),
    clearShapes: $("#monitorClearShapesBtn"),
    copyCoordinates: $("#monitorCopyCoordinatesBtn"),
    shapeButtons: $$("[data-monitor-shape-tool]")
  };
  if (!els.list || !els.viewer) return;

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "Not recorded";
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
  }

  function formatDuration(seconds = 0) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  function statusText(status) {
    if (status === "online") return "Online";
    if (status === "offline") return "Offline";
    return "Unknown";
  }

  async function api(route, options = {}) {
    const response = await fetch(`/camera-monitor${route}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Monitor request failed: ${response.status}`);
    }
    if (response.status === 204) return null;
    return await response.json();
  }

  function showViewerMessage(message) {
    destroyHls();
    els.viewer.innerHTML = `<div class="monitor-empty monitor-viewer-empty">${escapeHtml(message)}</div>`;
  }

  async function loadCameras() {
    try {
      state.cameras = await api("/api/cameras");
      if (!state.selectedId && state.cameras.length) state.selectedId = state.cameras[0].id;
      if (state.selectedId && !state.cameras.some((camera) => camera.id === state.selectedId)) {
        state.selectedId = state.cameras[0]?.id || null;
      }
      render();
    } catch (error) {
      showViewerMessage(`${error.message}. Update/restart the Jetson control service if the monitor backend is not active yet.`);
    }
  }

  function render(keepViewer = false) {
    els.total.textContent = state.cameras.length;
    els.online.textContent = state.cameras.filter((camera) => camera.status === "online").length;
    els.offline.textContent = state.cameras.filter((camera) => camera.status === "offline").length;
    els.streaming.textContent = state.cameras.filter((camera) => camera.streaming).length;
    els.empty.classList.toggle("visible", !state.cameras.length);
    els.list.innerHTML = state.cameras.map((camera) => `
      <button type="button" class="monitor-camera-row ${camera.id === state.selectedId ? "active" : ""}" data-monitor-camera="${escapeHtml(camera.id)}">
        <span>
          <strong>${escapeHtml(camera.name)}</strong>
          <small>${escapeHtml(camera.rtspUrlMasked || camera.rtspUrl)}</small>
        </span>
        <b class="monitor-badge ${escapeHtml(camera.status)}">${statusText(camera.status)}</b>
        <em>Check: ${formatDate(camera.lastCheckedAt)} - ${camera.streaming ? "streaming" : "idle"}</em>
      </button>
    `).join("");
    els.list.querySelectorAll("[data-monitor-camera]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedId = button.dataset.monitorCamera;
        render();
      });
    });
    if (!keepViewer) renderViewer();
  }

  function cameraCaptures(camera) {
    const byUrl = new Map();
    [...(state.captures.get(camera.id) || []), ...(camera.captures || [])].forEach((capture) => {
      if (capture?.url && !byUrl.has(capture.url)) byUrl.set(capture.url, capture);
    });
    return [...byUrl.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function renderViewer() {
    const camera = state.cameras.find((item) => item.id === state.selectedId);
    if (!camera) {
      showViewerMessage("Select a monitor camera to stream, capture and inspect outages.");
      return;
    }
    const captures = cameraCaptures(camera);
    const outages = camera.outages || [];
    els.viewer.innerHTML = `
      <div class="monitor-view-head">
        <div>
          <h3>${escapeHtml(camera.name)}</h3>
          <p>${escapeHtml(camera.rtspUrlMasked || camera.rtspUrl)}</p>
        </div>
        <div class="actions inline-actions">
          <button type="button" data-monitor-action="check" class="secondary">Check</button>
          <button type="button" data-monitor-action="edit" class="secondary">Edit</button>
          <button type="button" data-monitor-action="delete" class="danger">Delete</button>
          <button type="button" data-monitor-action="stream">${camera.streaming ? "Stop stream" : "Stream"}</button>
          <button type="button" data-monitor-action="capture" class="secondary">Capture</button>
        </div>
      </div>
      <div class="monitor-video">
        <video id="monitorVideo" controls muted playsinline></video>
        <div id="monitorVideoHelp">${camera.streaming ? "Loading HLS stream..." : "Start stream to view RTSP in the dashboard."}</div>
      </div>
      <div class="monitor-detail-grid">
        <section class="monitor-detail-block">
          <h4>Outages</h4>
          <div class="monitor-detail-list">
            ${outages.length ? outages.map((outage) => `
              <article>
                <strong>${outage.endedAt ? "Recovered" : "Offline"} - ${formatDuration(outage.durationSec)}</strong>
                <span>${formatDate(outage.startedAt)} to ${outage.endedAt ? formatDate(outage.endedAt) : "now"}</span>
              </article>
            `).join("") : "<article><strong>No outage recorded</strong><span>The timeline updates when ping state changes.</span></article>"}
          </div>
        </section>
        <section class="monitor-detail-block">
          <h4>Status & captures</h4>
          <div class="monitor-detail-list">
            <article>
              <strong>${statusText(camera.status)}</strong>
              <span>Last online: ${formatDate(camera.lastOnlineAt)}</span>
              <span>Last offline: ${formatDate(camera.lastOfflineAt)}</span>
              ${camera.lastError ? `<span>Error: ${escapeHtml(camera.lastError)}</span>` : ""}
            </article>
            ${captures.map((capture) => `
              <article class="monitor-capture-row">
                <strong>${formatDate(capture.createdAt)}</strong>
                <a href="${escapeHtml(capture.url)}" target="_blank" rel="noreferrer">${escapeHtml(capture.url)}</a>
                <button type="button" data-monitor-annotate="${escapeHtml(capture.url)}" data-monitor-capture-time="${escapeHtml(capture.createdAt)}" class="secondary">Draw shapes</button>
              </article>
            `).join("")}
          </div>
        </section>
      </div>
    `;
    const action = (name) => els.viewer.querySelector(`[data-monitor-action="${name}"]`);
    action("check")?.addEventListener("click", () => checkCamera(camera.id));
    action("edit")?.addEventListener("click", () => openCameraDialog(camera));
    action("delete")?.addEventListener("click", () => deleteCamera(camera.id, camera.name));
    action("stream")?.addEventListener("click", () => toggleStream(camera));
    action("capture")?.addEventListener("click", () => capture(camera.id));
    els.viewer.querySelectorAll("[data-monitor-annotate]").forEach((button) => {
      button.addEventListener("click", () => openFrame({
        url: button.dataset.monitorAnnotate,
        createdAt: button.dataset.monitorCaptureTime
      }));
    });
    setupVideo(camera);
  }

  function setupVideo(camera, attempt = 0) {
    const video = $("#monitorVideo");
    const help = $("#monitorVideoHelp");
    destroyHls();
    if (!camera.streaming || !video) return;
    const src = `${camera.streamUrl}?t=${Date.now()}`;
    if (window.Hls?.isSupported()) {
      const hls = new window.Hls({
        liveDurationInfinity: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 20,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 20,
        levelLoadingRetryDelay: 1000
      });
      state.hls = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (help) help.hidden = true;
        video.play().catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (help) help.textContent = "Waiting for HLS stream...";
        if (attempt < 8 && state.selectedId === camera.id) {
          setTimeout(() => setupVideo(camera, attempt + 1), 1500);
        } else if (help) {
          help.textContent = "Cannot load HLS stream. Check RTSP URL, codec, or stream status.";
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        if (help) help.hidden = true;
        video.play().catch(() => {});
      }, { once: true });
    }
  }

  function destroyHls() {
    if (state.hls) state.hls.destroy();
    state.hls = null;
  }

  function openCameraDialog(camera = null) {
    els.cameraError.textContent = "";
    els.cameraDialogTitle.textContent = camera ? "Edit camera" : "Add camera";
    els.cameraId.value = camera?.id || "";
    els.cameraName.value = camera?.name || "";
    els.cameraRtsp.value = camera?.rtspUrl || "";
    els.cameraInterval.value = camera?.checkIntervalSec || 1;
    els.cameraEnabled.checked = camera?.enabled !== false;
    els.deleteCamera.hidden = !camera;
    els.cameraDialog.showModal();
  }

  async function saveCamera(event) {
    event.preventDefault();
    els.cameraError.textContent = "";
    const payload = {
      name: els.cameraName.value,
      rtspUrl: els.cameraRtsp.value,
      checkIntervalSec: Number(els.cameraInterval.value || 1),
      enabled: els.cameraEnabled.checked
    };
    try {
      if (els.cameraId.value) {
        await api(`/api/cameras/${els.cameraId.value}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/cameras", { method: "POST", body: JSON.stringify(payload) });
      }
      els.cameraDialog.close();
      await loadCameras();
    } catch (error) {
      els.cameraError.textContent = error.message;
    }
  }

  async function deleteCamera(id, name = "this camera") {
    if (!confirm(`Delete ${name}?`)) return false;
    await api(`/api/cameras/${id}`, { method: "DELETE" });
    state.selectedId = null;
    state.captures.delete(id);
    await loadCameras();
    return true;
  }

  async function deleteDialogCamera() {
    if (!els.cameraId.value) return;
    if (await deleteCamera(els.cameraId.value, els.cameraName.value || "this camera")) els.cameraDialog.close();
  }

  async function checkCamera(id) {
    await api(`/api/cameras/${id}/check`, { method: "POST" });
    await loadCameras();
  }

  async function toggleStream(camera) {
    await api(`/api/cameras/${camera.id}/stream/${camera.streaming ? "stop" : "start"}`, { method: "POST" });
    await loadCameras();
  }

  async function capture(id) {
    const captureResult = await api(`/api/cameras/${id}/capture`, { method: "POST" });
    const camera = state.cameras.find((item) => item.id === id);
    const captures = camera ? cameraCaptures(camera) : [];
    state.captures.set(id, [captureResult, ...captures].slice(0, 20));
    renderViewer();
  }

  function clearTelegramMessages() {
    els.telegramError.textContent = "";
    els.telegramSuccess.textContent = "";
  }

  function renderTelegram(settings) {
    els.telegramStatus.textContent = settings.connected ? "Configured" : "Not configured";
    els.telegramStatus.dataset.connected = settings.connected ? "1" : "0";
    els.telegramToken.value = "";
    els.telegramToken.placeholder = settings.connected ? "Leave blank to keep current token" : "123456789:bot-token";
    els.telegramTokenHint.textContent = settings.botTokenMasked ? `Current token: ${settings.botTokenMasked}` : "No token saved.";
    els.telegramChatId.value = settings.chatId || "";
    els.telegramTimeZone.value = settings.timeZone || "Asia/Bangkok";
    els.telegramTimeout.value = settings.timeoutMs || 10000;
  }

  async function openTelegram() {
    clearTelegramMessages();
    renderTelegram(await api("/api/settings/telegram"));
    els.telegramDialog.showModal();
  }

  async function persistTelegram() {
    const body = {
      chatId: els.telegramChatId.value,
      timeZone: els.telegramTimeZone.value,
      timeoutMs: Number(els.telegramTimeout.value || 10000)
    };
    if (els.telegramToken.value.trim()) body.botToken = els.telegramToken.value.trim();
    return await api("/api/settings/telegram", { method: "PUT", body: JSON.stringify(body) });
  }

  async function saveTelegram(event) {
    event.preventDefault();
    clearTelegramMessages();
    try {
      renderTelegram(await persistTelegram());
      els.telegramSuccess.textContent = "Telegram connection saved.";
    } catch (error) {
      els.telegramError.textContent = error.message;
    }
  }

  async function testTelegram() {
    clearTelegramMessages();
    els.testTelegram.disabled = true;
    try {
      renderTelegram(await persistTelegram());
      await api("/api/settings/telegram/test", { method: "POST" });
      els.telegramSuccess.textContent = "Test message sent.";
    } catch (error) {
      els.telegramError.textContent = error.message;
    } finally {
      els.testTelegram.disabled = false;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function framePoint(event) {
    const rect = els.canvas.getBoundingClientRect();
    return {
      x: clamp(Math.round((event.clientX - rect.left) * els.canvas.width / rect.width), 0, els.canvas.width),
      y: clamp(Math.round((event.clientY - rect.top) * els.canvas.height / rect.height), 0, els.canvas.height)
    };
  }

  function rectangle(start, end) {
    return { type: "rectangle", x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
  }

  function circle(start, end) {
    return { type: "circle", center: { x: start.x, y: start.y }, radius: Math.round(Math.hypot(end.x - start.x, end.y - start.y)) };
  }

  function draftShape(draft) {
    if (!draft) return null;
    const shape = draft.type === "circle" ? circle(draft.start, draft.end) : rectangle(draft.start, draft.end);
    if (shape.type === "circle" && shape.radius < 2) return null;
    if (shape.type === "rectangle" && (shape.width < 2 || shape.height < 2)) return null;
    return shape;
  }

  function openFrame(captureItem) {
    state.frame = { capture: captureItem, image: null, tool: "rectangle", shapes: [], draft: null, polygon: [], drawing: false };
    els.frameTitle.textContent = `Frame capture - ${formatDate(captureItem.createdAt)}`;
    setShapeTool("rectangle");
    updateCoordinates();
    els.frameDialog.showModal();
    const image = new Image();
    image.onload = () => {
      state.frame.image = image;
      els.canvas.width = image.naturalWidth;
      els.canvas.height = image.naturalHeight;
      drawFrame();
      updateCoordinates();
    };
    image.onerror = () => {
      els.coordinateOutput.value = "Cannot load capture image.";
    };
    image.src = captureItem.url;
  }

  function setShapeTool(tool) {
    state.frame.tool = tool;
    state.frame.draft = null;
    if (tool !== "polygon") state.frame.polygon = [];
    els.shapeButtons.forEach((button) => {
      button.classList.toggle("secondary", button.dataset.monitorShapeTool !== tool);
    });
    drawFrame();
  }

  function polygonPath(context, points) {
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  }

  function drawShape(context, shape, color, label = "") {
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = Math.max(2, Math.round(els.canvas.width / 640));
    if (shape.type === "rectangle") context.strokeRect(shape.x, shape.y, shape.width, shape.height);
    if (shape.type === "circle") {
      context.beginPath();
      context.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
      context.stroke();
    }
    if (shape.type === "polygon") {
      polygonPath(context, shape.points);
      context.closePath();
      context.stroke();
    }
    if (label) context.fillText(String(label), shape.x || shape.center?.x || shape.points?.[0]?.x || 8, shape.y || shape.center?.y || shape.points?.[0]?.y || 8);
    context.restore();
  }

  function drawFrame() {
    const context = els.canvas.getContext("2d");
    if (!context || !state.frame.image) return;
    context.clearRect(0, 0, els.canvas.width, els.canvas.height);
    context.drawImage(state.frame.image, 0, 0, els.canvas.width, els.canvas.height);
    state.frame.shapes.forEach((shape, index) => drawShape(context, shape, "#22c55e", index + 1));
    const draft = draftShape(state.frame.draft);
    if (draft) drawShape(context, draft, "#38bdf8");
    if (state.frame.polygon.length) {
      context.save();
      context.strokeStyle = "#38bdf8";
      context.fillStyle = "#38bdf8";
      context.lineWidth = Math.max(2, Math.round(els.canvas.width / 640));
      polygonPath(context, state.frame.polygon);
      context.stroke();
      state.frame.polygon.forEach((point) => {
        context.beginPath();
        context.arc(point.x, point.y, 4, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();
    }
  }

  function serializeFrame() {
    return {
      image: {
        url: state.frame.capture?.url || null,
        width: state.frame.image?.naturalWidth || 0,
        height: state.frame.image?.naturalHeight || 0
      },
      shapes: state.frame.shapes.map((shape, index) => ({ id: index + 1, ...shape }))
    };
  }

  function updateCoordinates() {
    els.coordinateOutput.value = JSON.stringify(serializeFrame(), null, 2);
  }

  function finishPolygon() {
    if (state.frame.polygon.length < 3) return;
    state.frame.shapes.push({ type: "polygon", points: state.frame.polygon.map((point) => ({ ...point })) });
    state.frame.polygon = [];
    drawFrame();
    updateCoordinates();
  }

  function undoShape() {
    if (state.frame.polygon.length) state.frame.polygon.pop();
    else state.frame.shapes.pop();
    state.frame.draft = null;
    drawFrame();
    updateCoordinates();
  }

  function clearShapes() {
    state.frame.shapes = [];
    state.frame.draft = null;
    state.frame.polygon = [];
    drawFrame();
    updateCoordinates();
  }

  async function copyCoordinates() {
    await navigator.clipboard.writeText(els.coordinateOutput.value);
    els.copyCoordinates.textContent = "Copied";
    setTimeout(() => {
      els.copyCoordinates.textContent = "Copy JSON";
    }, 1200);
  }

  function frameDown(event) {
    if (!state.frame.image) return;
    const point = framePoint(event);
    if (state.frame.tool === "polygon") {
      state.frame.polygon.push(point);
      drawFrame();
      updateCoordinates();
      return;
    }
    els.canvas.setPointerCapture(event.pointerId);
    state.frame.drawing = true;
    state.frame.draft = { type: state.frame.tool, start: point, end: point };
    drawFrame();
  }

  function frameMove(event) {
    if (!state.frame.drawing || !state.frame.draft) return;
    state.frame.draft.end = framePoint(event);
    drawFrame();
  }

  function frameUp(event) {
    if (!state.frame.drawing || !state.frame.draft) return;
    state.frame.draft.end = framePoint(event);
    const shape = draftShape(state.frame.draft);
    if (shape) state.frame.shapes.push(shape);
    state.frame.draft = null;
    state.frame.drawing = false;
    drawFrame();
    updateCoordinates();
  }

  function connectSocket() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    state.socket = new WebSocket(`${protocol}://${window.location.host}/camera-monitor/ws`);
    state.socket.addEventListener("open", () => {
      els.socketState.textContent = "Live";
    });
    state.socket.addEventListener("close", () => {
      els.socketState.textContent = "Disconnected";
      setTimeout(connectSocket, 1500);
    });
    state.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type !== "dashboard") return;
      const previous = state.cameras.find((camera) => camera.id === state.selectedId);
      state.cameras = payload.cameras || [];
      if (!state.selectedId && state.cameras.length) state.selectedId = state.cameras[0].id;
      const current = state.cameras.find((camera) => camera.id === state.selectedId);
      render(Boolean(previous && current && previous.id === current.id && previous.streaming && current.streaming));
    });
  }

  els.refresh.addEventListener("click", loadCameras);
  els.add.addEventListener("click", () => openCameraDialog());
  els.telegram.addEventListener("click", () => openTelegram().catch((error) => alert(error.message)));
  els.closeCameraDialog.addEventListener("click", () => els.cameraDialog.close());
  els.cameraForm.addEventListener("submit", saveCamera);
  els.deleteCamera.addEventListener("click", deleteDialogCamera);
  els.closeTelegram.addEventListener("click", () => els.telegramDialog.close());
  els.telegramForm.addEventListener("submit", saveTelegram);
  els.testTelegram.addEventListener("click", testTelegram);
  els.closeFrame.addEventListener("click", () => els.frameDialog.close());
  els.shapeButtons.forEach((button) => button.addEventListener("click", () => setShapeTool(button.dataset.monitorShapeTool)));
  els.finishPolygon.addEventListener("click", finishPolygon);
  els.undoShape.addEventListener("click", undoShape);
  els.clearShapes.addEventListener("click", clearShapes);
  els.copyCoordinates.addEventListener("click", copyCoordinates);
  els.canvas.addEventListener("pointerdown", frameDown);
  els.canvas.addEventListener("pointermove", frameMove);
  els.canvas.addEventListener("pointerup", frameUp);
  els.canvas.addEventListener("pointercancel", frameUp);
  els.canvas.addEventListener("dblclick", (event) => {
    if (state.frame.tool === "polygon") {
      event.preventDefault();
      finishPolygon();
    }
  });
  connectSocket();
  loadCameras();
})();
