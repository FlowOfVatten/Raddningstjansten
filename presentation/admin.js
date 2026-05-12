const API_BASE = "/api/presentation";
const ADMIN_POLL_MS = 60 * 1000;

const createSessionBtn = document.getElementById("createSession");
const sessionInput = document.getElementById("sessionId");
const adminKeyInput = document.getElementById("adminKey");
const adminStatus = document.getElementById("adminStatus");
const participantLink = document.getElementById("participantLink");
const resultsLink = document.getElementById("resultsLink");
const triggerButtons = [...document.querySelectorAll(".trigger")];
const revealResultsBtn = document.getElementById("revealResults");
const adminPhase = document.getElementById("adminPhase");
const adminTimer = document.getElementById("adminTimer");
const joinedCount = document.getElementById("joinedCount");
const refreshStateBtn = document.getElementById("refreshState");
const lastUpdated = document.getElementById("lastUpdated");

let adminPollHandle = null;
let timerHandle = null;
let deadlineMs = null;
let lastStateUpdateMs = null;
let lastUpdatedHandle = null;

createSessionBtn.addEventListener("click", createSession);
triggerButtons.forEach((btn) => btn.addEventListener("click", () => activate(btn)));
revealResultsBtn.addEventListener("click", revealResults);
refreshStateBtn.addEventListener("click", () => {
  syncAdminState();
});
startLastUpdatedTicker();

async function createSession() {
  const res = await fetch(`${API_BASE}/createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    adminStatus.textContent = "Could not create session.";
    return;
  }

  const data = await res.json();
  sessionInput.value = data.sessionId;
  adminKeyInput.value = data.adminKey;
  participantLink.textContent = `${location.origin}${location.pathname.replace("admin.html", "index.html")}?session=${data.sessionId}`;
  resultsLink.textContent = `${location.origin}${location.pathname.replace("admin.html", "results.html")}?session=${data.sessionId}`;
  adminStatus.textContent = "Session created.";
  startAdminPolling();
}

async function activate(button) {
  if (!sessionInput.value || !adminKeyInput.value) {
    adminStatus.textContent = "Create a session first.";
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
    adminStatus.textContent = "Activation failed.";
    return;
  }

  adminStatus.textContent = `Scenario ${phase} is active.`;
  await syncAdminState();
}

async function revealResults() {
  if (!sessionInput.value || !adminKeyInput.value) {
    adminStatus.textContent = "Create a session first.";
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
    adminStatus.textContent = "Could not reveal results mode.";
    return;
  }

  adminStatus.textContent = "Results mode is active.";
  await syncAdminState();
}

function startAdminPolling() {
  if (adminPollHandle) {
    clearInterval(adminPollHandle);
  }
  syncAdminState();
  adminPollHandle = setInterval(syncAdminState, ADMIN_POLL_MS);
}

async function syncAdminState() {
  if (!sessionInput.value) {
    return;
  }

  const url = `${API_BASE}/state?sessionId=${encodeURIComponent(sessionInput.value)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return;
  }

  const state = await res.json();
  adminPhase.textContent = state.phase || "idle";
  joinedCount.textContent = String(state.participantCount || 0);
  lastStateUpdateMs = Date.now();
  renderLastUpdated();
  deadlineMs = state.deadlineMs || null;
  updateAdminTimer();
}

function startLastUpdatedTicker() {
  if (lastUpdatedHandle) {
    clearInterval(lastUpdatedHandle);
  }
  renderLastUpdated();
  lastUpdatedHandle = setInterval(renderLastUpdated, 1000);
}

function renderLastUpdated() {
  if (!lastUpdated) {
    return;
  }

  if (!lastStateUpdateMs) {
    lastUpdated.textContent = "Last updated: never";
    return;
  }

  const elapsedSec = Math.max(0, Math.floor((Date.now() - lastStateUpdateMs) / 1000));
  lastUpdated.textContent = `Last updated ${elapsedSec} second${elapsedSec === 1 ? "" : "s"} ago`;
}

function updateAdminTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
  }

  if (!deadlineMs) {
    adminTimer.textContent = "--";
    return;
  }

  const tick = () => {
    const left = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
    adminTimer.textContent = `${left}s`;
    if (left <= 0 && timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  };

  tick();
  timerHandle = setInterval(tick, 250);
}

const params = new URLSearchParams(window.location.search);
const incomingSession = (params.get("session") || "").trim().toUpperCase();
if (incomingSession) {
  sessionInput.value = incomingSession;
  startAdminPolling();
}
