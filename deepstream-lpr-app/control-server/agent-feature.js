const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const DEFAULT_THREAD_ID = "default";
const MAX_MESSAGES = 40;
const MAX_NOTES = 80;

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
  const provider = String(process.env.AGENT_PROVIDER || "openai").toLowerCase();
  const modelName = process.env.AGENT_MODEL || "gpt-4.1-mini";
  const enabled = process.env.AGENT_ENABLED !== "0";

  fs.mkdirSync(path.dirname(memoryFile), { recursive: true });

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

  function status() {
    return {
      enabled,
      provider,
      model: modelName,
      configured: enabled && provider === "openai" && Boolean(process.env.OPENAI_API_KEY),
      memoryFile: path.relative(appRoot, memoryFile).replace(/\\/g, "/"),
      mode: "read-only operator with persistent memory"
    };
  }

  async function createTools(threadId) {
    const [{ tool }, zod] = await Promise.all([
      import("@langchain/core/tools"),
      import("zod")
    ]);
    const { z } = zod;

    return [
      tool(async () => compactJson(await appSnapshot(), 9000), {
        name: "get_app_snapshot",
        description: "Read the current Jetson Console setup: cameras, deploy apps, DeepStream state, model groups, recent events and captures.",
        schema: z.object({})
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

  function systemPrompt(thread) {
    const notes = (thread.notes || []).map((item) => `- ${item.note}`).join("\n") || "- No long-term notes yet.";
    return [
      "You are the Jetson Console Operator Agent for a DeepStream camera dashboard.",
      "Your job is to help the user manage app tasks, debug camera/model/deploy issues, and explain next actions clearly.",
      "You are read-only by default. You can inspect config, runtime status, logs, model library, events and results. You must not claim to deploy, stop, delete or modify anything.",
      "When the user asks for an action that changes the system, propose a precise checklist and name the dashboard button/API route they should use.",
      "Keep answers concise and operational. Reply in Vietnamese unless the user asks otherwise.",
      "Mask or avoid repeating secrets, tokens and RTSP passwords.",
      "",
      "Long-term memory notes:",
      notes
    ].join("\n");
  }

  async function invokeAgent({ threadId, message }) {
    const state = await getThread(threadId);
    await saveMessage(state.threadId, { role: "user", content: message });
    const updatedState = await getThread(state.threadId);

    if (!enabled) {
      const answer = "Agent đang bị tắt bằng `AGENT_ENABLED=0`. Memory vẫn hoạt động, nhưng mình chưa gọi LLM/tool agent.";
      await saveMessage(state.threadId, { role: "assistant", content: answer });
      return { answer, toolCalls: [], thread: (await getThread(state.threadId)).thread, status: status() };
    }
    if (provider !== "openai" || !process.env.OPENAI_API_KEY) {
      const snapshot = await appSnapshot();
      const answer = [
        "Agent backend đã sẵn sàng, nhưng chưa có `OPENAI_API_KEY` nên mình đang chạy ở chế độ local summary.",
        "",
        `Hiện có ${(snapshot.cameras || []).length} camera, container DeepStream: ${snapshot.container?.running ? "running" : "not running"}, trạng thái pipeline: ${snapshot.runtimeStatus?.state || "unknown"}.`,
        "Để bật agent LangGraph thật, set `AGENT_ENABLED=1`, `AGENT_PROVIDER=openai`, `OPENAI_API_KEY` và restart control server."
      ].join("\n");
      await saveMessage(state.threadId, { role: "assistant", content: answer });
      return { answer, toolCalls: [], snapshot, thread: (await getThread(state.threadId)).thread, status: status() };
    }

    const [{ ChatOpenAI }, { createReactAgent }] = await Promise.all([
      import("@langchain/openai"),
      import("@langchain/langgraph/prebuilt")
    ]);
    const model = new ChatOpenAI({
      model: modelName,
      temperature: Number(process.env.AGENT_TEMPERATURE || 0.2),
      apiKey: process.env.OPENAI_API_KEY
    });
    const tools = await createTools(state.threadId);
    const agent = createReactAgent({ llm: model, tools });
    const history = lastItems(updatedState.thread.messages || [], 20).map((item) => ({
      role: item.role,
      content: item.content
    }));
    const result = await agent.invoke({
      messages: [
        { role: "system", content: systemPrompt(updatedState.thread) },
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
    return { answer, toolCalls, thread: (await getThread(state.threadId)).thread, status: status() };
  }

  function mount() {
    app.get("/api/agent/status", (_req, res) => {
      res.json(status());
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

  return { mount, status, readMemory };
}

module.exports = { createAgentFeature, maskSecrets };
