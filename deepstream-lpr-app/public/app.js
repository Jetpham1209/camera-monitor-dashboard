const gieStageTypes = [
  {
    gieType: "PGIE",
    id: "pgie",
    name: "PGIE",
    defaultGieId: 1,
    defaultNetworkType: 0,
    defaultOperateOnGieId: "",
    defaultOperateOnClassIds: ""
  },
  {
    gieType: "SGIE",
    id: "sgie",
    name: "SGIE",
    defaultGieId: 2,
    defaultNetworkType: 0,
    defaultOperateOnGieId: 1,
    defaultOperateOnClassIds: ""
  },
  {
    gieType: "TGIE",
    id: "tgie",
    name: "TGIE",
    defaultGieId: 3,
    defaultNetworkType: 0,
    defaultOperateOnGieId: 2,
    defaultOperateOnClassIds: ""
  }
];

const processorTypes = [
  {
    value: "lpr",
    label: "LPR",
    description: "Requires PGIE -> SGIE -> TGIE for vehicle, plate and character logic."
  },
  {
    value: "generic_detection",
    label: "Generic Detection",
    description: "Runs configured GIE detections and labels without app-specific post-process."
  }
];

const els = {
  workspaceTitle: document.querySelector("#workspaceTitle"),
  dashboardOverview: document.querySelector("#dashboardOverview"),
  streamWidth: document.querySelector("#streamWidth"),
  streamHeight: document.querySelector("#streamHeight"),
  deepstreamImage: document.querySelector("#deepstreamImage"),
  cameraSettingsTitle: document.querySelector("#cameraSettingsTitle"),
  cameraSettingId: document.querySelector("#cameraSettingId"),
  cameraSettingName: document.querySelector("#cameraSettingName"),
  cameraSettingCooldown: document.querySelector("#cameraSettingCooldown"),
  cameraSettingRtsp: document.querySelector("#cameraSettingRtsp"),
  cameraSettingClassIds: document.querySelector("#cameraSettingClassIds"),
  cameraSettingEnabled: document.querySelector("#cameraSettingEnabled"),
  cameraSettingRoi: document.querySelector("#cameraSettingRoi"),
  cameraSettingZones: document.querySelector("#cameraSettingZones"),
  cameraSettingRules: document.querySelector("#cameraSettingRules"),
  cameraEditingIndex: document.querySelector("#cameraEditingIndex"),
  cameraSettingConnection: document.querySelector("#cameraSettingConnection"),
  cameraSettingRoiSummary: document.querySelector("#cameraSettingRoiSummary"),
  cameraSettingFrameSize: document.querySelector("#cameraSettingFrameSize"),
  cameraSettingRoiSlot: document.querySelector("#cameraSettingRoiSlot"),
  checkCameraSettingBtn: document.querySelector("#checkCameraSettingBtn"),
  openCameraSettingRoiBtn: document.querySelector("#openCameraSettingRoiBtn"),
  newCameraBtn: document.querySelector("#newCameraBtn"),
  cameraList: document.querySelector("#cameraList"),
  addCameraBtn: document.querySelector("#addCameraBtn"),
  roiToolHome: document.querySelector("#roiToolHome"),
  roiToolPanel: document.querySelector("#roiToolPanel"),
  roiToolTitle: document.querySelector("#roiToolTitle"),
  closeRoiToolBtn: document.querySelector("#closeRoiToolBtn"),
  roiCameraSelect: document.querySelector("#roiCameraSelect"),
  roiImageFile: document.querySelector("#roiImageFile"),
  captureRoiFrameBtn: document.querySelector("#captureRoiFrameBtn"),
  roiImageSize: document.querySelector("#roiImageSize"),
  roiCanvas: document.querySelector("#roiCanvas"),
  roiCanvasEmpty: document.querySelector("#roiCanvasEmpty"),
  roiZoneSelect: document.querySelector("#roiZoneSelect"),
  roiZoneName: document.querySelector("#roiZoneName"),
  roiZoneMode: document.querySelector("#roiZoneMode"),
  roiZoneClassIds: document.querySelector("#roiZoneClassIds"),
  roiZoneCooldown: document.querySelector("#roiZoneCooldown"),
  roiZoneEnabled: document.querySelector("#roiZoneEnabled"),
  roiZoneList: document.querySelector("#roiZoneList"),
  newZoneBtn: document.querySelector("#newZoneBtn"),
  roiRuleName: document.querySelector("#roiRuleName"),
  roiRuleFirstZone: document.querySelector("#roiRuleFirstZone"),
  roiRuleSecondZone: document.querySelector("#roiRuleSecondZone"),
  roiRuleMaxTime: document.querySelector("#roiRuleMaxTime"),
  roiRuleReverseAction: document.querySelector("#roiRuleReverseAction"),
  roiRuleClassIds: document.querySelector("#roiRuleClassIds"),
  roiRuleCooldown: document.querySelector("#roiRuleCooldown"),
  roiRuleEnabled: document.querySelector("#roiRuleEnabled"),
  addRoiRuleBtn: document.querySelector("#addRoiRuleBtn"),
  roiRuleList: document.querySelector("#roiRuleList"),
  roiPolygonOutput: document.querySelector("#roiPolygonOutput"),
  undoRoiPointBtn: document.querySelector("#undoRoiPointBtn"),
  clearRoiBtn: document.querySelector("#clearRoiBtn"),
  applyRoiBtn: document.querySelector("#applyRoiBtn"),
  removeRoiBtn: document.querySelector("#removeRoiBtn"),
  deployAppList: document.querySelector("#deployAppList"),
  addDeployAppBtn: document.querySelector("#addDeployAppBtn"),
  refreshDeployPreviewBtn: document.querySelector("#refreshDeployPreviewBtn"),
  modelBuilders: document.querySelector("#modelBuilders"),
  globalStatus: document.querySelector("#globalStatus"),
  checkpointList: document.querySelector("#checkpointList"),
  output: document.querySelector("#output"),
  saveBtn: document.querySelector("#saveBtn"),
  deployBtn: document.querySelector("#deployBtn"),
  eventsBtn: document.querySelector("#eventsBtn"),
  refreshDeployStatusBtn: document.querySelector("#refreshDeployStatusBtn"),
  stopRunningDeployBtn: document.querySelector("#stopRunningDeployBtn"),
  deployStatusCards: document.querySelector("#deployStatusCards"),
  testImageFile: document.querySelector("#testImageFile"),
  testVideoFile: document.querySelector("#testVideoFile"),
  uploadTestImageBtn: document.querySelector("#uploadTestImageBtn"),
  uploadTestVideoBtn: document.querySelector("#uploadTestVideoBtn"),
  runTestImageBtn: document.querySelector("#runTestImageBtn"),
  runTestVideoBtn: document.querySelector("#runTestVideoBtn"),
  testPipelineStages: document.querySelector("#testPipelineStages"),
  testProcessorType: document.querySelector("#testProcessorType"),
  addTestStageBtn: document.querySelector("#addTestStageBtn"),
  confirmTestFlowBtn: document.querySelector("#confirmTestFlowBtn"),
  testFlowSummary: document.querySelector("#testFlowSummary"),
  testResults: document.querySelector("#testResults"),
  copyOutputBtn: document.querySelector("#copyOutputBtn"),
  toggleOutputBtn: document.querySelector("#toggleOutputBtn"),
  ocrMaxChars: document.querySelector("#ocrMaxChars"),
  ocrMinConfidence: document.querySelector("#ocrMinConfidence"),
  ocrNmsIou: document.querySelector("#ocrNmsIou"),
  ocrMinWidthRatio: document.querySelector("#ocrMinWidthRatio"),
  ocrMaxWidthRatio: document.querySelector("#ocrMaxWidthRatio"),
  ocrMinHeightRatio: document.querySelector("#ocrMinHeightRatio"),
  ocrMaxHeightRatio: document.querySelector("#ocrMaxHeightRatio"),
  agentStatus: document.querySelector("#agentStatus"),
  agentMessages: document.querySelector("#agentMessages"),
  agentForm: document.querySelector("#agentForm"),
  agentInput: document.querySelector("#agentInput"),
  agentSendBtn: document.querySelector("#agentSendBtn"),
  refreshAgentBtn: document.querySelector("#refreshAgentBtn"),
  clearAgentMemoryBtn: document.querySelector("#clearAgentMemoryBtn"),
  clearAgentNotesBtn: document.querySelector("#clearAgentNotesBtn"),
  clearAgentLearnedMemoryBtn: document.querySelector("#clearAgentLearnedMemoryBtn"),
  agentNoteInput: document.querySelector("#agentNoteInput"),
  saveAgentNoteBtn: document.querySelector("#saveAgentNoteBtn"),
  agentMemoryList: document.querySelector("#agentMemoryList"),
  agentToolTrace: document.querySelector("#agentToolTrace"),
  agentSettingsForm: document.querySelector("#agentSettingsForm"),
  agentProvider: document.querySelector("#agentProvider"),
  agentModel: document.querySelector("#agentModel"),
  agentCustomModel: document.querySelector("#agentCustomModel"),
  agentApiKey: document.querySelector("#agentApiKey"),
  agentBaseUrl: document.querySelector("#agentBaseUrl"),
  agentTimeZone: document.querySelector("#agentTimeZone"),
  agentTemperature: document.querySelector("#agentTemperature"),
  agentMaxTokens: document.querySelector("#agentMaxTokens"),
  agentTopP: document.querySelector("#agentTopP"),
  agentReasoningEffort: document.querySelector("#agentReasoningEffort"),
  agentEnabled: document.querySelector("#agentEnabled"),
  agentClearApiKey: document.querySelector("#agentClearApiKey"),
  saveAgentSettingsBtn: document.querySelector("#saveAgentSettingsBtn"),
  testAgentKeyBtn: document.querySelector("#testAgentKeyBtn"),
  agentSettingsHint: document.querySelector("#agentSettingsHint")
};

let cameraDrafts = [];
let deployApps = [];
let deployCaptures = [];
let confirmedTestPipelineStages = [];
let confirmedTestProcessorType = "lpr";
let latestDeployStatus = {};
const roiTool = {
  image: null,
  source: "",
  points: [],
  zoneIndex: 0
};
const tasks = new Map();
const modelFiles = new Map();
let modelLibraryGroups = [];
let deployStatusPollTimer = null;
let deployStatusPollInFlight = false;
const agentThreadId = "default";
let agentMessages = [];
let agentSettings = null;

