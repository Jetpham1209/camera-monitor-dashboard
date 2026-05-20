const els = {
  date: document.querySelector("#resultDateFilter"),
  source: document.querySelector("#resultSourceFilter"),
  limit: document.querySelector("#resultLimit"),
  load: document.querySelector("#loadResultsBtn"),
  summary: document.querySelector("#resultSummary"),
  results: document.querySelector("#deployResults")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || response.statusText);
  return data;
}

function setSummary(status, message) {
  const label = status === "running" ? "Running" : status === "success" ? "Success" : status === "failed" ? "Failed" : "Idle";
  els.summary.className = `task-status ${status}`;
  els.summary.innerHTML = `<span class="status-dot"></span><div><strong>${label}</strong> ${escapeHtml(message)}</div>`;
}

function syncSourceOptions(config, results = []) {
  const current = els.source.value;
  const fromConfig = (config.streams || []).map((item) => [item.id, item.name || item.id]);
  const fromResults = results.map((item) => [item.cameraId, item.cameraName || item.cameraId]);
  const sources = [...new Map([...fromConfig, ...fromResults]).entries()]
    .filter(([id]) => id)
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  els.source.innerHTML = `<option value="">All sources</option>${sources.map(([id, name]) => `
    <option value="${escapeHtml(id)}">${escapeHtml(name)} (${escapeHtml(id)})</option>
  `).join("")}`;
  if (sources.some(([id]) => id === current)) els.source.value = current;
}

function renderResults(results = []) {
  if (!results.length) {
    els.results.innerHTML = '<div class="empty">No captures found for these filters.</div>';
    return;
  }
  els.results.innerHTML = results.map((item) => `
    <article class="result-card">
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.eventId || item.fileName)}" loading="lazy" />
      </a>
      <div>
        <strong>${escapeHtml(item.plateText || item.eventType || "capture")}</strong>
        ${item.failedModel ? `<small>Fail: ${escapeHtml(item.failedStage || "")} / ${escapeHtml(item.failedModel)} - ${escapeHtml(item.failureReason || "")}</small>` : ""}
        <span>${escapeHtml(item.cameraName || item.cameraId || "source")} - ${escapeHtml(item.date || "")}</span>
        <small>${escapeHtml(new Date(item.createdAt).toLocaleString())}</small>
      </div>
    </article>
  `).join("");
}

function applyQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("date")) els.date.value = params.get("date");
  if (params.get("source")) els.source.value = params.get("source");
  if (params.get("limit")) els.limit.value = params.get("limit");
}

function updateQuery() {
  const params = new URLSearchParams();
  if (els.date.value) params.set("date", els.date.value);
  if (els.source.value) params.set("source", els.source.value);
  if (els.limit.value) params.set("limit", els.limit.value);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `/results?${query}` : "/results");
}

async function loadResults() {
  setSummary("running", "Loading results...");
  updateQuery();
  const params = new URLSearchParams();
  if (els.date.value) params.set("date", els.date.value);
  if (els.source.value) params.set("source", els.source.value);
  params.set("limit", els.limit.value || "100");
  const result = await api(`/api/deploy/results?${params}`);
  const config = await api("/api/config");
  syncSourceOptions(config, result.results || []);
  renderResults(result.results || []);
  setSummary("success", `Loaded ${(result.results || []).length} result(s).`);
}

async function init() {
  const config = await api("/api/config");
  syncSourceOptions(config, []);
  applyQuery();
  await loadResults().catch((error) => {
    setSummary("failed", error.message);
  });
}

els.load.addEventListener("click", () => loadResults().catch((error) => setSummary("failed", error.message)));
els.date.addEventListener("change", () => loadResults().catch((error) => setSummary("failed", error.message)));
els.source.addEventListener("change", () => loadResults().catch((error) => setSummary("failed", error.message)));
els.limit.addEventListener("change", () => loadResults().catch((error) => setSummary("failed", error.message)));

init().catch((error) => setSummary("failed", error.message));
