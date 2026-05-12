const API_BASE = "/api/presentation";

const sessionInput = document.getElementById("sessionId");
const loadBtn = document.getElementById("loadResults");
const loadStatus = document.getElementById("loadStatus");
const resultCard = document.getElementById("resultCard");
const phaseTitle = document.getElementById("phaseTitle");
const totals = document.getElementById("totals");
const bars = document.getElementById("bars");
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
    loadStatus.textContent = "Fyll i session-ID.";
    return;
  }

  const res = await fetch(`${API_BASE}/results?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    loadStatus.textContent = "Kunde inte hamta resultat.";
    return;
  }

  const data = await res.json();
  latestResults = data;
  const entries = Object.entries(data.counts || {});
  const max = Math.max(1, ...entries.map(([, value]) => value));
  const metrics = data.metrics || {};

  phaseTitle.textContent = `Senaste scenario: ${data.phase || "okant"}`;
  totals.textContent = `Deltagare: ${data.participants || 0} | Leveransscore: ${metrics.avgDeliveryScore || 0} | Wellbeing: ${metrics.avgWellbeingScore || 0} | Overload: ${metrics.avgOverloadMinutes || 0} min`;

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
  loadStatus.textContent = "Resultat uppdaterat.";
}

function exportCsv() {
  if (!latestResults) {
    loadStatus.textContent = "Hamta resultat innan export.";
    return;
  }

  const sessionId = sessionInput.value.trim().toUpperCase();
  const timestamp = new Date().toISOString();
  const rows = [["sessionId", "phase", "choice", "count", "avgDeliveryScore", "avgWellbeingScore", "avgOverloadMinutes", "exportedAt"]];
  const entries = Object.entries(latestResults.counts || {});
  const metrics = latestResults.metrics || {};

  if (!entries.length) {
    rows.push([sessionId, latestResults.phase || "", "", 0, metrics.avgDeliveryScore || 0, metrics.avgWellbeingScore || 0, metrics.avgOverloadMinutes || 0, timestamp]);
  } else {
    entries.forEach(([choice, count]) => {
      rows.push([sessionId, latestResults.phase || "", choice, count, metrics.avgDeliveryScore || 0, metrics.avgWellbeingScore || 0, metrics.avgOverloadMinutes || 0, timestamp]);
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
    urgent_incident: "Kritisk incident",
    customer_call: "Samtal med chefen",
    email_backlog: "Email backlog",
    meeting_prep: "Moteforberedelse",
    sprint_planning: "Sprint planning",
    code_review: "Code review",
    documentation: "Dokumentation",
    team_sync: "Team sync",
    dev_task: "Utvecklingsuppgift",
    support_ticket: "Support ticket",
    coffee_break: "Kaffe/benstrackare",
    breathing_reset: "Andningspaus",
    screen_free_lunch: "Lunch utan skarm"
  };
  return labels[choice] || choice;
}