function print(value) {
  els.output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function copyOutput() {
  await navigator.clipboard.writeText(els.output.textContent || "");
  setTaskStatus("output", "success", "Output copied.");
}

function toggleOutput() {
  const collapsed = els.output.classList.toggle("collapsed");
  els.toggleOutputBtn.textContent = collapsed ? "Expand" : "Collapse";
}

function setTaskStatus(id, status, message) {
  tasks.set(id, { status, message, updatedAt: new Date() });
  const node = document.querySelector(`[data-task-status="${id}"]`);
  if (node) {
    node.className = `task-status ${status}`;
    node.innerHTML = statusMarkup(status, message);
  }
  updateGlobalStatus(id, status, message);
}

function statusMarkup(status, message) {
  const label = status === "running" ? "Running"
    : status === "success" ? "Success"
    : status === "failed" ? "Failed"
    : "Idle";
  return `
    <span class="status-dot"></span>
    <strong>${label}</strong>
    <span>${escapeHtml(message || "Ready.")}</span>
  `;
}

function updateGlobalStatus(id, status, message) {
  if (!els.globalStatus) return;
  els.globalStatus.className = `task-status ${status}`;
  els.globalStatus.innerHTML = statusMarkup(status, `${id}: ${message || "Ready."}`);
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label || "Working...";
    button.disabled = true;
    button.classList.add("is-busy");
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  button.classList.remove("is-busy");
}

async function withTask(id, button, busyLabel, action) {
  setTaskStatus(id, "running", busyLabel || "Working...");
  setButtonBusy(button, true, busyLabel);
  try {
    const result = await action();
    setTaskStatus(id, "success", "Done.");
    return result;
  } catch (error) {
    setTaskStatus(id, "failed", error.message);
    throw error;
  } finally {
    setButtonBusy(button, false);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const dashboardViewTitles = {
  dashboard: "Main Dashboard",
  monitor: "Camera Monitor",
  cameras: "Cameras & ROI",
  deploy: "Deploy Settings",
  models: "Model Factory",
  tests: "Test Lab",
  agent: "Operator Agent",
  activity: "Activity"
};

function selectDashboardView(view = "dashboard") {
  const next = dashboardViewTitles[view] ? view : "dashboard";
  document.querySelectorAll("[data-view-section]").forEach((section) => {
    section.classList.toggle("active", section.dataset.viewSection === next);
  });
  document.querySelectorAll("[data-nav-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.navView === next);
  });
  if (els.workspaceTitle) els.workspaceTitle.textContent = dashboardViewTitles[next];
  if (next === "dashboard") renderMainDashboard();
  if (next === "agent") refreshAgent().catch((error) => setTaskStatus("agent", "failed", error.message));
}

function dashboardTag(label, tone = "") {
  return `<span class="dashboard-tag ${tone}">${escapeHtml(label)}</span>`;
}

function modelLibraryStats() {
  const groups = modelLibraryGroups.map((group) => {
    const files = modelFiles.get(group.group) || group.files || [];
    return {
      ...group,
      total: files.length,
      built: files.filter((file) => file.built).length,
      files
    };
  });
  return {
    groups,
    total: groups.reduce((sum, group) => sum + group.total, 0),
    built: groups.reduce((sum, group) => sum + group.built, 0)
  };
}

function dashboardDeploySummary() {
  const container = latestDeployStatus.container || {};
  const deepstream = latestDeployStatus.deepstream || {};
  const sources = deepstream.sources || [];
  const app = deployApps.find((item) => item.active) || deployApps[0] || null;
  return { container, deepstream, sources, app };
}

function renderMainDashboard() {
  if (!els.dashboardOverview) return;
  const cameras = readCameraCards();
  const enabledCameras = cameras.filter((camera) => camera.enabled !== false);
  const camerasWithRoi = cameras.filter((camera) => cameraZones(camera).some((zone) => cleanZonePolygon(zone.polygon).length >= 3));
  const modelStats = modelLibraryStats();
  const deploy = dashboardDeploySummary();
  const testStages = confirmedTestPipelineStages.length ? normalizePipelineStages(confirmedTestPipelineStages) : [];
  const selectedDeployCameras = new Set(deploy.app?.cameraIds || []);
  const deployStageCount = deploy.app?.pipelineStages?.length
    ? normalizePipelineStages(deploy.app.pipelineStages).filter((stage) => stage.enabled).length
    : 0;
  const running = Boolean(deploy.container.running);
  const started = Boolean(deploy.deepstream.started);
  const sourceText = deploy.sources.length
    ? `${deploy.sources.length} source${deploy.sources.length === 1 ? "" : "s"} reporting FPS`
    : "Waiting for source telemetry";

  els.dashboardOverview.innerHTML = `
    <div class="dashboard-kpis">
      <article class="dashboard-kpi ${cameras.length ? "success" : "warning"}">
        <span>Cameras</span>
        <strong>${cameras.length}</strong>
        <small>${enabledCameras.length} enabled - ${camerasWithRoi.length} ROI configured</small>
      </article>
      <article class="dashboard-kpi ${running && started ? "success" : "warning"}">
        <span>DeepStream runtime</span>
        <strong>${running ? "Container up" : "Not running"}</strong>
        <small>${started ? "Pipeline started" : escapeHtml(deploy.deepstream.message || "Deploy an app to start the pipeline.")}</small>
      </article>
      <article class="dashboard-kpi ${modelStats.built ? "success" : "warning"}">
        <span>Model library</span>
        <strong>${modelStats.built}/${modelStats.total}</strong>
        <small>Built source models ready for GIE stages</small>
      </article>
      <article class="dashboard-kpi ${testStages.length ? "success" : "warning"}">
        <span>Confirmed test flow</span>
        <strong>${testStages.length}</strong>
        <small>${testStages.filter((stage) => stage.enabled).length} enabled inference stage(s)</small>
      </article>
    </div>
    <div class="dashboard-grid">
      <section class="dashboard-section">
        <div class="panel-toolbar">
          <div>
            <h3>Camera setup</h3>
            <p>RTSP inputs and ROI readiness for deploy.</p>
          </div>
          <div class="dashboard-actions">
            <button type="button" class="secondary" data-open-view="cameras">Manage</button>
          </div>
        </div>
        <div class="dashboard-list">
          ${cameras.length ? cameras.map((camera, index) => `
            <article class="dashboard-camera-row">
              <strong>${escapeHtml(camera.name || camera.id || `Camera ${index + 1}`)}</strong>
              <span class="dashboard-list-meta">${escapeHtml(camera.id || `camera-${index + 1}`)} - ${escapeHtml(camera.rtspUrl || "No RTSP URL")}</span>
              <div class="dashboard-tags">
                ${dashboardTag(camera.enabled !== false ? "enabled" : "disabled", camera.enabled !== false ? "success" : "warning")}
                ${dashboardTag(zoneSummary(cameraZones(camera)), cameraZones(camera).some((zone) => cleanZonePolygon(zone.polygon).length >= 3) ? "success" : "warning")}
                ${dashboardTag(frameSizeSummary(camera.id))}
              </div>
            </article>
          `).join("") : '<div class="empty">No camera configured yet.</div>'}
        </div>
      </section>
      <section class="dashboard-section">
        <div class="panel-toolbar">
          <div>
            <h3>Active deploy app</h3>
            <p>${escapeHtml(deploy.app?.name || "No deploy app selected.")}</p>
          </div>
          <div class="dashboard-actions">
            <button type="button" class="secondary" data-open-view="deploy">Configure</button>
            <a class="button-link secondary" href="/results">Results</a>
          </div>
        </div>
        <div class="dashboard-list">
          <article class="dashboard-stage-row">
            <strong>${started ? "Pipeline running" : "Pipeline waiting"}</strong>
            <span class="dashboard-list-meta">${escapeHtml(sourceText)}</span>
            <div class="dashboard-tags">
              ${dashboardTag(running ? "container running" : "container stopped", running ? "success" : "warning")}
              ${dashboardTag(started ? "DeepStream started" : "DeepStream not started", started ? "success" : "warning")}
              ${dashboardTag(processorLabel(deploy.app?.processorType))}
              ${dashboardTag(`${selectedDeployCameras.size} camera(s)`)}
              ${dashboardTag(`${deployStageCount} stage(s)`)}
            </div>
          </article>
          ${deploy.sources.map((source) => `
            <article class="dashboard-stage-row">
              <strong>${escapeHtml(source.cameraName || source.cameraId || `Source ${source.sourceId}`)}</strong>
              <span class="dashboard-list-meta">${Number(source.fps || 0).toFixed(2)} FPS - ${Number(source.frameCount || 0)} frames</span>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="dashboard-section">
        <div class="panel-toolbar">
          <div>
            <h3>Model readiness</h3>
            <p>Source artifacts available to build or select in a flow.</p>
          </div>
          <div class="dashboard-actions">
            <button type="button" class="secondary" data-open-view="models">Factory</button>
          </div>
        </div>
        <div class="dashboard-list">
          ${modelStats.groups.map((group) => `
            <article class="dashboard-model-row">
              <strong>${escapeHtml(group.displayName || group.group)}</strong>
              <span class="dashboard-list-meta">${group.built} built of ${group.total} source model(s)</span>
              <div class="dashboard-tags">
                ${dashboardTag(group.group)}
                ${dashboardTag(group.built ? "ready" : "needs build", group.built ? "success" : "warning")}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="dashboard-section">
        <div class="panel-toolbar">
          <div>
            <h3>Test flow</h3>
            <p>Image and video tests use the confirmed stages.</p>
          </div>
          <div class="dashboard-actions">
            <button type="button" class="secondary" data-open-view="tests">Open tests</button>
          </div>
        </div>
        <div class="dashboard-list">
          ${testStages.length ? testStages.map((stage, index) => {
            const file = findModelFile(stage.modelGroup, stage.selectedModel);
            return `
              <article class="dashboard-stage-row">
                <strong>${index + 1}. ${escapeHtml(stage.gieType || "GIE")}</strong>
                <span class="dashboard-list-meta">GIE ${escapeHtml(stage.gieId)} - ${escapeHtml(file?.displayName || stage.selectedModel || "current active model")}</span>
                <div class="dashboard-tags">
                  ${dashboardTag(stage.enabled ? "enabled" : "disabled", stage.enabled ? "success" : "warning")}
                  ${dashboardTag(`GIE ${stage.gieId}`)}
                  ${dashboardTag(stage.operateOnClassIds ? `classes ${stage.operateOnClassIds}` : "all classes")}
                </div>
              </article>
            `;
          }).join("") : '<div class="empty">Confirm a test flow to pin image and video test stages.</div>'}
        </div>
      </section>
    </div>
  `;
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

function renderAgentStatus(status = {}) {
  if (!els.agentStatus) return;
  const configured = Boolean(status.configured);
  const enabled = status.enabled !== false;
  els.agentStatus.innerHTML = `
    <article class="agent-status-card ${configured ? "success" : "warning"}">
      <span>LLM</span>
      <strong>${enabled ? escapeHtml(status.providerLabel || status.provider || "unknown") : "disabled"}</strong>
      <small>${configured ? escapeHtml(status.model || "") : "Set provider credentials in Agent Settings."}</small>
    </article>
    <article class="agent-status-card">
      <span>Memory</span>
      <strong>Persistent</strong>
      <small>${escapeHtml(status.memoryFile || "runtime/agent-memory.json")}</small>
    </article>
    <article class="agent-status-card">
      <span>Mode</span>
      <strong>Read only</strong>
      <small>${escapeHtml(`${status.mode || "Operator with tools"} - temp ${status.temperature ?? "-"}`)}</small>
    </article>
    <article class="agent-status-card">
      <span>Time core</span>
      <strong>${escapeHtml(status.timeZone || "Asia/Bangkok")}</strong>
      <small>${escapeHtml(status.now || "")}</small>
    </article>
  `;
}

function renderAgentSettings(settings = {}) {
  if (!els.agentSettingsForm) return;
  agentSettings = settings;
  const providers = settings.providers || {};
  const providerIds = Object.keys(providers);
  els.agentProvider.innerHTML = providerIds.map((id) => `
    <option value="${escapeHtml(id)}">${escapeHtml(providers[id].label || id)}</option>
  `).join("");
  els.agentProvider.value = settings.provider || "openai";
  renderAgentModelOptions();
  els.agentEnabled.checked = settings.enabled !== false;
  els.agentCustomModel.value = "";
  els.agentApiKey.value = "";
  els.agentBaseUrl.value = settings.baseUrl || "";
  if (els.agentTimeZone) els.agentTimeZone.value = settings.timeZone || "Asia/Bangkok";
  els.agentTemperature.value = settings.temperature ?? "";
  els.agentMaxTokens.value = settings.maxTokens ?? "";
  els.agentTopP.value = settings.topP ?? "";
  updateAgentParamVisibility();
  els.agentSettingsHint.textContent = settings.hasApiKey
    ? `API key set (${settings.apiKeySource || "settings"}). Leave blank to keep it.`
    : "No API key stored for this provider.";
}

function currentAgentModelSpec() {
  if (!agentSettings) return {};
  const provider = els.agentProvider.value || agentSettings.provider || "openai";
  const spec = agentSettings.providers?.[provider] || {};
  const selectedModel = els.agentModel.value;
  const modelId = selectedModel === "__custom__"
    ? (els.agentCustomModel.value.trim() || spec.defaultModel)
    : selectedModel;
  return (spec.models || []).find((model) => model.id === modelId)
    || { id: modelId, ...(spec.customModel || { family: "chat", params: [] }), custom: true };
}

function renderAgentModelOptions() {
  if (!agentSettings || !els.agentModel) return;
  const provider = els.agentProvider.value || agentSettings.provider || "openai";
  const spec = agentSettings.providers?.[provider] || {};
  const models = spec.models || [];
  const currentModel = agentSettings.provider === provider ? agentSettings.model : spec.defaultModel;
  const modelIds = models.map((model) => typeof model === "string" ? model : model.id);
  const hasCurrent = modelIds.includes(currentModel);
  els.agentModel.innerHTML = [
    ...models.map((model) => {
      const item = typeof model === "string" ? { id: model, label: model } : model;
      return `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label || item.id)}</option>`;
    }),
    `<option value="__custom__">Custom...</option>`
  ].join("");
  els.agentModel.value = hasCurrent ? currentModel : "__custom__";
  els.agentCustomModel.value = hasCurrent ? "" : (currentModel || "");
  els.agentBaseUrl.placeholder = spec.baseUrlPlaceholder || "Provider default";
  if (els.agentBaseUrl && spec.baseUrl && !els.agentBaseUrl.value && provider === "ollama") els.agentBaseUrl.value = spec.baseUrl;
  updateAgentParamVisibility();
}

function updateAgentParamVisibility() {
  if (!agentSettings) return;
  const model = currentAgentModelSpec();
  const params = new Set(model.params || []);
  document.querySelectorAll("[data-agent-param]").forEach((field) => {
    const param = field.dataset.agentParam;
    const visible = params.has(param);
    field.hidden = !visible;
    field.querySelectorAll("input, select").forEach((input) => {
      input.disabled = !visible;
    });
  });
  if (els.agentReasoningEffort) {
    const efforts = model.reasoningEfforts || ["low", "medium", "high"];
    els.agentReasoningEffort.innerHTML = [
      `<option value="">Provider default${model.defaultReasoningEffort ? ` (${escapeHtml(model.defaultReasoningEffort)})` : ""}</option>`,
      ...efforts.map((effort) => `<option value="${escapeHtml(effort)}">${escapeHtml(effort)}</option>`)
    ].join("");
    els.agentReasoningEffort.value = agentSettings.reasoningEffort || "";
  }
  const summary = model.family === "reasoning"
    ? "Reasoning model: sampling params hidden; use reasoning effort when needed."
    : "Chat model: sampling params are optional; blank means provider default.";
  if (els.agentSettingsHint && !agentSettings.hasApiKey) {
    els.agentSettingsHint.textContent = summary;
  }
}

function renderAgentMessages() {
  if (!els.agentMessages) return;
  if (!agentMessages.length) {
    els.agentMessages.innerHTML = `
      <div class="agent-empty">
        <strong>Agent san sang ho tro van hanh.</strong>
        <span>Thu hoi: "Camera nao dang mat FPS?", "Model nao da build?", "Tai sao deploy khong co result?"</span>
      </div>
    `;
    return;
  }
  els.agentMessages.innerHTML = agentMessages.map((message) => `
    <article class="agent-message ${message.role}">
      <span>${message.role === "assistant" ? "Agent" : "You"}</span>
      <div>${escapeHtml(message.content).replace(/\n/g, "<br />")}</div>
    </article>
  `).join("");
  els.agentMessages.scrollTop = els.agentMessages.scrollHeight;
}

function renderAgentMemory(memory = {}) {
  if (!els.agentMemoryList) return;
  const notes = memory.notes || [];
  const pending = memory.pendingMemories || [];
  const learned = memory.memories || [];
  const policy = memory.policy || {};
  const noteMarkup = notes.length ? notes.slice().reverse().map((item) => `
    <div class="agent-memory-note">
      <strong>${escapeHtml(item.source || "note")}</strong>
      <span>${escapeHtml(item.note || "")}</span>
      <small>${escapeHtml(item.createdAt || "")}</small>
      <button type="button" class="secondary" data-memory-action="delete-note" data-memory-id="${escapeHtml(item.id)}">Delete</button>
    </div>
  `).join("") : '<div class="empty">No manual notes yet.</div>';
  const pendingMarkup = pending.length ? pending.slice().reverse().map((item) => `
    <div class="agent-memory-note warning">
      <strong>pending - ${escapeHtml(item.category || "memory")}</strong>
      <span>${escapeHtml(item.text || "")}</span>
      ${item.reason ? `<small>${escapeHtml(item.reason)}</small>` : ""}
      <div class="actions inline-actions">
        <button type="button" class="secondary" data-memory-action="approve" data-memory-id="${escapeHtml(item.id)}">Approve</button>
        <button type="button" class="danger" data-memory-action="reject" data-memory-id="${escapeHtml(item.id)}">Reject</button>
      </div>
    </div>
  `).join("") : '<div class="empty">No pending memory suggestions.</div>';
  const learnedMarkup = learned.length ? learned.slice().reverse().map((item) => `
    <div class="agent-memory-note success">
      <strong>${escapeHtml(item.category || "memory")}</strong>
      <span>${escapeHtml(item.text || "")}</span>
      <small>${escapeHtml(item.approvedAt || item.createdAt || "")}</small>
      <button type="button" class="secondary" data-memory-action="delete-memory" data-memory-id="${escapeHtml(item.id)}">Delete</button>
    </div>
  `).join("") : '<div class="empty">No approved learned memories yet.</div>';
  els.agentMemoryList.innerHTML = `
    <div class="agent-memory-policy">
      <strong>${escapeHtml(policy.mode || "suggest-before-saving")}</strong>
      <span>${escapeHtml(policy.learnedMemories || "Agent suggestions require approval before use.")}</span>
    </div>
    <h4>Pending memories</h4>
    ${pendingMarkup}
    <h4>Approved memories</h4>
    ${learnedMarkup}
    <h4>Manual notes</h4>
    ${noteMarkup}
  `;
}

function renderAgentToolTrace(toolCalls = []) {
  if (!els.agentToolTrace) return;
  if (!toolCalls.length) {
    els.agentToolTrace.innerHTML = '<div class="empty">No tool call yet.</div>';
    return;
  }
  els.agentToolTrace.innerHTML = toolCalls.map((item) => `
    <div class="agent-tool-item">
      <strong>${escapeHtml(item.name || item.type || "tool")}</strong>
      ${(item.toolCalls || []).map((call) => `<span>${escapeHtml(call.name || call.type || "call")}</span>`).join("")}
      ${item.content ? `<pre>${escapeHtml(item.content)}</pre>` : ""}
    </div>
  `).join("");
}

async function refreshAgent() {
  const [status, memory, settings] = await Promise.all([
    api("/api/agent/status"),
    api(`/api/agent/memory?threadId=${encodeURIComponent(agentThreadId)}`),
    api("/api/agent/settings")
  ]);
  renderAgentStatus(status);
  renderAgentSettings(settings);
  agentMessages = memory.messages || [];
  renderAgentMessages();
  renderAgentMemory(memory);
  return { status, memory, settings };
}

async function sendAgentMessage(event) {
  event.preventDefault();
  const message = els.agentInput.value.trim();
  if (!message) return;
  const localUserMessage = { role: "user", content: message, createdAt: new Date().toISOString() };
  agentMessages.push(localUserMessage);
  els.agentInput.value = "";
  renderAgentMessages();
  const result = await withTask("agent", els.agentSendBtn, "Thinking...", async () => {
    return await api("/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({ threadId: agentThreadId, message })
    });
  });
  agentMessages = result.thread?.messages || [
    ...agentMessages,
    { role: "assistant", content: result.answer || "", createdAt: new Date().toISOString() }
  ];
  renderAgentStatus(result.status || {});
  renderAgentMessages();
  renderAgentMemory(result.thread || {});
  renderAgentToolTrace(result.toolCalls || []);
  print(result);
}

async function clearAgentMemory(scope = "messages") {
  const button = scope === "notes"
    ? els.clearAgentNotesBtn
    : (scope === "memories" ? els.clearAgentLearnedMemoryBtn : els.clearAgentMemoryBtn);
  const label = scope === "notes"
    ? "Clearing notes..."
    : (scope === "memories" ? "Clearing learned memories..." : "Clearing chat...");
  const result = await withTask("agent-memory", button, label, async () => {
    return await api(`/api/agent/memory?threadId=${encodeURIComponent(agentThreadId)}&scope=${encodeURIComponent(scope)}`, { method: "DELETE" });
  });
  agentMessages = result.messages || [];
  renderAgentMessages();
  renderAgentMemory(result);
  if (scope === "messages") renderAgentToolTrace([]);
  print(result);
}

async function decideAgentMemory(id, decision) {
  const result = await api("/api/agent/memory/decide", {
    method: "POST",
    body: JSON.stringify({ threadId: agentThreadId, id, decision })
  });
  renderAgentMemory(result);
  print(result);
}

async function deleteAgentMemoryItem(id, kind) {
  const result = await api(`/api/agent/memory/items/${encodeURIComponent(id)}?threadId=${encodeURIComponent(agentThreadId)}&kind=${encodeURIComponent(kind)}`, {
    method: "DELETE"
  });
  renderAgentMemory(result);
  print(result);
}

async function saveAgentNote() {
  const note = els.agentNoteInput.value.trim();
  if (!note) return;
  const result = await withTask("agent-memory", els.saveAgentNoteBtn, "Saving note...", async () => {
    return await api("/api/agent/memory/notes", {
      method: "POST",
      body: JSON.stringify({ threadId: agentThreadId, note })
    });
  });
  els.agentNoteInput.value = "";
  renderAgentMemory(result);
  print(result);
}

async function saveAgentSettings(event) {
  event.preventDefault();
  const payload = readAgentSettingsForm();
  const result = await withTask("agent-settings", els.saveAgentSettingsBtn, "Saving settings...", async () => {
    return await api("/api/agent/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  });
  renderAgentSettings(result);
  renderAgentStatus(await api("/api/agent/status"));
  print(result);
}

function readAgentSettingsForm() {
  const selectedModel = els.agentModel.value;
  const customModel = els.agentCustomModel.value.trim();
  const model = selectedModel === "__custom__" ? customModel : selectedModel;
  return {
    enabled: els.agentEnabled.checked,
    provider: els.agentProvider.value,
    model,
    apiKey: els.agentApiKey.value.trim(),
    clearApiKey: false,
    baseUrl: els.agentBaseUrl.value.trim(),
    timeZone: els.agentTimeZone?.value.trim() || "Asia/Bangkok",
    temperature: els.agentTemperature.value === "" ? "" : Number(els.agentTemperature.value),
    maxTokens: els.agentMaxTokens.value === "" ? "" : Number(els.agentMaxTokens.value),
    topP: els.agentTopP.value === "" ? "" : Number(els.agentTopP.value),
    reasoningEffort: els.agentReasoningEffort.value
  };
}

async function clearStoredAgentApiKey() {
  const payload = { ...readAgentSettingsForm(), apiKey: "", clearApiKey: true };
  const result = await withTask("agent-settings", els.agentClearApiKey, "Clearing key...", async () => {
    return await api("/api/agent/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  });
  renderAgentSettings(result);
  renderAgentStatus(await api("/api/agent/status"));
  print(result);
}

async function testAgentKey() {
  const payload = readAgentSettingsForm();
  const result = await withTask("agent-settings", els.testAgentKeyBtn, "Testing key...", async () => {
    return await api("/api/agent/settings/test", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  });
  els.agentSettingsHint.textContent = `${result.message} (${result.durationMs} ms)`;
  print(result);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formConfig() {
  const cameras = readCameraCards();
  const deployProfiles = readDeployApps(cameras);
  const activeDeployApp = deployProfiles.find((app) => app.active) || deployProfiles[0] || defaultDeployApp(0, cameras);
  const selectedCameraIds = new Set(activeDeployApp.cameraIds || []);
  return {
    streams: cameras.map((camera) => ({
      ...applyDeployCameraSettings(camera, activeDeployApp),
      enabled: camera.enabled !== false && selectedCameraIds.has(camera.id)
    })),
    streamWidth: Number(els.streamWidth.value),
    streamHeight: Number(els.streamHeight.value),
    deepstreamImage: els.deepstreamImage.value.trim(),
    processor: { type: normalizeProcessorType(activeDeployApp.processorType) },
    testProcessorType: normalizeProcessorType(els.testProcessorType?.value || confirmedTestProcessorType),
    pipelineStages: normalizePipelineStages(activeDeployApp.pipelineStages),
    selectedModels: selectedModelsFromStages(activeDeployApp.pipelineStages),
    deployApps: deployProfiles,
    activeDeployAppId: activeDeployApp.id,
    ocrPostprocess: readOcrPostprocess()
  };
}

function normalizeProcessorType(value = "") {
  return processorTypes.some((item) => item.value === value) ? value : "lpr";
}

function processorOptionMarkup(selected = "lpr") {
  const value = normalizeProcessorType(selected);
  return processorTypes.map((item) => `
    <option value="${escapeHtml(item.value)}" ${item.value === value ? "selected" : ""}>${escapeHtml(item.label)}</option>
  `).join("");
}

function processorLabel(value = "") {
  return processorTypes.find((item) => item.value === normalizeProcessorType(value))?.label || "LPR";
}

function readOcrPostprocess() {
  return {
    maxChars: Number(els.ocrMaxChars?.value || 12),
    minConfidence: Number(els.ocrMinConfidence?.value || 0.5),
    nmsIou: Number(els.ocrNmsIou?.value || 0.5),
    minWidthRatio: Number(els.ocrMinWidthRatio?.value || 0.01),
    maxWidthRatio: Number(els.ocrMaxWidthRatio?.value || 0.25),
    minHeightRatio: Number(els.ocrMinHeightRatio?.value || 0.18),
    maxHeightRatio: Number(els.ocrMaxHeightRatio?.value || 1.15)
  };
}

function selectedModels() {
  return selectedModelsFromStages(readTestPipelineStages());
}

function selectedModelsFromStages(stages = []) {
  return normalizePipelineStages(stages).reduce((acc, stage) => {
    if (stage.enabled && stage.modelGroup && stage.selectedModel) acc[stage.modelGroup] = stage.selectedModel;
    return acc;
  }, {});
}

function firstStageClassIds(stages = []) {
  const normalized = normalizePipelineStages(stages).filter((item) => item.enabled);
  const stage = normalized.find((item) => !item.operateOnGieId) || normalized[0];
  return stage?.operateOnClassIds || "";
}

function builderControl(group, key) {
  return document.querySelector(`[data-builder="${group}"][data-key="${key}"]`);
}

function modelGroupLabel(group) {
  return modelLibraryGroups.find((item) => item.group === group)?.displayName
    || group
    || "model";
}

function normalizeGieType(value = "", index = 0) {
  const requested = String(value || "").trim().toUpperCase();
  return gieStageTypes.find((item) => item.gieType === requested)?.gieType
    || gieStageTypes[Math.min(index, gieStageTypes.length - 1)]?.gieType
    || "GIE";
}

function stageTypeByName(value = "", index = 0) {
  const gieType = normalizeGieType(value, index);
  return gieStageTypes.find((item) => item.gieType === gieType) || gieStageTypes[0];
}

function modelGroupFromModelName(modelName = "") {
  const group = String(modelName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  if (!group) throw new Error("Nhap Model name truoc khi upload source model.");
  return group;
}

function factoryModelGroup() {
  const modelName = builderControl("factory", "modelName")?.value || "";
  return modelGroupFromModelName(modelName);
}

function allModelFiles({ built = false } = {}) {
  return [...modelFiles.values()]
    .flat()
    .filter((file) => !built || file.built);
}

function modelSelectionValue(group, sourceKey) {
  return group && sourceKey ? `${group}::${sourceKey}` : "";
}

function parseModelSelection(value = "", fallbackGroup = "") {
  const selection = String(value || "");
  if (selection.includes("::")) {
    const [group, ...sourceParts] = selection.split("::");
    return { group, sourceKey: sourceParts.join("::") };
  }
  return { group: fallbackGroup, sourceKey: selection };
}

function findModelFile(group, sourceKey) {
  return (modelFiles.get(group) || []).find((file) => file.sourceKey === sourceKey) || null;
}

function buildOptions(group, overrides = {}) {
  const controlGroup = builderControl(group, "imgsz") ? group : "factory";
  return {
    profile: builderControl(controlGroup, "profile")?.value || "yolo_detection",
    imgsz: Number(builderControl(controlGroup, "imgsz").value),
    opset: Number(builderControl(controlGroup, "opset").value),
    task: builderControl(controlGroup, "task").value,
    yoloVersion: builderControl(controlGroup, "yoloVersion").value,
    workspaceMb: Number(builderControl(controlGroup, "workspaceMb").value),
    batchSize: Number(builderControl(controlGroup, "batchSize")?.value || 1),
    fp16: builderControl(controlGroup, "fp16").checked,
    simplify: builderControl(controlGroup, "simplify").checked,
    dynamic: builderControl(controlGroup, "dynamic").checked,
    buildEngine: builderControl(controlGroup, "buildEngine").checked,
    engineBuildMethod: builderControl(controlGroup, "engineBuildMethod")?.value || "auto",
    buildParser: builderControl(controlGroup, "buildParser").checked,
    forceRebuild: builderControl(controlGroup, "forceRebuild").checked,
    sourcePath: "",
    modelName: builderControl(controlGroup, "modelName")?.value || "",
    description: builderControl(controlGroup, "description")?.value || "",
    ...overrides
  };
}

function defaultCamera(index = 0) {
  const defaultZone = defaultZoneConfig(0, {
    classIds: "0",
    cooldownSec: 30
  });
  return {
    id: `camera-${index + 1}`,
    name: `Camera ${index + 1}`,
    rtspUrl: "",
    enabled: true,
    roi: { polygon: [] },
    zones: [defaultZone],
    rules: [],
    frontVehicleClassIds: [0],
    captureCooldownSec: 30
  };
}

function defaultZoneConfig(index = 0, overrides = {}) {
  return {
    id: `zone-${index + 1}`,
    name: `Zone ${index + 1}`,
    enabled: true,
    mode: "capture_when_inside",
    polygon: [],
    classIds: "",
    cooldownSec: "",
    ...overrides
  };
}

function parseRoiValue(value) {
  try {
    const polygon = JSON.parse(value || "[]");
    return Array.isArray(polygon) ? polygon : [];
  } catch {
    return [];
  }
}

function parseZonesValue(value) {
  try {
    const zones = JSON.parse(value || "[]");
    return Array.isArray(zones) ? zones : [];
  } catch {
    return [];
  }
}

function parseRulesValue(value) {
  try {
    const rules = JSON.parse(value || "[]");
    return Array.isArray(rules) ? rules : [];
  } catch {
    return [];
  }
}

function cleanZonePolygon(polygon = []) {
  return Array.isArray(polygon)
    ? polygon
      .map((point) => Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : null)
      .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    : [];
}

function normalizeZone(zone = {}, index = 0, camera = {}) {
  const fallback = defaultZoneConfig(index);
  const id = String(zone.id || fallback.id).trim() || fallback.id;
  const mode = ["capture_when_inside", "alert_when_inside", "lpr_only_inside", "detect_only_inside", "ignore_inside"].includes(zone.mode)
    ? zone.mode
    : fallback.mode;
  return {
    ...fallback,
    ...zone,
    id,
    name: String(zone.name || fallback.name).trim() || fallback.name,
    enabled: zone.enabled !== false,
    mode,
    polygon: cleanZonePolygon(zone.polygon || zone.points || []),
    classIds: Array.isArray(zone.classIds) ? zone.classIds.join(",") : String(zone.classIds ?? ""),
    cooldownSec: zone.cooldownSec === "" || zone.cooldownSec === null || zone.cooldownSec === undefined
      ? ""
      : Math.max(1, Number(zone.cooldownSec || camera.captureCooldownSec || 30))
  };
}

function defaultRuleConfig(index = 0, overrides = {}) {
  return {
    id: `rule-${index + 1}`,
    name: `Rule ${index + 1}`,
    enabled: true,
    type: "sequence",
    firstZoneId: "",
    secondZoneId: "",
    action: "capture",
    reverseAction: "ignore",
    maxTimeSec: 5,
    classIds: "",
    cooldownSec: "",
    ...overrides
  };
}

function normalizeRule(rule = {}, index = 0, zones = []) {
  const fallback = defaultRuleConfig(index);
  const zoneIds = new Set(zones.map((zone) => zone.id));
  const firstZoneId = String(rule.firstZoneId || fallback.firstZoneId).trim();
  const secondZoneId = String(rule.secondZoneId || fallback.secondZoneId).trim();
  return {
    ...fallback,
    ...rule,
    id: String(rule.id || fallback.id).trim() || fallback.id,
    name: String(rule.name || fallback.name).trim() || fallback.name,
    enabled: rule.enabled !== false,
    type: "sequence",
    firstZoneId: zoneIds.has(firstZoneId) ? firstZoneId : firstZoneId,
    secondZoneId: zoneIds.has(secondZoneId) ? secondZoneId : secondZoneId,
    action: ["capture", "ignore"].includes(rule.action) ? rule.action : "capture",
    reverseAction: ["capture", "ignore"].includes(rule.reverseAction) ? rule.reverseAction : "ignore",
    maxTimeSec: Math.max(1, Number(rule.maxTimeSec || 5)),
    classIds: Array.isArray(rule.classIds) ? rule.classIds.join(",") : String(rule.classIds ?? ""),
    cooldownSec: rule.cooldownSec === "" || rule.cooldownSec === null || rule.cooldownSec === undefined
      ? ""
      : Math.max(1, Number(rule.cooldownSec || 30))
  };
}

function cameraRules(camera = {}, zones = cameraZones(camera)) {
  const rules = Array.isArray(camera.rules) ? camera.rules : [];
  return rules
    .map((rule, index) => normalizeRule(rule, index, zones))
    .filter((rule) => rule.firstZoneId && rule.secondZoneId && rule.firstZoneId !== rule.secondZoneId);
}

function cameraPolygon(camera, index = 0) {
  const polygon = camera?.roi?.polygon ?? defaultCamera(index).roi.polygon;
  return Array.isArray(polygon) ? polygon : [];
}

function cameraZones(camera, index = 0) {
  const zones = Array.isArray(camera?.zones) ? camera.zones : [];
  if (zones.length) {
    return zones.map((zone, zoneIndex) => normalizeZone(zone, zoneIndex, camera));
  }
  const polygon = cameraPolygon(camera, index);
  if (polygon.length) {
    return [normalizeZone({
      id: "zone-1",
      name: "Zone 1",
      polygon,
      classIds: Array.isArray(camera?.frontVehicleClassIds) ? camera.frontVehicleClassIds.join(",") : camera?.frontVehicleClassIds || "",
      cooldownSec: camera?.captureCooldownSec || ""
    }, 0, camera)];
  }
  return [];
}

function roiSummary(polygon = []) {
  return polygon.length >= 3 ? `${polygon.length} points saved` : "No polygon, full frame";
}

function zoneSummary(zones = []) {
  const active = zones.filter((zone) => zone.enabled !== false);
  if (!active.length) return "No zones, full frame";
  const withPolygon = active.filter((zone) => cleanZonePolygon(zone.polygon).length >= 3).length;
  return `${active.length} zone${active.length === 1 ? "" : "s"} - ${withPolygon} polygon${withPolygon === 1 ? "" : "s"}`;
}

function primaryZonePolygon(camera, index = 0) {
  const zone = cameraZones(camera, index).find((item) => cleanZonePolygon(item.polygon).length >= 3);
  return zone?.polygon || cameraPolygon(camera, index);
}

function frameSizeSummary(cameraId) {
  const capture = latestCaptureForCamera(cameraId);
  return capture?.width && capture?.height ? `${capture.width} x ${capture.height}` : "Unknown";
}

function defaultPipelineStages() {
  return gieStageTypes.map((item) => ({
    id: item.id,
    name: item.name,
    gieType: item.gieType,
    modelGroup: "",
    selectedModel: "",
    enabled: true,
    gieId: item.defaultGieId,
    networkType: item.defaultNetworkType,
    operateOnGieId: item.defaultOperateOnGieId,
    operateOnClassIds: item.defaultOperateOnClassIds,
    role: item.gieType.toLowerCase()
  }));
}

function normalizePipelineStages(stages = []) {
  const input = Array.isArray(stages) && stages.length ? stages : defaultPipelineStages();
  return input.map((stage, index) => {
    const stageType = stageTypeByName(stage.gieType || stage.name, index);
    return {
      id: String(stage.id || `gie-${index + 1}`).trim() || `gie-${index + 1}`,
      name: stageType.name,
      gieType: stageType.gieType,
      modelGroup: String(stage.modelGroup || "").trim(),
      selectedModel: String(stage.selectedModel || "").trim(),
      enabled: stage.enabled !== false,
      gieId: Math.max(1, Number(stage.gieId || stageType.defaultGieId || index + 1)),
      networkType: Number(stage.networkType ?? stageType.defaultNetworkType ?? 0),
      operateOnGieId: stage.operateOnGieId === "" || stage.operateOnGieId === null || stage.operateOnGieId === undefined
        ? ""
        : Number(stage.operateOnGieId),
      operateOnClassIds: String(stage.operateOnClassIds ?? stageType.defaultOperateOnClassIds ?? ""),
      role: String(stage.role || stageType.gieType.toLowerCase())
    };
  });
}

function defaultDeployApp(index = 0, cameras = []) {
  return {
    id: `deepstream-app-${index + 1}`,
    name: `DeepStream App ${index + 1}`,
    active: index === 0,
    cameraIds: cameras.filter((camera) => camera.enabled !== false).map((camera) => camera.id),
    cameraSettings: {},
    processorType: "lpr",
    pipelineStages: defaultPipelineStages(),
    selectedModels: {}
  };
}

function primaryStageForApp(app = {}) {
  const stages = normalizePipelineStages(app.pipelineStages || stagesFromSelectedModels(app.selectedModels)).filter((stage) => stage.enabled);
  return stages.find((stage) => !stage.operateOnGieId || Number(stage.gieId) === 1) || stages[0] || null;
}

function primaryStageModelFile(app = {}) {
  const stage = primaryStageForApp(app);
  return stage ? findModelFile(stage.modelGroup, stage.selectedModel) : null;
}

function deployCameraSettings(app = {}, camera = {}) {
  const saved = app.cameraSettings?.[camera.id] || {};
  const zones = cameraZones(camera).map((zone, index) => {
    const override = Array.isArray(saved.zones)
      ? saved.zones.find((item) => item.id === zone.id) || saved.zones[index] || {}
      : {};
    return normalizeZone({
      ...zone,
      ...override,
      id: zone.id,
      name: zone.name,
      polygon: zone.polygon
    }, index, camera);
  });
  const rules = cameraRules({ rules: saved.rules || camera.rules || [], zones }, zones);
  return { zones, rules };
}

function applyDeployCameraSettings(camera = {}, app = {}) {
  const settings = deployCameraSettings(app, camera);
  const zones = settings.zones.map((zone, index) => normalizeZone({
    ...zone,
    polygon: cameraZones(camera)[index]?.polygon || zone.polygon,
    name: cameraZones(camera)[index]?.name || zone.name
  }, index, camera));
  return {
    ...camera,
    zones,
    rules: settings.rules,
    roi: { polygon: primaryZonePolygon({ ...camera, zones }) }
  };
}

function readCameraCards() {
  return cameraDrafts.length ? cameraDrafts.map((camera, index) => {
    const zones = cameraZones(camera, index);
    const rules = cameraRules(camera, zones);
    const polygon = primaryZonePolygon({ ...camera, zones }, index);
    return {
      ...camera,
      zones,
      rules,
      roi: { polygon }
    };
  }) : [];
}

function readCameraSetting() {
  const editingIndex = els.cameraEditingIndex.value === "" ? "" : Number(els.cameraEditingIndex.value);
  const zones = parseZonesValue(els.cameraSettingZones.value).map((zone, index) => normalizeZone(zone, index));
  const rules = parseRulesValue(els.cameraSettingRules?.value).map((rule, index) => normalizeRule(rule, index, zones));
  const polygon = primaryZonePolygon({ zones, roi: { polygon: parseRoiValue(els.cameraSettingRoi.value) } });
  return {
    id: els.cameraSettingId.value.trim() || `camera-${cameraDrafts.length + 1}`,
    name: els.cameraSettingName.value.trim() || `Camera ${cameraDrafts.length + 1}`,
    rtspUrl: els.cameraSettingRtsp.value.trim(),
    enabled: els.cameraSettingEnabled.checked,
    roi: { polygon },
    zones,
    rules,
    frontVehicleClassIds: els.cameraSettingClassIds.value,
    captureCooldownSec: Number(els.cameraSettingCooldown.value || 30),
    editingIndex
  };
}

function fillCameraSetting(camera = defaultCamera(cameraDrafts.length), index = "") {
  const zones = cameraZones(camera, Number(index) || 0);
  const rules = cameraRules(camera, zones);
  const polygon = primaryZonePolygon({ ...camera, zones }, Number(index) || 0);
  els.cameraEditingIndex.value = index === "" ? "" : String(index);
  els.cameraSettingsTitle.textContent = index === "" ? "Add camera" : `Change setting - ${camera.name || camera.id}`;
  els.addCameraBtn.textContent = index === "" ? "Add camera" : "Update camera";
  els.cameraSettingId.value = camera.id || `camera-${cameraDrafts.length + 1}`;
  els.cameraSettingName.value = camera.name || `Camera ${cameraDrafts.length + 1}`;
  els.cameraSettingRtsp.value = camera.rtspUrl || "";
  els.cameraSettingEnabled.checked = camera.enabled !== false;
  els.cameraSettingCooldown.value = camera.captureCooldownSec || 30;
  els.cameraSettingClassIds.value = Array.isArray(camera.frontVehicleClassIds)
    ? camera.frontVehicleClassIds.join(",")
    : camera.frontVehicleClassIds || "0";
  els.cameraSettingRoi.value = JSON.stringify(polygon);
  els.cameraSettingZones.value = JSON.stringify(zones);
  if (els.cameraSettingRules) els.cameraSettingRules.value = JSON.stringify(rules);
  roiTool.zoneIndex = 0;
  updateCameraSettingStatus();
  renderZoneControls();
  renderRuleControls();
}

function resetCameraSetting() {
  fillCameraSetting(defaultCamera(cameraDrafts.length), "");
  setCameraSettingConnection("idle", "Not checked");
  closeRoiTool();
}

function updateCameraSettingStatus() {
  const camera = readCameraSetting();
  els.cameraSettingRoiSummary.innerHTML = `<b>ROI setting</b> ${escapeHtml(zoneSummary(camera.zones))}`;
  els.cameraSettingFrameSize.innerHTML = `<b>Frame size</b> ${escapeHtml(frameSizeSummary(camera.id))}`;
}

function setCameraSettingConnection(state, message) {
  els.cameraSettingConnection.className = `camera-status ${state || ""}`.trim();
  els.cameraSettingConnection.innerHTML = `<b>Check connection</b> ${escapeHtml(message)}`;
}

function syncEditedCameraDraft() {
  const camera = readCameraSetting();
  const index = camera.editingIndex;
  delete camera.editingIndex;
  camera.roi = { polygon: primaryZonePolygon(camera) };
  if (index !== "" && cameraDrafts[index]) cameraDrafts[index] = camera;
  return camera;
}

function renderCameras(streams = []) {
  if (els.roiToolHome && els.roiToolPanel && els.roiToolPanel.parentElement !== els.roiToolHome) {
    els.roiToolHome.appendChild(els.roiToolPanel);
    els.roiToolPanel.classList.add("hidden");
  }
  cameraDrafts = streams.length ? streams : [];
  if (els.cameraEditingIndex.value === "" && cameraDrafts.length && !els.cameraSettingRtsp.value) {
    fillCameraSetting(defaultCamera(cameraDrafts.length), "");
  }
  els.cameraList.innerHTML = cameraDrafts.map((camera, index) => `
    <article class="camera-card camera-list-card" data-camera-card data-camera-index="${index}">
      <div class="model-file-row camera-list-row">
        <div>
          <strong>${escapeHtml(camera.name || `Camera ${index + 1}`)}</strong>
          <span>${escapeHtml(camera.id || `camera-${index + 1}`)} - ${escapeHtml(camera.rtspUrl || "No RTSP URL")}</span>
          <small>
            <b class="${camera.enabled !== false ? "built" : "not-built"}">${camera.enabled !== false ? "enabled" : "disabled"}</b>
            <b>${escapeHtml(camera.captureCooldownSec || 30)}s cooldown</b>
          </small>
        </div>
        <div class="model-file-actions">
          <button type="button" data-check-camera="${index}">Check connection</button>
          <button type="button" class="model-use-button" data-edit-camera="${index}">Change setting</button>
          <button type="button" data-remove-camera="${index}">Remove</button>
        </div>
      </div>
      <div class="camera-meta">
        <span class="camera-status" data-camera-status="${escapeHtml(camera.id || `camera-${index + 1}`)}"><b>Check connection</b> Not checked</span>
        <span class="roi-state" data-roi-summary="${escapeHtml(camera.id || `camera-${index + 1}`)}"><b>ROI setting</b> ${escapeHtml(zoneSummary(cameraZones(camera, index)))}</span>
        <span class="frame-size-state" data-frame-size="${escapeHtml(camera.id || `camera-${index + 1}`)}"><b>Frame size</b> ${escapeHtml(frameSizeSummary(camera.id || `camera-${index + 1}`))}</span>
      </div>
    </article>
  `).join("");
  document.querySelectorAll("[data-edit-camera]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.editCamera);
      fillCameraSetting(cameraDrafts[index], index);
      document.querySelector("#cameraSettingsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.querySelectorAll("[data-check-camera]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.checkCamera);
      checkSavedCameraConnection(index, button).catch((error) => print(error.message));
    });
  });
  document.querySelectorAll("[data-remove-camera]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeCamera);
      const current = readCameraCards();
      current.splice(index, 1);
      const editingIndex = els.cameraEditingIndex.value === "" ? "" : Number(els.cameraEditingIndex.value);
      renderCameras(current);
      renderDeployApps(readDeployApps(current), current);
      if (editingIndex === index) resetCameraSetting();
      else if (editingIndex !== "" && editingIndex > index) els.cameraEditingIndex.value = String(editingIndex - 1);
      persistConfigAfterCameraChange("Camera removed and saved.", button).catch((error) => print(error.message));
    });
  });
  syncRoiCameraSelect();
  renderMainDashboard();
}

function addCamera() {
  const current = readCameraCards();
  const camera = readCameraSetting();
  const index = camera.editingIndex;
  delete camera.editingIndex;
  if (index === "") current.push(camera);
  else current[index] = camera;
  renderCameras(current);
  resetCameraSetting();
  renderDeployApps(deployApps, current);
}

async function persistConfigAfterCameraChange(message, button = null) {
  const result = await withTask("config", button, "Saving...", async () => {
    return await api("/api/config", { method: "PUT", body: JSON.stringify(formConfig()) });
  });
  setTaskStatus("config", "success", message);
  print({ message, streams: result.streams || [] });
  return result;
}

function readDeployApps(cameras = readCameraCards()) {
  const cameraIds = new Set(cameras.map((camera) => camera.id));
  const cards = [...document.querySelectorAll("[data-deploy-app-card]")];
  if (!cards.length) return [defaultDeployApp(0, cameras)];
  let apps = cards.map((card, index) => {
    const id = card.dataset.deployAppId || `deepstream-app-${index + 1}`;
    const cameraSelections = [...card.querySelectorAll("[data-deploy-camera]:checked")]
      .map((input) => input.value)
      .filter((cameraId) => cameraIds.has(cameraId));
    const pipelineStages = readPipelineStages(card.querySelector("[data-deploy-stage-list]"));
    const previousSettings = deployApps.find((app) => app.id === id)?.cameraSettings || {};
    return {
      id,
      name: card.querySelector("[data-deploy-field='name']").value.trim() || `DeepStream App ${index + 1}`,
      active: card.querySelector("[data-deploy-active]")?.checked || false,
      cameraIds: cameraSelections,
      cameraSettings: { ...previousSettings, ...readDeployCameraSettings(card, cameras) },
      processorType: normalizeProcessorType(card.querySelector("[data-deploy-field='processorType']")?.value),
      pipelineStages,
      selectedModels: selectedModelsFromStages(pipelineStages)
    };
  });
  if (!apps.some((app) => app.active)) apps[0].active = true;
  apps = apps.map((app, index) => ({ ...app, active: index === apps.findIndex((item) => item.active) }));
  return apps;
}

function readDeployCameraSettings(card, cameras = readCameraCards()) {
  const settings = {};
  card.querySelectorAll("[data-deploy-preview-camera]").forEach((preview) => {
    const cameraId = preview.dataset.deployPreviewCamera;
    const camera = cameras.find((item) => item.id === cameraId);
    if (!camera) return;
    const zoneRows = [...preview.querySelectorAll("[data-deploy-zone-row]")];
    const zones = zoneRows.map((row, index) => {
      const field = (key) => row.querySelector(`[data-deploy-zone-field="${key}"]`);
      const base = cameraZones(camera)[index] || {};
      return normalizeZone({
        id: field("id")?.value || base.id || `zone-${index + 1}`,
        name: base.name || `Zone ${index + 1}`,
        polygon: base.polygon || [],
        enabled: field("enabled")?.checked !== false,
        mode: field("mode")?.value || base.mode,
        classIds: field("classIdsText")?.value || field("classIds")?.value || "",
        cooldownSec: field("cooldownSec")?.value || ""
      }, index, camera);
    });
    const rules = parseRulesValue(preview.querySelector("[data-deploy-camera-rules]")?.value).map((rule, index) => normalizeRule(rule, index, zones));
    settings[cameraId] = { zones, rules };
  });
  return settings;
}

function renderDeployApps(apps = [], cameras = readCameraCards()) {
  if (!els.deployAppList) return;
  const normalizedCameras = cameras;
  const existing = apps.length ? apps : deployApps;
  deployApps = (existing.length ? existing : [defaultDeployApp(0, normalizedCameras)]).map((app, index) => ({
    ...defaultDeployApp(index, normalizedCameras),
    ...app,
    active: app.active || (!existing.some((item) => item.active) && index === 0),
    cameraIds: Array.isArray(app.cameraIds) && app.cameraIds.length ? app.cameraIds : defaultDeployApp(index, normalizedCameras).cameraIds,
    cameraSettings: app.cameraSettings || {},
    pipelineStages: normalizePipelineStages(app.pipelineStages || stagesFromSelectedModels(app.selectedModels)),
    selectedModels: selectedModelsFromStages(app.pipelineStages || stagesFromSelectedModels(app.selectedModels))
  }));
  if (!deployApps.some((app) => app.active)) deployApps[0].active = true;
  const activeIndex = deployApps.findIndex((app) => app.active);
  deployApps = deployApps.map((app, index) => ({ ...app, active: index === activeIndex }));

  els.deployAppList.innerHTML = deployApps.map((app, index) => renderDeployAppCard(app, index, normalizedCameras)).join("");
  hydrateStageControls(els.deployAppList);
  updateModelSelects();
  attachDeployAppHandlers();
  attachDeployPreviewImageHandlers();
  bindStageActions(els.deployAppList, () => renderDeployApps(readDeployApps(), readCameraCards()));
  renderMainDashboard();
}

function renderDeployAppCard(app, index, cameras) {
  const selectedCameraIds = new Set(app.cameraIds || []);
  const selectedCameras = cameras.filter((camera) => selectedCameraIds.has(camera.id));
  return `
    <article class="deploy-app-card" data-deploy-app-card data-deploy-app-id="${escapeHtml(app.id)}">
      <div class="deploy-app-head">
        <label class="inline-check">
          <input data-deploy-active type="radio" name="activeDeployApp" ${app.active ? "checked" : ""} />
          Active
        </label>
        <label>App name <input data-deploy-field="name" value="${escapeHtml(app.name || `DeepStream App ${index + 1}`)}" /></label>
        <label>
          Processor
          <select data-deploy-field="processorType">
            ${processorOptionMarkup(app.processorType)}
          </select>
        </label>
        <div class="actions inline-actions">
          <button type="button" data-remove-deploy-app="${index}" ${deployApps.length <= 1 ? "disabled" : ""}>Remove app</button>
        </div>
      </div>
      <div class="stage-section-head">
        <strong>Inference stages</strong>
        <button type="button" class="secondary" data-add-deploy-stage="${index}">Add stage</button>
      </div>
      <div class="pipeline-stage-list" data-deploy-stage-list data-deploy-stage-owner="${index}">
        ${stageRowsMarkup(app.pipelineStages)}
      </div>
      <div class="deploy-camera-picker">
        ${cameras.map((camera) => `
          <label class="inline-check deploy-camera-option">
            <input data-deploy-camera type="checkbox" value="${escapeHtml(camera.id)}" ${selectedCameraIds.has(camera.id) ? "checked" : ""} />
            ${escapeHtml(camera.name || camera.id)}
          </label>
        `).join("")}
      </div>
      <div class="deploy-preview-grid">
        ${selectedCameras.length ? selectedCameras.map((camera) => renderDeployCameraPreview(camera, app, index)).join("") : '<div class="empty">Chon it nhat mot camera cho app nay.</div>'}
      </div>
    </article>
  `;
}

function latestCaptureForCamera(cameraId) {
  return deployCaptures.find((capture) => capture.cameraId === cameraId);
}

function renderDeployCameraPreview(camera, app = {}, appIndex = 0) {
  const settings = deployCameraSettings(app, camera);
  const zones = settings.zones;
  const capture = latestCaptureForCamera(camera.id);
  const modelFile = primaryStageModelFile(app);
  const labels = modelFile?.labels || [];
  return `
    <article class="deploy-camera-preview" data-deploy-preview-camera="${escapeHtml(camera.id)}">
      <div class="deploy-preview-head">
        <strong>${escapeHtml(camera.name || camera.id)}</strong>
        <button type="button" data-capture-deploy-sample="${escapeHtml(camera.id)}">Capture sample</button>
      </div>
      ${capture ? `
        <div class="deploy-preview-image">
          <img src="${escapeHtml(capture.url)}" alt="${escapeHtml(camera.name || camera.id)} sample" data-preview-image />
          <svg data-preview-svg preserveAspectRatio="none">
            ${zones.map((zone, index) => {
              const polygon = cleanZonePolygon(zone.polygon);
              const points = polygon.map((point) => point.join(",")).join(" ");
              return polygon.length >= 3
                ? `<polygon class="zone-${index % 6}" points="${escapeHtml(points)}"><title>${escapeHtml(zone.name || zone.id)}</title></polygon>`
                : "";
            }).join("")}
          </svg>
        </div>
        <small>${escapeHtml(new Date(capture.updatedAt || capture.createdAt).toLocaleString())} - ${escapeHtml(zoneSummary(zones))}</small>
      ` : `<div class="empty">Chua co frame mau. Bam Capture sample de lay anh tu camera.</div>`}
      <div class="deploy-zone-config">
        <div class="stage-section-head">
          <strong>Zone deploy logic</strong>
          <small>${labels.length ? `${escapeHtml(modelFile.displayName || modelFile.name)} labels` : "No primary-stage labels loaded"}</small>
        </div>
        ${zones.map((zone, zoneIndex) => renderDeployZoneRow(zone, zoneIndex, labels)).join("")}
      </div>
      <input data-deploy-camera-rules type="hidden" value="${escapeHtml(JSON.stringify(settings.rules))}" />
      ${renderDeployRuleEditor(camera, settings, appIndex)}
    </article>
  `;
}

function renderDeployZoneRow(zone, zoneIndex, labels = []) {
  const selected = new Set(String(zone.classIds || "").split(/[;,]/).map((item) => item.trim()).filter(Boolean));
  return `
    <div class="deploy-zone-row" data-deploy-zone-row>
      <input data-deploy-zone-field="id" type="hidden" value="${escapeHtml(zone.id)}" />
      <div class="deploy-zone-row-head">
        <strong>${escapeHtml(zone.name || zone.id)}</strong>
        <label class="inline-check"><input data-deploy-zone-field="enabled" type="checkbox" ${zone.enabled !== false ? "checked" : ""} /> enabled</label>
      </div>
      <div class="grid">
        <label>Logic mode
          <select data-deploy-zone-field="mode">
            ${["capture_when_inside", "alert_when_inside", "lpr_only_inside", "detect_only_inside", "ignore_inside"].map((mode) => `
              <option value="${mode}" ${zone.mode === mode ? "selected" : ""}>${escapeHtml(zoneModeLabel(mode))}</option>
            `).join("")}
          </select>
        </label>
        <label>Cooldown seconds <input data-deploy-zone-field="cooldownSec" type="number" min="1" value="${escapeHtml(zone.cooldownSec || "")}" placeholder="camera default" /></label>
      </div>
      <input data-deploy-zone-field="classIds" type="hidden" value="${escapeHtml(zone.classIds || "")}" />
      <label>Desired class IDs <input data-deploy-zone-field="classIdsText" value="${escapeHtml(zone.classIds || "")}" placeholder="blank = all selected primary labels" /></label>
      ${labels.length ? `
        <div class="stage-label-tools deploy-label-tools">
          <small>${labels.length} labels</small>
          <button type="button" class="secondary small-button" data-select-all-zone-labels>Select all</button>
        </div>
        <div class="stage-label-options compact-label-options">
          ${labels.map((label, index) => `
            <label class="class-chip">
              <input data-zone-class-option type="checkbox" value="${index}" ${selected.has(String(index)) ? "checked" : ""} />
              <span>${index}: ${escapeHtml(label)}</span>
            </label>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderDeployRuleEditor(camera, settings, appIndex = 0) {
  const zones = settings.zones || [];
  const zoneOptions = (selectedId = "") => zones.length
    ? zones.map((zone) => `<option value="${escapeHtml(zone.id)}" ${zone.id === selectedId ? "selected" : ""}>${escapeHtml(zone.name || zone.id)}</option>`).join("")
    : '<option value="">No zone</option>';
  return `
    <div class="deploy-rule-config">
      <div class="stage-section-head">
        <strong>Sequence rules</strong>
        <small>Default neu khong co rule: capture theo zone logic.</small>
      </div>
      <div class="grid">
        <label>Rule name <input data-rule-draft="name" placeholder="Zone 1 to Zone 2" /></label>
        <label>First zone <select data-rule-draft="firstZoneId">${zoneOptions(zones[0]?.id || "")}</select></label>
        <label>Then zone <select data-rule-draft="secondZoneId">${zoneOptions(zones[1]?.id || zones[0]?.id || "")}</select></label>
        <label>Max seconds <input data-rule-draft="maxTimeSec" type="number" min="1" value="5" /></label>
        <label>Reverse direction
          <select data-rule-draft="reverseAction">
            <option value="ignore">Ignore</option>
            <option value="capture">Capture</option>
          </select>
        </label>
        <label>Rule class IDs <input data-rule-draft="classIds" placeholder="blank = all desired zone labels" /></label>
        <label>Cooldown seconds <input data-rule-draft="cooldownSec" type="number" min="1" placeholder="zone/camera default" /></label>
        <label class="inline-check"><input data-rule-draft="enabled" type="checkbox" checked /> enabled</label>
      </div>
      <div class="actions inline-actions">
        <button type="button" data-add-deploy-rule="${escapeHtml(camera.id)}" data-app-index="${appIndex}">Add sequence rule</button>
      </div>
      <div class="zone-list">
        ${settings.rules?.length ? settings.rules.map((rule, index) => `
          <div class="rule-chip">
            <div>
              <strong>${escapeHtml(rule.name || rule.id)}</strong>
              <span>${escapeHtml(rule.firstZoneId)} -> ${escapeHtml(rule.secondZoneId)} - reverse ${escapeHtml(rule.reverseAction)} - ${escapeHtml(rule.maxTimeSec)}s</span>
              <em>${rule.enabled === false ? "disabled" : "enabled"}</em>
            </div>
            <button type="button" class="danger small-button" data-delete-deploy-rule="${index}" data-camera-id="${escapeHtml(camera.id)}">Delete</button>
          </div>
        `).join("") : '<div class="empty">No custom rules for this camera.</div>'}
      </div>
    </div>
  `;
}

function stagesFromSelectedModels(selectedModels = {}) {
  const entries = Object.entries(selectedModels || {}).filter(([_group, sourceKey]) => sourceKey);
  if (!entries.length) return defaultPipelineStages();
  return entries.map(([group, sourceKey], index) => {
    const stageType = gieStageTypes[Math.min(index, gieStageTypes.length - 1)] || gieStageTypes[0];
    return {
      id: stageType.id || `gie-${index + 1}`,
      name: stageType.name,
      gieType: stageType.gieType,
      modelGroup: group,
      selectedModel: sourceKey,
      enabled: true,
      gieId: index + 1,
      networkType: stageType.defaultNetworkType,
      operateOnGieId: stageType.defaultOperateOnGieId,
      operateOnClassIds: stageType.defaultOperateOnClassIds,
      role: stageType.gieType.toLowerCase()
    };
  });
}

function stageRowsMarkup(stages = []) {
  return normalizePipelineStages(stages).map((stage, index) => `
    <article class="pipeline-stage-row" data-stage-row>
      <div class="grid stage-config-grid">
        <label>
          GIE type
          <select data-stage-field="gieType" data-selected-value="${escapeHtml(stage.gieType)}">
            ${gieStageTypes.map((item) => `<option value="${escapeHtml(item.gieType)}">${escapeHtml(item.gieType)}</option>`).join("")}
          </select>
        </label>
        <label>
          Source model
          <select data-stage-field="selectedModel" data-selected-value="${escapeHtml(modelSelectionValue(stage.modelGroup, stage.selectedModel))}"></select>
        </label>
      </div>
      <div class="grid">
        <label>GIE ID <input data-stage-field="gieId" type="number" value="${escapeHtml(stage.gieId)}" /></label>
        <label>Operate on GIE ID <input data-stage-field="operateOnGieId" value="${escapeHtml(stage.operateOnGieId)}" placeholder="blank for PGIE" /></label>
        <label>Stage class IDs (global) <input data-stage-field="operateOnClassIdsText" value="${escapeHtml(stage.operateOnClassIds)}" placeholder="blank = all labels from this stage" /></label>
      </div>
      <input data-stage-field="operateOnClassIds" type="hidden" value="${escapeHtml(stage.operateOnClassIds)}" />
      <div class="stage-label-picker" data-stage-label-picker>
        <small>Select a source model to load labels.</small>
      </div>
      <div class="model-file-actions stage-actions">
        <label class="inline-check"><input data-stage-field="enabled" type="checkbox" ${stage.enabled ? "checked" : ""} /> Enabled</label>
        <input data-stage-field="modelGroup" type="hidden" value="${escapeHtml(stage.modelGroup)}" />
        <input data-stage-field="id" type="hidden" value="${escapeHtml(stage.id)}" />
        <input data-stage-field="role" type="hidden" value="${escapeHtml(stage.role)}" />
        <input data-stage-field="networkType" type="hidden" value="${escapeHtml(stage.networkType)}" />
        <button type="button" data-remove-stage="${index}">Remove stage</button>
      </div>
    </article>
  `).join("");
}

function hydrateStageControls(root = document) {
  root.querySelectorAll("[data-stage-field='gieType']").forEach((select, index) => {
    const selected = select.dataset.selectedValue || select.value;
    select.value = normalizeGieType(selected, index);
  });
  root.querySelectorAll("[data-stage-field='selectedModel']").forEach((select) => {
    const row = select.closest("[data-stage-row]");
    const group = row?.querySelector("[data-stage-field='modelGroup']")?.value || "";
    const current = select.dataset.selectedValue || select.value || "";
    const parsed = parseModelSelection(current, group);
    const currentValue = modelSelectionValue(parsed.group, parsed.sourceKey);
    const files = allModelFiles({ built: true });
    const hasCurrent = files.some((file) => modelSelectionValue(file.group, file.sourceKey) === currentValue);
    select.innerHTML = [
      '<option value="">Select built model...</option>',
      currentValue && !hasCurrent ? `<option value="${escapeHtml(currentValue)}">${escapeHtml(parsed.sourceKey)} - loading model...</option>` : "",
      ...files.map((file) => `<option value="${escapeHtml(modelSelectionValue(file.group, file.sourceKey))}">${escapeHtml(file.displayName || file.name)} - ${escapeHtml(file.group)} - ${escapeHtml(file.profile || file.task || "detect")}</option>`)
    ].join("");
    if (currentValue) select.value = currentValue;
    select.dataset.selectedValue = currentValue || select.value || "";
  });
  hydrateStageLabelPickers(root);
}

function selectedStageModelFile(row) {
  const group = row?.querySelector("[data-stage-field='modelGroup']")?.value || "";
  const select = row?.querySelector("[data-stage-field='selectedModel']");
  const parsed = parseModelSelection(select?.value || select?.dataset.selectedValue || "", group);
  return findModelFile(parsed.group, parsed.sourceKey);
}

function stageRowsIn(root = document) {
  const rows = [...root.querySelectorAll("[data-stage-row]")];
  if (root.matches?.("[data-stage-row]")) rows.unshift(root);
  return rows;
}

function hydrateStageLabelPickers(root = document) {
  stageRowsIn(root).forEach((row) => {
    const picker = row.querySelector("[data-stage-label-picker]");
    const hidden = row.querySelector("[data-stage-field='operateOnClassIds']");
    const textInput = row.querySelector("[data-stage-field='operateOnClassIdsText']");
    if (!picker || !hidden || !textInput) return;
    const selected = new Set(String(hidden.value || textInput.value || "").split(/[;,]/).map((item) => item.trim()).filter(Boolean));
    const file = selectedStageModelFile(row);
    const labels = file?.labels || [];
    if (!labels.length) {
      const select = row.querySelector("[data-stage-field='selectedModel']");
      const sourceKey = select?.value || select?.dataset.selectedValue || "";
      picker.innerHTML = sourceKey
        ? '<small>Labels are still loading or missing for this model. Use the class ID input above if needed.</small>'
        : '<small>Select a source model to load labels.</small>';
      hidden.value = textInput.value;
      return;
    }
    picker.innerHTML = `
      <div class="stage-label-head">
        <strong>Global stage labels</strong>
        <div class="stage-label-tools">
          <small>${escapeHtml(file.displayName || file.name)} - ${labels.length} labels</small>
          <button type="button" class="secondary" data-select-all-stage-labels>Select all</button>
        </div>
      </div>
      <div class="stage-label-options">
        ${labels.map((label, index) => `
          <label class="class-chip">
            <input data-stage-class-option type="checkbox" value="${index}" ${selected.has(String(index)) ? "checked" : ""} />
            <span>${index}: ${escapeHtml(label)}</span>
          </label>
        `).join("")}
      </div>
    `;
    picker.querySelectorAll("[data-stage-class-option]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const values = [...picker.querySelectorAll("[data-stage-class-option]:checked")].map((item) => item.value);
        hidden.value = values.join(";");
        textInput.value = hidden.value;
      });
    });
    picker.querySelector("[data-select-all-stage-labels]")?.addEventListener("click", () => {
      picker.querySelectorAll("[data-stage-class-option]").forEach((checkbox) => {
        checkbox.checked = true;
      });
      const values = labels.map((_label, index) => String(index));
      hidden.value = values.join(";");
      textInput.value = hidden.value;
    });
  });
}

function readPipelineStages(container) {
  syncStageClassInputs(container);
  if (!container) return defaultPipelineStages();
  const rows = [...container.querySelectorAll("[data-stage-row]")];
  if (!rows.length) return defaultPipelineStages();
  return normalizePipelineStages(rows.map((row, index) => {
    const field = (key) => row.querySelector(`[data-stage-field="${key}"]`);
    const selected = parseModelSelection(field("selectedModel")?.value || "", field("modelGroup")?.value || "");
    const stageType = stageTypeByName(field("gieType")?.value, index);
    const group = selected.group || field("modelGroup")?.value || "";
    return {
      id: field("id")?.value || `${group}-${index + 1}`,
      name: stageType.name,
      gieType: stageType.gieType,
      modelGroup: group,
      selectedModel: selected.sourceKey || "",
      enabled: field("enabled")?.checked !== false,
      gieId: field("gieId")?.value || index + 1,
      networkType: field("networkType")?.value || stageType.defaultNetworkType || 0,
      operateOnGieId: field("operateOnGieId")?.value || "",
      operateOnClassIds: field("operateOnClassIds")?.value || "",
      role: field("role")?.value || stageType.gieType.toLowerCase()
    };
  }));
}

function syncStageClassInputs(root = document) {
  stageRowsIn(root).forEach((row) => {
    const hidden = row.querySelector("[data-stage-field='operateOnClassIds']");
    const textInput = row.querySelector("[data-stage-field='operateOnClassIdsText']");
    if (!hidden || !textInput) return;
    const checked = [...row.querySelectorAll("[data-stage-class-option]:checked")].map((item) => item.value);
    if (checked.length) {
      hidden.value = checked.join(";");
      textInput.value = hidden.value;
    } else if (textInput.value !== hidden.value) {
      hidden.value = textInput.value;
    }
  });
}

function addStageRow(list) {
  if (!list) return;
  const stages = readPipelineStages(list);
  const nextIndex = stages.length;
  stages.push({
    ...defaultPipelineStages()[Math.min(nextIndex, defaultPipelineStages().length - 1)],
    id: `gie-${nextIndex + 1}`,
    name: `GIE`,
    gieId: nextIndex + 1,
    selectedModel: ""
  });
  list.innerHTML = stageRowsMarkup(stages);
  hydrateStageControls(list);
}

function renderTestPipelineStages(stages = defaultPipelineStages()) {
  if (!els.testPipelineStages) return;
  els.testPipelineStages.innerHTML = stageRowsMarkup(stages);
  hydrateStageControls(els.testPipelineStages);
  bindStageActions(els.testPipelineStages);
}

function readTestPipelineStages() {
  return readPipelineStages(els.testPipelineStages);
}

function confirmTestFlow() {
  confirmedTestPipelineStages = readTestPipelineStages();
  confirmedTestProcessorType = normalizeProcessorType(els.testProcessorType?.value || confirmedTestProcessorType);
  renderConfirmedTestFlow();
  setTaskStatus("test-flow", "success", `${processorLabel(confirmedTestProcessorType)} test flow confirmed.`);
}

function confirmedOrCurrentTestStages() {
  if (!confirmedTestPipelineStages.length) confirmTestFlow();
  return confirmedTestPipelineStages;
}

function renderConfirmedTestFlow() {
  if (!els.testFlowSummary) return;
  if (!confirmedTestPipelineStages.length) {
    els.testFlowSummary.innerHTML = '<div class="empty">No confirmed test flow yet.</div>';
    renderMainDashboard();
    return;
  }
  els.testFlowSummary.innerHTML = `
    <div class="confirmed-flow-head">
      <strong>Confirmed ${escapeHtml(processorLabel(confirmedTestProcessorType))} flow</strong>
      <small>Image test va video test se dung flow nay.</small>
    </div>
    <div class="confirmed-flow-list">
      ${confirmedTestPipelineStages.map((stage, index) => {
        const file = findModelFile(stage.modelGroup, stage.selectedModel);
        return `
          <div class="confirmed-flow-step">
            <b>${index + 1}. ${escapeHtml(stage.gieType || "GIE")}</b>
            <span>GIE ${escapeHtml(stage.gieId)} / ${escapeHtml(file?.displayName || stage.selectedModel || "current active model")}</span>
            <small>Operate on GIE: ${escapeHtml(stage.operateOnGieId || "none")} - Classes: ${escapeHtml(stage.operateOnClassIds || "all")}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
  renderMainDashboard();
}

function bindStageActions(root = document, onChange = null) {
  root.querySelectorAll("[data-stage-field='gieType']").forEach((select) => {
    select.addEventListener("change", () => {
      const row = select.closest("[data-stage-row]");
      const stageType = stageTypeByName(select.value);
      const networkType = row?.querySelector("[data-stage-field='networkType']");
      if (networkType) networkType.value = stageType.defaultNetworkType;
      if (onChange) onChange();
    });
  });
  root.querySelectorAll("[data-stage-field='selectedModel']").forEach((select) => {
    select.addEventListener("change", () => {
      select.dataset.selectedValue = select.value;
      const row = select.closest("[data-stage-row]");
      const groupField = row?.querySelector("[data-stage-field='modelGroup']");
      const parsed = parseModelSelection(select.value, groupField?.value || "");
      const hidden = row?.querySelector("[data-stage-field='operateOnClassIds']");
      const textInput = row?.querySelector("[data-stage-field='operateOnClassIdsText']");
      if (groupField) groupField.value = parsed.group;
      if (hidden && textInput && selectedStageModelFile(row)?.labels?.length) {
        hidden.value = "";
        textInput.value = "";
      }
      hydrateStageLabelPickers(row || root);
    });
  });
  root.querySelectorAll("[data-stage-field='selectedModel']").forEach((select) => {
    select.addEventListener("input", () => {
      select.dataset.selectedValue = select.value;
      const row = select.closest("[data-stage-row]");
      const groupField = row?.querySelector("[data-stage-field='modelGroup']");
      const parsed = parseModelSelection(select.value, groupField?.value || "");
      if (groupField) groupField.value = parsed.group;
      hydrateStageLabelPickers(row || root);
    });
  });
  root.querySelectorAll("[data-stage-field='operateOnClassIdsText']").forEach((input) => {
    input.addEventListener("input", () => {
      const hidden = input.closest("[data-stage-row]")?.querySelector("[data-stage-field='operateOnClassIds']");
      if (hidden) hidden.value = input.value;
      if (onChange) onChange();
    });
  });
  root.querySelectorAll("[data-remove-stage]").forEach((button) => {
    button.addEventListener("click", () => {
      const list = button.closest(".pipeline-stage-list");
      const stages = readPipelineStages(list);
      stages.splice(Number(button.dataset.removeStage), 1);
      list.innerHTML = stageRowsMarkup(stages.length ? stages : defaultPipelineStages());
      hydrateStageControls(list);
      bindStageActions(list, onChange);
      if (onChange) onChange();
    });
  });
}

function attachDeployAppHandlers() {
  document.querySelectorAll("[data-remove-deploy-app]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = readDeployApps();
      current.splice(Number(button.dataset.removeDeployApp), 1);
      renderDeployApps(current.length ? current : [defaultDeployApp(0, readCameraCards())]);
      persistConfigAfterDeployAppChange("DeepStream app removed and saved.", button).catch((error) => print(error.message));
    });
  });
  document.querySelectorAll("[data-capture-deploy-sample]").forEach((button) => {
    button.addEventListener("click", () => captureDeploySample(button.dataset.captureDeploySample, button).catch((error) => print(error.message)));
  });
  document.querySelectorAll("[data-add-deploy-stage]").forEach((button) => {
    button.addEventListener("click", () => {
      const list = button.closest("[data-deploy-app-card]")?.querySelector("[data-deploy-stage-list]");
      addStageRow(list);
      renderDeployApps(readDeployApps(), readCameraCards());
    });
  });
  document.querySelectorAll("[data-zone-class-option]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => syncDeployZoneClassOptions(checkbox.closest("[data-deploy-zone-row]")));
  });
  document.querySelectorAll("[data-select-all-zone-labels]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-deploy-zone-row]");
      row?.querySelectorAll("[data-zone-class-option]").forEach((checkbox) => {
        checkbox.checked = true;
      });
      syncDeployZoneClassOptions(row);
      renderDeployApps(readDeployApps(), readCameraCards());
    });
  });
  document.querySelectorAll("[data-add-deploy-rule]").forEach((button) => {
    button.addEventListener("click", () => addDeploySequenceRule(button));
  });
  document.querySelectorAll("[data-delete-deploy-rule]").forEach((button) => {
    button.addEventListener("click", () => deleteDeploySequenceRule(button));
  });
}

async function persistConfigAfterDeployAppChange(message, button = null) {
  const result = await withTask("config", button, "Saving...", async () => {
    return await api("/api/config", { method: "PUT", body: JSON.stringify(formConfig()) });
  });
  setTaskStatus("config", "success", message);
  renderConfig(result);
  print({ message, deployApps: result.deployApps || [] });
  return result;
}

function syncDeployZoneClassOptions(row) {
  if (!row) return;
  const hidden = row.querySelector("[data-deploy-zone-field='classIds']");
  const textInput = row.querySelector("[data-deploy-zone-field='classIdsText']");
  if (!hidden || !textInput) return;
  const checked = [...row.querySelectorAll("[data-zone-class-option]:checked")].map((item) => item.value);
  if (checked.length) {
    hidden.value = checked.join(";");
    textInput.value = hidden.value;
  } else {
    hidden.value = textInput.value;
  }
}

function addDeploySequenceRule(button) {
  const card = button.closest("[data-deploy-app-card]");
  const preview = button.closest("[data-deploy-preview-camera]");
  const cameraId = button.dataset.addDeployRule;
  if (!card || !preview || !cameraId) return;
  const apps = readDeployApps();
  const appIndex = [...document.querySelectorAll("[data-deploy-app-card]")].indexOf(card);
  const app = apps[appIndex];
  if (!app) return;
  const settings = app.cameraSettings?.[cameraId] || { zones: [], rules: [] };
  if ((settings.zones || []).length < 2) return print("Can it nhat 2 zone de tao sequence rule.");
  const draft = (key) => preview.querySelector(`[data-rule-draft="${key}"]`);
  const firstZoneId = draft("firstZoneId")?.value || "";
  const secondZoneId = draft("secondZoneId")?.value || "";
  if (!firstZoneId || !secondZoneId || firstZoneId === secondZoneId) {
    return print("First zone va then zone phai khac nhau.");
  }
  const rules = [...(settings.rules || [])];
  rules.push(normalizeRule({
    id: `rule-${Date.now()}`,
    name: draft("name")?.value || `${firstZoneId} to ${secondZoneId}`,
    enabled: draft("enabled")?.checked !== false,
    type: "sequence",
    firstZoneId,
    secondZoneId,
    action: "capture",
    reverseAction: draft("reverseAction")?.value || "ignore",
    maxTimeSec: draft("maxTimeSec")?.value || 5,
    classIds: draft("classIds")?.value || "",
    cooldownSec: draft("cooldownSec")?.value || ""
  }, rules.length, settings.zones));
  app.cameraSettings = {
    ...(app.cameraSettings || {}),
    [cameraId]: { ...settings, rules }
  };
  renderDeployApps(apps, readCameraCards());
}

function deleteDeploySequenceRule(button) {
  const card = button.closest("[data-deploy-app-card]");
  const cameraId = button.dataset.cameraId;
  if (!card || !cameraId) return;
  const apps = readDeployApps();
  const appIndex = [...document.querySelectorAll("[data-deploy-app-card]")].indexOf(card);
  const app = apps[appIndex];
  const settings = app?.cameraSettings?.[cameraId];
  if (!app || !settings) return;
  const rules = [...(settings.rules || [])];
  rules.splice(Number(button.dataset.deleteDeployRule), 1);
  app.cameraSettings = {
    ...(app.cameraSettings || {}),
    [cameraId]: { ...settings, rules }
  };
  renderDeployApps(apps, readCameraCards());
}

function attachDeployPreviewImageHandlers() {
  document.querySelectorAll("[data-preview-image]").forEach((image) => {
    const svg = image.parentElement.querySelector("[data-preview-svg]");
    const updateViewBox = () => {
      if (!svg || !image.naturalWidth || !image.naturalHeight) return;
      svg.setAttribute("viewBox", `0 0 ${image.naturalWidth} ${image.naturalHeight}`);
    };
    image.addEventListener("load", updateViewBox, { once: true });
    updateViewBox();
  });
}

async function loadDeployCaptures(button = null) {
  const captures = await withTask("deploy-previews", button, "Loading preview frames...", async () => {
    return await api("/api/monitor-captures");
  });
  deployCaptures = captures || [];
  updateCameraFrameStatuses();
  renderDeployApps(readDeployApps(), readCameraCards());
  return deployCaptures;
}

async function captureDeploySample(cameraId, button = null) {
  const camera = readCameraCards().find((item) => item.id === cameraId);
  if (!camera) return print("Khong tim thay camera de capture sample.");
  if (!/^rtsps?:\/\//i.test(camera.rtspUrl)) return print("RTSP URL phai bat dau bang rtsp:// hoac rtsps://.");
  const result = await withTask(`deploy-capture-${cameraId}`, button, "Capturing deploy sample...", async () => {
    return await api("/api/cameras/capture", {
      method: "POST",
      body: JSON.stringify({ rtspUrl: camera.rtspUrl, cameraId: camera.id, cameraName: camera.name })
    });
  });
  deployCaptures = [result.frame, ...deployCaptures.filter((capture) => capture.url !== result.frame.url)];
  updateCameraFrameStatuses();
  renderDeployApps(readDeployApps(), readCameraCards());
  print(result);
}

function cameraListStatus(cameraId) {
  return [...document.querySelectorAll("[data-camera-status]")]
    .find((node) => node.dataset.cameraStatus === cameraId);
}

function setCameraStatus(cameraId, state, message) {
  const status = cameraListStatus(cameraId);
  if (!status) return;
  status.className = `camera-status ${state || ""}`.trim();
  status.innerHTML = `<b>Check connection</b> ${escapeHtml(message)}`;
}

function updateCameraRoiSummary(cameraId, zonesOrPolygon = []) {
  const summary = [...document.querySelectorAll("[data-roi-summary]")]
    .find((node) => node.dataset.roiSummary === cameraId);
  const text = Array.isArray(zonesOrPolygon) && zonesOrPolygon.some((item) => item && !Array.isArray(item))
    ? zoneSummary(zonesOrPolygon)
    : roiSummary(zonesOrPolygon);
  if (summary) summary.innerHTML = `<b>ROI setting</b> ${escapeHtml(text)}`;
}

function updateCameraFrameStatuses() {
  document.querySelectorAll("[data-frame-size]").forEach((node) => {
    node.innerHTML = `<b>Frame size</b> ${escapeHtml(frameSizeSummary(node.dataset.frameSize))}`;
  });
  updateCameraSettingStatus();
}

async function checkCameraSettingConnection(button = null) {
  const camera = readCameraSetting();
  if (!/^rtsps?:\/\//i.test(camera.rtspUrl)) return print("RTSP URL phai bat dau bang rtsp:// hoac rtsps://.");
  setCameraSettingConnection("running", "Checking...");
  setCameraStatus(camera.id, "running", "Checking...");
  const result = await withTask(`camera-${camera.id}`, button, "Checking camera...", async () => {
    return await api("/api/cameras/check", {
      method: "POST",
      body: JSON.stringify({ rtspUrl: camera.rtspUrl, cameraId: camera.id })
    });
  });
  const state = result.ok === false ? "failed" : "success";
  const message = result.message || (result.ok === false ? "Offline" : "Online");
  setCameraSettingConnection(state, message);
  setCameraStatus(camera.id, state, message);
  print(result);
}

async function checkSavedCameraConnection(index, button = null) {
  const camera = cameraDrafts[index];
  if (!camera) return print("Khong tim thay camera trong danh sach.");
  if (!/^rtsps?:\/\//i.test(camera.rtspUrl || "")) return print("RTSP URL phai bat dau bang rtsp:// hoac rtsps://.");
  setCameraStatus(camera.id, "running", "Checking...");
  const result = await withTask(`camera-list-${camera.id}`, button, "Checking...", async () => {
    return await api("/api/cameras/check", {
      method: "POST",
      body: JSON.stringify({ rtspUrl: camera.rtspUrl, cameraId: camera.id })
    });
  });
  const state = result.ok === false ? "failed" : "success";
  const message = result.message || (result.ok === false ? "Offline" : "Online");
  setCameraStatus(camera.id, state, message);
  if (readCameraSetting().id === camera.id) setCameraSettingConnection(state, message);
  print(result);
}

function renderConfig(config) {
  renderCameras(config.streams || []);
  renderDeployApps(config.deployApps || [], config.streams || []);
  confirmedTestProcessorType = normalizeProcessorType(config.testProcessorType || config.processor?.type);
  if (els.testProcessorType) els.testProcessorType.value = confirmedTestProcessorType;
  confirmedTestPipelineStages = normalizePipelineStages(config.pipelineStages || config.deployApps?.find((app) => app.active)?.pipelineStages || stagesFromSelectedModels(config.selectedModels));
  renderTestPipelineStages(confirmedTestPipelineStages);
  renderConfirmedTestFlow();
  els.streamWidth.value = config.streamWidth || 1920;
  els.streamHeight.value = config.streamHeight || 1080;
  els.deepstreamImage.value = config.deepstreamImage || "camera-monitor-deepstream-runtime:local";
  const ocr = config.ocrPostprocess || {};
  if (els.ocrMaxChars) els.ocrMaxChars.value = ocr.maxChars ?? 12;
  if (els.ocrMinConfidence) els.ocrMinConfidence.value = ocr.minConfidence ?? 0.5;
  if (els.ocrNmsIou) els.ocrNmsIou.value = ocr.nmsIou ?? 0.5;
  if (els.ocrMinWidthRatio) els.ocrMinWidthRatio.value = ocr.minWidthRatio ?? 0.01;
  if (els.ocrMaxWidthRatio) els.ocrMaxWidthRatio.value = ocr.maxWidthRatio ?? 0.25;
  if (els.ocrMinHeightRatio) els.ocrMinHeightRatio.value = ocr.minHeightRatio ?? 0.18;
  if (els.ocrMaxHeightRatio) els.ocrMaxHeightRatio.value = ocr.maxHeightRatio ?? 1.15;
  renderMainDashboard();
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

function renderModelBuilders() {
  const taskOptions = ["detect", "auto", "classify", "segment", "pose", "obb"];
  const profileOptions = [
    ["yolo_detection", "YOLO Detection", "Bbox detection parser from DeepStream-Yolo."],
    ["yolo_face", "YOLO Face", "Face outputs and parser from DeepStream-Yolo-Face."],
    ["yolo_segmentation", "YOLO Segmentation", "Instance masks and parser from DeepStream-Yolo-Seg."],
    ["yolo_pose", "YOLO Pose", "Keypoint outputs and parser from DeepStream-Yolo-Pose."],
    ["yolo_classification", "YOLO Classification", "Classifier engine without YOLO detection parser."],
    ["custom_onnx", "Custom ONNX", "Use uploaded ONNX and labels without automatic YOLO parser."]
  ];
  const versionOptions = [
    ["yolov5", "YOLOv5"],
    ["yolov7", "YOLOv7"],
    ["yolov8", "YOLOv8"],
    ["yolov9", "YOLOv9"],
    ["yolov10", "YOLOv10"],
    ["yolo11", "YOLO11"],
    ["yolov12", "YOLOv12"],
    ["yolov13", "YOLOv13"]
  ];
  const defaultRole = {
    defaultTask: "detect",
    defaultImgsz: 640,
    defaultParser: true
  };
  els.modelBuilders.innerHTML = `
    <article class="model-builder-card">
      <div class="model-builder-head">
        <div>
          <h3>Model Builder Factory</h3>
          <p>Upload YOLO source model, build DeepStream artifacts va chon lai trong moi GIE flow.</p>
        </div>
        <code>factory</code>
      </div>
      <div class="grid">
        <label class="model-name-field">
          Model name
          <input data-builder="factory" data-key="modelName" placeholder="vd: person_detector_yolov8n" />
          <small>Model name tao model library rieng. Co the la person_detector, dog_detector, fire_smoke...</small>
        </label>
        <label>Description <input data-builder="factory" data-key="description" placeholder="Nguon data, version, ghi chu..." /></label>
      </div>
      <div class="grid">
        <label>Image size <input data-builder="factory" data-key="imgsz" type="number" value="${defaultRole.defaultImgsz || 640}" /></label>
        <label>ONNX opset <input data-builder="factory" data-key="opset" type="number" value="17" /></label>
        <label>Build batch size <input data-builder="factory" data-key="batchSize" type="number" value="1" min="1" /></label>
        <label>TensorRT workspace MB <input data-builder="factory" data-key="workspaceMb" type="number" value="2048" /></label>
      </div>
      <div class="grid">
        <label>
          Model profile
          <select data-builder="factory" data-key="profile">
            ${profileOptions.map(([value, label]) => `<option value="${value}" ${value === "yolo_detection" ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <small data-model-profile-hint>${profileOptions[0][2]}</small>
        </label>
        <label>
          Export task
          <select data-builder="factory" data-key="task">
            ${taskOptions.map((task) => `<option value="${task}" ${task === defaultRole.defaultTask ? "selected" : ""}>${task}</option>`).join("")}
          </select>
        </label>
        <label>
          YOLO version
          <select data-builder="factory" data-key="yoloVersion">
            ${versionOptions.map(([value, label]) => `<option value="${value}" ${value === "yolov8" ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <label>
          Engine build
          <select data-builder="factory" data-key="engineBuildMethod">
            <option value="auto" selected>Auto - runtime trtexec</option>
            <option value="runtime-trtexec">Runtime-matched trtexec</option>
            <option value="deepstream-runtime">DeepStream nvinfer</option>
            <option value="trtexec">Builder trtexec - advanced</option>
            <option value="skip">Skip engine</option>
          </select>
        </label>
      </div>
      <div class="grid one">
        <label>Source .pt/.onnx <input data-builder="factory" data-key="source" type="file" accept=".pt,.onnx" /></label>
      </div>
      <div class="checks">
        <label><input data-builder="factory" data-key="fp16" type="checkbox" checked /> FP16 engine</label>
        <label><input data-builder="factory" data-key="simplify" type="checkbox" checked /> Simplify ONNX</label>
        <label><input data-builder="factory" data-key="dynamic" type="checkbox" /> Dynamic shape</label>
        <label><input data-builder="factory" data-key="buildEngine" type="checkbox" checked /> Build TensorRT engine</label>
        <label><input data-builder="factory" data-key="buildParser" type="checkbox" ${defaultRole.defaultParser ? "checked" : ""} /> Build DeepStream-Yolo parser</label>
        <label><input data-builder="factory" data-key="forceRebuild" type="checkbox" /> Force rebuild</label>
      </div>
      <div class="actions inline-actions">
        <button type="button" data-upload-factory-source>Upload source</button>
        <button type="button" data-refresh-model-files="all">Refresh library</button>
      </div>
      <div class="task-status idle" data-task-status="model-factory">
        ${statusMarkup("idle", "Ready.")}
      </div>
      <div class="model-file-list model-library" data-model-library>
        <div class="empty">No source model yet.</div>
      </div>
    </article>
  `;
  document.querySelector("[data-upload-factory-source]")?.addEventListener("click", (event) => {
    try {
      uploadSource(factoryModelGroup(), event.currentTarget).catch((error) => print(error.message));
    } catch (error) {
      print(error.message);
    }
  });
  document.querySelectorAll("[data-build-log]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.dataset.buildLog === "factory" ? builderControl("factory", "group").value : button.dataset.buildLog;
      viewBuildLog(group).catch((error) => print(error.message));
    });
  });
  document.querySelectorAll("[data-refresh-model-files]").forEach((button) => {
    button.addEventListener("click", () => loadAllModelFiles(button).catch((error) => print(error.message)));
  });
  const profileSelect = builderControl("factory", "profile");
  profileSelect?.addEventListener("change", () => applyFactoryProfileDefaults(profileOptions));
  applyFactoryProfileDefaults(profileOptions);
  renderModelLibrary();
  updateModelSelects();
}

function applyFactoryProfileDefaults(profileOptions = []) {
  const profile = builderControl("factory", "profile")?.value || "yolo_detection";
  const task = builderControl("factory", "task");
  const parser = builderControl("factory", "buildParser");
  const source = builderControl("factory", "source");
  const hint = document.querySelector("[data-model-profile-hint]");
  const defaults = {
    yolo_detection: { task: "detect", parser: true, accept: ".pt,.onnx" },
    yolo_face: { task: "detect", parser: true, accept: ".pt,.onnx" },
    yolo_segmentation: { task: "segment", parser: true, accept: ".pt,.onnx" },
    yolo_pose: { task: "pose", parser: true, accept: ".pt,.onnx" },
    yolo_classification: { task: "classify", parser: false, accept: ".pt,.onnx" },
    custom_onnx: { task: "auto", parser: false, accept: ".onnx" }
  };
  const selected = defaults[profile] || defaults.yolo_detection;
  if (task) task.value = selected.task;
  if (parser) parser.checked = selected.parser;
  if (source) source.accept = selected.accept;
  if (hint) {
    hint.textContent = profileOptions.find(([value]) => value === profile)?.[2] || "";
  }
}

async function uploadSource(group, button = null) {
  const controlGroup = builderControl(group, "source") ? group : "factory";
  const sourceInput = builderControl(controlGroup, "source");
  if (!sourceInput.files.length) return print(`Chon file .pt hoac .onnx cho ${group} truoc khi upload.`);
  const fileName = sourceInput.files[0].name;
  const result = await withTask(`model-${group}`, button, `Uploading ${group}...`, async () => {
    const form = new FormData();
    form.append("file", sourceInput.files[0]);
    form.append("profile", builderControl(controlGroup, "profile")?.value || "yolo_detection");
    form.append("modelName", builderControl(controlGroup, "modelName")?.value || "");
    form.append("description", builderControl(controlGroup, "description")?.value || "");
    return await api(`/api/model-source/${group}`, { method: "POST", body: form });
  });
  setTaskStatus(`model-${group}`, "success", `Uploaded ${fileName}.`);
  await loadModelFiles(group);
  print(result);
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function renderModelLibrary() {
  const library = document.querySelector("[data-model-library]");
  if (!library) return;
  if (!modelLibraryGroups.length) {
    library.innerHTML = '<div class="empty">No source model yet.</div>';
    renderMainDashboard();
    return;
  }
  library.innerHTML = modelLibraryGroups.map((item) => `
    <section class="model-library-group">
      <div class="model-library-head">
        <strong>${escapeHtml(item.displayName || item.group)}</strong>
        <small>${escapeHtml(item.group)}</small>
      </div>
      <div class="model-file-list" data-model-files="${escapeHtml(item.group)}">
        <div class="empty">Loading files...</div>
      </div>
    </section>
  `).join("");
  modelLibraryGroups.forEach((item) => renderModelFiles(item.group, modelFiles.get(item.group) || item.files || []));
}

function renderModelFiles(group, files = []) {
  const container = document.querySelector(`[data-model-files="${group}"]`);
  updateModelSelects();
  if (!container) return;
  if (!files.length) {
    container.innerHTML = '<div class="empty">No source model yet.</div>';
    renderMainDashboard();
    return;
  }
  container.innerHTML = files.map((file) => `
    <div class="model-file-row">
      <div>
        <strong>${escapeHtml(file.displayName || file.name)}</strong>
        <span>${escapeHtml(formatBytes(file.size))} - ${escapeHtml(formatDateTime(file.updatedAt))}</span>
        ${file.description ? `<span>${escapeHtml(file.description)}</span>` : ""}
        <small>
          <b class="${file.built ? "built" : "not-built"}">${file.built ? "built" : "not built"}</b>
          ${file.buildStatus ? `<b>${escapeHtml(file.buildStatus)}</b>` : ""}
          ${file.profile ? `<b>${escapeHtml(file.profile)}</b>` : ""}
          ${file.engineBuildMethod ? `<b>${escapeHtml(file.engineBuildMethod)}</b>` : ""}
          ${file.deepstreamYoloRef ? `<b>parser ${escapeHtml(file.deepstreamYoloRef.slice(0, 8))}</b>` : ""}
          ${file.name.toLowerCase().endsWith(".onnx") ? `<b class="${file.labelsUploaded ? "built" : "not-built"}">${file.labelsUploaded ? "labels ok" : "needs labels"}</b>` : ""}
          ${file.task ? `<b>${escapeHtml(file.task)}</b>` : ""}
          ${file.roles?.length ? file.roles.map((role) => `<b>${escapeHtml(role)}</b>`).join(" ") : ""}
        </small>
      </div>
      <div class="model-file-actions">
        ${file.url ? `<a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">Source</a>` : ""}
        ${file.name.toLowerCase().endsWith(".onnx") ? `
          <label class="inline-file-label">
            labels.txt
            <input data-label-file="${escapeHtml(group)}" data-source-key="${escapeHtml(file.sourceKey)}" type="file" accept=".txt" />
          </label>
          <button class="model-use-button" type="button" data-upload-labels="${escapeHtml(group)}" data-source-key="${escapeHtml(file.sourceKey)}">
            Upload labels
          </button>
        ` : ""}
        <button class="model-build-button" type="button" data-build-source="${escapeHtml(group)}" data-source-path="${escapeHtml(file.path)}" data-source-name="${escapeHtml(file.name)}" data-source-profile="${escapeHtml(file.profile || "yolo_detection")}" data-built="${file.built ? "1" : "0"}">
          ${file.built ? "Built" : "Build"}
        </button>
        <button type="button" data-delete-model-file="${escapeHtml(group)}" data-file-id="${escapeHtml(file.id)}">
          Delete
        </button>
      </div>
    </div>
  `).join("");
  container.querySelectorAll("[data-upload-labels]").forEach((button) => {
    button.addEventListener("click", () => uploadSourceLabels(button.dataset.uploadLabels, button.dataset.sourceKey, button).catch((error) => print(error.message)));
  });
  container.querySelectorAll("[data-build-source]").forEach((button) => {
    button.addEventListener("click", () => buildModelSource(
      button.dataset.buildSource,
      button.dataset.sourcePath,
      button.dataset.sourceName,
      button.dataset.sourceProfile,
      button.dataset.built === "1",
      button
    ).catch((error) => {
      renderCheckpoints(error.body?.checkpoints || []);
      print(error.message);
    }));
  });
  container.querySelectorAll("[data-delete-model-file]").forEach((button) => {
    button.addEventListener("click", () => deleteModelFile(button.dataset.deleteModelFile, button.dataset.fileId, button).catch((error) => print(error.message)));
  });
  updateModelSelects();
  renderMainDashboard();
}

async function uploadSourceLabels(group, sourceKey, button = null) {
  const input = document.querySelector(`[data-label-file="${group}"][data-source-key="${sourceKey}"]`);
  if (!input?.files?.length) return print("Chon labels.txt truoc khi upload.");
  const result = await withTask(`model-${group}`, button, `Uploading labels for ${group}...`, async () => {
    const form = new FormData();
    form.append("file", input.files[0]);
    return await api(`/api/model-source/${group}/${encodeURIComponent(sourceKey)}/labels`, { method: "POST", body: form });
  });
  modelFiles.set(group, result.files || []);
  renderModelFiles(group, result.files || []);
  setTaskStatus(`model-${group}`, "success", `Uploaded ${result.labelCount} labels.`);
  print(result);
}

function updateModelSelects() {
  hydrateStageControls(document);
}

function upsertModelLibraryGroup(group, files = []) {
  const current = modelLibraryGroups.find((item) => item.group === group);
  const next = {
    group,
    displayName: files[0]?.displayName || current?.displayName || group,
    fileCount: files.length,
    builtCount: files.filter((file) => file.built).length,
    files
  };
  modelLibraryGroups = files.length
    ? [...modelLibraryGroups.filter((item) => item.group !== group), next].sort((a, b) => a.displayName.localeCompare(b.displayName))
    : modelLibraryGroups.filter((item) => item.group !== group);
}

async function loadModelFiles(group, button = null) {
  const result = await withTask(`model-${group}`, button, `Loading ${group} files...`, async () => {
    return await api(`/api/models/${group}/files`);
  });
  modelFiles.set(group, result.files || []);
  upsertModelLibraryGroup(group, result.files || []);
  renderModelLibrary();
  hydrateStageControls(document);
  renderConfirmedTestFlow();
  setTaskStatus(`model-${group}`, "success", `Loaded ${(result.files || []).length} files.`);
  return result;
}

async function loadAllModelFiles(button = null) {
  setButtonBusy(button, true, "Refreshing...");
  try {
    const result = await api("/api/models/groups");
    modelFiles.clear();
    modelLibraryGroups = result.groups || [];
    modelLibraryGroups.forEach((group) => modelFiles.set(group.group, group.files || []));
    renderModelLibrary();
    hydrateStageControls(document);
    renderConfirmedTestFlow();
    setTaskStatus("model-factory", "success", "Library refreshed.");
  } finally {
    setButtonBusy(button, false);
  }
}

async function deleteModelFile(group, fileId, button = null) {
  if (!confirm(`Delete selected file from ${group}?`)) return;
  const result = await withTask(`model-${group}`, button, `Deleting ${group} file...`, async () => {
    return await api(`/api/models/${group}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  });
  modelFiles.set(group, result.files || []);
  upsertModelLibraryGroup(group, result.files || []);
  renderModelLibrary();
  setTaskStatus(`model-${group}`, "success", "File deleted.");
  print(result);
}

function syncRoiCameraSelect() {
  const camera = readCameraSetting();
  els.roiCameraSelect.innerHTML = `<option value="setting">${escapeHtml(camera.name)} (${escapeHtml(camera.id)})</option>`;
  els.roiCameraSelect.value = "setting";
}

function selectedCameraPolygon() {
  const zones = selectedCameraZones();
  return zones[roiTool.zoneIndex]?.polygon || parseRoiValue(els.cameraSettingRoi.value || "[]");
}

function selectedCameraZones() {
  return parseZonesValue(els.cameraSettingZones.value).map((zone, index) => normalizeZone(zone, index, readCameraSetting()));
}

function setCameraZones(zones = []) {
  const normalized = zones.map((zone, index) => normalizeZone(zone, index, readCameraSetting()));
  els.cameraSettingZones.value = JSON.stringify(normalized);
  els.cameraSettingRoi.value = JSON.stringify(primaryZonePolygon({ zones: normalized, roi: { polygon: [] } }));
  updateCameraSettingStatus();
  renderZoneControls();
  renderRuleControls();
}

function zoneModeLabel(mode) {
  return {
    capture_when_inside: "capture",
    alert_when_inside: "alert",
    lpr_only_inside: "lpr only",
    detect_only_inside: "detect only",
    ignore_inside: "ignore"
  }[mode] || mode;
}

function currentZone() {
  const zones = selectedCameraZones();
  if (!zones.length) {
    const zone = defaultZoneConfig(0, {
      classIds: els.cameraSettingClassIds.value,
      cooldownSec: els.cameraSettingCooldown.value || ""
    });
    setCameraZones([zone]);
    roiTool.zoneIndex = 0;
    return zone;
  }
  roiTool.zoneIndex = clamp(roiTool.zoneIndex, 0, zones.length - 1);
  return zones[roiTool.zoneIndex];
}

function renderZoneControls() {
  if (!els.roiZoneSelect) return;
  const zones = selectedCameraZones();
  roiTool.zoneIndex = zones.length ? clamp(roiTool.zoneIndex, 0, zones.length - 1) : 0;
  els.roiZoneSelect.innerHTML = zones.length
    ? zones.map((zone, index) => `<option value="${index}">${escapeHtml(zone.name || zone.id)}</option>`).join("")
    : '<option value="0">No zone yet</option>';
  els.roiZoneSelect.value = String(roiTool.zoneIndex);
  const zone = zones[roiTool.zoneIndex] || defaultZoneConfig(0);
  els.roiZoneName.value = zone.name || "";
  els.roiZoneMode.value = zone.mode || "capture_when_inside";
  els.roiZoneClassIds.value = Array.isArray(zone.classIds) ? zone.classIds.join(",") : zone.classIds || "";
  els.roiZoneCooldown.value = zone.cooldownSec || "";
  els.roiZoneEnabled.checked = zone.enabled !== false;
  els.roiZoneList.innerHTML = zones.length ? zones.map((item, index) => `
    <button type="button" class="zone-chip ${index === roiTool.zoneIndex ? "active" : ""}" data-zone-index="${index}">
      <strong>${escapeHtml(item.name || item.id)}</strong>
      <span>${cleanZonePolygon(item.polygon).length >= 3 ? `${item.polygon.length} pts` : "full frame"}</span>
    </button>
  `).join("") : '<div class="empty">No zone configured.</div>';
  els.roiZoneList.querySelectorAll("[data-zone-index]").forEach((button) => {
    button.addEventListener("click", () => selectZone(Number(button.dataset.zoneIndex)));
  });
}

function selectedCameraRules() {
  const zones = selectedCameraZones();
  return cameraRules({ rules: parseRulesValue(els.cameraSettingRules?.value), zones }, zones);
}

function setCameraRules(rules = []) {
  const zones = selectedCameraZones();
  const normalized = rules.map((rule, index) => normalizeRule(rule, index, zones));
  if (els.cameraSettingRules) els.cameraSettingRules.value = JSON.stringify(normalized);
  updateCameraSettingStatus();
  renderRuleControls();
}

function renderRuleControls() {
  if (!els.roiRuleList) return;
  const zones = selectedCameraZones();
  const rules = selectedCameraRules();
  const zoneOptions = zones.length
    ? zones.map((zone) => `<option value="${escapeHtml(zone.id)}">${escapeHtml(zone.name || zone.id)}</option>`).join("")
    : '<option value="">No zone</option>';
  els.roiRuleFirstZone.innerHTML = zoneOptions;
  els.roiRuleSecondZone.innerHTML = zoneOptions;
  if (zones[0]) els.roiRuleFirstZone.value = zones[0].id;
  if (zones[1]) els.roiRuleSecondZone.value = zones[1].id;
  els.roiRuleList.innerHTML = rules.length ? rules.map((rule, index) => `
    <div class="rule-chip">
      <div>
        <strong>${escapeHtml(rule.name || rule.id)}</strong>
        <span>${escapeHtml(rule.firstZoneId)} -> ${escapeHtml(rule.secondZoneId)} - reverse ${escapeHtml(rule.reverseAction)} - ${rule.maxTimeSec}s</span>
        <em>${rule.enabled === false ? "disabled" : "enabled"}</em>
      </div>
      <button type="button" class="danger small-button" data-delete-rule-index="${index}">Delete</button>
    </div>
  `).join("") : '<div class="empty">No custom rules. Default zone capture is active.</div>';
  els.roiRuleList.querySelectorAll("[data-delete-rule-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = selectedCameraRules();
      next.splice(Number(button.dataset.deleteRuleIndex), 1);
      setCameraRules(next);
      syncEditedCameraDraft();
    });
  });
}

function addRoiRule() {
  const zones = selectedCameraZones();
  if (zones.length < 2) return print("Can it nhat 2 zone de tao sequence rule.");
  const firstZoneId = els.roiRuleFirstZone.value;
  const secondZoneId = els.roiRuleSecondZone.value;
  if (!firstZoneId || !secondZoneId || firstZoneId === secondZoneId) {
    return print("First zone va then zone phai khac nhau.");
  }
  const rules = selectedCameraRules();
  rules.push(normalizeRule({
    id: `rule-${Date.now()}`,
    name: els.roiRuleName.value || `${firstZoneId} to ${secondZoneId}`,
    enabled: els.roiRuleEnabled.checked,
    type: "sequence",
    firstZoneId,
    secondZoneId,
    action: "capture",
    reverseAction: els.roiRuleReverseAction.value || "ignore",
    maxTimeSec: els.roiRuleMaxTime.value || 5,
    classIds: els.roiRuleClassIds.value,
    cooldownSec: els.roiRuleCooldown.value
  }, rules.length, zones));
  setCameraRules(rules);
  syncEditedCameraDraft();
  print({ message: "Added sequence rule. Bam Add/Update camera de luu vao danh sach.", rules });
}

function readZoneEditor() {
  const zone = currentZone();
  return normalizeZone({
    ...zone,
    name: els.roiZoneName.value || zone.name,
    mode: els.roiZoneMode.value || zone.mode,
    classIds: els.roiZoneClassIds.value,
    cooldownSec: els.roiZoneCooldown.value,
    enabled: els.roiZoneEnabled.checked,
    polygon: roiTool.points
  }, roiTool.zoneIndex, readCameraSetting());
}

function persistZoneEditor() {
  const zones = selectedCameraZones();
  zones[roiTool.zoneIndex] = readZoneEditor();
  setCameraZones(zones);
  roiTool.points = zones[roiTool.zoneIndex]?.polygon || [];
  drawRoiTool();
  updateRoiOutput();
  syncEditedCameraDraft();
  return zones[roiTool.zoneIndex];
}

function selectZone(index) {
  const zones = selectedCameraZones();
  if (!zones.length) return;
  roiTool.zoneIndex = clamp(index, 0, zones.length - 1);
  roiTool.points = zones[roiTool.zoneIndex].polygon || [];
  renderZoneControls();
  drawRoiTool();
  updateRoiOutput();
}

function newZone() {
  const zones = selectedCameraZones();
  zones.push(defaultZoneConfig(zones.length, {
    classIds: "",
    cooldownSec: ""
  }));
  roiTool.zoneIndex = zones.length - 1;
  setCameraZones(zones);
  roiTool.points = [];
  drawRoiTool();
  updateRoiOutput();
}

function clearRoiReferenceImage(initialPoints = []) {
  roiTool.image = null;
  roiTool.source = "";
  roiTool.points = Array.isArray(initialPoints) ? initialPoints : [];
  if (els.roiImageFile) els.roiImageFile.value = "";
  els.roiImageSize.value = "No image loaded";
  drawRoiTool();
  updateRoiOutput();
}

function restoreLatestRoiReference(camera) {
  const polygon = selectedCameraPolygon();
  const capture = latestCaptureForCamera(camera.id);
  if (!capture?.url) {
    clearRoiReferenceImage(polygon);
    return false;
  }
  if (els.roiImageFile) els.roiImageFile.value = "";
  const capturedAt = capture.updatedAt || capture.createdAt;
  const label = capturedAt
    ? `${camera.name} - ${formatDateTime(capturedAt)}`
    : `${camera.name} - latest sample`;
  loadRoiImageFromUrl(capture.url, label, false, polygon);
  return true;
}

function openRoiTool() {
  syncRoiCameraSelect();
  const camera = readCameraSetting();
  if (!selectedCameraZones().length) setCameraZones([defaultZoneConfig(0, {
    classIds: els.cameraSettingClassIds.value,
    cooldownSec: els.cameraSettingCooldown.value || ""
  })]);
  if (els.cameraSettingRoiSlot && els.roiToolPanel.parentElement !== els.cameraSettingRoiSlot) {
    els.cameraSettingRoiSlot.appendChild(els.roiToolPanel);
  }
  els.roiToolPanel.classList.remove("hidden");
  renderZoneControls();
  renderRuleControls();
  els.roiToolTitle.textContent = `Zones - ${camera.name}`;
  restoreLatestRoiReference(camera);
  els.roiToolPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeRoiTool() {
  els.roiToolPanel.classList.add("hidden");
}

function getRoiCanvasPoint(event) {
  const rect = els.roiCanvas.getBoundingClientRect();
  const scaleX = els.roiCanvas.width / rect.width;
  const scaleY = els.roiCanvas.height / rect.height;
  return [
    clamp(Math.round((event.clientX - rect.left) * scaleX), 0, els.roiCanvas.width),
    clamp(Math.round((event.clientY - rect.top) * scaleY), 0, els.roiCanvas.height)
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadRoiImage() {
  const file = els.roiImageFile.files[0];
  if (!file) return;
  const objectUrl = URL.createObjectURL(file);
  loadRoiImageFromUrl(objectUrl, file.name, true, selectedCameraPolygon());
}

function loadRoiImageFromUrl(url, label, shouldRevoke = false, initialPoints = []) {
  const image = new Image();
  image.onload = () => {
    if (shouldRevoke) URL.revokeObjectURL(url);
    roiTool.image = image;
    roiTool.source = label || url;
    roiTool.points = Array.isArray(initialPoints) ? initialPoints : [];
    els.roiCanvas.width = image.naturalWidth;
    els.roiCanvas.height = image.naturalHeight;
    els.roiImageSize.value = `${image.naturalWidth} x ${image.naturalHeight}`;
    drawRoiTool();
    updateRoiOutput();
  };
  image.onerror = () => {
    print("Khong tai duoc anh ROI.");
    if (shouldRevoke) URL.revokeObjectURL(url);
  };
  image.src = url;
}

async function captureRoiFrame(button = null) {
  const camera = readCameraSetting();
  if (!/^rtsps?:\/\//i.test(camera.rtspUrl)) return print("RTSP URL phai bat dau bang rtsp:// hoac rtsps://.");
  const result = await withTask("roi-capture", button, "Capturing ROI frame...", async () => {
    return await api("/api/cameras/capture", {
      method: "POST",
      body: JSON.stringify({ rtspUrl: camera.rtspUrl, cameraId: camera.id, cameraName: camera.name })
    });
  });
  const frame = result.frame;
  deployCaptures = [frame, ...deployCaptures.filter((capture) => capture.url !== frame.url)];
  updateCameraFrameStatuses();
  renderDeployApps(readDeployApps(), readCameraCards());
  loadRoiImageFromUrl(frame.url, `${camera.name} - ${new Date(frame.createdAt).toLocaleString()}`, false, selectedCameraPolygon());
  print(result);
}

function drawRoiTool() {
  const canvas = els.roiCanvas;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  els.roiCanvasEmpty.classList.toggle("hidden", Boolean(roiTool.image));
  if (!roiTool.image) return;

  context.drawImage(roiTool.image, 0, 0, canvas.width, canvas.height);
  const zones = selectedCameraZones();
  zones.forEach((zone, index) => {
    const points = index === roiTool.zoneIndex ? roiTool.points : cleanZonePolygon(zone.polygon);
    if (!points.length) return;
    const active = index === roiTool.zoneIndex;
    context.save();
    context.strokeStyle = active ? "#22c55e" : "#38bdf8";
    context.fillStyle = active ? "#22c55e" : "#38bdf8";
    context.globalAlpha = active ? 1 : 0.45;
    context.lineWidth = Math.max(2, Math.round(canvas.width / 640));
    context.beginPath();
    points.forEach(([x, y], pointIndex) => {
      if (pointIndex === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    if (points.length >= 3) context.closePath();
    context.stroke();
    if (points.length >= 3) {
      context.globalAlpha = active ? 0.15 : 0.08;
      context.fill();
    }
    context.globalAlpha = active ? 1 : 0.65;
    points.forEach(([x, y], pointIndex) => {
      context.beginPath();
      context.arc(x, y, Math.max(4, Math.round(canvas.width / 320)), 0, Math.PI * 2);
      context.fill();
      if (active) drawRoiPointLabel(context, pointIndex + 1, x, y);
    });
    context.restore();
  });
  if (!roiTool.points.length) return;
}

function drawRoiPointLabel(context, label, x, y) {
  const size = Math.max(13, Math.round(els.roiCanvas.width / 90));
  context.font = `${size}px sans-serif`;
  const text = String(label);
  const metrics = context.measureText(text);
  context.fillStyle = "#22c55e";
  context.fillRect(x + 7, y + 7, metrics.width + 10, size + 6);
  context.fillStyle = "#ffffff";
  context.fillText(text, x + 12, y + size + 7);
}

function updateRoiOutput() {
  els.roiPolygonOutput.value = JSON.stringify(roiTool.points, null, 2);
}

function addRoiPoint(event) {
  if (!roiTool.image) return print("Capture frame hoac upload anh ROI truoc khi ve polygon.");
  roiTool.points.push(getRoiCanvasPoint(event));
  drawRoiTool();
  updateRoiOutput();
}

function undoRoiPoint() {
  roiTool.points.pop();
  drawRoiTool();
  updateRoiOutput();
}

function clearRoiPolygon() {
  roiTool.points = [];
  drawRoiTool();
  updateRoiOutput();
}

async function saveRoiConfig(message) {
  const result = await api("/api/config", { method: "PUT", body: JSON.stringify(formConfig()) });
  renderConfig(result);
  print(message);
}

async function applyRoiToCamera() {
  if (roiTool.points.length < 3) return print("Zone polygon can it nhat 3 diem.");
  const zone = persistZoneEditor();
  const camera = syncEditedCameraDraft();
  updateCameraSettingStatus();
  updateCameraRoiSummary(camera.id, camera.zones);
  print({
    message: "Da apply zone vao camera setting. Bam Add/Update camera de luu vao danh sach.",
    cameraId: camera.id,
    cameraName: camera.name,
    zone,
    source: roiTool.source,
    zones: camera.zones
  });
}

async function removeRoiFromCamera() {
  const zones = selectedCameraZones();
  zones.splice(roiTool.zoneIndex, 1);
  roiTool.zoneIndex = clamp(roiTool.zoneIndex, 0, Math.max(0, zones.length - 1));
  setCameraZones(zones);
  const camera = syncEditedCameraDraft();
  roiTool.points = zones[roiTool.zoneIndex]?.polygon || [];
  updateCameraSettingStatus();
  updateCameraRoiSummary(camera.id, camera.zones);
  drawRoiTool();
  updateRoiOutput();
  print({
    message: "Da remove zone khoi camera setting. Bam Add/Update camera de luu vao danh sach.",
    cameraId: camera.id,
    cameraName: camera.name,
    zones: camera.zones
  });
}

async function uploadTestMedia(kind, button = null) {
  const input = kind === "image" ? els.testImageFile : els.testVideoFile;
  if (!input.files.length) return print(`Chon ${kind} file truoc khi upload.`);
  const result = await withTask(`test-${kind}`, button, `Uploading ${kind}...`, async () => {
    const form = new FormData();
    form.append("file", input.files[0]);
    return await api(`/api/test-media/${kind}`, { method: "POST", body: form });
  });
  print(result);
}

async function runTestMedia(kind, button = null) {
  renderCheckpoints([
    { order: 1, label: `${kind} test requested`, status: "running", message: `Running ${kind} test...`, durationMs: null }
  ]);
  print(`Running ${kind} test...`);
  const result = await withTask(`test-${kind}`, button, `Running ${kind} test...`, async () => {
    const body = formConfig();
    body.pipelineStages = confirmedOrCurrentTestStages();
    body.selectedModels = selectedModelsFromStages(body.pipelineStages);
    body.processor = { type: normalizeProcessorType(confirmedTestProcessorType) };
    body.testProcessorType = normalizeProcessorType(confirmedTestProcessorType);
    if (kind === "image") {
      body.testMode = "image-debug";
      if (body.processor.type === "lpr") {
        const vehicleClassIds = firstStageClassIds(body.pipelineStages);
        if (vehicleClassIds) body.imageTest = { vehicleClassIds };
      }
    }
    return await api(`/api/test/${kind}`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  });
  renderCheckpoints(result.checkpoints || []);
  renderTestResults(kind, result);
  print(result);
}

function bboxStyle(bbox, imageWidth, imageHeight) {
  if (!bbox || !imageWidth || !imageHeight) return "";
  const left = Math.max(0, Math.min(100, (bbox.left / imageWidth) * 100));
  const top = Math.max(0, Math.min(100, (bbox.top / imageHeight) * 100));
  const width = Math.max(0, Math.min(100 - left, (bbox.width / imageWidth) * 100));
  const height = Math.max(0, Math.min(100 - top, (bbox.height / imageHeight) * 100));
  return [
    `left:${left}%`,
    `top:${top}%`,
    `width:${width}%`,
    `height:${height}%`
  ].join(";");
}

function bboxId(item) {
  const bbox = item?.bbox || {};
  return [
    item?.component || "",
    item?.label || "",
    Number(bbox.left || 0).toFixed(1),
    Number(bbox.top || 0).toFixed(1),
    Number(bbox.width || 0).toFixed(1),
    Number(bbox.height || 0).toFixed(1)
  ].join("|");
}

function imageOverlayDetections(events) {
  const overlays = [];
  const seen = new Set();
  function add(item, component = item.component, extra = {}) {
    if (!item?.bbox) return;
    const overlay = { ...item, ...extra, component: component || item.component };
    const id = bboxId(overlay);
    if (seen.has(id)) return;
    seen.add(id);
    overlays.push(overlay);
  }

  events
    .filter((event) => event.eventType === "image_detection" && event.stage === "final")
    .forEach((event) => add(event));
  events
    .filter((event) => event.eventType === "image_lpr_result")
    .forEach((event) => {
      add(event.vehicle, "vehicle_front");
      (event.plates || []).forEach((plate) => {
        add(plate, "plate_detector");
        (plate.charDetections || plate.ocrObjects || []).forEach((char) => add(char, "plate_ocr"));
      });
    });
  return overlays;
}

function renderTestResults(kind, result) {
  const events = result.events || [];
  if (!els.testResults) return;
  if (kind === "image") {
    const summary = [...events].reverse().find((event) => event.eventType === "image_frame_summary") || {};
    const lprResults = events.filter((event) => event.eventType === "image_lpr_result");
    const detections = imageOverlayDetections(events);
    const generic = normalizeProcessorType(result.processorType || summary.processorType) === "generic_detection";
    const imageUrl = result.mediaUrl || "/runtime/test-media/image/test_image.jpg";
    const width = Number(result.mediaWidth || summary.frameWidth || 1920);
    const height = Number(result.mediaHeight || summary.frameHeight || 1080);
    els.testResults.innerHTML = `
      <div class="image-result-layout">
        <div class="image-preview" data-frame-width="${width}" data-frame-height="${height}">
          <img src="${escapeHtml(imageUrl)}?t=${Date.now()}" alt="test image" />
          ${detections
            .sort((a, b) => (b.bbox?.width || 0) * (b.bbox?.height || 0) - (a.bbox?.width || 0) * (a.bbox?.height || 0))
            .map((event) => `
            <div class="bbox ${event.component}" style="${bboxStyle(event.bbox, width, height)}">
              <span>${escapeHtml(event.label || event.component)} ${(Number(event.confidence || 0) * 100).toFixed(1)}%</span>
            </div>
          `).join("")}
        </div>
        <div class="result-list">
          ${generic ? `
            <div class="metric-row">
              <strong>${summary.detectionCount || detections.length || 0}</strong><span>detections</span>
              <strong>${Object.keys(summary.countsByComponent || {}).length}</strong><span>components</span>
            </div>
            ${detections.map((event) => `
              <article class="result-card">
                <h3>${escapeHtml(event.label || event.component || "detection")}</h3>
                <p>${escapeHtml(event.component || "GIE")} - class ${escapeHtml(event.classId ?? "")}</p>
                <strong>${(Number(event.confidence || 0) * 100).toFixed(1)}%</strong>
              </article>
            `).join("") || '<div class="empty">No detection found.</div>'}
          ` : `
            <div class="metric-row">
              <strong>${summary.vehicleCount || 0}</strong><span>vehicles</span>
              <strong>${summary.plateCount || 0}</strong><span>plates</span>
              <strong>${summary.ocrObjectCount || 0}</strong><span>chars</span>
            </div>
            ${lprResults.map((event) => `
            <article class="result-card">
              <h3>${escapeHtml(event.vehicle?.label || "vehicle")}</h3>
              <p>Plate status: ${escapeHtml(event.plateStatus || "unknown")}</p>
              <strong>${escapeHtml(event.plateText || "No plate text")}</strong>
              ${(event.plates || []).map((plate) => `
                <small>${escapeHtml(plate.label)} ${(Number(plate.confidence || 0) * 100).toFixed(1)}% ${escapeHtml(plate.plateText || "")} (${plate.keptCharCount || 0}/${plate.rawCharCount || 0} chars kept)</small>
                <small>Kept: ${escapeHtml((plate.charDetections || []).map((char) => `${char.label}:${Number(char.normalizedConfidence || char.confidence || 0).toFixed(2)}`).join(" "))}</small>
                <small>Top raw: ${escapeHtml((plate.topRawCharDetections || []).slice(0, 10).map((char) => `${char.label}:${Number(char.normalizedConfidence || char.confidence || 0).toFixed(2)}`).join(" "))}</small>
              `).join("")}
            </article>
            `).join("") || '<div class="empty">No LPR result.</div>'}
          `}
        </div>
      </div>
    `;
    return;
  }

  const generic = normalizeProcessorType(result.processorType || events.find((event) => event.processorType)?.processorType) === "generic_detection";
  const videoEvents = events.filter((event) => generic
    ? event.eventType === "detection_capture"
    : event.eventType === "vehicle_capture" || event.plateText || event.objectId !== undefined);
  els.testResults.innerHTML = `
    <div class="result-list">
      <div class="metric-row">
        <strong>${videoEvents.length}</strong><span>${generic ? "detection events" : "vehicle events"}</span>
      </div>
      ${videoEvents.map((event) => `
        <article class="result-card">
          <h3>${escapeHtml(event.cameraName || event.cameraId || "video")}</h3>
          <p>Frame ${escapeHtml(event.frameNum ?? "")} - Object ${escapeHtml(event.objectId ?? "")}</p>
          <strong>${escapeHtml(generic ? event.label || event.component || "detection" : event.plateText || "No plate text")}</strong>
          ${event.zoneName ? `<small>Zone: ${escapeHtml(event.zoneName)} (${escapeHtml(event.zoneMode || "")})</small>` : ""}
          ${event.imagePath ? `<small>${escapeHtml(event.imagePath)}</small>` : ""}
        </article>
      `).join("") || `<div class="empty">No ${generic ? "detection" : "vehicle"} event detected.</div>`}
    </div>
  `;
}

async function buildModelSource(group, sourcePath, sourceName = "", sourceProfile = "yolo_detection", alreadyBuilt = false, button = null) {
  const forceRebuild = builderControl(group, "forceRebuild")?.checked || builderControl("factory", "forceRebuild")?.checked || false;
  if (alreadyBuilt && !forceRebuild) {
    const message = `${sourceName || "Selected model"} da build roi. Bat Force rebuild neu muon build lai.`;
    setTaskStatus(`model-${group}`, "success", message);
    print(message);
    return;
  }
  await buildModel(group, button, { sourcePath, profile: sourceProfile, forceRebuild, modelName: "", description: "" });
}

async function buildModel(group, button = null, overrides = {}) {
  const sourcePath = overrides.sourcePath || "";
  if (!sourcePath) {
    const message = `Bam Build tren source model ${modelGroupLabel(group)} can build.`;
    setTaskStatus(`model-${group}`, "failed", message);
    print(message);
    return;
  }
  const matched = (modelFiles.get(group) || []).find((file) => file.path === sourcePath);
  const forceRebuild = overrides.forceRebuild ?? (builderControl(group, "forceRebuild")?.checked || builderControl("factory", "forceRebuild")?.checked || false);
  if (matched?.built && !forceRebuild) {
    const message = `${matched.name} da build roi. Bat Force rebuild neu muon build lai.`;
    setTaskStatus(`model-${group}`, "success", message);
    print(message);
    return;
  }
  renderCheckpoints([
    { order: 1, label: "Build requested", status: "running", message: `Building ${group}...`, durationMs: null }
  ]);
  print(`Building ${matched?.name || group}. Viec nay co the mat vai phut tren Jetson...`);
  const result = await withTask(`model-${group}`, button, `Building ${group}...`, async () => {
    const job = await api(`/api/build/${group}`, {
      method: "POST",
      body: JSON.stringify(buildOptions(group, { ...overrides, sourcePath, forceRebuild }))
    });
    setTaskStatus(`model-${group}`, "running", `Job ${job.id} started.`);
    return await pollBuildJob(group, job.id);
  });
  renderCheckpoints(result.result?.checkpoints || result.checkpoints || []);
  setTaskStatus(`model-${group}`, "success", `Build completed for ${group}.`);
  print(result);
  await loadModelFiles(group);
}

async function pollBuildJob(group, jobId) {
  while (true) {
    await sleep(1000);
    const job = await api(`/api/jobs/${jobId}`);
    renderCheckpoints(job.checkpoints || []);
    if (job.status === "running" || job.status === "queued") {
      setTaskStatus(`model-${group}`, "running", job.message || `Job ${jobId} is running...`);
      print({
        jobId,
        status: job.status,
        message: job.message,
        checkpoints: job.checkpoints
      });
      continue;
    }
    if (job.status === "failed") {
      const error = new Error(job.error?.message || job.message || "Build failed.");
      error.body = { checkpoints: job.checkpoints || [] };
      throw error;
    }
    return job;
  }
}

async function viewBuildLog(group) {
  print(await apiText(`/api/build/${group}/log`));
}

async function saveConfig() {
  const result = await withTask("config", els.saveBtn, "Saving...", async () => {
    return await api("/api/config", { method: "PUT", body: JSON.stringify(formConfig()) });
  });
  renderConfig(result);
}

async function deploy() {
  renderCheckpoints([
    { order: 1, label: "Deploy requested", status: "running", message: "Starting deploy...", durationMs: null }
  ]);
  print("Deploying...");
  const result = await withTask("deploy", els.deployBtn, "Deploying...", async () => {
    return await api("/api/deploy", { method: "POST", body: JSON.stringify(formConfig()) });
  });
  renderCheckpoints(result.checkpoints || []);
  await refreshDeployStatus().catch(() => {});
  print(result);
}

async function stop(button = null) {
  const result = await withTask("stop", button, "Stopping...", async () => {
    return await api("/api/stop", { method: "POST" });
  });
  await refreshDeployStatus().catch(() => {});
  print(result);
}

async function loadEvents() {
  const result = await withTask("events", els.eventsBtn, "Loading events...", async () => {
    return await api("/api/events");
  });
  print(result);
}

function renderDeployStatus(status = {}) {
  if (!els.deployStatusCards) return;
  latestDeployStatus = status;
  const container = status.container || {};
  const deepstream = status.deepstream || {};
  const sources = deepstream.sources || [];
  const activeApp = deployApps.find((app) => app.active) || deployApps[0] || null;
  if (els.stopRunningDeployBtn) {
    els.stopRunningDeployBtn.disabled = !container.running;
    els.stopRunningDeployBtn.textContent = container.running
      ? `Stop ${activeApp?.name || "running app"}`
      : "Stop running app";
  }
  els.deployStatusCards.innerHTML = `
    <article class="deploy-status-card ${container.running ? "success" : ""}">
      <span>Active app</span>
      <strong>${escapeHtml(activeApp?.name || "No app selected")}</strong>
      <small>${escapeHtml(activeApp?.id || "Deploy an app to start runtime.")}</small>
    </article>
    <article class="deploy-status-card ${container.running ? "success" : "failed"}">
      <span>Container</span>
      <strong>${container.running ? "Running" : container.exists ? "Stopped" : "Missing"}</strong>
      <small>${escapeHtml(container.name || "deepstream-lpr")} ${escapeHtml(container.status || "")}</small>
    </article>
    <article class="deploy-status-card ${deepstream.started ? "success" : "failed"}">
      <span>DeepStream</span>
      <strong>${deepstream.started ? "Started" : escapeHtml(deepstream.state || "Unknown")}</strong>
      <small>${escapeHtml(deepstream.message || "No status file yet.")}</small>
    </article>
    ${sources.length ? sources.map((source) => `
      <article class="deploy-status-card">
        <span>${escapeHtml(source.cameraName || source.cameraId || `Source ${source.sourceId}`)}</span>
        <strong>${Number(source.fps || 0).toFixed(2)} FPS</strong>
        <small>${escapeHtml(source.cameraId || "")} - ${Number(source.frameCount || 0)} frames</small>
      </article>
    `).join("") : `
      <article class="deploy-status-card">
        <span>Sources</span>
        <strong>0.00 FPS</strong>
        <small>No source status yet.</small>
      </article>
    `}
  `;
  renderMainDashboard();
}

async function refreshDeployStatus(button = null) {
  const result = await withTask("deploy-monitor", button, "Refreshing deploy status...", async () => {
    return await api("/api/deploy/status");
  });
  renderDeployStatus(result);
  print(result);
  return result;
}

async function pollDeployStatus() {
  if (deployStatusPollInFlight || document.hidden) return;
  deployStatusPollInFlight = true;
  try {
    const result = await api("/api/deploy/status");
    renderDeployStatus(result);
  } catch {
    // Keep polling quiet; manual refresh still prints detailed errors.
  } finally {
    deployStatusPollInFlight = false;
  }
}

function startDeployStatusPolling() {
  if (deployStatusPollTimer) clearInterval(deployStatusPollTimer);
  deployStatusPollTimer = setInterval(pollDeployStatus, 1000);
}

async function init() {
  selectDashboardView("dashboard");
  renderModelBuilders();
  renderCheckpoints();
  updateRoiOutput();
  const config = await api("/api/config");
  await loadAllModelFiles().catch((error) => setTaskStatus("model-factory", "failed", error.message));
  renderConfig(config);
  await loadDeployCaptures().catch((error) => setTaskStatus("deploy-previews", "failed", error.message));
  await refreshDeployStatus().catch(() => {});
  await refreshAgent().catch((error) => setTaskStatus("agent", "failed", error.message));
  startDeployStatusPolling();
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-nav-view], [data-open-view]");
  if (!viewButton) return;
  selectDashboardView(viewButton.dataset.navView || viewButton.dataset.openView);
});

els.saveBtn.addEventListener("click", () => saveConfig().catch((error) => print(error.message)));
els.deployBtn.addEventListener("click", () => deploy().catch((error) => {
  renderCheckpoints(error.body?.checkpoints || []);
  print(error.message);
}));
els.eventsBtn.addEventListener("click", () => loadEvents().catch((error) => print(error.message)));
els.refreshDeployStatusBtn?.addEventListener("click", () => refreshDeployStatus(els.refreshDeployStatusBtn).catch((error) => print(error.message)));
els.stopRunningDeployBtn?.addEventListener("click", () => stop(els.stopRunningDeployBtn).catch((error) => print(error.message)));
els.addCameraBtn.addEventListener("click", () => {
  try {
    addCamera();
  } catch (error) {
    print(error.message);
  }
});
els.newCameraBtn.addEventListener("click", resetCameraSetting);
els.checkCameraSettingBtn.addEventListener("click", () => checkCameraSettingConnection(els.checkCameraSettingBtn).catch((error) => {
  setCameraSettingConnection("failed", error.message);
  print(error.message);
}));
els.openCameraSettingRoiBtn.addEventListener("click", openRoiTool);
[
  els.cameraSettingId,
  els.cameraSettingName,
  els.cameraSettingCooldown,
  els.cameraSettingRtsp,
  els.cameraSettingClassIds,
  els.cameraSettingEnabled
].forEach((input) => input.addEventListener("input", updateCameraSettingStatus));
els.cameraList.addEventListener("input", syncRoiCameraSelect);
els.cameraList.addEventListener("change", () => renderDeployApps(readDeployApps(), readCameraCards()));
els.addDeployAppBtn.addEventListener("click", () => {
  const current = readDeployApps();
  current.push(defaultDeployApp(current.length, readCameraCards()));
  renderDeployApps(current, readCameraCards());
});
els.addTestStageBtn.addEventListener("click", () => {
  addStageRow(els.testPipelineStages);
  bindStageActions(els.testPipelineStages);
});
els.confirmTestFlowBtn.addEventListener("click", confirmTestFlow);
els.testPipelineStages.addEventListener("change", (event) => {
  if (!event.target?.matches?.("[data-stage-field='selectedModel']")) return;
  event.target.dataset.selectedValue = event.target.value;
  hydrateStageLabelPickers(event.target.closest("[data-stage-row]") || els.testPipelineStages);
});
els.refreshDeployPreviewBtn.addEventListener("click", () => loadDeployCaptures(els.refreshDeployPreviewBtn).catch((error) => print(error.message)));
els.deployAppList.addEventListener("change", (event) => {
  if (event.target?.matches?.("[data-stage-field='selectedModel']")) {
    event.target.dataset.selectedValue = event.target.value;
    hydrateStageLabelPickers(event.target.closest("[data-stage-row]") || els.deployAppList);
    renderDeployApps(readDeployApps(), readCameraCards());
    return;
  }
  renderDeployApps(readDeployApps(), readCameraCards());
});
els.roiImageFile.addEventListener("change", loadRoiImage);
els.roiCameraSelect.addEventListener("change", openRoiTool);
els.roiZoneSelect?.addEventListener("change", () => selectZone(Number(els.roiZoneSelect.value || 0)));
els.newZoneBtn?.addEventListener("click", newZone);
els.addRoiRuleBtn?.addEventListener("click", addRoiRule);
[els.roiZoneName, els.roiZoneMode, els.roiZoneClassIds, els.roiZoneCooldown, els.roiZoneEnabled].forEach((input) => {
  input?.addEventListener("input", () => {
    persistZoneEditor();
  });
  input?.addEventListener("change", () => {
    persistZoneEditor();
  });
});
els.captureRoiFrameBtn.addEventListener("click", () => captureRoiFrame(els.captureRoiFrameBtn).catch((error) => print(error.message)));
els.closeRoiToolBtn.addEventListener("click", closeRoiTool);
els.roiCanvas.addEventListener("click", addRoiPoint);
els.undoRoiPointBtn.addEventListener("click", undoRoiPoint);
els.clearRoiBtn.addEventListener("click", clearRoiPolygon);
els.applyRoiBtn.addEventListener("click", () => applyRoiToCamera().catch((error) => print(error.message)));
els.removeRoiBtn.addEventListener("click", () => removeRoiFromCamera().catch((error) => print(error.message)));
els.uploadTestImageBtn.addEventListener("click", () => uploadTestMedia("image", els.uploadTestImageBtn).catch((error) => print(error.message)));
els.uploadTestVideoBtn.addEventListener("click", () => uploadTestMedia("video", els.uploadTestVideoBtn).catch((error) => print(error.message)));
els.runTestImageBtn.addEventListener("click", () => runTestMedia("image", els.runTestImageBtn).catch((error) => {
  renderCheckpoints(error.body?.checkpoints || []);
  print(error.message);
}));
els.runTestVideoBtn.addEventListener("click", () => runTestMedia("video", els.runTestVideoBtn).catch((error) => {
  renderCheckpoints(error.body?.checkpoints || []);
  print(error.message);
}));
els.copyOutputBtn.addEventListener("click", () => copyOutput().catch((error) => print(error.message)));
els.toggleOutputBtn.addEventListener("click", toggleOutput);
els.agentForm?.addEventListener("submit", (event) => sendAgentMessage(event).catch((error) => print(error.message)));
els.agentInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    els.agentForm?.requestSubmit();
  }
});
els.refreshAgentBtn?.addEventListener("click", () => refreshAgent().catch((error) => print(error.message)));
els.clearAgentMemoryBtn?.addEventListener("click", () => clearAgentMemory().catch((error) => print(error.message)));
els.clearAgentNotesBtn?.addEventListener("click", () => clearAgentMemory("notes").catch((error) => print(error.message)));
els.clearAgentLearnedMemoryBtn?.addEventListener("click", () => clearAgentMemory("memories").catch((error) => print(error.message)));
els.saveAgentNoteBtn?.addEventListener("click", () => saveAgentNote().catch((error) => print(error.message)));
els.agentMemoryList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-memory-action]");
  if (!button) return;
  const id = button.dataset.memoryId;
  const action = button.dataset.memoryAction;
  if (!id) return;
  if (action === "approve" || action === "reject") {
    decideAgentMemory(id, action).catch((error) => print(error.message));
  } else if (action === "delete-note") {
    deleteAgentMemoryItem(id, "note").catch((error) => print(error.message));
  } else if (action === "delete-memory") {
    deleteAgentMemoryItem(id, "memory").catch((error) => print(error.message));
  }
});
els.agentSettingsForm?.addEventListener("submit", (event) => saveAgentSettings(event).catch((error) => print(error.message)));
els.agentClearApiKey?.addEventListener("click", () => clearStoredAgentApiKey().catch((error) => {
  els.agentSettingsHint.textContent = error.message;
  print(error.message);
}));
els.testAgentKeyBtn?.addEventListener("click", () => testAgentKey().catch((error) => {
  els.agentSettingsHint.textContent = error.message;
  print(error.message);
}));
els.agentProvider?.addEventListener("change", renderAgentModelOptions);
els.agentModel?.addEventListener("change", () => {
  if (els.agentModel.value === "__custom__") els.agentCustomModel.focus();
  updateAgentParamVisibility();
});
els.agentCustomModel?.addEventListener("input", updateAgentParamVisibility);
els.agentApiKey?.addEventListener("input", () => {
  els.agentApiKey.type = "password";
});
init().catch((error) => print(error.message));
