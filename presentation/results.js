const API_BASE = "/api/presentation";

const sessionInput = document.getElementById("sessionId");
const loadBtn = document.getElementById("loadResults");
const loadStatus = document.getElementById("loadStatus");
const resultCard = document.getElementById("resultCard");
const phaseTitle = document.getElementById("phaseTitle");
const totals = document.getElementById("totals");
const bars = document.getElementById("bars");
const metricGrid = document.getElementById("metricGrid");
const topRanked = document.getElementById("topRanked");
const topThree = document.getElementById("topThree");
const consensusList = document.getElementById("consensusList");
const profileList = document.getElementById("profileList");
const workloadDist = document.getElementById("workloadDist");
const channelDist = document.getElementById("channelDist");
const focusDist = document.getElementById("focusDist");
const clarityDist = document.getElementById("clarityDist");
const exportBtn = document.getElementById("exportCsv");

let latestResults = null;

const params = new URLSearchParams(window.location.search);
if (params.get("session")) {
  sessionInput.value = params.get("session").toUpperCase();
}

loadBtn.addEventListener("click", loadResults);
exportBtn.addEventListener("click", exportCsv);

async function loadResults() {
  const sessionId = sessionInput.value.trim().toUpperCase();
  if (!sessionId) {
    loadStatus.textContent = "Enter a session ID.";
    return;
  }

  const res = await fetch(`${API_BASE}/results?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    loadStatus.textContent = "Could not load results.";
    return;
  }

  const data = await res.json();
  latestResults = data;
  const entries = Object.entries(data.counts || {});
  const max = Math.max(1, ...entries.map(([, value]) => value));
  const metrics = data.metrics || {};
  const highlights = data.highlights || {};
  const distributions = data.distributions || {};
  const profiles = data.profiles || {};

  phaseTitle.textContent = `Latest scenario: ${data.phase || "unknown"}`;
  totals.textContent = `Participants: ${data.participants || 0} | Shows group patterns, risk zones, and which behaviors drove stress.`;

  renderMetricGrid(metrics);
  renderBars(topRanked, highlights.topRanked || [], "count", item => item.label, " deltagare");
  renderBars(topThree, highlights.topThree || [], "count", item => item.label, " deltagare");
  renderBars(consensusList, highlights.consensus || [], "mentions", item => `${item.label} (snittrank ${item.avgRank})`, " namningar");
  renderBars(profileList, [
    { label: "Perfection-driven", count: profiles.perfectionists || 0 },
    { label: "Recovery users", count: profiles.recoveryUsers || 0 },
    { label: "Reactive operators", count: profiles.reactiveWorkers || 0 },
    { label: "Overload risk", count: profiles.overloadRisk || 0 }
  ], "count", item => item.label, " participants");
  renderBars(workloadDist, [
    { label: "Overloaded", count: distributions.overloaded || 0 },
    { label: "Tight schedule", count: distributions.tight || 0 },
    { label: "In control", count: distributions.inControl || 0 }
  ], "count", item => item.label, " participants");
  renderBars(channelDist, [
    { label: "Strong channel accuracy", count: distributions.channelStrong || 0 },
    { label: "Mixed channel accuracy", count: distributions.channelMixed || 0 },
    { label: "Low channel accuracy", count: distributions.channelWeak || 0 }
  ], "count", item => item.label, " participants");
  renderBars(focusDist, [
    { label: "Stable focus", count: distributions.focusStable || 0 },
    { label: "Fragmented focus", count: distributions.focusFragmented || 0 },
    { label: "Collapsed focus", count: distributions.focusCollapsed || 0 }
  ], "count", item => item.label, " participants");
  renderBars(clarityDist, [
    { label: "Strong calibration", count: distributions.clarityStrong || 0 },
    { label: "Mixed calibration", count: distributions.clarityMixed || 0 },
    { label: "Over/under-work", count: distributions.clarityWeak || 0 }
  ], "count", item => item.label, " participants");

  bars.innerHTML = "";
  entries.forEach(([key, value]) => {
    const pct = Math.round((value / max) * 100);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <strong>${labelForChoice(key)}</strong>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <span>${value}</span>
    `;
    bars.appendChild(row);
  });

  resultCard.hidden = false;
  loadStatus.textContent = "Results updated.";
}

