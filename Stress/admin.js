const API_BASE = "/api/stress";
const POLL_MS = 2000;

const els = {
  createSession: document.getElementById("createSession"),
  sessionId: document.getElementById("sessionId"),
  adminKey: document.getElementById("adminKey"),
  durationSec: document.getElementById("durationSec"),
  startGame: document.getElementById("startGame"),
  showResults: document.getElementById("showResults"),
  adminStatus: document.getElementById("adminStatus"),
  participantLink: document.getElementById("participantLink"),
  phase: document.getElementById("phaseValue"),
  participantCount: document.getElementById("participantCount"),
  submissionCount: document.getElementById("submissionCount"),
  timeLeft: document.getElementById("timeLeft"),
  leaderboard: document.getElementById("leaderboard")
};

let pollHandle = null;
let lastDeadlineMs = null;

els.createSession.addEventListener("click", createSession);
els.startGame.addEventListener("click", () => setPhase("live"));
els.showResults.addEventListener("click", () => setPhase("results"));
els.durationSec.addEventListener("change", onDurationChange);

async function createSession() {
  const durationSec = Math.max(60, Math.min(1200, Number(els.durationSec.value || 600)));
  const res = await fetch(`${API_BASE}/createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ durationSec })
  });

  if (!res.ok) {
    els.adminStatus.textContent = "Could not create session.";
    return;
  }

  const data = await res.json();
  els.sessionId.value = data.sessionId;
  els.adminKey.value = data.adminKey;
  const url = `${location.origin}${location.pathname.replace("admin.html", "index.html")}?session=${encodeURIComponent(data.sessionId)}`;
  els.participantLink.innerHTML = `Participant link: <a href="${url}" target="_blank" rel="noopener">${url}</a>`;
  els.adminStatus.textContent = "Session created.";
  startPolling();
}

async function onDurationChange() {
  const sessionId = (els.sessionId.value || "").trim().toUpperCase();
  const adminKey = (els.adminKey.value || "").trim();
  if (!sessionId || !adminKey) {
    return;
  }

  const phase = (els.phase.textContent || "idle").trim().toLowerCase();
  if (phase !== "idle") {
    return;
  }

  await setPhase("idle");
  els.adminStatus.textContent = "Duration updated for waiting participants.";
}

async function setPhase(phase) {
  const sessionId = (els.sessionId.value || "").trim().toUpperCase();
  const adminKey = (els.adminKey.value || "").trim();
  if (!sessionId || !adminKey) {
    els.adminStatus.textContent = "Create a session first.";
    return;
  }

  const durationSec = Math.max(60, Math.min(1200, Number(els.durationSec.value || 600)));

  const res = await fetch(`${API_BASE}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, adminKey, phase, durationSec })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    els.adminStatus.textContent = err.error || "Could not update phase.";
    return;
  }

  els.adminStatus.textContent = phase === "live" ? "Game started." : "Results mode activated.";
  await syncState();
}

function startPolling() {
  if (pollHandle) {
    clearInterval(pollHandle);
  }
  syncState();
  pollHandle = setInterval(syncState, POLL_MS);
}

async function syncState() {
  const sessionId = (els.sessionId.value || "").trim().toUpperCase();
  if (!sessionId) {
    return;
  }

  const res = await fetch(`${API_BASE}/state?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    return;
  }

  const state = await res.json();
  els.phase.textContent = state.phase || "idle";
  els.participantCount.textContent = String(state.participantCount || 0);
  els.submissionCount.textContent = String(state.submissions || 0);
  lastDeadlineMs = state.deadlineMs || null;
  renderTimeLeft();

  if ((state.phase || "") === "results") {
    await loadResults();
  }
}

function renderTimeLeft() {
  if (!lastDeadlineMs) {
    els.timeLeft.textContent = "--";
    return;
  }
  const leftSec = Math.max(0, Math.floor((Number(lastDeadlineMs) - Date.now()) / 1000));
  els.timeLeft.textContent = `${leftSec}s`;
}

async function loadResults() {
  const sessionId = (els.sessionId.value || "").trim().toUpperCase();
  if (!sessionId) {
    return;
  }

  const res = await fetch(`${API_BASE}/results?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    return;
  }

  const data = await res.json();
  const rows = (data.leaderboard || []).map((item, idx) => {
    return `${idx + 1}. ${item.participantId.slice(0, 8)} - Final Stress Score ${Math.round(item.stressScore)}`;
  });

  els.leaderboard.innerHTML = `
    <p>Median stress: <strong>${data.medianStress || 0}</strong></p>
    <p>Leaderboard ranking is based on Final Stress Score.</p>
    <p>${rows.join("<br>") || "No results yet."}</p>
  `;
}

setInterval(renderTimeLeft, 300);
