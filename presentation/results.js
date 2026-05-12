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

  phaseTitle.textContent = `Senaste scenario: ${data.phase || "okant"}`;
  totals.textContent = `Totalt svar: ${data.totalAnswers}`;

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
  const rows = [["sessionId", "phase", "choice", "count", "exportedAt"]];
  const entries = Object.entries(latestResults.counts || {});

  if (!entries.length) {
    rows.push([sessionId, latestResults.phase || "", "", 0, timestamp]);
  } else {
    entries.forEach(([choice, count]) => {
      rows.push([sessionId, latestResults.phase || "", choice, count, timestamp]);
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
    urgent_incident: "Incident",
    customer_request: "Kundfraga",
    prep_meeting: "Mote",
    ignore_all: "Paus"
  };
  return labels[choice] || choice;
}
