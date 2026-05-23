const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const DEFAULT_THREAD_ID = "default";
const MAX_MESSAGES = 40;
const MAX_NOTES = 80;
const DEFAULT_AGENT_TIME_ZONE = "Asia/Bangkok";

const PROVIDER_SPECS = {
  openai: {
    label: "OpenAI",
    needsApiKey: true,
    apiKeyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-4.1-mini",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "Provider default: https://api.openai.com/v1",
    models: [
      { id: "gpt-5.1", label: "GPT-5.1", family: "reasoning", params: ["maxTokens", "reasoningEffort"], reasoningEfforts: ["none", "low", "medium", "high"], defaultReasoningEffort: "none" },
      { id: "gpt-5.1-mini", label: "GPT-5.1 Mini", family: "reasoning", params: ["maxTokens", "reasoningEffort"], reasoningEfforts: ["none", "low", "medium", "high"], defaultReasoningEffort: "none" },
      { id: "gpt-5", label: "GPT-5", family: "reasoning", params: ["maxTokens", "reasoningEffort"], reasoningEfforts: ["low", "medium", "high"], defaultReasoningEffort: "medium" },
      { id: "gpt-5-mini", label: "GPT-5 Mini", family: "reasoning", params: ["maxTokens", "reasoningEffort"], reasoningEfforts: ["low", "medium", "high"], defaultReasoningEffort: "medium" },
      { id: "gpt-5-nano", label: "GPT-5 Nano", family: "reasoning", params: ["maxTokens", "reasoningEffort"], reasoningEfforts: ["low", "medium", "high"], defaultReasoningEffort: "medium" },
      { id: "o4-mini", label: "o4-mini", family: "reasoning", params: ["maxTokens", "reasoningEffort"], reasoningEfforts: ["low", "medium", "high"], defaultReasoningEffort: "medium" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", family: "chat", params: ["temperature", "maxTokens", "topP"] },
      { id: "gpt-4.1", label: "GPT-4.1", family: "chat", params: ["temperature", "maxTokens", "topP"] },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", family: "chat", params: ["temperature", "maxTokens", "topP"] },
      { id: "gpt-4o", label: "GPT-4o", family: "chat", params: ["temperature", "maxTokens", "topP"] }
    ],
    customModel: { family: "chat", params: ["temperature", "maxTokens", "topP"] }
  },
  ollama: {
    label: "Ollama",
    needsApiKey: false,
    defaultModel: "llama3.1",
    baseUrl: "http://localhost:11434",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "Provider default: http://localhost:11434",
    models: [
      { id: "llama3.1", label: "Llama 3.1", family: "chat", params: ["temperature", "maxTokens", "topP"] },
      { id: "llama3.2", label: "Llama 3.2", family: "chat", params: ["temperature", "maxTokens", "topP"] },
      { id: "qwen2.5", label: "Qwen 2.5", family: "chat", params: ["temperature", "maxTokens", "topP"] },
      { id: "gemma3", label: "Gemma 3", family: "chat", params: ["temperature", "maxTokens", "topP"] },
      { id: "mistral", label: "Mistral", family: "chat", params: ["temperature", "maxTokens", "topP"] }
    ],
    customModel: { family: "chat", params: ["temperature", "maxTokens", "topP"] }
  }
};

function maskSecrets(value) {
  let text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  text = text.replace(/(rtsp:\/\/)([^:\s/@]+):([^@\s]+)@/gi, "$1***:***@");
  text = text.replace(/(TELEGRAM_BOT_TOKEN|OPENAI_API_KEY|NGC_API_KEY|NVAPI[_A-Z]*|TOKEN|PASSWORD|SECRET)\s*[:=]\s*["']?[^"',\s]+/gi, "$1=***");
  text = text.replace(/\b(nvapi-[a-z0-9_-]{20,}|sk-[a-z0-9_-]{20,})\b/gi, "***");
  return text;
}

function compactJson(value, max = 6000) {
  const text = maskSecrets(value);
  return text.length > max ? `${text.slice(0, max)}\n... truncated ...` : text;
}

function safeThreadId(value) {
  return String(value || DEFAULT_THREAD_ID).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || DEFAULT_THREAD_ID;
}

function lastItems(items, limit) {
  return Array.isArray(items) ? items.slice(Math.max(0, items.length - limit)) : [];
}

function normalizeMessage(message) {
  return {
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content || "").slice(0, 8000),
    createdAt: message.createdAt || new Date().toISOString()
  };
}

function createFallbackMemory() {
  return {
    version: 1,
    threads: {
      [DEFAULT_THREAD_ID]: {
        messages: [],
        notes: [],
        updatedAt: new Date().toISOString()
      }
    }
  };
}

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  return PROVIDER_SPECS[provider] ? provider : "openai";
}

function providerSpec(provider) {
  return PROVIDER_SPECS[normalizeProvider(provider)] || PROVIDER_SPECS.openai;
}

function clampNumber(value, fallback, min, max) {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function optionalNumber(value, min, max) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, number));
}

