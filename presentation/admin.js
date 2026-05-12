const API_BASE = "/api/presentation";

const createSessionBtn = document.getElementById("createSession");
const sessionInput = document.getElementById("sessionId");
const adminKeyInput = document.getElementById("adminKey");
const adminStatus = document.getElementById("adminStatus");
const participantLink = document.getElementById("participantLink");
const resultsLink = document.getElementById("resultsLink");
const triggerButtons = [...document.querySelectorAll(".trigger")];
const revealResultsBtn = document.getElementById("revealResults");

createSessionBtn.addEventListener("click", createSession);
triggerButtons.forEach((btn) => btn.addEventListener("click", () => activate(btn)));
revealResultsBtn.addEventListener("click", revealResults);

async function createSession() {
  const res = await fetch(`${API_BASE}/createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    adminStatus.textContent = "Kunde inte skapa session.";
    return;
  }

  const data = await res.json();
  sessionInput.value = data.sessionId;
  adminKeyInput.value = data.adminKey;
  participantLink.textContent = `${location.origin}${location.pathname.replace("admin.html", "index.html")}?session=${data.sessionId}`;
  resultsLink.textContent = `${location.origin}${location.pathname.replace("admin.html", "results.html")}?session=${data.sessionId}`;
  adminStatus.textContent = "Session skapad.";
}

async function activate(button) {
  if (!sessionInput.value || !adminKeyInput.value) {
    adminStatus.textContent = "Skapa session forst.";
    return;
  }

  const phase = button.dataset.phase;
  const durationSec = Number(button.dataset.duration || "60");

  const res = await fetch(`${API_BASE}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionInput.value,
      adminKey: adminKeyInput.value,
      phase,
      durationSec
    })
  });

  if (!res.ok) {
    adminStatus.textContent = "Aktivering misslyckades.";
    return;
  }

  adminStatus.textContent = `Scenario ${phase} aktivt.`;
}

async function revealResults() {
  if (!sessionInput.value || !adminKeyInput.value) {
    adminStatus.textContent = "Skapa session forst.";
    return;
  }

  const res = await fetch(`${API_BASE}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionInput.value,
      adminKey: adminKeyInput.value,
      phase: "results",
      durationSec: 0
    })
  });

  if (!res.ok) {
    adminStatus.textContent = "Kunde inte visa resultatlage.";
    return;
  }

  adminStatus.textContent = "Resultatlage aktivt.";
}
