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

const deepstreamPayloadFields = [
  { path: "__literal__", label: "User input" },
  { path: "__blank__", label: "Blank" },
  { path: "__uuid__", label: "UUID" },
  { path: "eventType", label: "Event type" },
  { path: "eventId", label: "Event ID" },
  { path: "ts", label: "Timestamp" },
  { path: "processorType", label: "Processor type" },
  { path: "cameraId", label: "Camera ID" },
  { path: "cameraName", label: "Camera name" },
  { path: "sourceId", label: "Source index" },
  { path: "stream", label: "RTSP stream" },
  { path: "zoneId", label: "Zone ID" },
  { path: "zoneName", label: "Zone name" },
  { path: "zoneMode", label: "Zone mode" },
  { path: "ruleId", label: "Rule ID" },
  { path: "ruleName", label: "Rule name" },
  { path: "ruleDirection", label: "Rule direction" },
  { path: "objectId", label: "Object ID" },
  { path: "classId", label: "Class ID" },
  { path: "frameNum", label: "Frame number" },
  { path: "frameWidth", label: "Frame width" },
  { path: "frameHeight", label: "Frame height" },
  { path: "plateText", label: "Plate text" },
  { path: "plateStatus", label: "Plate status" },
  { path: "imageUrl", label: "Image URL" },
  { path: "imageRelativePath", label: "Image relative path" },
  { path: "failedStage", label: "Failed stage" },
  { path: "failedModel", label: "Failed model" },
  { path: "failureReason", label: "Failure reason" },
  { path: "bbox.left", label: "BBox left" },
  { path: "bbox.top", label: "BBox top" },
  { path: "bbox.width", label: "BBox width" },
  { path: "bbox.height", label: "BBox height" },
  { path: "center.x", label: "Center X" },
  { path: "center.y", label: "Center Y" },
  { path: "footCenter.x", label: "Foot center X" },
  { path: "footCenter.y", label: "Foot center Y" },
  { path: "plates.0.label", label: "First plate label" },
  { path: "plates.0.confidence", label: "First plate confidence" },
  { path: "plates.0.rawPlateText", label: "First plate raw text" },
  { path: "plates.0.ocrStatus", label: "First plate OCR status" }
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
  roiPolygonModeBtn: document.querySelector("#roiPolygonModeBtn"),
  roiRectangleModeBtn: document.querySelector("#roiRectangleModeBtn"),
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
  agentSettingsHint: document.querySelector("#agentSettingsHint"),
  refreshAutomationBtn: document.querySelector("#refreshAutomationBtn"),
  saveAutomationBtn: document.querySelector("#saveAutomationBtn"),
  automationServiceName: document.querySelector("#automationServiceName"),
  automationServiceType: document.querySelector("#automationServiceType"),
  automationServiceEnv: document.querySelector("#automationServiceEnv"),
  automationServiceTimeout: document.querySelector("#automationServiceTimeout"),
  automationServiceEndpoint: document.querySelector("#automationServiceEndpoint"),
  automationServiceScript: document.querySelector("#automationServiceScript"),
  automationServiceCommand: document.querySelector("#automationServiceCommand"),
  automationServiceParams: document.querySelector("#automationServiceParams"),
  addAutomationServiceBtn: document.querySelector("#addAutomationServiceBtn"),
  automationServiceList: document.querySelector("#automationServiceList"),
  automationEnvName: document.querySelector("#automationEnvName"),
  automationEnvType: document.querySelector("#automationEnvType"),
  automationEnvWorkingDir: document.querySelector("#automationEnvWorkingDir"),
  automationEnvPythonPath: document.querySelector("#automationEnvPythonPath"),
  automationEnvVars: document.querySelector("#automationEnvVars"),
  addAutomationEnvBtn: document.querySelector("#addAutomationEnvBtn"),
  automationEnvList: document.querySelector("#automationEnvList"),
  automationWorkflowName: document.querySelector("#automationWorkflowName"),
  automationWorkflowEvent: document.querySelector("#automationWorkflowEvent"),
  automationWorkflowDelay: document.querySelector("#automationWorkflowDelay"),
  automationWorkflowService: document.querySelector("#automationWorkflowService"),
  automationWorkflowFilters: document.querySelector("#automationWorkflowFilters"),
  automationWorkflowParams: document.querySelector("#automationWorkflowParams"),
  automationWorkflowEnabled: document.querySelector("#automationWorkflowEnabled"),
  addAutomationWorkflowBtn: document.querySelector("#addAutomationWorkflowBtn"),
  automationWorkflowList: document.querySelector("#automationWorkflowList"),
  refreshAutomationRunsBtn: document.querySelector("#refreshAutomationRunsBtn"),
  clearAutomationRunsBtn: document.querySelector("#clearAutomationRunsBtn"),
  automationRunList: document.querySelector("#automationRunList"),
  refreshConnectionsBtn: document.querySelector("#refreshConnectionsBtn"),
  saveConnectionsBtn: document.querySelector("#saveConnectionsBtn"),
  connectionStatusCards: document.querySelector("#connectionStatusCards"),
  connectionProviderList: document.querySelector("#connectionProviderList"),
  connectionChannelName: document.querySelector("#connectionChannelName"),
  connectionChannelProvider: document.querySelector("#connectionChannelProvider"),
  connectionChannelType: document.querySelector("#connectionChannelType"),
  connectionChannelDescription: document.querySelector("#connectionChannelDescription"),
  addConnectionChannelBtn: document.querySelector("#addConnectionChannelBtn"),
  connectionChannelList: document.querySelector("#connectionChannelList"),
  connectionInspectChannel: document.querySelector("#connectionInspectChannel"),
  connectionInspectSort: document.querySelector("#connectionInspectSort"),
  connectionInspectLimit: document.querySelector("#connectionInspectLimit"),
  inspectConnectionChannelBtn: document.querySelector("#inspectConnectionChannelBtn"),
  connectionMessageViewer: document.querySelector("#connectionMessageViewer"),
  refreshServicesBtn: document.querySelector("#refreshServicesBtn"),
  serviceCatalogList: document.querySelector("#serviceCatalogList"),
  servicePackageSelect: document.querySelector("#servicePackageSelect"),
  serviceInstanceName: document.querySelector("#serviceInstanceName"),
  serviceInstanceEnabled: document.querySelector("#serviceInstanceEnabled"),
  serviceDynamicConfig: document.querySelector("#serviceDynamicConfig"),
  serviceMessageEnabled: document.querySelector("#serviceMessageEnabled"),
  serviceInputChannel: document.querySelector("#serviceInputChannel"),
  serviceInputMode: document.querySelector("#serviceInputMode"),
  serviceOutputChannel: document.querySelector("#serviceOutputChannel"),
  serviceOutputMode: document.querySelector("#serviceOutputMode"),
  serviceConsumerGroup: document.querySelector("#serviceConsumerGroup"),
  serviceConsumerName: document.querySelector("#serviceConsumerName"),
  saveServiceInstanceBtn: document.querySelector("#saveServiceInstanceBtn"),
  resetServiceEditorBtn: document.querySelector("#resetServiceEditorBtn"),
  serviceInstanceList: document.querySelector("#serviceInstanceList"),
  serviceOutputViewer: document.querySelector("#serviceOutputViewer"),
  automationServiceInputChannel: document.querySelector("#automationServiceInputChannel"),
  automationServiceOutputChannel: document.querySelector("#automationServiceOutputChannel"),
  automationServiceInputMode: document.querySelector("#automationServiceInputMode"),
  automationServiceOutputMode: document.querySelector("#automationServiceOutputMode"),
  automationWorkflowInputChannel: document.querySelector("#automationWorkflowInputChannel"),
  refreshTritonBtn: document.querySelector("#refreshTritonBtn"),
  startTritonBtn: document.querySelector("#startTritonBtn"),
  stopTritonBtn: document.querySelector("#stopTritonBtn"),
  tritonStatusCards: document.querySelector("#tritonStatusCards"),
  tritonModelName: document.querySelector("#tritonModelName"),
  tritonModelVersion: document.querySelector("#tritonModelVersion"),
  tritonModelPlatform: document.querySelector("#tritonModelPlatform"),
  tritonMaxBatchSize: document.querySelector("#tritonMaxBatchSize"),
  tritonDecoderProfile: document.querySelector("#tritonDecoderProfile"),
  tritonModelFile: document.querySelector("#tritonModelFile"),
  tritonConfigFile: document.querySelector("#tritonConfigFile"),
  tritonLabelsFile: document.querySelector("#tritonLabelsFile"),
  uploadTritonModelBtn: document.querySelector("#uploadTritonModelBtn"),
  tritonModelList: document.querySelector("#tritonModelList"),
  tritonInferModel: document.querySelector("#tritonInferModel"),
  tritonInferVersion: document.querySelector("#tritonInferVersion"),
  tritonInferUrl: document.querySelector("#tritonInferUrl"),
  copyTritonInferUrlBtn: document.querySelector("#copyTritonInferUrlBtn"),
  loadTritonMetadataBtn: document.querySelector("#loadTritonMetadataBtn"),
  sampleTritonPayloadBtn: document.querySelector("#sampleTritonPayloadBtn"),
  tritonInferPayload: document.querySelector("#tritonInferPayload"),
  testTritonInferBtn: document.querySelector("#testTritonInferBtn"),
  dummyTritonInferBtn: document.querySelector("#dummyTritonInferBtn"),
  tritonInferImage: document.querySelector("#tritonInferImage"),
  tritonInferChannelOrder: document.querySelector("#tritonInferChannelOrder"),
  tritonInferScaleMode: document.querySelector("#tritonInferScaleMode"),
  tritonInferResizeMode: document.querySelector("#tritonInferResizeMode"),
  tritonInferDecoderProfile: document.querySelector("#tritonInferDecoderProfile"),
  tritonInferConfidence: document.querySelector("#tritonInferConfidence"),
  tritonInferIou: document.querySelector("#tritonInferIou"),
  testTritonImageInferBtn: document.querySelector("#testTritonImageInferBtn"),
  tritonImagePreview: document.querySelector("#tritonImagePreview"),
  tritonImageCanvas: document.querySelector("#tritonImageCanvas"),
  tritonDetectionList: document.querySelector("#tritonDetectionList"),
  tritonInferOutput: document.querySelector("#tritonInferOutput")
};

let cameraDrafts = [];
let deployApps = [];
let deployCaptures = [];
let activeDeployAppId = "";
let confirmedTestPipelineStages = [];
let confirmedTestProcessorType = "lpr";
let latestDeployStatus = {};
const roiTool = {
  image: null,
  source: "",
  points: [],
  zoneIndex: 0,
  drawMode: "polygon",
  rectStart: null,
  previewPoint: null
};
const tasks = new Map();
const modelFiles = new Map();
let modelLibraryGroups = [];
let pendingModelDraft = null;
let editingModelConfig = null;
let deployStatusPollTimer = null;
let deployStatusPollInFlight = false;
const agentThreadId = "default";
let agentMessages = [];
let agentSettings = null;
let automationConfig = { services: [], environments: [], workflows: [] };
let automationRuns = [];
let connectionsConfig = { providers: {}, channels: [] };
let connectionsStatus = { providers: {}, channels: [] };
let serviceCatalog = [];
let serviceInstances = [];
let editingServiceInstanceId = "";
let latestTriton = { status: {}, models: [] };
let latestTritonMetadata = null;
let latestTritonMetadataKey = "";