function modelSpec(provider, model) {
  const spec = providerSpec(provider);
  const found = (spec.models || []).find((item) => item.id === model);
  return found || { id: model, label: model, ...(spec.customModel || { family: "chat", params: [] }), custom: true };
}

function localDateKey(value = new Date(), timeZone = DEFAULT_AGENT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function localDateTime(value = new Date(), timeZone = DEFAULT_AGENT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function shiftDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

function normalizeDateExpression(expression = "", timeZone = DEFAULT_AGENT_TIME_ZONE) {
  const raw = String(expression || "").trim().toLowerCase();
  const ascii = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const today = localDateKey(new Date(), timeZone);
  if (!raw || ["today", "hom nay"].includes(ascii)) return today;
  if (["yesterday", "hom qua"].includes(ascii)) return shiftDateKey(today, -1);
  if (["tomorrow", "ngay mai"].includes(ascii)) return shiftDateKey(today, 1);
  const iso = raw.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
  const dmy = raw.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  return raw;
}

function createAgentFeature(options) {
  const {
    app,
    appRoot,
    runtimeDir,
    getConfig,
    readRuntimeEvents,
    readRuntimeStatus,
    inspectContainer,
    listRuntimeResults,
    listMonitorCaptures,
    listModelGroups,
    runCommand,
    tailOutput
  } = options;

  const memoryFile = path.resolve(
    appRoot,
    process.env.AGENT_MEMORY_FILE || path.join(runtimeDir, "agent-memory.json")
  );
  const settingsFile = path.resolve(
    appRoot,
    process.env.AGENT_SETTINGS_FILE || path.join(runtimeDir, "agent-settings.json")
  );
  const skillsDir = path.resolve(
    appRoot,
    process.env.AGENT_SKILLS_DIR || path.join(appRoot, "agent-skills")
  );
  const agentTimeZone = process.env.AGENT_TIME_ZONE || process.env.TZ || DEFAULT_AGENT_TIME_ZONE;

  fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });

  function defaultSettings() {
    const provider = normalizeProvider(process.env.AGENT_PROVIDER || "openai");
    const spec = providerSpec(provider);
    return {
      enabled: process.env.AGENT_ENABLED !== "0",
      provider,
      model: process.env.AGENT_MODEL || spec.defaultModel,
      temperature: optionalNumber(process.env.AGENT_TEMPERATURE, 0, 2),
      maxTokens: optionalNumber(process.env.AGENT_MAX_TOKENS, 128, 8000),
      topP: optionalNumber(process.env.AGENT_TOP_P, 0, 1),
      reasoningEffort: process.env.AGENT_REASONING_EFFORT || "",
      baseUrl: process.env.AGENT_BASE_URL || spec.baseUrl || "",
      timeZone: process.env.AGENT_TIME_ZONE || process.env.TZ || DEFAULT_AGENT_TIME_ZONE,
      apiKey: process.env[spec.apiKeyEnv] || "",
      updatedAt: null
    };
  }

  async function readAgentSettings({ includeSecret = false } = {}) {
    const defaults = defaultSettings();
    let stored = {};
    try {
      stored = JSON.parse(await fsp.readFile(settingsFile, "utf8"));
    } catch {
      stored = {};
    }
    const provider = normalizeProvider(stored.provider || defaults.provider);
    const spec = providerSpec(provider);
    const apiKeyFromEnv = spec.apiKeyEnv ? process.env[spec.apiKeyEnv] : "";
    const apiKey = apiKeyFromEnv || stored.apiKey || "";
    const settings = {
      enabled: stored.enabled ?? defaults.enabled,
      provider,
      model: String(stored.model || defaults.model || spec.defaultModel).trim(),
      temperature: optionalNumber(stored.temperature ?? defaults.temperature, 0, 2),
      maxTokens: optionalNumber(stored.maxTokens ?? defaults.maxTokens, 128, 8000),
      topP: optionalNumber(stored.topP ?? defaults.topP, 0, 1),
      reasoningEffort: String(stored.reasoningEffort ?? defaults.reasoningEffort ?? "").trim(),
      baseUrl: String(stored.baseUrl || defaults.baseUrl || spec.baseUrl || "").trim(),
      timeZone: String(stored.timeZone || defaults.timeZone || DEFAULT_AGENT_TIME_ZONE).trim(),
      hasApiKey: Boolean(apiKey),
      apiKeySource: apiKeyFromEnv ? "env" : (stored.apiKey ? "settings" : ""),
      updatedAt: stored.updatedAt || null
    };
    if (includeSecret) settings.apiKey = apiKey;
    return settings;
  }

  async function publicAgentSettings() {
    const settings = await readAgentSettings();
    return {
      ...settings,
      apiKeyMasked: settings.hasApiKey ? "********" : "",
      apiKey: undefined,
      providers: PROVIDER_SPECS,
      settingsFile: path.relative(appRoot, settingsFile).replace(/\\/g, "/")
    };
  }

  async function saveAgentSettings(input = {}) {
    const current = await readAgentSettings({ includeSecret: true });
    const provider = normalizeProvider(input.provider || current.provider);
    const spec = providerSpec(provider);
    const next = {
      enabled: input.enabled === undefined ? current.enabled : Boolean(input.enabled),
      provider,
      model: String(input.model || current.model || spec.defaultModel).trim(),
      temperature: optionalNumber(input.temperature, 0, 2),
      maxTokens: optionalNumber(input.maxTokens, 128, 8000),
      topP: optionalNumber(input.topP, 0, 1),
      reasoningEffort: String(input.reasoningEffort || "").trim(),
      baseUrl: String(input.baseUrl || current.baseUrl || spec.baseUrl || "").trim(),
      timeZone: String(input.timeZone || current.timeZone || agentTimeZone).trim(),
      apiKey: current.apiKey || "",
      updatedAt: new Date().toISOString()
    };
    if (Object.prototype.hasOwnProperty.call(input, "apiKey") && String(input.apiKey || "").trim()) {
      next.apiKey = String(input.apiKey).trim();
    }
    if (input.clearApiKey) next.apiKey = "";
    await fsp.mkdir(path.dirname(settingsFile), { recursive: true });
    await fsp.writeFile(settingsFile, `${JSON.stringify(next, null, 2)}\n`);
    return publicAgentSettings();
  }

  async function settingsFromInput(input = {}) {
    const current = await readAgentSettings({ includeSecret: true });
    const provider = normalizeProvider(input.provider || current.provider);
    const spec = providerSpec(provider);
    let apiKey = current.apiKey || "";
    if (Object.prototype.hasOwnProperty.call(input, "apiKey") && String(input.apiKey || "").trim()) {
      apiKey = String(input.apiKey).trim();
    }
    if (input.clearApiKey) apiKey = "";
    return {
      enabled: input.enabled === undefined ? current.enabled : Boolean(input.enabled),
      provider,
      model: String(input.model || current.model || spec.defaultModel).trim(),
      temperature: optionalNumber(input.temperature, 0, 2),
      maxTokens: optionalNumber(input.maxTokens, 128, 8000),
      topP: optionalNumber(input.topP, 0, 1),
      reasoningEffort: String(input.reasoningEffort || "").trim(),
      baseUrl: String(input.baseUrl || current.baseUrl || spec.baseUrl || "").trim(),
      timeZone: String(input.timeZone || current.timeZone || agentTimeZone).trim(),
      apiKey,
      hasApiKey: Boolean(apiKey)
    };
  }

  async function readMemory() {
    try {
      const raw = JSON.parse(await fsp.readFile(memoryFile, "utf8"));
      return raw && typeof raw === "object" ? raw : createFallbackMemory();
    } catch {
      return createFallbackMemory();
    }
  }

  async function writeMemory(memory) {
    await fsp.mkdir(path.dirname(memoryFile), { recursive: true });
    await fsp.writeFile(memoryFile, `${JSON.stringify(memory, null, 2)}\n`);
  }

  async function getThread(threadId = DEFAULT_THREAD_ID) {
    const id = safeThreadId(threadId);
    const memory = await readMemory();
    memory.threads = memory.threads || {};
    memory.threads[id] = memory.threads[id] || { messages: [], notes: [], updatedAt: new Date().toISOString() };
    return { memory, threadId: id, thread: memory.threads[id] };
  }

  async function saveMessage(threadId, message) {
    const state = await getThread(threadId);
    state.thread.messages = lastItems([...(state.thread.messages || []), normalizeMessage(message)], MAX_MESSAGES);
    state.thread.updatedAt = new Date().toISOString();
    await writeMemory(state.memory);
    return state.thread;
  }

  async function saveNote(threadId, note, source = "agent") {
    const state = await getThread(threadId);
    const cleanNote = maskSecrets(String(note || "").trim()).slice(0, 1000);
    if (!cleanNote) return state.thread;
    state.thread.notes = lastItems([
      ...(state.thread.notes || []),
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, source, note: cleanNote, createdAt: new Date().toISOString() }
    ], MAX_NOTES);
    state.thread.updatedAt = new Date().toISOString();
    await writeMemory(state.memory);
    return state.thread;
  }

  async function clearThread(threadId) {
    const id = safeThreadId(threadId);
    const memory = await readMemory();
    memory.threads = memory.threads || {};
    memory.threads[id] = { messages: [], notes: [], updatedAt: new Date().toISOString() };
    await writeMemory(memory);
    return memory.threads[id];
  }

  async function appSnapshot() {
    const [config, runtimeStatus, container, modelGroups, events, results, monitorCaptures] = await Promise.all([
      getConfig().catch((error) => ({ error: error.message })),
      readRuntimeStatus().catch((error) => ({ state: "unknown", error: error.message })),
      inspectContainer("deepstream-lpr").catch((error) => ({ exists: false, running: false, error: error.message })),
      listModelGroups().catch(() => ({ groups: [] })),
      readRuntimeEvents(20).catch(() => []),
      listRuntimeResults({ limit: 12 }).catch(() => []),
      listMonitorCaptures(12).catch(() => [])
    ]);
    return {
      cameras: (config.streams || []).map((camera) => ({
        id: camera.id,
        name: camera.name,
        enabled: camera.enabled !== false,
        rtspUrl: camera.rtspUrl,
        zones: (camera.zones || []).map((zone) => ({
          id: zone.id,
          name: zone.name,
          enabled: zone.enabled !== false,
          mode: zone.mode,
          points: Array.isArray(zone.polygon) ? zone.polygon.length : 0
        }))
      })),
      deployApps: (config.deployApps || []).map((item) => ({
        id: item.id,
        name: item.name,
        active: item.active,
        processorType: item.processorType,
        cameraIds: item.cameraIds,
        stages: (item.pipelineStages || []).map((stage) => ({
          gieType: stage.gieType,
          modelGroup: stage.modelGroup,
          selectedModel: stage.selectedModel,
          enabled: stage.enabled !== false,
          classIds: stage.classIds
        }))
      })),
      runtimeStatus,
      container,
      modelGroups: modelGroups.groups || modelGroups,
      recentEvents: events,
      recentResults: results,
      monitorCaptures
    };
  }

  function eventDate(event, timeZone = agentTimeZone) {
    const ts = event.ts || event.timestamp || event.createdAt || event.time || "";
    if (!ts) return "";
    return localDateKey(ts, timeZone);
  }

  function eventLabel(event) {
    return String(event.label || event.classLabel || event.objectLabel || event.objectClass || event.className || event.plateText || event.classId || "unknown");
  }

  function matchesText(value, expected) {
    if (!expected) return true;
    return String(value || "").toLowerCase() === String(expected || "").toLowerCase();
  }

  async function countRuntimeEvents({ date = "", startDate = "", endDate = "", camera = "", label = "", eventType = "", timeZone = agentTimeZone, limit = 10000 } = {}) {
    const resolvedDate = date ? normalizeDateExpression(date, timeZone) : "";
    const resolvedStart = startDate ? normalizeDateExpression(startDate, timeZone) : resolvedDate;
    const resolvedEnd = endDate ? normalizeDateExpression(endDate, timeZone) : resolvedDate;
    const events = await readRuntimeEvents(Math.min(Number(limit) || 10000, 50000));
    const filtered = [];
    const byDate = {};
    const byCamera = {};
    const byLabel = {};
    const byEventType = {};
    for (const event of events) {
      const dateKey = eventDate(event, timeZone);
      const cameraValue = String(event.cameraName || event.cameraId || event.sourceId || "unknown");
      const labelValue = eventLabel(event);
      const eventTypeValue = String(event.eventType || event.type || "unknown");
      if (resolvedStart && dateKey < resolvedStart) continue;
      if (resolvedEnd && dateKey > resolvedEnd) continue;
      if (!matchesText(cameraValue, camera)) continue;
      if (!matchesText(labelValue, label)) continue;
      if (!matchesText(eventTypeValue, eventType)) continue;
      filtered.push(event);
      byDate[dateKey] = (byDate[dateKey] || 0) + 1;
      byCamera[cameraValue] = (byCamera[cameraValue] || 0) + 1;
      byLabel[labelValue] = (byLabel[labelValue] || 0) + 1;
      byEventType[eventTypeValue] = (byEventType[eventTypeValue] || 0) + 1;
    }
    return {
      count: filtered.length,
      filters: {
        date: resolvedDate || null,
        startDate: resolvedStart || null,
        endDate: resolvedEnd || null,
        camera: camera || null,
        label: label || null,
        eventType: eventType || null,
        timeZone
      },
      totals: { byDate, byCamera, byLabel, byEventType },
      samples: filtered.slice(-5).map((event) => ({
        eventType: event.eventType || event.type || "",
        ts: event.ts || event.timestamp || event.createdAt || "",
        localDate: eventDate(event, timeZone),
        cameraId: event.cameraId,
        cameraName: event.cameraName,
        label: eventLabel(event),
        confidence: event.confidence,
        imageUrl: event.imageUrl || null
      }))
    };
  }

  async function loadAgentSkills() {
    let entries = [];
    try {
      entries = await fsp.readdir(skillsDir, { withFileTypes: true });
    } catch {
      return [];
    }
    const skills = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const file = path.join(skillsDir, entry.name, "SKILL.md");
      try {
        const content = await fsp.readFile(file, "utf8");
        const firstHeading = content.match(/^#\s+(.+)$/m)?.[1] || entry.name;
        const description = content.match(/^description:\s*(.+)$/mi)?.[1] || "";
        const triggers = (content.match(/^triggers:\s*(.+)$/mi)?.[1] || "")
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);
        skills.push({
          id: entry.name,
          name: firstHeading,
          description,
          triggers,
          content: content.slice(0, 6000)
        });
      } catch {
        // Ignore malformed skill folders; the UI can still operate.
      }
    }
    return skills;
  }

  function selectSkillsForMessage(skills, message) {
    const raw = String(message || "").toLowerCase();
    const selected = skills.filter((skill) => {
      if (!skill.triggers?.length) return false;
      return skill.triggers.some((trigger) => raw.includes(trigger));
    });
    return selected.length ? selected : skills.filter((skill) => ["time-core", "event-analytics", "camera-health"].includes(skill.id));
  }

  function skillPrompt(skills) {
    if (!skills.length) return "No skills loaded.";
    return skills.map((skill) => [
      `## Skill: ${skill.name} (${skill.id})`,
      skill.description ? `Description: ${skill.description}` : "",
      skill.content
    ].filter(Boolean).join("\n")).join("\n\n");
  }

  async function status() {
    const settings = await readAgentSettings();
    const spec = providerSpec(settings.provider);
    const skills = await loadAgentSkills();
    return {
      enabled: settings.enabled,
      provider: settings.provider,
      providerLabel: spec.label,
      model: settings.model,
      modelSpec: modelSpec(settings.provider, settings.model),
      configured: settings.enabled && (!spec.needsApiKey || settings.hasApiKey),
      hasApiKey: settings.hasApiKey,
      apiKeySource: settings.apiKeySource,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
      reasoningEffort: settings.reasoningEffort,
      baseUrl: settings.baseUrl,
      timeZone: settings.timeZone || agentTimeZone,
      now: localDateTime(new Date(), settings.timeZone || agentTimeZone),
      skills: skills.map((skill) => ({ id: skill.id, name: skill.name, description: skill.description })),
      memoryFile: path.relative(appRoot, memoryFile).replace(/\\/g, "/"),
      settingsFile: path.relative(appRoot, settingsFile).replace(/\\/g, "/"),
      skillsDir: path.relative(appRoot, skillsDir).replace(/\\/g, "/"),
      mode: "read-only operator with persistent memory"
    };
  }

  async function createTools(threadId, settings = {}) {
    const { tool } = require("@langchain/core/tools");
    const { z } = require("zod");
    const defaultToolTimeZone = settings.timeZone || agentTimeZone;

    return [
      tool(async ({ timeZone = defaultToolTimeZone } = {}) => compactJson({
        timeZone,
        now: localDateTime(new Date(), timeZone),
        today: localDateKey(new Date(), timeZone),
        yesterday: shiftDateKey(localDateKey(new Date(), timeZone), -1),
        tomorrow: shiftDateKey(localDateKey(new Date(), timeZone), 1)
      }), {
        name: "get_current_time",
        description: "Return the current local time and date keys for the configured agent timezone.",
        schema: z.object({ timeZone: z.string().optional() })
      }),
      tool(async ({ expression = "", timeZone = defaultToolTimeZone }) => compactJson({
        expression,
        timeZone,
        date: normalizeDateExpression(expression, timeZone),
        now: localDateTime(new Date(), timeZone)
      }), {
        name: "resolve_date_expression",
        description: "Resolve relative date text such as today, yesterday, hom nay, hom qua, ngay mai to yyyy-mm-dd.",
        schema: z.object({
          expression: z.string().optional(),
          timeZone: z.string().optional()
        })
      }),
      tool(async () => compactJson(await appSnapshot(), 9000), {
        name: "get_app_snapshot",
        description: "Read the current Jetson Console setup: cameras, deploy apps, DeepStream state, model groups, recent events and captures.",
        schema: z.object({})
      }),
      tool(async ({
        date = "",
        startDate = "",
        endDate = "",
        camera = "",
        label = "",
        eventType = "",
        timeZone = defaultToolTimeZone,
        limit = 10000
      }) => compactJson(await countRuntimeEvents({
        date,
        startDate,
        endDate,
        camera,
        label,
        eventType,
        timeZone,
        limit
      }), 12000), {
        name: "count_runtime_events",
        description: "Deterministically count DeepStream runtime events from events.jsonl by local date, camera, label and event type. Use this for any count/statistics question.",
        schema: z.object({
          date: z.string().optional().describe("A date expression or yyyy-mm-dd, such as today, yesterday, hom nay, hom qua."),
          startDate: z.string().optional().describe("Optional start date expression or yyyy-mm-dd."),
          endDate: z.string().optional().describe("Optional end date expression or yyyy-mm-dd."),
          camera: z.string().optional().describe("Camera name/id/source id filter. Exact match, case-insensitive."),
          label: z.string().optional().describe("Object label/class filter. Exact match, case-insensitive."),
          eventType: z.string().optional().describe("Event type filter. Exact match, case-insensitive."),
          timeZone: z.string().optional(),
          limit: z.number().optional().describe("Maximum event lines to inspect, capped at 50000.")
        })
      }),
      tool(async ({ limit = 50 }) => compactJson(await readRuntimeEvents(Math.min(Number(limit) || 50, 200)), 9000), {
        name: "get_recent_events",
        description: "Read recent DeepStream runtime events, including capture events, source IDs, camera IDs and failure hints.",
        schema: z.object({ limit: z.number().optional().describe("Maximum event count, capped at 200.") })
      }),
      tool(async ({ date = "", source = "", limit = 50 }) => compactJson(await listRuntimeResults({
        date,
        source,
        limit: Math.min(Number(limit) || 50, 200)
      }), 9000), {
        name: "get_runtime_results",
        description: "List captured DeepStream result images by optional date and source.",
        schema: z.object({
          date: z.string().optional().describe("Date folder in yyyy-mm-dd format."),
          source: z.string().optional().describe("Camera/source id."),
          limit: z.number().optional()
        })
      }),
      tool(async () => compactJson(await listModelGroups(), 9000), {
        name: "get_model_library",
        description: "List source models, built artifacts, labels and build status.",
        schema: z.object({})
      }),
      tool(async ({ lines = 120 }) => {
        const count = Math.min(Number(lines) || 120, 300);
        const result = await runCommand("docker", ["logs", "--tail", String(count), "deepstream-lpr"], { cwd: appRoot });
        return compactJson({ code: result.code, output: tailOutput(result.output || "", 12000) }, 12000);
      }, {
        name: "get_deepstream_logs",
        description: "Read recent docker logs for the active DeepStream container.",
        schema: z.object({ lines: z.number().optional().describe("Tail line count, capped at 300.") })
      }),
      tool(async ({ lines = 80 } = {}) => {
        const [runtimeStatus, container, recentEvents, logs] = await Promise.all([
          readRuntimeStatus().catch((error) => ({ state: "unknown", error: error.message })),
          inspectContainer("deepstream-lpr").catch((error) => ({ exists: false, running: false, error: error.message })),
          readRuntimeEvents(20).catch(() => []),
          runCommand("docker", ["logs", "--tail", String(Math.min(Number(lines) || 80, 200)), "deepstream-lpr"], { cwd: appRoot })
            .catch((error) => ({ code: 1, output: error.message }))
        ]);
        return compactJson({
          container,
          runtimeStatus,
          recentEventCount: recentEvents.length,
          recentEvents: recentEvents.slice(-5),
          logTail: tailOutput(logs.output || "", 9000)
        }, 12000);
      }, {
        name: "get_deepstream_health",
        description: "Summarize DeepStream container health, runtime status, recent events and log tail.",
        schema: z.object({ lines: z.number().optional().describe("Docker log tail line count, capped at 200.") })
      }),
      tool(async ({ note }) => {
        await saveNote(threadId, note, "agent-tool");
        return "Stored this stable preference/note in agent memory.";
      }, {
        name: "remember_note",
        description: "Persist stable user preferences or operational facts. Do not store passwords, API keys, RTSP credentials or secrets.",
        schema: z.object({ note: z.string().describe("A short stable note to remember.") })
      })
    ];
  }

  function systemPrompt(thread, selectedSkills = [], settings = {}) {
    const notes = (thread.notes || []).map((item) => `- ${item.note}`).join("\n") || "- No long-term notes yet.";
    const timeZone = settings.timeZone || agentTimeZone;
    const today = localDateKey(new Date(), timeZone);
    return [
      "You are the Jetson Console Operator Agent for a DeepStream camera dashboard.",
      "Your job is to help the user manage app tasks, debug camera/model/deploy issues, and explain next actions clearly.",
      "You are read-only by default. You can inspect config, runtime status, logs, model library, events and results. You must not claim to deploy, stop, delete or modify anything.",
      "When the user asks for an action that changes the system, propose a precise checklist and name the dashboard button/API route they should use.",
      "Keep answers concise and operational. Reply in Vietnamese unless the user asks otherwise.",
      "Mask or avoid repeating secrets, tokens and RTSP passwords.",
      "",
      `Current local time: ${localDateTime(new Date(), timeZone)} (${timeZone}).`,
      `Date keys: today=${today}, yesterday=${shiftDateKey(today, -1)}, tomorrow=${shiftDateKey(today, 1)}.`,
      "For any question about time, dates, today/yesterday/tomorrow, counts, totals, statistics or 'bao nhieu', you MUST call get_current_time/resolve_date_expression and count_runtime_events. Do not infer counts from recent events or chat history.",
      "When reporting event counts, include the filters and timezone used.",
      "",
      "Loaded operational skills:",
      skillPrompt(selectedSkills),
      "",
      "Long-term memory notes:",
      notes
    ].join("\n");
  }

  async function createChatModel(settings) {
    const spec = providerSpec(settings.provider);
    const currentModelSpec = modelSpec(settings.provider, settings.model);
    if (settings.provider === "ollama") {
      const { ChatOllama } = require("@langchain/ollama");
      const options = {
        model: settings.model || spec.defaultModel,
        baseUrl: settings.baseUrl || spec.baseUrl
      };
      if (currentModelSpec.params?.includes("temperature") && settings.temperature !== null) options.temperature = settings.temperature;
      if (currentModelSpec.params?.includes("maxTokens") && settings.maxTokens !== null) options.numPredict = settings.maxTokens;
      if (currentModelSpec.params?.includes("topP") && settings.topP !== null) options.topP = settings.topP;
      return new ChatOllama(options);
    }
    const { ChatOpenAI } = require("@langchain/openai");
    const options = {
      model: settings.model || spec.defaultModel,
      apiKey: settings.apiKey,
      timeout: 20000
    };
    if (settings.baseUrl) options.configuration = { baseURL: settings.baseUrl };
    if (currentModelSpec.params?.includes("temperature") && settings.temperature !== null) options.temperature = settings.temperature;
    if (currentModelSpec.params?.includes("maxTokens") && settings.maxTokens !== null) options.maxTokens = settings.maxTokens;
    if (currentModelSpec.params?.includes("topP") && settings.topP !== null) options.topP = settings.topP;
    if (currentModelSpec.params?.includes("reasoningEffort") && settings.reasoningEffort) {
      options.reasoning = { effort: settings.reasoningEffort };
    }
    return new ChatOpenAI(options);
  }

  async function testAgentSettings(input = {}) {
    const startedAt = Date.now();
    const settings = await settingsFromInput(input);
    const spec = providerSpec(settings.provider);
    if (spec.needsApiKey && !settings.apiKey) {
      return {
        ok: false,
        provider: settings.provider,
        model: settings.model,
        durationMs: Date.now() - startedAt,
        message: "No API key available for this provider."
      };
    }
    try {
      const model = await createChatModel(settings);
      const response = await Promise.race([
        model.invoke("Reply with exactly: OK"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Provider test timed out after 20s.")), 20000))
      ]);
      const content = typeof response?.content === "string" ? response.content : JSON.stringify(response?.content || "");
      return {
        ok: true,
        provider: settings.provider,
        model: settings.model,
        durationMs: Date.now() - startedAt,
        message: "Provider test succeeded.",
        sample: maskSecrets(content).slice(0, 200)
      };
    } catch (error) {
      return {
        ok: false,
        provider: settings.provider,
        model: settings.model,
        durationMs: Date.now() - startedAt,
        message: maskSecrets(error.message || "Provider test failed.")
      };
    }
  }

  async function invokeAgent({ threadId, message }) {
    const settings = await readAgentSettings({ includeSecret: true });
    const spec = providerSpec(settings.provider);
    const state = await getThread(threadId);
    await saveMessage(state.threadId, { role: "user", content: message });
    const updatedState = await getThread(state.threadId);

    if (!settings.enabled) {
      const answer = "Agent dang bi tat trong Agent Settings. Memory van hoat dong, nhung minh chua goi LLM/tool agent.";
      await saveMessage(state.threadId, { role: "assistant", content: answer });
      return { answer, toolCalls: [], thread: (await getThread(state.threadId)).thread, status: await status() };
    }
    if (spec.needsApiKey && !settings.apiKey) {
      const snapshot = await appSnapshot();
      const answer = [
        `Agent backend da san sang, nhung provider ${spec.label} chua co API key nen minh dang chay o che do local summary.`,
        "",
        `Hien co ${(snapshot.cameras || []).length} camera, container DeepStream: ${snapshot.container?.running ? "running" : "not running"}, trang thai pipeline: ${snapshot.runtimeStatus?.state || "unknown"}.`,
        "Hay vao tab Agent > Settings de them API key."
      ].join("\n");
      await saveMessage(state.threadId, { role: "assistant", content: answer });
      return { answer, toolCalls: [], snapshot, thread: (await getThread(state.threadId)).thread, status: await status() };
    }

    const allSkills = await loadAgentSkills();
    const selectedSkills = selectSkillsForMessage(allSkills, message);
    const { createReactAgent } = require("@langchain/langgraph/prebuilt");
    const model = await createChatModel(settings);
    const tools = await createTools(state.threadId, settings);
    const agent = createReactAgent({ llm: model, tools });
    const history = lastItems(updatedState.thread.messages || [], 20).map((item) => ({
      role: item.role,
      content: item.content
    }));
    const result = await agent.invoke({
      messages: [
        { role: "system", content: systemPrompt(updatedState.thread, selectedSkills, settings) },
        ...history
      ]
    });
    const messages = result.messages || [];
    const finalMessage = messages[messages.length - 1];
    const answer = typeof finalMessage?.content === "string"
      ? finalMessage.content
      : JSON.stringify(finalMessage?.content || "");
    const toolCalls = messages
      .filter((item) => item.tool_calls?.length || item.name)
      .map((item) => ({
        type: item._getType?.() || item.constructor?.name || item.role || "message",
        name: item.name || "",
        toolCalls: item.tool_calls || [],
        content: typeof item.content === "string" ? item.content.slice(0, 1200) : ""
      }));
    await saveMessage(state.threadId, { role: "assistant", content: answer });
    return {
      answer,
      toolCalls,
      selectedSkills: selectedSkills.map((skill) => ({ id: skill.id, name: skill.name, description: skill.description })),
      thread: (await getThread(state.threadId)).thread,
      status: await status()
    };
  }

  function mount() {
    app.get("/api/agent/status", async (_req, res) => {
      res.json(await status());
    });

    app.get("/api/agent/skills", async (_req, res) => {
      const skills = await loadAgentSkills();
      res.json({
        timeZone: (await readAgentSettings()).timeZone || agentTimeZone,
        skills: skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          triggers: skill.triggers
        }))
      });
    });

    app.get("/api/agent/settings", async (_req, res) => {
      res.json(await publicAgentSettings());
    });

    app.put("/api/agent/settings", async (req, res) => {
      try {
        res.json(await saveAgentSettings(req.body || {}));
      } catch (error) {
        res.status(400).json({ error: error.message || "Could not save agent settings." });
      }
    });

    app.post("/api/agent/settings/test", async (req, res) => {
      try {
        const result = await testAgentSettings(req.body || {});
        res.status(result.ok ? 200 : 400).json(result);
      } catch (error) {
        res.status(500).json({ ok: false, message: maskSecrets(error.message || "Agent settings test failed.") });
      }
    });

    app.get("/api/agent/memory", async (req, res) => {
      const state = await getThread(req.query.threadId);
      res.json({
        threadId: state.threadId,
        messages: state.thread.messages || [],
        notes: state.thread.notes || [],
        updatedAt: state.thread.updatedAt || null
      });
    });

    app.delete("/api/agent/memory", async (req, res) => {
      const thread = await clearThread(req.query.threadId);
      res.json({ threadId: safeThreadId(req.query.threadId), ...thread });
    });

    app.post("/api/agent/memory/notes", async (req, res) => {
      const state = await saveNote(req.body?.threadId, req.body?.note, "user");
      res.json({ threadId: safeThreadId(req.body?.threadId), notes: state.notes || [] });
    });

    app.post("/api/agent/chat", async (req, res) => {
      try {
        const message = String(req.body?.message || "").trim();
        if (!message) return res.status(400).json({ error: "Message is required." });
        res.json(await invokeAgent({ threadId: req.body?.threadId, message }));
      } catch (error) {
        res.status(500).json({ error: error.message || "Agent failed." });
      }
    });
  }

  return { mount, status, readMemory, readAgentSettings };
}

module.exports = { createAgentFeature, maskSecrets };