function renderMetricGrid(metrics) {
  const cards = [
    { label: "Delivery score", value: metrics.avgDeliveryScore || 0 },
    { label: "Wellbeing", value: metrics.avgWellbeingScore || 0 },
    { label: "Overload", value: `${metrics.avgOverloadMinutes || 0} min` },
    { label: "Channel accuracy", value: `${metrics.avgChannelAccuracy || 0}%` },
    { label: "Focus efficiency", value: `${metrics.avgFocusEfficiency || 0}%` },
    { label: "Clarity match", value: `${metrics.avgClarityMatchRate || 0}%` },
    { label: "Interruptions", value: metrics.avgInterruptions || 0 },
    { label: "Breaks", value: `${metrics.avgBreakCount || 0} / ${metrics.avgBreakMinutes || 0} min` }
  ];

  metricGrid.innerHTML = cards.map((card) => `
    <div class="metric-tile">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
    </div>
  `).join("");
}

function renderBars(container, items, valueKey, labelFn, suffix = "") {
  container.innerHTML = "";
  const safeItems = (items || []).filter((item) => Number(item[valueKey] || 0) > 0);
  if (!safeItems.length) {
    container.innerHTML = '<p class="muted">No data yet.</p>';
    return;
  }

  const max = Math.max(1, ...safeItems.map((item) => Number(item[valueKey] || 0)));
  safeItems.forEach((item) => {
    const value = Number(item[valueKey] || 0);
    const pct = Math.round((value / max) * 100);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <strong>${labelFn(item)}</strong>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <span>${value}${suffix}</span>
    `;
    container.appendChild(row);
  });
}

function exportCsv() {
  if (!latestResults) {
    loadStatus.textContent = "Load results before exporting.";
    return;
  }

  const sessionId = sessionInput.value.trim().toUpperCase();
  const timestamp = new Date().toISOString();
  const rows = [["sessionId", "phase", "choice", "count", "avgDeliveryScore", "avgWellbeingScore", "avgOverloadMinutes", "avgChannelAccuracy", "avgFocusEfficiency", "avgClarityMatchRate", "avgInterruptions", "avgBreakCount", "avgBreakMinutes", "exportedAt"]];
  const entries = Object.entries(latestResults.counts || {});
  const metrics = latestResults.metrics || {};

  if (!entries.length) {
    rows.push([sessionId, latestResults.phase || "", "", 0, metrics.avgDeliveryScore || 0, metrics.avgWellbeingScore || 0, metrics.avgOverloadMinutes || 0, metrics.avgChannelAccuracy || 0, metrics.avgFocusEfficiency || 0, metrics.avgClarityMatchRate || 0, metrics.avgInterruptions || 0, metrics.avgBreakCount || 0, metrics.avgBreakMinutes || 0, timestamp]);
  } else {
    entries.forEach(([choice, count]) => {
      rows.push([sessionId, latestResults.phase || "", choice, count, metrics.avgDeliveryScore || 0, metrics.avgWellbeingScore || 0, metrics.avgOverloadMinutes || 0, metrics.avgChannelAccuracy || 0, metrics.avgFocusEfficiency || 0, metrics.avgClarityMatchRate || 0, metrics.avgInterruptions || 0, metrics.avgBreakCount || 0, metrics.avgBreakMinutes || 0, timestamp]);
    });
  }

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `presentation-results-${sessionId || "session"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function labelForChoice(choice) {
  const labels = {
    urgent_incident: "Critical incident",
    customer_call: "Manager call",
    email_backlog: "Inbox backlog",
    meeting_prep: "Meeting preparation",
    sprint_planning: "Sprint planning",
    code_review: "Code review",
    documentation: "Documentation",
    team_sync: "Team sync",
    dev_task: "Development task",
    support_ticket: "Support ticket",
    coffee_break: "Coffee break",
    breathing_reset: "Breathing reset",
    screen_free_lunch: "Screen-free lunch"
  };
  return labels[choice] || choice;
}