function print(value) {
  els.output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function copyText(text) {
  const value = String(text || "");
  if (!value) throw new Error("Nothing to copy.");
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Browser blocked clipboard access. Select and copy the text manually.");
}

async function copyOutput() {
  await copyText(els.output.textContent || "");
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
  triton: "Triton Server",
  connections: "Connections",
  services: "Services",
  tests: "Test Lab",
  agent: "Operator Agent",
  automation: "Automation",
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
  if (next === "automation") refreshAutomation().catch((error) => setTaskStatus("automation", "failed", error.message));
  if (next === "triton") refreshTriton().catch((error) => setTaskStatus("triton", "failed", error.message));
  if (next === "connections") refreshConnections().catch((error) => setTaskStatus("connections", "failed", error.message));
  if (next === "services") refreshServices().catch((error) => setTaskStatus("services", "failed", error.message));
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
  const statusApps = Array.isArray(latestDeployStatus.apps) && latestDeployStatus.apps.length
    ? latestDeployStatus.apps
    : (latestDeployStatus.appId ? [latestDeployStatus] : []);
  const configuredApps = deployApps.length ? deployApps : [];
  const statusById = new Map(statusApps.map((item) => [item.appId || item.id || "default", item]));
  const apps = (configuredApps.length ? configuredApps : statusApps).map((app, index) => {
    const appId = app.id || app.appId || `deepstream-app-${index + 1}`;
    const status = statusById.get(appId) || {};
    const container = status.container || {};
    const deepstream = status.deepstream || {};
    const sources = deepstream.sources || [];
    return {
      ...app,
      id: appId,
      name: app.name || status.appName || appId,
      status,
      container,
      deepstream,
      sources,
      running: Boolean(container.running),
      started: Boolean(deepstream.started || deepstream.state === "playing"),
      fps: sources.reduce((sum, source) => sum + Number(source.fps || 0), 0)
    };
  });
  const activeId = latestDeployStatus.appId || activeDeployAppId || configuredApps.find((item) => item.active)?.id || apps[0]?.id || "";
  const activeApp = apps.find((item) => item.id === activeId) || apps.find((item) => item.active) || apps[0] || null;
  const sources = apps.flatMap((app) => app.sources.map((source) => ({ ...source, appId: app.id, appName: app.name })));
  return {
    apps,
    activeApp,
    sources,
    runningApps: apps.filter((app) => app.running).length,
    startedApps: apps.filter((app) => app.started).length,
    totalFps: apps.reduce((sum, app) => sum + app.fps, 0)
  };
}

function renderMainDashboard() {
  if (!els.dashboardOverview) return;
  const cameras = readCameraCards();
  const enabledCameras = cameras.filter((camera) => camera.enabled !== false);
  const camerasWithRoi = cameras.filter((camera) => cameraZones(camera).some((zone) => cleanZonePolygon(zone.polygon).length >= 3));
  const modelStats = modelLibraryStats();
  const deploy = dashboardDeploySummary();
  const automation = automationConfig || {};
  const testStages = confirmedTestPipelineStages.length ? normalizePipelineStages(confirmedTestPipelineStages) : [];
  const running = deploy.runningApps > 0;
  const started = deploy.startedApps > 0;
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
        <strong>${deploy.runningApps}/${deploy.apps.length || 0} running</strong>
        <small>${started ? `${deploy.startedApps} pipeline(s) started - ${deploy.totalFps.toFixed(2)} FPS` : "Deploy an app to start the pipeline."}</small>
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
      <article class="dashboard-kpi ${(automation.workflows || []).some((item) => item.enabled !== false) ? "success" : "warning"}">
        <span>Automation</span>
        <strong>${(automation.workflows || []).length}</strong>
        <small>${(automation.services || []).length} service(s), ${(automation.workflows || []).filter((item) => item.enabled !== false).length} enabled workflow(s)</small>
      </article>
      <article class="dashboard-kpi ${serviceInstances.length ? "success" : "warning"}">
        <span>Services</span>
        <strong>${serviceInstances.length}</strong>
        <small>${serviceCatalog.length} package(s), ${serviceInstances.filter((item) => item.enabled !== false).length} enabled instance(s)</small>
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
            <h3>Deploy apps</h3>
            <p>${escapeHtml(sourceText)}</p>
          </div>
          <div class="dashboard-actions">
            <button type="button" class="secondary" data-open-view="deploy">Configure</button>
            <a class="button-link secondary" href="/results">Results</a>
          </div>
        </div>
        <div class="dashboard-list">
          ${deploy.apps.length ? deploy.apps.map((app) => {
            const selectedDeployCameras = new Set(app.cameraIds || []);
            const deployStageCount = app.pipelineStages?.length
              ? normalizePipelineStages(app.pipelineStages).filter((stage) => stage.enabled).length
              : 0;
            return `
              <article class="dashboard-stage-row">
                <strong>${escapeHtml(app.name || app.id)}</strong>
                <span class="dashboard-list-meta">${escapeHtml(app.id)} - ${app.fps.toFixed(2)} FPS - ${app.sources.length} source(s)</span>
                <div class="dashboard-tags">
                  ${dashboardTag(app.running ? "container running" : app.container.exists ? "container stopped" : "container missing", app.running ? "success" : "warning")}
                  ${dashboardTag(app.started ? "DeepStream started" : "DeepStream not started", app.started ? "success" : "warning")}
                  ${dashboardTag(processorLabel(app.processorType))}
                  ${dashboardTag(`${selectedDeployCameras.size} camera(s)`)}
                  ${dashboardTag(`${deployStageCount} stage(s)`)}
                </div>
              </article>
            `;
          }).join("") : '<div class="empty">No deploy app configured yet.</div>'}
          ${deploy.sources.map((source) => `
            <article class="dashboard-stage-row">
              <strong>${escapeHtml(source.cameraName || source.cameraId || `Source ${source.sourceId}`)}</strong>
              <span class="dashboard-list-meta">${escapeHtml(source.appName || source.appId || "")} - ${Number(source.fps || 0).toFixed(2)} FPS - ${Number(source.frameCount || 0)} frames</span>
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

function parseJsonField(input, fallback = {}) {
  const raw = typeof input === "string" ? input : input?.value;
  if (!String(raw || "").trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`JSON khong hop le: ${error.message}`);
  }
}

function serviceManifestById(serviceId) {
  return serviceCatalog.find((item) => item.id === serviceId) || null;
}

function serviceFieldDefault(field) {
  if (field.default !== undefined && field.default !== null) return field.default;
  if (field.type === "json") return [];
  if (field.type === "number") return "";
  if (field.type === "checkbox") return false;
  return "";
}

function serviceFieldValue(config, field) {
  return config && Object.prototype.hasOwnProperty.call(config, field.key)
    ? config[field.key]
    : serviceFieldDefault(field);
}

function serviceFieldInput(field, value, config = {}) {
  const key = escapeHtml(field.key);
  const label = `${escapeHtml(field.label || field.key)}${field.required ? " *" : ""}`;
  const help = field.help ? `<small>${escapeHtml(field.help)}</small>` : "";
  if (field.type === "select") {
    return `
      <label>${label}
        <select data-service-config-key="${key}" data-service-config-type="select">
          ${(field.options || []).map((option) => `
            <option value="${escapeHtml(option.value)}" ${String(value) === String(option.value) ? "selected" : ""}>${escapeHtml(option.label || option.value)}</option>
          `).join("")}
        </select>
        ${help}
      </label>
    `;
  }
  if (field.type === "cameraSelect") {
    const cameras = readCameraCards();
    return `
      <label>${label}
        <select data-service-config-key="${key}" data-service-config-type="cameraSelect">
          <option value="">Choose camera</option>
          ${cameras.map((camera, index) => `
            <option value="${escapeHtml(camera.id || `camera-${index + 1}`)}" ${String(value) === String(camera.id) ? "selected" : ""}>${escapeHtml(camera.name || camera.id || `Camera ${index + 1}`)}</option>
          `).join("")}
        </select>
        ${help}
      </label>
      <div class="service-camera-summary" data-service-camera-summary="${key}"></div>
    `;
  }
  if (field.type === "zoneSelect") {
    const cameraId = config[field.cameraField || "selectedCameraId"] || "";
    const camera = readCameraCards().find((item) => String(item.id || "") === String(cameraId || ""));
    const zones = Array.isArray(camera?.zones) ? camera.zones : [];
    return `
      <label>${label}
        <select data-service-config-key="${key}" data-service-config-type="zoneSelect" data-zone-camera-field="${escapeHtml(field.cameraField || "selectedCameraId")}">
          <option value="">Choose zone</option>
          ${zones.map((zone, index) => `
            <option value="${escapeHtml(zone.id || `zone-${index + 1}`)}" ${String(value) === String(zone.id || `zone-${index + 1}`) ? "selected" : ""}>${escapeHtml(zone.name || zone.id || `Zone ${index + 1}`)} (${Array.isArray(zone.polygon) ? zone.polygon.length : 0} points)</option>
          `).join("")}
        </select>
        ${help || `<small>${camera ? "Zones are loaded from the selected camera." : "Select a camera first to load zones."}</small>`}
      </label>
    `;
  }
  if (field.type === "json" || field.type === "polygon") {
    const text = typeof value === "string" ? value : JSON.stringify(value ?? serviceFieldDefault(field), null, 2);
    return `
      <label class="service-config-wide">${label}
        <textarea data-service-config-key="${key}" data-service-config-type="json" rows="${Number(field.rows || 4)}">${escapeHtml(text)}</textarea>
        ${help}
      </label>
    `;
  }
  if (field.type === "checkbox") {
    return `
      <label class="inline-check">
        <input data-service-config-key="${key}" data-service-config-type="checkbox" type="checkbox" ${value ? "checked" : ""} />
        ${label}
        ${help}
      </label>
    `;
  }
  const inputType = field.type === "number" ? "number" : "text";
  const attrs = [
    field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : "",
    field.min !== undefined ? `min="${escapeHtml(field.min)}"` : "",
    field.max !== undefined ? `max="${escapeHtml(field.max)}"` : "",
    field.step !== undefined ? `step="${escapeHtml(field.step)}"` : ""
  ].filter(Boolean).join(" ");
  return `
    <label>${label}
      <input data-service-config-key="${key}" data-service-config-type="${escapeHtml(field.type || inputType)}" type="${inputType}" value="${escapeHtml(value ?? "")}" ${attrs} />
      ${help}
    </label>
  `;
}

function renderServiceConfigForm(config = {}) {
  if (!els.serviceDynamicConfig || !els.servicePackageSelect) return;
  const manifest = serviceManifestById(els.servicePackageSelect.value);
  if (!manifest) {
    els.serviceDynamicConfig.innerHTML = '<div class="empty">No service package selected.</div>';
    return;
  }
  const fields = manifest.configSchema || [];
  els.serviceDynamicConfig.innerHTML = fields.length ? `
    <div class="service-config-grid">
      ${fields.map((field) => serviceFieldInput(field, serviceFieldValue(config, field), config)).join("")}
    </div>
  ` : '<div class="empty">This service does not expose configurable fields.</div>';
  renderServiceCameraSummaries();
}

function readServiceConfigForm() {
  const manifest = serviceManifestById(els.servicePackageSelect?.value);
  const config = {};
  if (!manifest || !els.serviceDynamicConfig) return config;
  for (const field of manifest.configSchema || []) {
    const input = els.serviceDynamicConfig.querySelector(`[data-service-config-key="${CSS.escape(field.key)}"]`);
    if (!input) continue;
    if (field.type === "json" || field.type === "polygon") {
      config[field.key] = parseJsonField(input, serviceFieldDefault(field));
    } else if (field.type === "number") {
      config[field.key] = input.value === "" ? "" : Number(input.value);
    } else if (field.type === "checkbox") {
      config[field.key] = input.checked;
    } else {
      config[field.key] = input.value;
    }
  }
  return config;
}

function cameraSummaryHtml(cameraId) {
  const camera = readCameraCards().find((item) => String(item.id || "") === String(cameraId || ""));
  if (!camera) return '<div class="empty compact">No camera selected from Cameras & ROI.</div>';
  const zones = Array.isArray(camera.zones) ? camera.zones : [];
  const frame = frameSizeSummary(camera.id);
  return `
    <article class="service-camera-card">
      <strong>${escapeHtml(camera.name || camera.id)}</strong>
      <span>${escapeHtml(camera.id || "")} · ${escapeHtml(frame)}</span>
      <small>${escapeHtml(camera.rtspUrl || "No RTSP URL")}</small>
      <div class="dashboard-tags">
        ${dashboardTag(camera.enabled !== false ? "enabled" : "disabled", camera.enabled !== false ? "success" : "warning")}
        ${dashboardTag(`${zones.length} zone(s)`, zones.length ? "success" : "warning")}
      </div>
    </article>
  `;
}

function renderServiceCameraSummaries() {
  els.serviceDynamicConfig?.querySelectorAll("[data-service-config-type='cameraSelect']").forEach((select) => {
    const target = els.serviceDynamicConfig.querySelector(`[data-service-camera-summary="${CSS.escape(select.dataset.serviceConfigKey)}"]`);
    if (target) target.innerHTML = cameraSummaryHtml(select.value);
  });
}

function serviceStatusTag(instance) {
  const state = instance?.status?.state || "saved";
  const tone = ["success", "started"].includes(state) ? "success" : state === "failed" ? "warning" : "";
  return `<span class="dashboard-tag ${tone}">${escapeHtml(state)}</span>`;
}

function renderServiceChannelOptions(bindings = {}) {
  const options = `<option value="">No channel</option>${(connectionsConfig.channels || []).map((channel) => `
    <option value="${escapeHtml(channel.id)}">${escapeHtml(channel.name)} (${escapeHtml(channel.provider)} ${escapeHtml(channel.type)})</option>
  `).join("")}`;
  if (els.serviceInputChannel) {
    els.serviceInputChannel.innerHTML = options;
    els.serviceInputChannel.value = bindings.inputChannelId || "";
  }
  if (els.serviceOutputChannel) {
    els.serviceOutputChannel.innerHTML = options;
    els.serviceOutputChannel.value = bindings.outputChannelId || "";
  }
  if (els.serviceMessageEnabled) els.serviceMessageEnabled.checked = bindings.enabled === true;
  if (els.serviceInputMode) els.serviceInputMode.value = bindings.inputMode || "";
  if (els.serviceOutputMode) els.serviceOutputMode.value = bindings.outputMode || "";
  if (els.serviceConsumerGroup) els.serviceConsumerGroup.value = bindings.groupName || "";
  if (els.serviceConsumerName) els.serviceConsumerName.value = bindings.consumerName || "";
}

function readServiceBindingsForm() {
  return {
    enabled: els.serviceMessageEnabled?.checked === true,
    inputChannelId: els.serviceInputChannel?.value || "",
    inputMode: els.serviceInputMode?.value || "",
    outputChannelId: els.serviceOutputChannel?.value || "",
    outputMode: els.serviceOutputMode?.value || "",
    groupName: els.serviceConsumerGroup?.value.trim() || "",
    consumerName: els.serviceConsumerName?.value.trim() || ""
  };
}

function serviceBindingSummary(bindings = {}) {
  if (!bindings.enabled) return "message bus off";
  const parts = [];
  if (bindings.inputChannelId) parts.push(`in ${channelName(bindings.inputChannelId)} (${bindings.inputMode || "mode?"})`);
  if (bindings.outputChannelId) parts.push(`out ${channelName(bindings.outputChannelId)} (${bindings.outputMode || "mode?"})`);
  return parts.length ? parts.join(" / ") : "message bus enabled, no channel";
}

function renderServices() {
  if (!els.serviceCatalogList) return;
  const selectedPackage = els.servicePackageSelect?.value || serviceCatalog[0]?.id || "";
  if (els.servicePackageSelect) {
    els.servicePackageSelect.innerHTML = serviceCatalog.length
      ? serviceCatalog.map((manifest) => `<option value="${escapeHtml(manifest.id)}" ${manifest.id === selectedPackage ? "selected" : ""}>${escapeHtml(manifest.name)}</option>`).join("")
      : '<option value="">No service package</option>';
  }
  els.serviceCatalogList.innerHTML = serviceCatalog.length ? serviceCatalog.map((manifest) => `
    <article class="service-package-row">
      <div>
        <strong>${escapeHtml(manifest.name)}</strong>
        <span>${escapeHtml(manifest.id)} · v${escapeHtml(manifest.version)} · ${escapeHtml(manifest.runtime)}</span>
        <small>${escapeHtml(manifest.description || "No description.")}</small>
      </div>
      <button type="button" class="secondary" data-use-service-package="${escapeHtml(manifest.id)}">Use</button>
    </article>
  `).join("") : '<div class="empty">No service package found in deepstream-lpr-app/services.</div>';

  els.serviceInstanceList.innerHTML = serviceInstances.length ? serviceInstances.map((instance) => {
    const manifest = serviceManifestById(instance.serviceId);
    return `
      <article class="service-instance-row">
        <div class="service-instance-head">
          <div>
            <strong>${escapeHtml(instance.name)}</strong>
            <span>${escapeHtml(manifest?.name || instance.serviceId)} · ${escapeHtml(instance.id)}</span>
          </div>
          <div class="dashboard-tags">
            ${serviceStatusTag(instance)}
            ${instance.enabled ? dashboardTag("enabled", "success") : dashboardTag("disabled", "warning")}
          </div>
        </div>
        <small>${escapeHtml(instance.status?.message || "Saved.")} · ${escapeHtml(serviceBindingSummary(instance.bindings || {}))}</small>
        ${instance.status?.output ? `<pre>${escapeHtml(instance.status.output)}</pre>` : ""}
        <div class="actions inline-actions">
          <button type="button" class="secondary" data-edit-service-instance="${escapeHtml(instance.id)}">Edit</button>
          <button type="button" data-service-action="install" data-service-instance="${escapeHtml(instance.id)}">Install</button>
          <button type="button" data-service-action="test" data-service-instance="${escapeHtml(instance.id)}">Test</button>
          <button type="button" data-service-action="start" data-service-instance="${escapeHtml(instance.id)}">Start</button>
          <button type="button" class="secondary" data-service-action="stop" data-service-instance="${escapeHtml(instance.id)}">Stop</button>
          <button type="button" class="secondary" data-view-service-outputs="${escapeHtml(instance.id)}">View outputs</button>
          <button type="button" class="danger" data-delete-service-instance="${escapeHtml(instance.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("") : '<div class="empty">No service instance yet. Choose a package, fill config and save an instance.</div>';
  renderServiceChannelOptions(editingServiceInstanceId ? serviceInstances.find((item) => item.id === editingServiceInstanceId)?.bindings || {} : {});
}

function resetServiceEditor(serviceId = "") {
  editingServiceInstanceId = "";
  if (els.servicePackageSelect && serviceId) els.servicePackageSelect.value = serviceId;
  if (els.serviceInstanceName) els.serviceInstanceName.value = "";
  if (els.serviceInstanceEnabled) els.serviceInstanceEnabled.checked = true;
  renderServiceConfigForm({});
  renderServiceChannelOptions({});
}

function editServiceInstance(instanceId) {
  const instance = serviceInstances.find((item) => item.id === instanceId);
  if (!instance) return;
  editingServiceInstanceId = instance.id;
  els.servicePackageSelect.value = instance.serviceId;
  els.serviceInstanceName.value = instance.name || "";
  els.serviceInstanceEnabled.checked = instance.enabled !== false;
  renderServiceConfigForm(instance.config || {});
  renderServiceChannelOptions(instance.bindings || {});
  setTaskStatus("services", "running", `Editing ${instance.name}.`);
}

async function refreshServices(button = null) {
  const result = await withTask("services", button, "Loading services...", async () => api("/api/services"));
  serviceCatalog = result.catalog || [];
  serviceInstances = result.instances || [];
  renderServices();
  renderServiceConfigForm(editingServiceInstanceId ? serviceInstances.find((item) => item.id === editingServiceInstanceId)?.config || {} : {});
  renderServiceChannelOptions(editingServiceInstanceId ? serviceInstances.find((item) => item.id === editingServiceInstanceId)?.bindings || {} : {});
  return result;
}

async function saveServiceInstance(button = null) {
  const manifest = serviceManifestById(els.servicePackageSelect?.value);
  if (!manifest) throw new Error("Choose a service package first.");
  const payload = {
    serviceId: manifest.id,
    name: els.serviceInstanceName.value.trim() || manifest.name,
    enabled: els.serviceInstanceEnabled.checked,
    config: readServiceConfigForm(),
    bindings: readServiceBindingsForm()
  };
  const result = await withTask("services", button, "Saving service instance...", async () => {
    if (editingServiceInstanceId) {
      return api(`/api/services/instances/${encodeURIComponent(editingServiceInstanceId)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    }
    return api("/api/services/instances", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  });
  serviceInstances = result.instances || serviceInstances;
  editingServiceInstanceId = result.instance?.id || "";
  renderServices();
  setTaskStatus("services", "success", "Service instance saved.");
}

async function runServiceInstanceAction(instanceId, action, button = null) {
  const result = await withTask("services", button, `${action} service...`, async () => api(`/api/services/instances/${encodeURIComponent(instanceId)}/${encodeURIComponent(action)}`, {
    method: "POST",
    body: JSON.stringify({})
  }));
  await refreshServices();
  if (["test", "start"].includes(action)) await loadServiceOutputs(instanceId).catch(() => {});
  print(result);
}

async function deleteServiceInstance(instanceId) {
  const result = await withTask("services", null, "Deleting service instance...", async () => api(`/api/services/instances/${encodeURIComponent(instanceId)}`, { method: "DELETE" }));
  serviceInstances = result.instances || [];
  if (editingServiceInstanceId === instanceId) resetServiceEditor();
  renderServices();
}

function renderServiceOutputs(result = null) {
  if (!els.serviceOutputViewer) return;
  if (!result) {
    els.serviceOutputViewer.innerHTML = '<div class="empty">Choose View outputs from a service instance.</div>';
    return;
  }
  const instance = serviceInstances.find((item) => item.id === result.instanceId);
  const files = Array.isArray(result.files) ? result.files : [];
  const events = Array.isArray(result.events) ? result.events : [];
  els.serviceOutputViewer.innerHTML = `
    <div class="service-output-head">
      <div>
        <strong>${escapeHtml(instance?.name || result.instanceId)}</strong>
        <span>${escapeHtml(result.outputDir || "")}</span>
      </div>
      <b>${files.length} image(s), ${events.length} event(s)</b>
    </div>
    <div class="service-output-grid">
      ${files.length ? files.map((file) => `
        <article class="service-output-card">
          <a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(file.url)}" alt="${escapeHtml(file.fileName)}" loading="lazy" />
          </a>
          <div>
            ${serviceOutputSummaryMarkup(file.event)}
            <strong>${escapeHtml(file.fileName)}</strong>
            <span>${new Date(file.createdAt).toLocaleString()}</span>
            <small>${Number(file.size || 0).toLocaleString()} bytes</small>
          </div>
        </article>
      `).join("") : '<div class="empty">No image output yet.</div>'}
    </div>
  `;
}

function serviceOutputSummaryMarkup(event = null) {
  if (!event) return '<strong>No result metadata</strong>';
  const value = event.weight ?? event.text ?? event.payload?.weight ?? event.payload?.weight_text ?? "";
  const title = event.ok === false ? "No valid result" : (value === "" ? "Result" : value);
  const method = event.selectionMethod ? ` · ${event.selectionMethod}` : "";
  return `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(event.analysisCode || event.crop?.zoneName || "")}${escapeHtml(method)}</span>
    <small>${escapeHtml(event.event?.eventId || event.payload?.trigger_event_id || "")}</small>
  `;
}

async function loadServiceOutputs(instanceId, button = null) {
  const result = await withTask("services", button, "Loading service outputs...", async () => api(`/api/services/instances/${encodeURIComponent(instanceId)}/outputs?limit=80`));
  renderServiceOutputs(result);
  return result;
}

function renderAutomation() {
  if (!els.automationServiceList) return;
  const environments = automationConfig.environments || [];
  const services = automationConfig.services || [];
  const workflows = automationConfig.workflows || [];
  const channels = connectionsConfig.channels || [];
  const channelOptions = `<option value="">No channel</option>${channels.map((channel) => (
    `<option value="${escapeHtml(channel.id)}">${escapeHtml(channel.name)} (${escapeHtml(channel.provider)})</option>`
  )).join("")}`;
  els.automationServiceEnv.innerHTML = `<option value="">No environment</option>${environments.map((env) => `
    <option value="${escapeHtml(env.id)}">${escapeHtml(env.name)}</option>
  `).join("")}`;
  if (els.automationServiceInputChannel) els.automationServiceInputChannel.innerHTML = channelOptions;
  if (els.automationServiceOutputChannel) els.automationServiceOutputChannel.innerHTML = channelOptions;
  if (els.automationWorkflowInputChannel) els.automationWorkflowInputChannel.innerHTML = channelOptions;
  els.automationWorkflowService.innerHTML = services.length
    ? services.map((service) => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)}</option>`).join("")
    : '<option value="">No service</option>';
  els.automationEnvList.innerHTML = environments.length ? environments.map((env, index) => `
    <article class="automation-row">
      <div>
        <strong>${escapeHtml(env.name)}</strong>
        <span>${escapeHtml(env.type)} - ${escapeHtml(env.workingDir || "default cwd")}</span>
        <small>${escapeHtml(env.pythonPath || "python3")}</small>
      </div>
      <button type="button" class="danger" data-remove-automation-env="${index}">Remove</button>
    </article>
  `).join("") : '<div class="empty">No environment registered yet.</div>';
  els.automationServiceList.innerHTML = services.length ? services.map((service, index) => `
    <article class="automation-row">
      <div>
        <strong>${escapeHtml(service.name)}</strong>
        <span>${escapeHtml(service.type)} - ${escapeHtml(service.endpoint || service.scriptPath || service.command || "not configured")}</span>
        <small>${escapeHtml(service.description || `${service.timeoutMs || 30000}ms timeout`)}${bindingSummary(service.bindings)}</small>
      </div>
      <div class="actions inline-actions">
        <button type="button" class="secondary" data-test-automation-service="${escapeHtml(service.id)}">Test</button>
        <button type="button" class="danger" data-remove-automation-service="${index}">Remove</button>
      </div>
    </article>
  `).join("") : '<div class="empty">No service registered yet.</div>';
  els.automationWorkflowList.innerHTML = workflows.length ? workflows.map((workflow, index) => {
    const service = services.find((item) => item.id === workflow.serviceId);
    return `
      <article class="automation-row">
        <div>
          <strong>${escapeHtml(workflow.name)}</strong>
          <span>${escapeHtml(workflow.triggerEventType)} -> ${escapeHtml(service?.name || "missing service")} after ${Number(workflow.delaySec || 0)}s</span>
          <small>${workflow.enabled !== false ? "enabled" : "disabled"} - filters ${escapeHtml(JSON.stringify(workflow.filters || {}))}${workflow.inputChannelId ? ` - from ${escapeHtml(channelName(workflow.inputChannelId))}` : ""}</small>
        </div>
        <div class="actions inline-actions">
          <button type="button" class="secondary" data-test-automation-workflow="${escapeHtml(workflow.id)}">Test</button>
          <button type="button" class="danger" data-remove-automation-workflow="${index}">Remove</button>
        </div>
      </article>
    `;
  }).join("") : '<div class="empty">No workflow registered yet.</div>';
  renderAutomationRuns();
}

function channelName(channelId) {
  return (connectionsConfig.channels || []).find((channel) => channel.id === channelId)?.name || channelId || "";
}

function bindingSummary(bindings = {}) {
  const parts = [];
  if (bindings.inputChannelId) parts.push(`in ${channelName(bindings.inputChannelId)}`);
  if (bindings.outputChannelId) parts.push(`out ${channelName(bindings.outputChannelId)}`);
  return parts.length ? ` - ${parts.join(" / ")}` : "";
}

function renderAutomationRuns() {
  if (!els.automationRunList) return;
  els.automationRunList.innerHTML = automationRuns.length ? automationRuns.map((run) => `
    <article class="automation-run ${escapeHtml(run.status || "idle")}">
      <div>
        <strong>${escapeHtml(run.workflowName || "Manual service test")}</strong>
        <span>${escapeHtml(run.status || "unknown")} - ${escapeHtml(run.eventType || "")} - ${escapeHtml(run.serviceName || run.serviceId || "")}</span>
        <small>${escapeHtml(run.startedAt || "")}${run.finishedAt ? ` -> ${escapeHtml(run.finishedAt)}` : ""}</small>
      </div>
      ${run.output ? `<pre>${escapeHtml(run.output)}</pre>` : ""}
    </article>
  `).join("") : '<div class="empty">No automation run yet.</div>';
}

async function refreshAutomation(button = null) {
  const result = await withTask("automation", button, "Loading automation...", async () => {
    const [config, runs] = await Promise.all([
      api("/api/automation"),
      api("/api/automation/runs")
    ]);
    return { config, runs };
  });
  automationConfig = result.config || { services: [], environments: [], workflows: [] };
  automationRuns = result.runs?.runs || [];
  renderAutomation();
  print(result);
}

async function saveAutomation(button = null) {
  const result = await withTask("automation", button, "Saving automation...", async () => {
    return await api("/api/automation", {
      method: "PUT",
      body: JSON.stringify(automationConfig)
    });
  });
  automationConfig = result;
  renderAutomation();
  print(result);
}

function addAutomationEnvironment() {
  automationConfig.environments = automationConfig.environments || [];
  automationConfig.environments.push({
    id: `env-${Date.now()}`,
    name: els.automationEnvName.value.trim() || `Environment ${automationConfig.environments.length + 1}`,
    type: els.automationEnvType.value,
    workingDir: els.automationEnvWorkingDir.value.trim(),
    pythonPath: els.automationEnvPythonPath.value.trim() || "python3",
    env: parseJsonField(els.automationEnvVars, {}),
    description: ""
  });
  els.automationEnvName.value = "";
  renderAutomation();
}

function addAutomationService() {
  automationConfig.services = automationConfig.services || [];
  automationConfig.services.push({
    id: `svc-${Date.now()}`,
    name: els.automationServiceName.value.trim() || `Service ${automationConfig.services.length + 1}`,
    type: els.automationServiceType.value,
    environmentId: els.automationServiceEnv.value,
    endpoint: els.automationServiceEndpoint.value.trim(),
    scriptPath: els.automationServiceScript.value.trim(),
    command: els.automationServiceCommand.value.trim(),
    timeoutMs: Number(els.automationServiceTimeout.value || 30000),
    params: parseJsonField(els.automationServiceParams, {}),
    bindings: {
      inputChannelId: els.automationServiceInputChannel?.value || "",
      inputMode: els.automationServiceInputMode?.value || "",
      outputChannelId: els.automationServiceOutputChannel?.value || "",
      outputMode: els.automationServiceOutputMode?.value || ""
    },
    description: ""
  });
  els.automationServiceName.value = "";
  renderAutomation();
}

function addAutomationWorkflow() {
  automationConfig.workflows = automationConfig.workflows || [];
  const filters = parseJsonField(els.automationWorkflowFilters, {});
  automationConfig.workflows.push({
    id: `flow-${Date.now()}`,
    name: els.automationWorkflowName.value.trim() || `Workflow ${automationConfig.workflows.length + 1}`,
    enabled: els.automationWorkflowEnabled.checked,
    triggerEventType: els.automationWorkflowEvent.value.trim() || "vehicle_capture",
    filters,
    delaySec: Number(els.automationWorkflowDelay.value || 0),
    serviceId: els.automationWorkflowService.value,
    inputChannelId: els.automationWorkflowInputChannel?.value || "",
    params: parseJsonField(els.automationWorkflowParams, {}),
    description: ""
  });
  els.automationWorkflowName.value = "";
  renderAutomation();
}

async function testAutomationService(serviceId) {
  const result = await withTask("automation", null, "Testing service...", async () => {
    return await api(`/api/automation/services/${encodeURIComponent(serviceId)}/test`, {
      method: "POST",
      body: JSON.stringify({
        event: { eventType: "manual_test", eventId: `manual-${Date.now()}`, ts: new Date().toISOString() }
      })
    });
  });
  await refreshAutomationRuns();
  print(result);
}

async function testAutomationWorkflow(workflowId) {
  const workflow = (automationConfig.workflows || []).find((item) => item.id === workflowId) || {};
  const result = await withTask("automation", null, "Testing workflow...", async () => {
    return await api(`/api/automation/workflows/${encodeURIComponent(workflowId)}/test`, {
      method: "POST",
      body: JSON.stringify({
        event: {
          eventType: workflow.triggerEventType || "vehicle_capture",
          eventId: `manual-${Date.now()}`,
          ts: new Date().toISOString(),
          cameraId: "manual",
          sourceId: 0,
          objectId: 0,
          plateText: "MANUAL"
        }
      })
    });
  });
  await refreshAutomationRuns();
  print(result);
}

async function refreshAutomationRuns(button = null) {
  const result = await withTask("automation-runs", button, "Loading runs...", async () => {
    return await api("/api/automation/runs");
  });
  automationRuns = result.runs || [];
  renderAutomationRuns();
  return result;
}

async function clearAutomationRuns() {
  const result = await withTask("automation-runs", els.clearAutomationRunsBtn, "Clearing runs...", async () => {
    return await api("/api/automation/runs", { method: "DELETE" });
  });
  automationRuns = result.runs || [];
  renderAutomationRuns();
  print(result);
}

function providerLabel(provider) {
  return provider === "redis" ? "Redis" : provider === "kafka" ? "Kafka" : provider;
}

function renderConnections() {
  const providers = connectionsConfig.providers || {};
  const statusProviders = connectionsStatus.providers || {};
  const channels = connectionsConfig.channels || [];
  if (els.connectionStatusCards) {
    els.connectionStatusCards.innerHTML = ["redis", "kafka"].map((name) => {
      const provider = statusProviders[name] || providers[name] || {};
      const active = provider.enabled && provider.reachable;
      return `
        <article class="deploy-status-card ${active ? "success" : provider.enabled ? "failed" : ""}">
          <span>${providerLabel(name)}</span>
          <strong>${active ? "Reachable" : provider.enabled ? "Not reachable" : "Disabled"}</strong>
          <small>${escapeHtml(provider.mode || "external")} - ${escapeHtml(provider.host || "127.0.0.1")}:${Number(provider.port || 0)} ${provider.container?.running ? "- container running" : ""}</small>
        </article>
      `;
    }).join("") + `
      <article class="deploy-status-card">
        <span>Channels</span>
        <strong>${channels.filter((item) => item.enabled !== false).length}/${channels.length}</strong>
        <small>enabled / total configured</small>
      </article>
    `;
  }
  if (els.connectionProviderList) {
    els.connectionProviderList.innerHTML = ["redis", "kafka"].map((name) => {
      const provider = providers[name] || {};
      const status = statusProviders[name] || {};
      const statusText = status.reachable ? "TCP ok" : escapeHtml(status.message || "not checked");
      return `
        <details class="connection-provider-card" data-connection-provider="${name}">
          <summary class="connection-provider-head">
            <div>
              <strong>${providerLabel(name)}</strong>
              <span>${escapeHtml(provider.mode || "external")} - ${escapeHtml(provider.host || "127.0.0.1")}:${Number(provider.port || 0)}</span>
            </div>
            <span class="connection-provider-state ${status.reachable ? "ok" : "warn"}">${status.reachable ? "Reachable" : "Not ready"}</span>
          </summary>
          <p class="muted">${escapeHtml(provider.description || "")}</p>
          <label class="inline-check"><input data-connection-provider-field="enabled" type="checkbox" ${provider.enabled ? "checked" : ""} /> Enabled</label>
          <div class="grid">
            <label>Mode
              <select data-connection-provider-field="mode">
                <option value="managed" ${provider.mode === "managed" ? "selected" : ""}>Managed Docker</option>
                <option value="external" ${provider.mode === "external" ? "selected" : ""}>External endpoint</option>
              </select>
            </label>
            <label>Host <input data-connection-provider-field="host" value="${escapeHtml(provider.host || "127.0.0.1")}" /></label>
            <label>Port <input data-connection-provider-field="port" type="number" min="1" max="65535" value="${Number(provider.port || 0)}" /></label>
            <label>Container <input data-connection-provider-field="containerName" value="${escapeHtml(provider.containerName || "")}" /></label>
          </div>
          <label>Docker image <input data-connection-provider-field="image" value="${escapeHtml(provider.image || "")}" /></label>
          <div class="connection-provider-foot">
            <span class="${status.reachable ? "ok" : "warn"}">${statusText}</span>
            <div class="actions inline-actions">
              <button type="button" class="secondary" data-start-connection-provider="${name}">Start</button>
              <button type="button" class="danger" data-stop-connection-provider="${name}">Stop</button>
            </div>
          </div>
        </details>
      `;
    }).join("");
  }
  if (els.connectionChannelList) {
    els.connectionChannelList.innerHTML = channels.length ? channels.map((channel, index) => `
      <article class="connection-channel-row">
        <div>
          <strong>${escapeHtml(channel.name)}</strong>
          <span>${providerLabel(channel.provider)} ${escapeHtml(channel.type)}</span>
          <small>${channel.enabled !== false ? "enabled" : "disabled"}${channel.description ? ` - ${escapeHtml(channel.description)}` : ""}</small>
        </div>
        <div class="actions inline-actions">
          <button type="button" class="secondary" data-test-connection-channel="${escapeHtml(channel.id)}">Test</button>
          <button type="button" class="danger" data-remove-connection-channel="${index}">Remove</button>
        </div>
      </article>
    `).join("") : '<div class="empty">No message channel yet.</div>';
  }
  if (els.connectionInspectChannel) {
    const selected = els.connectionInspectChannel.value;
    els.connectionInspectChannel.innerHTML = channels.length
      ? channels.map((channel) => `<option value="${escapeHtml(channel.id)}" ${channel.id === selected ? "selected" : ""}>${escapeHtml(channel.name)} (${providerLabel(channel.provider)} ${escapeHtml(channel.type)})</option>`).join("")
      : '<option value="">No channels</option>';
  }
}

function readConnectionProviders() {
  document.querySelectorAll("[data-connection-provider]").forEach((card) => {
    const name = card.dataset.connectionProvider;
    const provider = connectionsConfig.providers?.[name] || {};
    const field = (key) => card.querySelector(`[data-connection-provider-field="${key}"]`);
    connectionsConfig.providers[name] = {
      ...provider,
      enabled: Boolean(field("enabled")?.checked),
      mode: field("mode")?.value || "external",
      host: field("host")?.value.trim() || "127.0.0.1",
      port: Number(field("port")?.value || provider.port || 0),
      containerName: field("containerName")?.value.trim() || provider.containerName || `jetson-${name}-bus`,
      image: field("image")?.value.trim() || provider.image || ""
    };
  });
}

async function refreshConnections(button = null) {
  const result = await withTask("connections", button, "Loading connections...", async () => {
    return await api("/api/connections");
  });
  connectionsConfig = result.config || { providers: {}, channels: [] };
  connectionsStatus = result.status || { providers: {}, channels: [] };
  renderConnections();
  renderServiceChannelOptions(editingServiceInstanceId
    ? serviceInstances.find((item) => item.id === editingServiceInstanceId)?.bindings || {}
    : readServiceBindingsForm());
  print(result);
}

async function saveConnections(button = null) {
  readConnectionProviders();
  const result = await withTask("connections", button, "Saving connections...", async () => {
    return await api("/api/connections", {
      method: "PUT",
      body: JSON.stringify(connectionsConfig)
    });
  });
  connectionsConfig = result.config || connectionsConfig;
  connectionsStatus = result.status || connectionsStatus;
  renderConnections();
  renderServiceChannelOptions(editingServiceInstanceId
    ? serviceInstances.find((item) => item.id === editingServiceInstanceId)?.bindings || {}
    : readServiceBindingsForm());
  print(result);
}

function addConnectionChannel() {
  readConnectionProviders();
  connectionsConfig.channels = connectionsConfig.channels || [];
  connectionsConfig.channels.push({
    id: `channel-${Date.now()}`,
    name: els.connectionChannelName.value.trim() || `channel-${connectionsConfig.channels.length + 1}`,
    provider: els.connectionChannelProvider.value,
    type: els.connectionChannelType.value,
    description: els.connectionChannelDescription.value.trim(),
    enabled: true
  });
  els.connectionChannelName.value = "";
  els.connectionChannelDescription.value = "";
  renderConnections();
}

async function startConnectionProvider(provider, button = null) {
  await saveConnections();
  const result = await withTask("connections", button, `Starting ${providerLabel(provider)}...`, async () => {
    return await api(`/api/connections/providers/${encodeURIComponent(provider)}/start`, { method: "POST" });
  });
  await refreshConnections();
  print(result);
}

async function stopConnectionProvider(provider, button = null) {
  const result = await withTask("connections", button, `Stopping ${providerLabel(provider)}...`, async () => {
    return await api(`/api/connections/providers/${encodeURIComponent(provider)}/stop`, { method: "POST" });
  });
  await refreshConnections();
  print(result);
}

async function testConnectionChannel(channelId, button = null) {
  await saveConnections();
  const result = await withTask("connections", button, "Testing channel...", async () => {
    return await api(`/api/connections/channels/${encodeURIComponent(channelId)}/test`, { method: "POST" });
  });
  print(result);
}

function renderConnectionMessages(result = null) {
  if (!els.connectionMessageViewer) return;
  if (!result) {
    els.connectionMessageViewer.innerHTML = '<div class="empty">Choose a channel to inspect retained messages.</div>';
    return;
  }
  const messages = Array.isArray(result.messages) ? result.messages : [];
  const countText = result.count === null || result.count === undefined
    ? `${messages.length} shown`
    : `${Number(result.count)} retained, ${messages.length} shown`;
  els.connectionMessageViewer.innerHTML = `
    <div class="connection-message-summary">
      <div>
        <strong>${escapeHtml(result.channel?.name || "")}</strong>
        <span>${providerLabel(result.provider)} ${escapeHtml(result.channel?.type || "")} - ${escapeHtml(result.sort || "latest")}</span>
      </div>
      <b>${countText}</b>
    </div>
    ${result.subscriberCount !== undefined ? `<p class="muted">Live subscribers: ${Number(result.subscriberCount || 0)}</p>` : ""}
    ${result.note ? `<p class="muted">${escapeHtml(result.note)}</p>` : ""}
    <div class="connection-message-list">
      ${messages.length ? messages.map((message) => `
        <article class="connection-message-row">
          <strong>${escapeHtml(message.id || "")}</strong>
          <pre>${escapeHtml(JSON.stringify(message.fields || message, null, 2))}</pre>
        </article>
      `).join("") : '<div class="empty">No retained messages for this channel.</div>'}
    </div>
  `;
}

async function inspectConnectionChannelMessages(button = null) {
  await saveConnections();
  const channelId = els.connectionInspectChannel?.value;
  if (!channelId) throw new Error("Choose a message channel first.");
  const sort = els.connectionInspectSort?.value || "latest";
  const limit = Math.max(1, Math.min(500, Number(els.connectionInspectLimit?.value || 50)));
  const result = await withTask("connections", button, "Loading channel messages...", async () => {
    return await api(`/api/connections/channels/${encodeURIComponent(channelId)}/messages?sort=${encodeURIComponent(sort)}&limit=${encodeURIComponent(limit)}`);
  });
  renderConnectionMessages(result);
  print(result);
}

function tritonPublicInferUrl(modelName = "", version = "") {
  const status = latestTriton.status || {};
  const port = status.httpPort || 8000;
  const host = location.hostname || "localhost";
  const versionPart = String(version || "").trim()
    ? `/versions/${encodeURIComponent(String(version).trim())}`
    : "";
  return `http://${host}:${port}/v2/models/${encodeURIComponent(modelName)}${versionPart}/infer`;
}

function updateTritonInferUrl() {
  if (!els.tritonInferUrl) return;
  const modelName = els.tritonInferModel?.value || "";
  const version = els.tritonInferVersion?.value || "";
  els.tritonInferUrl.value = modelName ? tritonPublicInferUrl(modelName, version) : "";
}

function currentTritonMetadataKey() {
  return `${els.tritonInferModel?.value || ""}::${els.tritonInferVersion?.value || ""}`;
}

function setTritonInferOutput(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (els.tritonInferOutput) els.tritonInferOutput.textContent = text;
  print(value);
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");
}

function tritonDecoderOptions(selected = "raw", includeDefault = false) {
  const options = [
    ...(includeDefault ? [{ value: "", label: "Use model setting" }] : []),
    { value: "raw", label: "Raw tensor" },
    { value: "ultralytics_yolo_detect", label: "Ultralytics YOLO detect" },
    { value: "legacy_boxes_scores_classes", label: "Legacy boxes/scores/classes" }
  ];
  return options.map((option) => (
    `<option value="${option.value}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`
  )).join("");
}

function tritonLabelPreview(labels = []) {
  if (!labels.length) return "No labels";
  const shown = labels.slice(0, 8).map(escapeHtml).join(", ");
  return `${shown}${labels.length > 8 ? ` +${labels.length - 8}` : ""}`;
}

function renderTriton(data = latestTriton) {
  latestTriton = data || { status: {}, models: [] };
  const status = latestTriton.status || {};
  const container = status.container || {};
  const models = latestTriton.models || [];
  if (els.tritonStatusCards) {
    els.tritonStatusCards.innerHTML = `
      <article class="deploy-status-card ${container.running ? "success" : "failed"}">
        <span>Container</span>
        <strong>${container.running ? "Running" : container.exists ? "Stopped" : "Missing"}</strong>
        <small>${escapeHtml(container.name || "jetson-triton-server")} ${escapeHtml(container.status || "")}</small>
      </article>
      <article class="deploy-status-card ${status.ready ? "success" : "failed"}">
        <span>Triton ready</span>
        <strong>${status.ready ? "Ready" : "Not ready"}</strong>
        <small>${escapeHtml(status.server?.version ? `version ${status.server.version}` : "Health endpoint waiting.")}</small>
      </article>
      <article class="deploy-status-card">
        <span>Image</span>
        <strong>${escapeHtml(status.image || "unknown")}</strong>
        <small>${escapeHtml(status.modelRepository || "triton-models")}</small>
      </article>
      <article class="deploy-status-card">
        <span>Ports</span>
        <strong>${status.httpPort || 8010} / ${status.grpcPort || 8011}</strong>
        <small>HTTP / gRPC, metrics ${status.metricsPort || 8012}</small>
      </article>
    `;
  }
  if (els.tritonModelList) {
    els.tritonModelList.innerHTML = models.length ? models.map((model) => `
      <article class="triton-repo-card">
        <div class="triton-repo-top">
          <div class="triton-repo-title">
            <strong>${escapeHtml(model.name)}</strong>
            <span>${model.versions?.length ? model.versions.map((item) => `v${item.version}: ${item.files.join(", ")}`).join(" | ") : "No version folder"}</span>
          </div>
          <div class="triton-repo-actions">
            <button type="button" class="secondary" data-use-triton-model="${escapeHtml(model.name)}">Use</button>
            <button type="button" class="secondary" data-copy-triton-url="${escapeHtml(model.name)}">Copy URL</button>
            <button type="button" class="danger" data-delete-triton-model="${escapeHtml(model.name)}">Delete</button>
          </div>
        </div>
        <div class="triton-repo-meta">
          <span class="${model.hasConfig ? "ok" : "warn"}">${model.hasConfig ? "config ready" : "missing config"}</span>
          <span>${escapeHtml(model.decoderProfile || "raw")}</span>
          <span>${model.labels?.count || 0} label(s)</span>
        </div>
        <div class="triton-repo-url-row">
          <code class="triton-infer-url">${escapeHtml(tritonPublicInferUrl(model.name))}</code>
          <button type="button" class="secondary compact" data-fix-triton-config="${escapeHtml(model.name)}">Make non-batch config</button>
        </div>
        <small class="triton-label-preview">${tritonLabelPreview(model.labels?.preview || [])}</small>
        <details class="triton-repo-details">
          <summary>Model settings</summary>
          <div class="triton-model-controls" data-triton-model-controls="${escapeHtml(model.name)}">
            <label class="triton-control-decoder">Decoder
              <select data-triton-decoder-select="${escapeHtml(model.name)}">
                ${tritonDecoderOptions(model.decoderProfile || "raw")}
              </select>
            </label>
            <label class="triton-control-upload">Upload labels.txt <input type="file" accept=".txt" data-triton-label-file="${escapeHtml(model.name)}" /></label>
            <label class="triton-label-editor">Labels
              <textarea rows="8" data-triton-labels-text="${escapeHtml(model.name)}" placeholder="one label per line">${escapeHtml(model.labels?.text || "")}</textarea>
            </label>
            <div class="actions inline-actions triton-control-actions">
              <button type="button" class="secondary" data-save-triton-meta="${escapeHtml(model.name)}">Save labels/profile</button>
              <button type="button" class="secondary" data-upload-triton-labels="${escapeHtml(model.name)}">Upload labels</button>
            </div>
          </div>
        </details>
        ${model.configPreview ? `
          <details class="triton-repo-details">
            <summary>Config preview</summary>
            <pre class="triton-config-preview">${escapeHtml(model.configPreview)}</pre>
          </details>
        ` : ""}
      </article>
    `).join("") : '<div class="empty">No Triton model yet.</div>';
  }
  if (els.tritonInferModel) {
    const selected = els.tritonInferModel.value;
    els.tritonInferModel.innerHTML = models.length
      ? models.map((model) => `<option value="${escapeHtml(model.name)}">${escapeHtml(model.name)}</option>`).join("")
      : '<option value="">No model</option>';
    if (models.some((model) => model.name === selected)) els.tritonInferModel.value = selected;
    updateTritonInferUrl();
  }
}

async function refreshTriton(button = null) {
  const result = await withTask("triton", button, "Loading Triton...", async () => {
    return await api("/api/triton/models");
  });
  renderTriton(result);
  print(result);
  return result;
}

async function startTriton(button = null) {
  const result = await withTask("triton", button, "Starting Triton...", async () => {
    return await api("/api/triton/start", { method: "POST" });
  });
  await refreshTriton().catch(() => {});
  print(result);
}

async function stopTriton(button = null) {
  const result = await withTask("triton", button, "Stopping Triton...", async () => {
    return await api("/api/triton/stop", { method: "POST" });
  });
  await refreshTriton().catch(() => {});
  print(result);
}

async function uploadTritonModel(button = null) {
  if (!els.tritonModelFile?.files?.length) return print("Chon Triton model file truoc khi upload.");
  const form = new FormData();
  form.append("model", els.tritonModelFile.files[0]);
  if (els.tritonConfigFile?.files?.length) form.append("config", els.tritonConfigFile.files[0]);
  if (els.tritonLabelsFile?.files?.length) form.append("labels", els.tritonLabelsFile.files[0]);
  form.append("name", els.tritonModelName.value.trim());
  form.append("version", els.tritonModelVersion.value.trim() || "1");
  form.append("platform", els.tritonModelPlatform.value);
  form.append("maxBatchSize", els.tritonMaxBatchSize.value || "0");
  form.append("decoderProfile", els.tritonDecoderProfile?.value || "raw");
  const result = await withTask("triton", button, "Uploading Triton model...", async () => {
    return await api("/api/triton/models", { method: "POST", body: form });
  });
  els.tritonModelFile.value = "";
  if (els.tritonConfigFile) els.tritonConfigFile.value = "";
  if (els.tritonLabelsFile) els.tritonLabelsFile.value = "";
  renderTriton(result);
  print(result);
}

async function deleteTritonModel(name) {
  const result = await withTask("triton", null, `Deleting ${name}...`, async () => {
    return await api(`/api/triton/models/${encodeURIComponent(name)}`, { method: "DELETE" });
  });
  renderTriton(result);
  print(result);
}

async function fixTritonConfig(name) {
  const result = await withTask("triton", null, `Fixing ${name} config...`, async () => {
    return await api(`/api/triton/models/${encodeURIComponent(name)}/config`, {
      method: "POST",
      body: JSON.stringify({ maxBatchSize: 0 })
    });
  });
  renderTriton(result);
  print(result);
}

async function saveTritonMeta(name) {
  const decoder = document.querySelector(`[data-triton-decoder-select="${cssEscape(name)}"]`)?.value || "raw";
  const labelsText = document.querySelector(`[data-triton-labels-text="${cssEscape(name)}"]`)?.value || "";
  const result = await withTask("triton", null, `Saving ${name} labels/profile...`, async () => {
    return await api(`/api/triton/models/${encodeURIComponent(name)}/meta`, {
      method: "PUT",
      body: JSON.stringify({ decoderProfile: decoder, labelsText })
    });
  });
  renderTriton(result);
  print(result);
}

async function uploadTritonLabels(name) {
  const input = document.querySelector(`[data-triton-label-file="${cssEscape(name)}"]`);
  if (!input?.files?.length) return print("Chon labels.txt truoc khi upload.");
  const form = new FormData();
  form.append("labels", input.files[0]);
  const result = await withTask("triton", null, `Uploading ${name} labels...`, async () => {
    return await api(`/api/triton/models/${encodeURIComponent(name)}/labels`, {
      method: "POST",
      body: form
    });
  });
  renderTriton(result);
  print(result);
}

async function copyTritonInferUrl(modelName = "") {
  const url = modelName ? tritonPublicInferUrl(modelName) : els.tritonInferUrl.value;
  if (!url) return print("No Triton infer URL to copy.");
  await copyText(url);
  setTritonInferOutput(`Copied Triton infer URL:\n${url}`);
  setTaskStatus("triton", "success", "Triton infer URL copied.");
}

function tritonZeroForDatatype(datatype = "") {
  const value = String(datatype || "").toUpperCase();
  if (value === "BOOL") return false;
  if (value === "BYTES" || value === "STRING") return "";
  return 0;
}

function sampleTritonPayload(metadata = latestTritonMetadata) {
  const body = metadata?.body || metadata || {};
  const inputs = Array.isArray(body.inputs) ? body.inputs : [];
  if (!inputs.length) throw new Error("Load metadata truoc de tao sample payload.");
  return {
    inputs: inputs.map((input) => {
      const shape = (input.shape || []).map((dim) => Number(dim) > 0 ? Number(dim) : 1);
      const elements = shape.reduce((total, dim) => total * Math.max(1, Number(dim || 1)), 1);
      if (elements > 2000000) {
        throw new Error(`Input ${input.name} qua lon (${elements} elements). Dung Dummy zero infer hoac paste payload rieng.`);
      }
      return {
        name: input.name,
        shape,
        datatype: input.datatype || "FP32",
        data: Array.from({ length: elements }, () => tritonZeroForDatatype(input.datatype))
      };
    })
  };
}

async function loadTritonMetadata(button = null) {
  const modelName = els.tritonInferModel?.value || "";
  if (!modelName) return print("Chon model Triton truoc khi load metadata.");
  const version = els.tritonInferVersion?.value || "";
  const result = await withTask("triton", button, "Loading Triton metadata...", async () => {
    const query = version ? `?version=${encodeURIComponent(version)}` : "";
    return await api(`/api/triton/models/${encodeURIComponent(modelName)}/metadata${query}`);
  });
  latestTritonMetadata = result;
  latestTritonMetadataKey = currentTritonMetadataKey();
  setTritonInferOutput(result);
  return result;
}

async function useSampleTritonPayload(button = null) {
  if (!latestTritonMetadata || latestTritonMetadataKey !== currentTritonMetadataKey()) {
    await loadTritonMetadata(button);
  }
  const payload = sampleTritonPayload();
  els.tritonInferPayload.value = JSON.stringify(payload, null, 2);
  setTritonInferOutput({
    message: "Sample payload generated from Triton metadata.",
    inputs: payload.inputs.map((input) => ({
      name: input.name,
      shape: input.shape,
      datatype: input.datatype,
      elements: input.data.length
    }))
  });
  setTaskStatus("triton", "success", "Sample payload generated from metadata.");
}

async function testTritonInfer(button = null) {
  const modelName = els.tritonInferModel?.value || "";
  if (!modelName) return print("Chon model Triton truoc khi test infer.");
  const payload = parseJsonField(els.tritonInferPayload, {});
  const version = els.tritonInferVersion?.value || "";
  const result = await withTask("triton", button, "Running Triton infer...", async () => {
    return await api(`/api/triton/models/${encodeURIComponent(modelName)}/infer`, {
      method: "POST",
      body: JSON.stringify({ version, payload })
    });
  });
  setTritonInferOutput(result);
}

async function dummyTritonInfer(button = null) {
  const modelName = els.tritonInferModel?.value || "";
  if (!modelName) return print("Chon model Triton truoc khi dummy infer.");
  const version = els.tritonInferVersion?.value || "";
  const result = await withTask("triton", button, "Running dummy Triton infer...", async () => {
    return await api(`/api/triton/models/${encodeURIComponent(modelName)}/infer-dummy`, {
      method: "POST",
      body: JSON.stringify({ version })
    });
  });
  setTritonInferOutput(result);
}

function drawTritonImageResult(file, result) {
  const canvas = els.tritonImageCanvas;
  const list = els.tritonDetectionList;
  if (!canvas || !list || !file) return;
  const wrapper = els.tritonImagePreview;
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  const detections = result?.decode?.detections || [];
  const warnings = result?.decode?.warnings || [];
  const reading = result?.decode?.reading || {};
  const preprocessing = result?.preprocessing || {};
  image.onload = () => {
    const maxWidth = 920;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.lineWidth = Math.max(2, Math.round(width / 420));
    ctx.font = `${Math.max(12, Math.round(width / 60))}px system-ui, sans-serif`;
    detections.forEach((detection, index) => {
      const box = detection.bboxOriginal || detection.bboxResized || {};
      const x = Number(box.left || 0) * scale;
      const y = Number(box.top || 0) * scale;
      const w = Number(box.width || 0) * scale;
      const h = Number(box.height || 0) * scale;
      const hue = (index * 71) % 360;
      const stroke = `hsl(${hue} 85% 45%)`;
      ctx.strokeStyle = stroke;
      ctx.fillStyle = "rgba(8, 15, 30, 0.82)";
      ctx.strokeRect(x, y, w, h);
      const label = `${detection.label || `class_${detection.classId}`} ${(Number(detection.confidence || 0) * 100).toFixed(1)}%`;
      const metrics = ctx.measureText(label);
      const labelHeight = Math.max(20, Math.round(width / 38));
      const labelY = y > labelHeight ? y - labelHeight : y;
      ctx.fillRect(x, labelY, Math.min(width - x, metrics.width + 12), labelHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 6, labelY + Math.round(labelHeight * 0.7));
    });
    URL.revokeObjectURL(objectUrl);
    if (wrapper) wrapper.classList.add("has-result");
    list.innerHTML = `
      <div class="triton-detection-summary">
        <strong>${detections.length}</strong>
        <span>detection(s)</span>
        ${reading.text ? `<em>sorted: ${escapeHtml(reading.text)}</em>` : ""}
        <small>${escapeHtml(preprocessing.resizeMode || "resize")} ${Number(preprocessing.originalWidth || image.naturalWidth)}x${Number(preprocessing.originalHeight || image.naturalHeight)} -> ${Number(preprocessing.width || 0)}x${Number(preprocessing.height || 0)}</small>
      </div>
      ${warnings.length ? `<div class="triton-warning">${warnings.map(escapeHtml).join("<br>")}</div>` : ""}
      <div class="triton-detection-items">
        ${detections.length ? detections.map((detection) => `
          <article>
            <strong>${escapeHtml(detection.label || `class_${detection.classId}`)}</strong>
            <span>${(Number(detection.confidence || 0) * 100).toFixed(2)}%</span>
            <small>x ${Number(detection.bboxOriginal?.left || 0).toFixed(1)}, y ${Number(detection.bboxOriginal?.top || 0).toFixed(1)}, w ${Number(detection.bboxOriginal?.width || 0).toFixed(1)}, h ${Number(detection.bboxOriginal?.height || 0).toFixed(1)}</small>
          </article>
        `).join("") : '<div class="empty">No decoded detection. Try lower confidence, switch RGB/BGR, or check labels/decoder.</div>'}
      </div>
    `;
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    list.innerHTML = '<div class="empty">Cannot preview selected image.</div>';
  };
  image.src = objectUrl;
}

async function testTritonImageInfer(button = null) {
  const modelName = els.tritonInferModel?.value || "";
  if (!modelName) return print("Chon model Triton truoc khi test image infer.");
  if (!els.tritonInferImage?.files?.length) return print("Chon anh truoc khi test image infer.");
  const file = els.tritonInferImage.files[0];
  const form = new FormData();
  form.append("image", file);
  form.append("version", els.tritonInferVersion?.value || "");
  form.append("channelOrder", els.tritonInferChannelOrder?.value || "rgb");
  form.append("scaleMode", els.tritonInferScaleMode?.value || "0-1");
  form.append("resizeMode", els.tritonInferResizeMode?.value || "letterbox");
  form.append("decoderProfile", els.tritonInferDecoderProfile?.value || "");
  form.append("confidenceThreshold", els.tritonInferConfidence?.value || "0.25");
  form.append("iouThreshold", els.tritonInferIou?.value || "0.45");
  const result = await withTask("triton", button, "Running Triton image infer...", async () => {
    return await api(`/api/triton/models/${encodeURIComponent(modelName)}/infer-image`, {
      method: "POST",
      body: form
    });
  });
  drawTritonImageResult(file, result);
  setTritonInferOutput(result);
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

function formConfig(targetDeployAppId = activeDeployAppId, options = {}) {
  const forDeploy = Boolean(options.forDeploy);
  const cameras = readCameraCards();
  const deployProfiles = readDeployApps(cameras);
  const activeDeployApp = deployProfiles.find((app) => app.id === targetDeployAppId)
    || deployProfiles.find((app) => app.active)
    || deployProfiles[0]
    || defaultDeployApp(0, cameras);
  const selectedDeployAppId = targetDeployAppId && deployProfiles.some((app) => app.id === targetDeployAppId)
    ? targetDeployAppId
    : activeDeployApp.id;
  const targetDeployApp = deployProfiles.find((app) => app.id === selectedDeployAppId) || activeDeployApp;
  activeDeployAppId = activeDeployApp.id;
  const normalizedDeployProfiles = deployProfiles.map((app) => ({
    ...app,
    active: app.id === activeDeployApp.id
  }));
  const selectedCameraIds = new Set(targetDeployApp.cameraIds || []);
  return {
    streams: cameras.map((camera) => ({
      ...applyDeployCameraSettings(camera, targetDeployApp),
      enabled: forDeploy ? selectedCameraIds.has(camera.id) : camera.enabled !== false
    })),
    streamWidth: Number(els.streamWidth.value),
    streamHeight: Number(els.streamHeight.value),
    deepstreamImage: els.deepstreamImage.value.trim(),
    processor: { type: normalizeProcessorType(targetDeployApp.processorType) },
    testProcessorType: normalizeProcessorType(els.testProcessorType?.value || confirmedTestProcessorType),
    pipelineStages: normalizePipelineStages(targetDeployApp.pipelineStages),
    selectedModels: selectedModelsFromStages(targetDeployApp.pipelineStages),
    deployApps: normalizedDeployProfiles,
    activeDeployAppId: targetDeployApp.id,
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
    referenceSize: null,
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

function normalizeReferenceSize(value = null) {
  if (!value || typeof value !== "object") return null;
  const width = Number(value.width || value.w || 0);
  const height = Number(value.height || value.h || 0);
  return width > 0 && height > 0 ? { width: Math.round(width), height: Math.round(height) } : null;
}

function currentRoiReferenceSize() {
  if (!roiTool.image || !els.roiCanvas) return null;
  const width = Number(els.roiCanvas.width || roiTool.image.naturalWidth || 0);
  const height = Number(els.roiCanvas.height || roiTool.image.naturalHeight || 0);
  return width > 0 && height > 0 ? { width: Math.round(width), height: Math.round(height) } : null;
}

function normalizeZone(zone = {}, index = 0, camera = {}) {
  const fallback = defaultZoneConfig(index);
  const id = String(zone.id || fallback.id).trim() || fallback.id;
  const mode = ["capture_when_inside", "alert_when_inside", "lpr_only_inside", "detect_only_inside", "ignore_inside"].includes(zone.mode)
    ? zone.mode
    : fallback.mode;
  const gieId = zone.gieId === "" || zone.gieId === null || zone.gieId === undefined
    ? ""
    : Math.max(1, Number(zone.gieId || 1));
  return {
    ...fallback,
    ...zone,
    id,
    name: String(zone.name || fallback.name).trim() || fallback.name,
    enabled: zone.enabled !== false,
    mode,
    polygon: cleanZonePolygon(zone.polygon || zone.points || []),
    referenceSize: normalizeReferenceSize(zone.referenceSize || zone.imageSize),
    gieId,
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
    maxTimeSec: 30,
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
    maxTimeSec: Math.max(1, Number(rule.maxTimeSec || 30)),
    classIds: "",
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

function stageLabelChoices(stage = {}) {
  const file = findModelFile(stage.modelGroup, stage.selectedModel);
  const labels = file?.labels || [];
  const allowed = String(stage.operateOnClassIds || "").split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  const allowedSet = new Set(allowed);
  return labels
    .map((label, index) => ({ id: String(index), label }))
    .filter((item) => !allowedSet.size || allowedSet.has(item.id));
}

function zoneStageForApp(app = {}, zone = {}) {
  const stages = normalizePipelineStages(app.pipelineStages || stagesFromSelectedModels(app.selectedModels)).filter((stage) => stage.enabled);
  const requestedGieId = Number(zone.gieId || 0);
  return stages.find((stage) => Number(stage.gieId) === requestedGieId)
    || primaryStageForApp({ ...app, pipelineStages: stages })
    || stages[0]
    || null;
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
  const action = index === "" ? "added" : "updated";
  delete camera.editingIndex;
  if (index === "") current.push(camera);
  else current[index] = camera;
  renderCameras(current);
  resetCameraSetting();
  renderDeployApps(deployApps, current);
  return { camera, action };
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
      eventOutputs: [...card.querySelectorAll("[data-deploy-event-output]")].map((row) => ({
        eventType: row.querySelector("[data-deploy-event-field='eventType']")?.value.trim() || "",
        channelId: row.querySelector("[data-deploy-event-field='channelId']")?.value || "",
        payload: row.querySelector("[data-deploy-event-field='payload']")?.value || "full",
        schema: readPayloadSchema(row),
        template: row.querySelector("[data-deploy-event-field='template']")?.value.trim() || "",
        transformLanguage: row.querySelector("[data-deploy-event-field='transformLanguage']")?.value || "python",
        transformScript: row.querySelector("[data-deploy-event-field='transformScript']")?.value.trim() || "",
        enabled: row.querySelector("[data-deploy-event-field='enabled']")?.checked !== false
      })).filter((item) => item.eventType && item.channelId),
      selectedModels: selectedModelsFromStages(pipelineStages)
    };
  });
  if (!apps.some((app) => app.active)) apps[0].active = true;
  apps = apps.map((app, index) => ({ ...app, active: index === apps.findIndex((item) => item.active) }));
  activeDeployAppId = apps.find((app) => app.active)?.id || activeDeployAppId;
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
        gieId: field("gieId")?.value || base.gieId || "",
        classIds: field("classIdsText")?.value || field("classIds")?.value || "",
        cooldownSec: field("cooldownSec")?.value || ""
      }, index, camera);
    });
    const rules = parseRulesValue(preview.querySelector("[data-deploy-camera-rules]")?.value).map((rule, index) => normalizeRule(rule, index, zones));
    settings[cameraId] = { zones, rules };
  });
  return settings;
}

function deployDetailsKey(details) {
  const card = details.closest("[data-deploy-app-card]");
  if (!card) return "";
  const appId = card.dataset.deployAppId || "";
  const section = details.dataset.deploySection || "";
  if (section) return `${appId}:${section}`;
  const camera = details.closest("[data-deploy-preview-camera]")?.dataset.deployPreviewCamera || "";
  const summary = details.querySelector("summary")?.textContent?.trim().replace(/\s+/g, " ") || "";
  if (camera || summary) return `${appId}:camera:${camera}:${summary}`;
  const detailsIndex = [...card.querySelectorAll("details")].indexOf(details);
  return `${appId}:details:${detailsIndex}`;
}

function captureDeployDetailsState() {
  const state = new Map();
  els.deployAppList?.querySelectorAll("details").forEach((details) => {
    const key = deployDetailsKey(details);
    if (key) state.set(key, details.open);
  });
  return state;
}

function restoreDeployDetailsState(state) {
  if (!state?.size) return;
  els.deployAppList?.querySelectorAll("details").forEach((details) => {
    const key = deployDetailsKey(details);
    if (key && state.has(key)) details.open = state.get(key);
  });
}

function renderDeployApps(apps = [], cameras = readCameraCards()) {
  if (!els.deployAppList) return;
  const openState = captureDeployDetailsState();
  const normalizedCameras = cameras;
  const existing = apps.length ? apps : deployApps;
  const requestedActiveId = existing.find((item) => item.active)?.id || activeDeployAppId;
  deployApps = (existing.length ? existing : [defaultDeployApp(0, normalizedCameras)]).map((app, index) => ({
    ...defaultDeployApp(index, normalizedCameras),
    ...app,
    active: false,
    cameraIds: Array.isArray(app.cameraIds) ? app.cameraIds : defaultDeployApp(index, normalizedCameras).cameraIds,
    cameraSettings: app.cameraSettings || {},
    eventOutputs: Array.isArray(app.eventOutputs) ? app.eventOutputs : [],
    pipelineStages: normalizePipelineStages(app.pipelineStages || stagesFromSelectedModels(app.selectedModels)),
    selectedModels: selectedModelsFromStages(app.pipelineStages || stagesFromSelectedModels(app.selectedModels))
  }));
  let activeIndex = deployApps.findIndex((app) => app.id === requestedActiveId);
  if (activeIndex < 0) activeIndex = 0;
  activeDeployAppId = deployApps[activeIndex]?.id || "";
  deployApps = deployApps.map((app, index) => ({ ...app, active: index === activeIndex }));

  els.deployAppList.innerHTML = deployApps.map((app, index) => renderDeployAppCard(app, index, normalizedCameras)).join("");
  restoreDeployDetailsState(openState);
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
  const stages = normalizePipelineStages(app.pipelineStages || []);
  const eventOutputs = Array.isArray(app.eventOutputs) ? app.eventOutputs : [];
  const processorLabel = (normalizeProcessorType(app.processorType) || "generic_detection").replaceAll("_", " ");
  return `
    <article class="deploy-app-card" data-deploy-app-card data-deploy-app-id="${escapeHtml(app.id)}">
      <div class="deploy-app-head compact">
        <div class="deploy-app-title">
          <strong>${escapeHtml(app.name || `DeepStream App ${index + 1}`)}</strong>
          <small>${escapeHtml(app.id)} - ${escapeHtml(processorLabel)}</small>
        </div>
        <div class="deploy-app-badges">
          ${app.active ? renderRuntimeBadge("active", "info") : ""}
          ${renderRuntimeBadge(`${selectedCameras.length} camera${selectedCameras.length === 1 ? "" : "s"}`, selectedCameras.length ? "success" : "warning")}
          ${renderRuntimeBadge(`${stages.length} stage${stages.length === 1 ? "" : "s"}`, stages.length ? "info" : "warning")}
          ${renderRuntimeBadge(`${eventOutputs.length} output${eventOutputs.length === 1 ? "" : "s"}`, eventOutputs.length ? "info" : "")}
        </div>
        <div class="actions inline-actions">
          <button type="button" class="primary" data-deploy-single-app="${escapeHtml(app.id)}">Deploy / Update</button>
          <button type="button" class="danger" data-stop-single-app="${escapeHtml(app.id)}">Stop</button>
          <button type="button" data-remove-deploy-app="${index}" ${deployApps.length <= 1 ? "disabled" : ""}>Remove app</button>
        </div>
      </div>
      <div class="deploy-config-accordion">
        <details class="deploy-config-section" data-deploy-section="setup" open>
          <summary>
            <span>App setup</span>
            <small>Name, active target and processor mode</small>
          </summary>
          <div class="deploy-app-setup-grid">
            <label class="inline-check">
              <input data-deploy-active type="radio" name="activeDeployApp" ${app.active ? "checked" : ""} />
              Active deploy target
            </label>
            <label>App name <input data-deploy-field="name" value="${escapeHtml(app.name || `DeepStream App ${index + 1}`)}" /></label>
            <label>
              Processor
              <select data-deploy-field="processorType">
                ${processorOptionMarkup(app.processorType)}
              </select>
            </label>
          </div>
        </details>
        <details class="deploy-config-section" data-deploy-section="stages">
          <summary>
            <span>Inference stages</span>
            <small>${stages.length} configured stage${stages.length === 1 ? "" : "s"}</small>
          </summary>
          <div class="stage-section-head">
            <strong>GIE flow</strong>
            <button type="button" class="secondary" data-add-deploy-stage="${index}">Add stage</button>
          </div>
          <div class="pipeline-stage-list" data-deploy-stage-list data-deploy-stage-owner="${index}">
            ${stageRowsMarkup(stages)}
          </div>
        </details>
        <details class="deploy-config-section" data-deploy-section="events">
          <summary>
            <span>Event outputs</span>
            <small>${eventOutputs.length || "No"} message channel${eventOutputs.length === 1 ? "" : "s"}</small>
          </summary>
          <p class="muted">Publish DeepStream events to message channels. Channels are created in the Connections tab.</p>
          <div class="deploy-event-output-list">
            ${eventOutputRowsMarkup(eventOutputs)}
          </div>
          <button type="button" class="secondary" data-add-deploy-event-output="${index}">Add event output</button>
        </details>
        <details class="deploy-config-section" data-deploy-section="cameras">
          <summary>
            <span>Cameras & ROI</span>
            <small>${selectedCameras.length || "No"} selected camera${selectedCameras.length === 1 ? "" : "s"}</small>
          </summary>
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
        </details>
      </div>
    </article>
  `;
}

function eventOutputRowsMarkup(outputs = []) {
  const rows = outputs.length ? outputs : [];
  return rows.map((output) => eventOutputRowMarkup(output)).join("") || '<div class="empty">No event output configured.</div>';
}

function defaultPayloadSchema() {
  return [
    { key: "event_type", value: "eventType" },
    { key: "event_id", value: "eventId" },
    { key: "camera", value: "cameraName" },
    { key: "plate", value: "plateText" },
    { key: "zone", value: "zoneName" },
    { key: "image", value: "imageUrl" },
    { key: "time", value: "ts" }
  ];
}

function normalizePayloadSchema(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        key: String(item?.key || "").trim(),
        value: String(item?.value || item?.path || "").trim(),
        literal: String(item?.literal || item?.text || "")
      }))
      .filter((item) => item.key && item.value);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizePayloadSchema(parsed);
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed).map(([key, path]) => ({
          key,
          value: String(path || "").replace(/^\{\{\s*|\s*\}\}$/g, "")
        })).filter((item) => item.key && item.value);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function payloadFieldOptions(selected = "") {
  return deepstreamPayloadFields.map((field) => `
    <option value="${escapeHtml(field.path)}" ${field.path === selected ? "selected" : ""}>${escapeHtml(field.label)}</option>
  `).join("");
}

function payloadSchemaRowsMarkup(schema = []) {
  const rows = normalizePayloadSchema(schema).length ? normalizePayloadSchema(schema) : defaultPayloadSchema();
  return rows.map((item) => `
    <div class="payload-schema-row" data-payload-schema-row>
      <input data-payload-schema-key value="${escapeHtml(item.key)}" placeholder="vd: plate" />
      <select data-payload-schema-value>${payloadFieldOptions(item.value)}</select>
      <input data-payload-schema-literal value="${escapeHtml(item.literal || "")}" placeholder="Custom text" ${item.value === "__literal__" ? "" : "hidden"} />
      <button type="button" class="danger small-button" data-remove-payload-field>Remove</button>
    </div>
  `).join("");
}

function readPayloadSchema(row) {
  return [...row.querySelectorAll("[data-payload-schema-row]")].map((schemaRow) => {
    const value = schemaRow.querySelector("[data-payload-schema-value]")?.value || "";
    const item = {
      key: schemaRow.querySelector("[data-payload-schema-key]")?.value.trim() || "",
      value
    };
    if (value === "__literal__") {
      item.literal = schemaRow.querySelector("[data-payload-schema-literal]")?.value || "";
    }
    return item;
  }).filter((item) => item.key && item.value);
}

function eventOutputRowMarkup(output = {}) {
  const channels = connectionsConfig.channels || [];
  const hasSelectedChannel = channels.some((channel) => channel.id === output.channelId);
  const missingSelectedChannel = output.channelId && !hasSelectedChannel
    ? `<option value="${escapeHtml(output.channelId)}" selected>Saved channel (${escapeHtml(output.channelId)})</option>`
    : "";
  const channelOptions = `<option value="">Select channel</option>${missingSelectedChannel}${channels.map((channel) => (
    `<option value="${escapeHtml(channel.id)}" ${channel.id === output.channelId ? "selected" : ""}>${escapeHtml(channel.name)} (${escapeHtml(channel.provider)})</option>`
  )).join("")}`;
  const payload = output.payload || "full";
  const transformValue = output.transformScript || `return {
  "event_type": event.get("eventType"),
  "camera": event.get("cameraName"),
  "plate": None if event.get("plateText") == "UNKNOWN" else event.get("plateText"),
  "image": event.get("imageUrl"),
  "meta": {
    "zone": event.get("zoneName"),
    "direction": event.get("ruleDirection")
  }
}`;
  return `
    <div class="deploy-event-output-row" data-deploy-event-output>
      <label class="inline-check"><input data-deploy-event-field="enabled" type="checkbox" ${output.enabled !== false ? "checked" : ""} /> enabled</label>
      <label>Event <input data-deploy-event-field="eventType" value="${escapeHtml(output.eventType || "vehicle_capture")}" /></label>
      <label>Publish to <select data-deploy-event-field="channelId">${channelOptions}</select></label>
      <label>Payload
        <select data-deploy-event-field="payload">
          <option value="full" ${payload === "full" ? "selected" : ""}>Full event</option>
          <option value="minimal" ${payload === "minimal" || payload === "compact" ? "selected" : ""}>Minimal</option>
          <option value="schema" ${payload === "schema" || payload === "template" ? "selected" : ""}>Custom schema</option>
          <option value="transform" ${payload === "transform" ? "selected" : ""}>Python transform</option>
        </select>
      </label>
      <button type="button" class="danger small-button" data-remove-deploy-event-output>Remove</button>
      <details class="deploy-payload-editor" ${payload === "schema" || payload === "template" || payload === "transform" ? "open" : ""}>
        <summary>Custom schema / transform</summary>
        <p class="muted">Custom schema maps your output keys to friendly DeepStream event fields. Transform receives <code>event</code> and returns a JSON-serializable object.</p>
        <div class="deploy-payload-fields">
          <div class="payload-schema-builder">
            <div class="payload-schema-head">
              <strong>Schema fields</strong>
              <button type="button" class="secondary small-button" data-add-payload-field>Add field</button>
            </div>
            <div class="payload-schema-list" data-payload-schema-list>
              ${payloadSchemaRowsMarkup(output.schema || output.template)}
            </div>
          </div>
          <label>Transform language
            <select data-deploy-event-field="transformLanguage">
              <option value="python" ${(output.transformLanguage || "python") === "python" ? "selected" : ""}>Python</option>
            </select>
          </label>
          <label>Python transform
            <textarea data-deploy-event-field="transformScript" rows="8">${escapeHtml(transformValue)}</textarea>
          </label>
        </div>
      </details>
    </div>
  `;
}

function latestCaptureForCamera(cameraId) {
  return deployCaptures.find((capture) => capture.cameraId === cameraId);
}

function renderDeployCameraPreview(camera, app = {}, appIndex = 0) {
  const settings = deployCameraSettings(app, camera);
  const zones = settings.zones;
  const capture = latestCaptureForCamera(camera.id);
  const stages = normalizePipelineStages(app.pipelineStages || stagesFromSelectedModels(app.selectedModels)).filter((stage) => stage.enabled);
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
          <small>Zone filters reuse labels from the GIE stages above.</small>
        </div>
        ${zones.map((zone, zoneIndex) => renderDeployZoneRow(zone, zoneIndex, app, stages)).join("")}
      </div>
      <input data-deploy-camera-rules type="hidden" value="${escapeHtml(JSON.stringify(settings.rules))}" />
      ${renderDeployRuleEditor(camera, settings, appIndex)}
    </article>
  `;
}

function renderDeployZoneRow(zone, zoneIndex, app = {}, stages = []) {
  const selectedStage = zoneStageForApp({ ...app, pipelineStages: stages }, zone);
  const selectedGieId = Number(selectedStage?.gieId || zone.gieId || 1);
  const labels = selectedStage ? stageLabelChoices(selectedStage) : [];
  const selected = new Set(String(zone.classIds || "").split(/[;,]/).map((item) => item.trim()).filter(Boolean));
  return `
    <div class="deploy-zone-row" data-deploy-zone-row>
      <input data-deploy-zone-field="id" type="hidden" value="${escapeHtml(zone.id)}" />
      <div class="deploy-zone-row-head">
        <strong>${escapeHtml(zone.name || zone.id)}</strong>
        <label class="inline-check"><input data-deploy-zone-field="enabled" type="checkbox" ${zone.enabled !== false ? "checked" : ""} /> enabled</label>
      </div>
      <div class="grid">
        <label>GIE source
          <select data-deploy-zone-field="gieId">
            ${stages.length ? stages.map((stage) => {
              const file = findModelFile(stage.modelGroup, stage.selectedModel);
              const label = `${stage.gieType || "GIE"} ${stage.gieId} - ${file?.displayName || stage.modelGroup || stage.selectedModel || "model"}`;
              return `<option value="${escapeHtml(stage.gieId)}" ${Number(stage.gieId) === selectedGieId ? "selected" : ""}>${escapeHtml(label)}</option>`;
            }).join("") : '<option value="1">GIE 1</option>'}
          </select>
        </label>
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
      <input data-deploy-zone-field="classIdsText" type="hidden" value="${escapeHtml(zone.classIds || "")}" />
      ${labels.length ? `
        <div class="stage-label-tools deploy-label-tools">
          <small>${labels.length} label(s) from selected GIE stage</small>
          <button type="button" class="secondary small-button" data-select-all-zone-labels>Select all</button>
        </div>
        <div class="stage-label-options compact-label-options">
          ${labels.map((item) => `
            <label class="class-chip">
              <input data-zone-class-option type="checkbox" value="${escapeHtml(item.id)}" ${selected.has(String(item.id)) ? "checked" : ""} />
              <span>${escapeHtml(item.id)}: ${escapeHtml(item.label)}</span>
            </label>
          `).join("")}
        </div>
      ` : '<small>No labels available from this GIE stage. Blank means all classes from the selected GIE.</small>'}
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
        <label>Max seconds <input data-rule-draft="maxTimeSec" type="number" min="1" value="30" /></label>
        <label>Reverse direction
          <select data-rule-draft="reverseAction">
            <option value="ignore">Ignore</option>
            <option value="capture">Capture</option>
          </select>
        </label>
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
  document.querySelectorAll("[data-deploy-active]").forEach((input) => {
    input.addEventListener("change", () => {
      const apps = readDeployApps();
      activeDeployAppId = apps.find((app) => app.active)?.id || activeDeployAppId;
      renderDeployApps(apps, readCameraCards());
    });
  });
  document.querySelectorAll("[data-deploy-camera]").forEach((input) => {
    input.addEventListener("change", () => {
      renderDeployApps(readDeployApps(), readCameraCards());
    });
  });
  document.querySelectorAll("[data-remove-deploy-app]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = readDeployApps();
      current.splice(Number(button.dataset.removeDeployApp), 1);
      renderDeployApps(current.length ? current : [defaultDeployApp(0, readCameraCards())]);
      persistConfigAfterDeployAppChange("DeepStream app removed and saved.", button).catch((error) => print(error.message));
    });
  });
  document.querySelectorAll("[data-deploy-single-app]").forEach((button) => {
    button.addEventListener("click", () => deploySingleApp(button.dataset.deploySingleApp, button).catch((error) => {
      renderCheckpoints(error.checkpoints || []);
      print(error.message || error);
    }));
  });
  document.querySelectorAll("[data-stop-single-app]").forEach((button) => {
    button.addEventListener("click", () => stopSingleApp(button.dataset.stopSingleApp, button).catch((error) => print(error.message || error)));
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
  document.querySelectorAll("[data-add-deploy-event-output]").forEach((button) => {
    button.addEventListener("click", () => {
      const list = button.closest("[data-deploy-app-card]")?.querySelector(".deploy-event-output-list");
      if (!list) return;
      if (list.querySelector(".empty")) list.innerHTML = "";
      list.insertAdjacentHTML("beforeend", eventOutputRowMarkup({ eventType: "vehicle_capture", payload: "schema", schema: defaultPayloadSchema(), enabled: true }));
      attachDeployEventOutputHandlers(list);
    });
  });
  attachDeployEventOutputHandlers(document);
  document.querySelectorAll("[data-zone-class-option]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => syncDeployZoneClassOptions(checkbox.closest("[data-deploy-zone-row]")));
  });
  document.querySelectorAll("[data-deploy-zone-field='gieId']").forEach((select) => {
    select.addEventListener("change", () => {
      const row = select.closest("[data-deploy-zone-row]");
      const hidden = row?.querySelector("[data-deploy-zone-field='classIds']");
      const textInput = row?.querySelector("[data-deploy-zone-field='classIdsText']");
      if (hidden) hidden.value = "";
      if (textInput) textInput.value = "";
      renderDeployApps(readDeployApps(), readCameraCards());
    });
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

function attachDeployEventOutputHandlers(root = document) {
  root.querySelectorAll("[data-remove-deploy-event-output]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      button.closest("[data-deploy-event-output]")?.remove();
      deployApps = readDeployApps();
    });
  });
  root.querySelectorAll("[data-add-payload-field]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const list = button.closest("[data-deploy-event-output]")?.querySelector("[data-payload-schema-list]");
      if (!list) return;
      const next = deepstreamPayloadFields[Math.min(list.querySelectorAll("[data-payload-schema-row]").length, deepstreamPayloadFields.length - 1)];
      list.insertAdjacentHTML("beforeend", payloadSchemaRowsMarkup([{ key: next.path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""), value: next.path }]));
      attachDeployEventOutputHandlers(list);
      deployApps = readDeployApps();
    });
  });
  root.querySelectorAll("[data-remove-payload-field]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      button.closest("[data-payload-schema-row]")?.remove();
      deployApps = readDeployApps();
    });
  });
  root.querySelectorAll("[data-payload-schema-value]").forEach((field) => {
    syncPayloadLiteralInput(field.closest("[data-payload-schema-row]"));
    if (field.dataset.literalBound === "1") return;
    field.dataset.literalBound = "1";
    field.addEventListener("change", () => syncPayloadLiteralInput(field.closest("[data-payload-schema-row]")));
  });
  root.querySelectorAll("[data-deploy-event-output] input, [data-deploy-event-output] select, [data-deploy-event-output] textarea").forEach((field) => {
    if (field.dataset.bound === "1") return;
    field.dataset.bound = "1";
    field.addEventListener("change", () => { deployApps = readDeployApps(); });
    field.addEventListener("input", () => { deployApps = readDeployApps(); });
  });
}

function syncPayloadLiteralInput(row) {
  if (!row) return;
  const select = row.querySelector("[data-payload-schema-value]");
  const input = row.querySelector("[data-payload-schema-literal]");
  if (!select || !input) return;
  input.hidden = select.value !== "__literal__";
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
    maxTimeSec: draft("maxTimeSec")?.value || 30,
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
  activeDeployAppId = config.activeDeployAppId || config.deployApps?.find((app) => app.active)?.id || activeDeployAppId;
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
        <label>
          Upload type
          <select data-builder="factory" data-key="sourceType">
            <option value="pt" selected>PyTorch .pt</option>
            <option value="onnx">ONNX .onnx</option>
          </select>
        </label>
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
        <label data-builder-labels-row hidden>labels.txt for ONNX <input data-builder="factory" data-key="labels" type="file" accept=".txt" /></label>
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
        <button type="button" data-upload-factory-source>Upload & inspect</button>
        <button type="button" data-save-model-config disabled>Save config</button>
        <button type="button" data-refresh-model-files="all">Refresh library</button>
      </div>
      <div class="model-inspect-panel" data-pending-model-panel>
        <div class="empty">Upload source de auto inspect va fill suggested build options truoc khi save vao library.</div>
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
      uploadPendingSource(event.currentTarget).catch((error) => print(error.message));
    } catch (error) {
      print(error.message);
    }
  });
  document.querySelector("[data-save-model-config]")?.addEventListener("click", (event) => {
    saveModelBuildConfig(event.currentTarget).catch((error) => print(error.message));
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
  builderControl("factory", "sourceType")?.addEventListener("change", () => applyFactorySourceTypeDefaults());
  applyFactoryProfileDefaults(profileOptions);
  applyFactorySourceTypeDefaults();
  renderPendingModelDraft();
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

function applyFactorySourceTypeDefaults() {
  const sourceType = builderControl("factory", "sourceType")?.value || "pt";
  const source = builderControl("factory", "source");
  const labelsRow = document.querySelector("[data-builder-labels-row]");
  const simplify = builderControl("factory", "simplify");
  if (source) source.accept = sourceType === "onnx" ? ".onnx" : ".pt";
  if (labelsRow) labelsRow.hidden = sourceType !== "onnx";
  if (simplify && sourceType === "onnx") simplify.checked = false;
}

function fillFactoryBuildOptions(options = {}) {
  const map = {
    profile: "profile",
    task: "task",
    yoloVersion: "yoloVersion",
    imgsz: "imgsz",
    opset: "opset",
    batchSize: "batchSize",
    workspaceMb: "workspaceMb",
    engineBuildMethod: "engineBuildMethod"
  };
  Object.entries(map).forEach(([key, controlKey]) => {
    const control = builderControl("factory", controlKey);
    if (control && options[key] !== undefined && options[key] !== null && options[key] !== "") {
      control.value = options[key];
    }
  });
  ["fp16", "simplify", "dynamic", "buildEngine", "buildParser", "forceRebuild"].forEach((key) => {
    const control = builderControl("factory", key);
    if (control && options[key] !== undefined) control.checked = Boolean(options[key]);
  });
  if (builderControl("factory", "sourceType") && options.sourceType) {
    builderControl("factory", "sourceType").value = options.sourceType;
    applyFactorySourceTypeDefaults();
  }
}

function readFactoryBuildOptions() {
  return buildOptions("factory");
}

function renderPendingModelDraft() {
  const panel = document.querySelector("[data-pending-model-panel]");
  const saveButton = document.querySelector("[data-save-model-config]");
  if (!panel) return;
  if (!pendingModelDraft && !editingModelConfig) {
    panel.innerHTML = '<div class="empty">Upload source de auto inspect va fill suggested build options truoc khi save vao library.</div>';
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Save config";
    }
    return;
  }
  const draft = pendingModelDraft || editingModelConfig;
  const inspect = draft.inspect || {};
  const suggested = inspect.suggested || draft.buildOptions || {};
  const familyRule = inspect.familyRule || draft.familyRule || null;
  const outputs = (inspect.outputs || []).map((item) => `${item.name}: [${(item.shape || []).join(", ")}]`).join("\n");
  const inputs = (inspect.inputs || []).map((item) => `${item.name}: [${(item.shape || []).join(", ")}]`).join("\n");
  panel.innerHTML = `
    <div class="inspect-summary">
      <div>
        <strong>${escapeHtml(draft.modelName || draft.group || "Pending model")}</strong>
        <span>${escapeHtml(draft.originalName || draft.source || "")}</span>
        <small>${escapeHtml(inspect.detected?.outputKind || "not inspected")} - ${escapeHtml(inspect.type || "")}</small>
      </div>
      <div class="metric-row">
        <strong>${escapeHtml(suggested.profile || "")}</strong><span>profile</span>
        <strong>${escapeHtml(suggested.imageSize || suggested.imgsz || "")}</strong><span>imgsz</span>
        <strong>${escapeHtml(suggested.buildBatchSize || suggested.batchSize || "")}</strong><span>batch</span>
      </div>
      ${familyRule ? `
        <div class="inspect-family-rule">
          <strong>${escapeHtml(familyRule.label || familyRule.id)}</strong>
          <span>${escapeHtml(familyRule.reason || "")}</span>
          <small>Locked parser: ${escapeHtml(familyRule.parserProfile || suggested.deepstreamYoloRef || "")}</small>
          ${familyRule.lockedOptions?.length ? `<small>Locked options: ${familyRule.lockedOptions.map(escapeHtml).join(", ")}</small>` : ""}
        </div>
      ` : ""}
      <pre>${escapeHtml([inputs ? `Inputs:\n${inputs}` : "", outputs ? `Outputs:\n${outputs}` : ""].filter(Boolean).join("\n\n"))}</pre>
      ${(inspect.recommendations || []).length ? `<ul>${inspect.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${(inspect.warnings || []).length ? `<div class="task-status failed">${statusMarkup("failed", inspect.warnings.join(" "))}</div>` : ""}
    </div>
  `;
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.textContent = editingModelConfig ? "Save config changes" : "Save config";
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

async function uploadPendingSource(button = null) {
  const sourceInput = builderControl("factory", "source");
  const labelsInput = builderControl("factory", "labels");
  if (!sourceInput.files.length) return print("Chon file source model truoc khi upload.");
  const group = factoryModelGroup();
  const result = await withTask("model-factory", button, "Inspecting source...", async () => {
    const form = new FormData();
    form.append("file", sourceInput.files[0]);
    if (labelsInput?.files?.length) form.append("labels", labelsInput.files[0]);
    form.append("modelName", builderControl("factory", "modelName")?.value || group);
    form.append("description", builderControl("factory", "description")?.value || "");
    form.append("sourceType", builderControl("factory", "sourceType")?.value || "pt");
    form.append("profile", builderControl("factory", "profile")?.value || "yolo_detection");
    form.append("yoloVersion", builderControl("factory", "yoloVersion")?.value || "yolov8");
    return await api("/api/model-source/pending", { method: "POST", body: form });
  });
  pendingModelDraft = result;
  editingModelConfig = null;
  fillFactoryBuildOptions(result.buildOptions || result.inspect?.suggested || {});
  renderPendingModelDraft();
  setTaskStatus("model-factory", "success", `Inspect done for ${result.modelName || result.group}. Save config to add it to library.`);
  print(result);
}

async function saveModelBuildConfig(button = null) {
  if (editingModelConfig) {
    const payload = {
      modelName: builderControl("factory", "modelName")?.value || editingModelConfig.modelName || editingModelConfig.group,
      description: builderControl("factory", "description")?.value || editingModelConfig.description || "",
      buildOptions: readFactoryBuildOptions()
    };
    const result = await withTask(`model-${editingModelConfig.group}`, button, "Saving build config...", async () => {
      return await api(`/api/model-source/${encodeURIComponent(editingModelConfig.group)}/${encodeURIComponent(editingModelConfig.sourceKey)}/config`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    });
    modelFiles.set(editingModelConfig.group, result.files || []);
    upsertModelLibraryGroup(editingModelConfig.group, result.files || []);
    editingModelConfig = null;
    renderPendingModelDraft();
    renderModelLibrary();
    setTaskStatus("model-factory", "success", "Build config saved.");
    print(result);
    return;
  }
  if (!pendingModelDraft) return print("Upload va inspect source model truoc khi save config.");
  const payload = {
    ...pendingModelDraft,
    modelName: builderControl("factory", "modelName")?.value || pendingModelDraft.modelName,
    description: builderControl("factory", "description")?.value || pendingModelDraft.description || "",
    buildOptions: readFactoryBuildOptions()
  };
  const result = await withTask("model-factory", button, "Saving model config...", async () => {
    return await api("/api/model-source/save-config", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  });
  pendingModelDraft = null;
  modelFiles.set(result.group, result.files || []);
  upsertModelLibraryGroup(result.group, result.files || []);
  renderPendingModelDraft();
  renderModelLibrary();
  setTaskStatus("model-factory", "success", "Model config saved to library.");
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
          ${file.familyRule?.label ? `<b class="built">${escapeHtml(file.familyRule.label)}</b>` : ""}
          ${file.name.toLowerCase().endsWith(".onnx") ? `<b class="${file.labelsUploaded ? "built" : "not-built"}">${file.labelsUploaded ? "labels ok" : "needs labels"}</b>` : ""}
          ${file.task ? `<b>${escapeHtml(file.task)}</b>` : ""}
          ${file.inspectedAt ? `<b>inspected ${escapeHtml(formatDateTime(file.inspectedAt))}</b>` : ""}
          ${file.inspectDetected?.outputKind ? `<b>${escapeHtml(file.inspectDetected.outputKind)}</b>` : ""}
          ${file.lastDummyTest?.testedAt ? `<b>dummy tested ${escapeHtml(formatDateTime(file.lastDummyTest.testedAt))}</b>` : ""}
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
        <button type="button" data-change-model-config="${escapeHtml(group)}" data-source-key="${escapeHtml(file.sourceKey)}">
          Change config
        </button>
        <button type="button" data-inspect-model-file="${escapeHtml(group)}" data-source-key="${escapeHtml(file.sourceKey)}">
          Inspect
        </button>
        <button type="button" data-test-build-model="${escapeHtml(group)}" data-source-key="${escapeHtml(file.sourceKey)}">
          Test build
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
  container.querySelectorAll("[data-inspect-model-file]").forEach((button) => {
    button.addEventListener("click", () => inspectModelFile(
      button.dataset.inspectModelFile,
      button.dataset.sourceKey,
      button
    ).catch((error) => print(error.message)));
  });
  container.querySelectorAll("[data-change-model-config]").forEach((button) => {
    button.addEventListener("click", () => changeModelConfig(
      button.dataset.changeModelConfig,
      button.dataset.sourceKey
    ));
  });
  container.querySelectorAll("[data-test-build-model]").forEach((button) => {
    button.addEventListener("click", () => testModelBuild(
      button.dataset.testBuildModel,
      button.dataset.sourceKey,
      button
    ).catch((error) => print(error.message)));
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

async function inspectModelFile(group, sourceKey, button = null) {
  const result = await withTask(`model-${group}`, button, `Inspecting ${group}...`, async () => {
    return await api(`/api/model-source/${encodeURIComponent(group)}/${encodeURIComponent(sourceKey)}/inspect`, { method: "POST" });
  });
  await loadModelFiles(group);
  const detected = result.inspect?.detected?.outputKind || "unknown output";
  setTaskStatus(`model-${group}`, "success", `Inspect done: ${detected}.`);
  print(result);
}

function changeModelConfig(group, sourceKey) {
  const file = findModelFile(group, sourceKey);
  if (!file) return print("Cannot find selected model config.");
  editingModelConfig = {
    group,
    sourceKey,
    modelName: file.displayName || file.name,
    description: file.description || "",
    inspect: file.inspect || null,
    buildOptions: file.buildOptions || {}
  };
  pendingModelDraft = null;
  builderControl("factory", "modelName").value = file.displayName || group;
  builderControl("factory", "description").value = file.description || "";
  fillFactoryBuildOptions(file.buildOptions || {
    profile: file.profile,
    task: file.task,
    sourceType: file.name.toLowerCase().endsWith(".onnx") ? "onnx" : "pt"
  });
  renderPendingModelDraft();
  setTaskStatus("model-factory", "running", `Editing build config for ${file.displayName || file.name}.`);
}

async function testModelBuild(group, sourceKey, button = null) {
  const result = await withTask(`model-${group}`, button, `Testing ${group}...`, async () => {
    return await api(`/api/model-source/${encodeURIComponent(group)}/${encodeURIComponent(sourceKey)}/test-build`, { method: "POST" });
  });
  if (result.files) {
    modelFiles.set(group, result.files || []);
    upsertModelLibraryGroup(group, result.files || []);
    renderModelLibrary();
  }
  setTaskStatus(`model-${group}`, "success", `Dummy test ${result.test?.mode || "done"}.`);
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

function resetRoiRectangleDraft() {
  roiTool.rectStart = null;
  roiTool.previewPoint = null;
}

function setRoiDrawMode(mode) {
  roiTool.drawMode = mode === "rectangle" ? "rectangle" : "polygon";
  resetRoiRectangleDraft();
  els.roiPolygonModeBtn?.classList.toggle("active", roiTool.drawMode === "polygon");
  els.roiRectangleModeBtn?.classList.toggle("active", roiTool.drawMode === "rectangle");
  drawRoiTool();
}

function rectanglePoints(start, end) {
  if (!Array.isArray(start) || !Array.isArray(end)) return [];
  const [x1, y1] = start;
  const [x2, y2] = end;
  if (x1 === x2 || y1 === y2) return [];
  return [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2]
  ];
}

function zoneGeometrySummary(points = []) {
  const clean = cleanZonePolygon(points);
  if (clean.length < 3) return "full frame";
  return clean.length === 4 ? "rectangle / 4 pts" : `${clean.length} pts`;
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
      <span>${zoneGeometrySummary(item.polygon)}</span>
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
    maxTimeSec: els.roiRuleMaxTime.value || 30,
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
    polygon: roiTool.points,
    referenceSize: currentRoiReferenceSize() || zone.referenceSize || null
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
  resetRoiRectangleDraft();
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
  resetRoiRectangleDraft();
  drawRoiTool();
  updateRoiOutput();
}

function clearRoiReferenceImage(initialPoints = []) {
  roiTool.image = null;
  roiTool.source = "";
  roiTool.points = Array.isArray(initialPoints) ? initialPoints : [];
  resetRoiRectangleDraft();
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
    resetRoiRectangleDraft();
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
  drawRoiRectanglePreview(context);
  if (!roiTool.points.length) return;
}

function drawRoiRectanglePreview(context) {
  if (roiTool.drawMode !== "rectangle" || !roiTool.rectStart) return;
  const canvas = els.roiCanvas;
  const preview = roiTool.previewPoint || roiTool.rectStart;
  const points = rectanglePoints(roiTool.rectStart, preview);
  context.save();
  context.strokeStyle = "#f59e0b";
  context.fillStyle = "rgba(245, 158, 11, .14)";
  context.lineWidth = Math.max(2, Math.round(canvas.width / 640));
  context.setLineDash([Math.max(8, Math.round(canvas.width / 160)), Math.max(5, Math.round(canvas.width / 240))]);
  if (points.length) {
    context.beginPath();
    points.forEach(([x, y], pointIndex) => {
      if (pointIndex === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.stroke();
    context.fill();
  }
  context.setLineDash([]);
  context.beginPath();
  context.arc(roiTool.rectStart[0], roiTool.rectStart[1], Math.max(5, Math.round(canvas.width / 300)), 0, Math.PI * 2);
  context.fillStyle = "#f59e0b";
  context.fill();
  drawRoiPointLabel(context, "A", roiTool.rectStart[0], roiTool.rectStart[1]);
  context.restore();
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
  if (!roiTool.image) return print("Capture frame hoac upload anh ROI truoc khi ve zone.");
  const point = getRoiCanvasPoint(event);
  if (roiTool.drawMode === "rectangle") {
    if (!roiTool.rectStart) {
      roiTool.rectStart = point;
      roiTool.previewPoint = point;
    } else {
      const points = rectanglePoints(roiTool.rectStart, point);
      if (!points.length) return print("Rectangle can co chieu rong va chieu cao lon hon 0.");
      roiTool.points = points;
      resetRoiRectangleDraft();
    }
    drawRoiTool();
    updateRoiOutput();
    return;
  }
  roiTool.points.push(point);
  drawRoiTool();
  updateRoiOutput();
}

function undoRoiPoint() {
  if (roiTool.rectStart) {
    resetRoiRectangleDraft();
  } else if (roiTool.drawMode === "rectangle" && roiTool.points.length === 4) {
    roiTool.points = [];
  } else {
    roiTool.points.pop();
  }
  drawRoiTool();
  updateRoiOutput();
}

function clearRoiPolygon() {
  roiTool.points = [];
  resetRoiRectangleDraft();
  drawRoiTool();
  updateRoiOutput();
}

function previewRoiRectangle(event) {
  if (!roiTool.image || roiTool.drawMode !== "rectangle" || !roiTool.rectStart) return;
  roiTool.previewPoint = getRoiCanvasPoint(event);
  drawRoiTool();
}

function clearRoiPreview() {
  if (!roiTool.previewPoint) return;
  roiTool.previewPoint = null;
  drawRoiTool();
}

async function saveRoiConfig(message) {
  const result = await api("/api/config", { method: "PUT", body: JSON.stringify(formConfig()) });
  renderConfig(result);
  print(message);
}

async function applyRoiToCamera() {
  if (roiTool.points.length < 3) return print("Zone can it nhat 3 diem, hoac ve rectangle bang 2 goc.");
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
  const sourceKey = (modelFiles.get(group) || []).find((file) => file.path === sourcePath)?.sourceKey || "";
  const saved = sourceKey ? findModelFile(group, sourceKey)?.buildOptions || {} : {};
  await buildModel(group, button, { ...saved, sourcePath, profile: saved.profile || sourceProfile, forceRebuild, modelName: "", description: "" });
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
    return await api("/api/deploy", { method: "POST", body: JSON.stringify(formConfig(activeDeployAppId, { forDeploy: true })) });
  });
  renderCheckpoints(result.checkpoints || []);
  await refreshDeployStatus().catch(() => {});
  print(result);
}

async function deploySingleApp(appId, button = null) {
  const app = readDeployApps().find((item) => item.id === appId);
  if (!app) throw new Error("Deploy app not found.");
  renderCheckpoints([
    { order: 1, label: `Deploy ${app.name || app.id}`, status: "running", message: "Starting deploy...", durationMs: null }
  ]);
  const result = await withTask("deploy", button, `Deploying ${app.name || app.id}...`, async () => {
    return await api(`/api/deploy/apps/${encodeURIComponent(app.id)}/deploy`, {
      method: "POST",
      body: JSON.stringify(formConfig(app.id, { forDeploy: true }))
    });
  });
  renderCheckpoints(result.checkpoints || []);
  await refreshDeployStatus().catch(() => {});
  print(result);
}

async function stop(button = null) {
  const activeApp = readDeployApps().find((app) => app.active) || readDeployApps()[0];
  if (activeApp?.id) return await stopSingleApp(activeApp.id, button);
  const result = await withTask("stop", button, "Stopping...", async () => api("/api/stop", { method: "POST" }));
  await refreshDeployStatus().catch(() => {});
  print(result);
}

async function stopSingleApp(appId, button = null) {
  const app = readDeployApps().find((item) => item.id === appId);
  const result = await withTask("stop", button, `Stopping ${app?.name || appId}...`, async () => {
    return await api(`/api/deploy/apps/${encodeURIComponent(appId)}/stop`, { method: "POST" });
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

function deployStatusTone({ running = false, exists = false, started = false, state = "" } = {}) {
  if (running && (started || state === "playing")) return "success";
  if (running) return "warning";
  if (exists || state === "starting") return "warning";
  return "failed";
}

function deployStatusLabel(appStatus = {}) {
  const container = appStatus.container || {};
  const deepstream = appStatus.deepstream || {};
  if (container.running && (deepstream.state === "playing" || deepstream.started)) return "Running";
  if (container.running) return "Starting";
  if (container.exists) return "Stopped";
  return "Missing";
}

function appConfigById(appId) {
  return deployApps.find((app) => app.id === appId) || null;
}

function renderRuntimeBadge(label, tone = "") {
  return `<span class="runtime-badge ${tone}">${escapeHtml(label)}</span>`;
}

function renderDeployAppMonitorRow(appStatus = {}, activeId = "") {
  const appId = appStatus.appId || appStatus.id || "default";
  const appConfig = appConfigById(appId);
  const container = appStatus.container || {};
  const deepstream = appStatus.deepstream || {};
  const sources = Array.isArray(deepstream.sources) ? deepstream.sources : [];
  const isActive = appId === activeId;
  const running = Boolean(container.running);
  const stateLabel = deployStatusLabel(appStatus);
  const stateTone = deployStatusTone({
    running,
    exists: container.exists,
    started: deepstream.started,
    state: deepstream.state
  });
  const fps = sources.reduce((sum, source) => sum + Number(source.fps || 0), 0);
  return `
    <article class="deploy-runtime-row ${isActive ? "active" : ""}" data-monitor-app-id="${escapeHtml(appId)}">
      <div class="deploy-runtime-main">
        <div>
          <div class="deploy-runtime-title">
            <strong>${escapeHtml(appStatus.appName || appConfig?.name || appId)}</strong>
            ${isActive ? renderRuntimeBadge("active", "info") : ""}
          </div>
          <small>${escapeHtml(appId)} - ${escapeHtml(appStatus.containerName || container.name || "container not created")}</small>
        </div>
        <div class="deploy-runtime-badges">
          ${renderRuntimeBadge(stateLabel, stateTone)}
          ${renderRuntimeBadge(deepstream.state || "unknown", deepstream.state === "playing" ? "success" : "warning")}
          ${renderRuntimeBadge(`${sources.length} source${sources.length === 1 ? "" : "s"}`, "info")}
          ${renderRuntimeBadge(`${fps.toFixed(2)} FPS`, fps > 0 ? "success" : "warning")}
        </div>
      </div>
      <div class="deploy-runtime-actions">
        <button type="button" class="secondary" data-monitor-deploy-app="${escapeHtml(appId)}">Deploy</button>
        <button type="button" class="danger" data-monitor-stop-app="${escapeHtml(appId)}" ${running ? "" : "disabled"}>Stop</button>
        <a class="button-link secondary" href="/results?appId=${encodeURIComponent(appId)}">Results</a>
      </div>
    </article>
  `;
}

function renderDeploySourceMonitorRows(appStatuses = []) {
  const rows = appStatuses.flatMap((appStatus) => {
    const appId = appStatus.appId || appStatus.id || "default";
    const appName = appStatus.appName || appConfigById(appId)?.name || appId;
    const sources = appStatus.deepstream?.sources || [];
    return sources.map((source) => ({ ...source, appId, appName }));
  });
  if (!rows.length) {
    return `
      <div class="deploy-empty-state">
        <strong>No source status yet</strong>
        <small>Deploy an app and wait for DeepStream to report FPS.</small>
      </div>
    `;
  }
  return `
    <div class="deploy-source-table">
      ${rows.map((source) => `
        <div class="deploy-source-row">
          <div>
            <strong>${escapeHtml(source.cameraName || source.cameraId || `Source ${source.sourceId}`)}</strong>
            <small>${escapeHtml(source.appName)} - ${escapeHtml(source.cameraId || `source-${source.sourceId}`)}</small>
          </div>
          <span>${Number(source.fps || 0).toFixed(2)} FPS</span>
          <small>${Number(source.frameCount || 0)} frames</small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderDeployStatus(status = {}) {
  if (!els.deployStatusCards) return;
  latestDeployStatus = status;
  const container = status.container || {};
  const deepstream = status.deepstream || {};
  const appStatuses = Array.isArray(status.apps) && status.apps.length ? status.apps : [status];
  const activeApp = deployApps.find((app) => app.active) || deployApps[0] || null;
  const activeId = status.appId || activeApp?.id || appStatuses[0]?.appId || "";
  const runningApps = appStatuses.filter((item) => item.container?.running).length;
  const totalSources = appStatuses.reduce((sum, item) => sum + Number(item.deepstream?.sources?.length || 0), 0);
  const totalFps = appStatuses.reduce((sum, item) => (
    sum + (item.deepstream?.sources || []).reduce((inner, source) => inner + Number(source.fps || 0), 0)
  ), 0);
  if (els.stopRunningDeployBtn) {
    els.stopRunningDeployBtn.disabled = !container.running;
    els.stopRunningDeployBtn.textContent = container.running
      ? `Stop ${activeApp?.name || "running app"}`
      : "Stop running app";
  }
  els.deployStatusCards.innerHTML = `
    <div class="deploy-monitor-board">
      <div class="deploy-monitor-summary">
        <article>
          <span>Active app</span>
          <strong>${escapeHtml(activeApp?.name || status.appName || "No app selected")}</strong>
          <small>${escapeHtml(activeId || "Deploy an app to start runtime.")}</small>
        </article>
        <article>
          <span>Running apps</span>
          <strong>${runningApps}/${appStatuses.length}</strong>
          <small>${escapeHtml(deepstream.message || "Runtime status by app")}</small>
        </article>
        <article>
          <span>Sources</span>
          <strong>${totalSources}</strong>
          <small>${totalFps.toFixed(2)} total FPS</small>
        </article>
      </div>
      <div class="deploy-monitor-columns">
        <section class="deploy-monitor-section">
          <div class="section-mini-head">
            <h4>DeepStream apps</h4>
            <small>Deploy, stop and inspect each app independently.</small>
          </div>
          <div class="deploy-runtime-list">
            ${appStatuses.map((item) => renderDeployAppMonitorRow(item, activeId)).join("")}
          </div>
        </section>
        <section class="deploy-monitor-section">
          <div class="section-mini-head">
            <h4>Source FPS</h4>
            <small>Realtime source health reported by running containers.</small>
          </div>
          ${renderDeploySourceMonitorRows(appStatuses)}
        </section>
      </div>
    </div>
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
  await refreshConnections().catch((error) => setTaskStatus("connections", "failed", error.message));
  renderConfig(config);
  await loadDeployCaptures().catch((error) => setTaskStatus("deploy-previews", "failed", error.message));
  await refreshDeployStatus().catch(() => {});
  await refreshAgent().catch((error) => setTaskStatus("agent", "failed", error.message));
  await refreshAutomation().catch((error) => setTaskStatus("automation", "failed", error.message));
  await refreshTriton().catch((error) => setTaskStatus("triton", "failed", error.message));
  await refreshServices().catch((error) => setTaskStatus("services", "failed", error.message));
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
els.deployStatusCards?.addEventListener("click", (event) => {
  const deployButton = event.target.closest("[data-monitor-deploy-app]");
  if (deployButton) {
    deploySingleApp(deployButton.dataset.monitorDeployApp, deployButton).catch((error) => {
      renderCheckpoints(error.checkpoints || error.body?.checkpoints || []);
      print(error.message || error);
    });
    return;
  }
  const stopButton = event.target.closest("[data-monitor-stop-app]");
  if (stopButton) {
    stopSingleApp(stopButton.dataset.monitorStopApp, stopButton).catch((error) => print(error.message || error));
  }
});
els.addCameraBtn.addEventListener("click", () => {
  try {
    const { camera, action } = addCamera();
    persistConfigAfterCameraChange(`Camera ${camera.name || camera.id} ${action} and saved.`, els.addCameraBtn).catch((error) => print(error.message));
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
  }
  deployApps = readDeployApps();
  renderMainDashboard();
});
els.roiImageFile.addEventListener("change", loadRoiImage);
els.roiCameraSelect.addEventListener("change", openRoiTool);
els.roiPolygonModeBtn?.addEventListener("click", () => setRoiDrawMode("polygon"));
els.roiRectangleModeBtn?.addEventListener("click", () => setRoiDrawMode("rectangle"));
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
els.roiCanvas.addEventListener("mousemove", previewRoiRectangle);
els.roiCanvas.addEventListener("mouseleave", clearRoiPreview);
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
els.refreshServicesBtn?.addEventListener("click", () => refreshServices(els.refreshServicesBtn).catch((error) => print(error.message)));
els.servicePackageSelect?.addEventListener("change", () => {
  editingServiceInstanceId = "";
  renderServiceConfigForm({});
});
els.serviceDynamicConfig?.addEventListener("change", (event) => {
  if (event.target?.matches?.("[data-service-config-type='cameraSelect']")) {
    const config = readServiceConfigForm();
    renderServiceConfigForm(config);
  }
});
els.resetServiceEditorBtn?.addEventListener("click", () => resetServiceEditor());
els.saveServiceInstanceBtn?.addEventListener("click", () => saveServiceInstance(els.saveServiceInstanceBtn).catch((error) => print(error.message)));
els.serviceCatalogList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-use-service-package]");
  if (!button) return;
  resetServiceEditor(button.dataset.useServicePackage);
});
els.serviceInstanceList?.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-service-instance]");
  if (editButton) {
    editServiceInstance(editButton.dataset.editServiceInstance);
    return;
  }
  const actionButton = event.target.closest("[data-service-action]");
  if (actionButton) {
    runServiceInstanceAction(actionButton.dataset.serviceInstance, actionButton.dataset.serviceAction, actionButton).catch((error) => print(error.message));
    return;
  }
  const outputButton = event.target.closest("[data-view-service-outputs]");
  if (outputButton) {
    loadServiceOutputs(outputButton.dataset.viewServiceOutputs, outputButton).catch((error) => print(error.message));
    return;
  }
  const deleteButton = event.target.closest("[data-delete-service-instance]");
  if (deleteButton) {
    deleteServiceInstance(deleteButton.dataset.deleteServiceInstance).catch((error) => print(error.message));
  }
});
els.refreshAutomationBtn?.addEventListener("click", () => refreshAutomation(els.refreshAutomationBtn).catch((error) => print(error.message)));
els.saveAutomationBtn?.addEventListener("click", () => saveAutomation(els.saveAutomationBtn).catch((error) => print(error.message)));
els.addAutomationEnvBtn?.addEventListener("click", () => {
  try {
    addAutomationEnvironment();
  } catch (error) {
    print(error.message);
  }
});
els.addAutomationServiceBtn?.addEventListener("click", () => {
  try {
    addAutomationService();
  } catch (error) {
    print(error.message);
  }
});
els.addAutomationWorkflowBtn?.addEventListener("click", () => {
  try {
    addAutomationWorkflow();
  } catch (error) {
    print(error.message);
  }
});
els.automationEnvList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-automation-env]");
  if (!button) return;
  automationConfig.environments.splice(Number(button.dataset.removeAutomationEnv), 1);
  renderAutomation();
});
els.automationServiceList?.addEventListener("click", (event) => {
  const testButton = event.target.closest("[data-test-automation-service]");
  if (testButton) {
    testAutomationService(testButton.dataset.testAutomationService).catch((error) => print(error.message));
    return;
  }
  const removeButton = event.target.closest("[data-remove-automation-service]");
  if (!removeButton) return;
  automationConfig.services.splice(Number(removeButton.dataset.removeAutomationService), 1);
  renderAutomation();
});
els.automationWorkflowList?.addEventListener("click", (event) => {
  const testButton = event.target.closest("[data-test-automation-workflow]");
  if (testButton) {
    testAutomationWorkflow(testButton.dataset.testAutomationWorkflow).catch((error) => print(error.message));
    return;
  }
  const removeButton = event.target.closest("[data-remove-automation-workflow]");
  if (!removeButton) return;
  automationConfig.workflows.splice(Number(removeButton.dataset.removeAutomationWorkflow), 1);
  renderAutomation();
});
els.refreshAutomationRunsBtn?.addEventListener("click", () => refreshAutomationRuns(els.refreshAutomationRunsBtn).then((result) => print(result)).catch((error) => print(error.message)));
els.clearAutomationRunsBtn?.addEventListener("click", () => clearAutomationRuns().catch((error) => print(error.message)));
els.refreshConnectionsBtn?.addEventListener("click", () => refreshConnections(els.refreshConnectionsBtn).catch((error) => print(error.message)));
els.saveConnectionsBtn?.addEventListener("click", () => saveConnections(els.saveConnectionsBtn).catch((error) => print(error.message)));
els.addConnectionChannelBtn?.addEventListener("click", () => {
  try {
    addConnectionChannel();
  } catch (error) {
    print(error.message);
  }
});
els.connectionProviderList?.addEventListener("change", readConnectionProviders);
els.connectionProviderList?.addEventListener("input", readConnectionProviders);
els.connectionProviderList?.addEventListener("click", (event) => {
  const startButton = event.target.closest("[data-start-connection-provider]");
  if (startButton) {
    startConnectionProvider(startButton.dataset.startConnectionProvider, startButton).catch((error) => print(error.message));
    return;
  }
  const stopButton = event.target.closest("[data-stop-connection-provider]");
  if (stopButton) {
    stopConnectionProvider(stopButton.dataset.stopConnectionProvider, stopButton).catch((error) => print(error.message));
  }
});
els.connectionChannelList?.addEventListener("click", (event) => {
  const testButton = event.target.closest("[data-test-connection-channel]");
  if (testButton) {
    testConnectionChannel(testButton.dataset.testConnectionChannel, testButton).catch((error) => print(error.message));
    return;
  }
  const removeButton = event.target.closest("[data-remove-connection-channel]");
  if (!removeButton) return;
  connectionsConfig.channels.splice(Number(removeButton.dataset.removeConnectionChannel), 1);
  renderConnections();
});
els.inspectConnectionChannelBtn?.addEventListener("click", () => inspectConnectionChannelMessages(els.inspectConnectionChannelBtn).catch((error) => print(error.message)));
els.refreshTritonBtn?.addEventListener("click", () => refreshTriton(els.refreshTritonBtn).catch((error) => print(error.message)));
els.startTritonBtn?.addEventListener("click", () => startTriton(els.startTritonBtn).catch((error) => print(error.message)));
els.stopTritonBtn?.addEventListener("click", () => stopTriton(els.stopTritonBtn).catch((error) => print(error.message)));
els.uploadTritonModelBtn?.addEventListener("click", () => uploadTritonModel(els.uploadTritonModelBtn).catch((error) => print(error.message)));
els.tritonModelFile?.addEventListener("change", () => {
  const file = els.tritonModelFile.files?.[0];
  if (!file || els.tritonModelName.value.trim()) return;
  els.tritonModelName.value = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_.-]/g, "_");
});
els.tritonModelList?.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy-triton-url]");
  if (copyButton) {
    copyTritonInferUrl(copyButton.dataset.copyTritonUrl).catch((error) => print(error.message));
    return;
  }
  const useButton = event.target.closest("[data-use-triton-model]");
  if (useButton) {
    if (els.tritonInferModel) els.tritonInferModel.value = useButton.dataset.useTritonModel;
    latestTritonMetadata = null;
    latestTritonMetadataKey = "";
    updateTritonInferUrl();
    setTaskStatus("triton", "success", `Selected Triton model ${useButton.dataset.useTritonModel}.`);
    return;
  }
  const fixButton = event.target.closest("[data-fix-triton-config]");
  if (fixButton) {
    fixTritonConfig(fixButton.dataset.fixTritonConfig).catch((error) => print(error.message));
    return;
  }
  const saveMetaButton = event.target.closest("[data-save-triton-meta]");
  if (saveMetaButton) {
    saveTritonMeta(saveMetaButton.dataset.saveTritonMeta).catch((error) => print(error.message));
    return;
  }
  const uploadLabelsButton = event.target.closest("[data-upload-triton-labels]");
  if (uploadLabelsButton) {
    uploadTritonLabels(uploadLabelsButton.dataset.uploadTritonLabels).catch((error) => print(error.message));
    return;
  }
  const button = event.target.closest("[data-delete-triton-model]");
  if (!button) return;
  deleteTritonModel(button.dataset.deleteTritonModel).catch((error) => print(error.message));
});
els.tritonInferModel?.addEventListener("change", () => {
  latestTritonMetadata = null;
  latestTritonMetadataKey = "";
  updateTritonInferUrl();
});
els.tritonInferVersion?.addEventListener("input", () => {
  latestTritonMetadata = null;
  latestTritonMetadataKey = "";
  updateTritonInferUrl();
});
els.copyTritonInferUrlBtn?.addEventListener("click", () => copyTritonInferUrl().catch((error) => print(error.message)));
els.loadTritonMetadataBtn?.addEventListener("click", () => loadTritonMetadata(els.loadTritonMetadataBtn).catch((error) => {
  if (els.tritonInferOutput) els.tritonInferOutput.textContent = error.message;
  print(error.message);
}));
els.sampleTritonPayloadBtn?.addEventListener("click", () => {
  useSampleTritonPayload(els.sampleTritonPayloadBtn).catch((error) => {
    setTritonInferOutput(error.message);
  });
});
els.testTritonInferBtn?.addEventListener("click", () => testTritonInfer(els.testTritonInferBtn).catch((error) => {
  if (els.tritonInferOutput) els.tritonInferOutput.textContent = error.message;
  print(error.message);
}));
els.dummyTritonInferBtn?.addEventListener("click", () => dummyTritonInfer(els.dummyTritonInferBtn).catch((error) => {
  if (els.tritonInferOutput) els.tritonInferOutput.textContent = error.message;
  print(error.message);
}));
els.testTritonImageInferBtn?.addEventListener("click", () => testTritonImageInfer(els.testTritonImageInferBtn).catch((error) => {
  if (els.tritonInferOutput) els.tritonInferOutput.textContent = error.message;
  print(error.message);
}));
init().catch((error) => print(error.message));
