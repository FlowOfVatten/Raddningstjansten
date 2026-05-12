const API_BASE = "/api/presentation";
const POLL_MS = 1000;

const sessionInput = document.getElementById("sessionId");
const joinBtn = document.getElementById("joinBtn");
const joinStatus = document.getElementById("joinStatus");
const scenarioCard = document.getElementById("scenarioCard");
const scenarioTitle = document.getElementById("scenarioTitle");
const scenarioText = document.getElementById("scenarioText");
const timerEl = document.getElementById("timer");
const choicesEl = document.getElementById("choices");
const submittedEl = document.getElementById("submitted");

const participantId = getOrCreateParticipantId();
let activeSessionId = "";
let pollHandle = null;
let timerHandle = null;
let deadlineMs = null;

const params = new URLSearchParams(window.location.search);
const incomingSession = (params.get("session") || "").trim().toUpperCase();
if (incomingSession) {
  sessionInput.value = incomingSession;
  joinBtn.click();
}

const phaseCopy = {
  idle: "Vantar pa aktivering",
  digitalStress: "Digital Stress ar aktiv",
  workloadChaos: "Workload Chaos ar aktiv",
  results: "Resultatlage"
};

joinBtn.addEventListener("click", () => {
  const sessionId = sessionInput.value.trim().toUpperCase();
  if (!sessionId) {
    joinStatus.textContent = "Fyll i ett session-ID.";
    return;
  }
  activeSessionId = sessionId;
  joinStatus.textContent = "Ansluten. Vantar pa scenario...";
  scenarioCard.hidden = false;
  startPolling();
});

choicesEl.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-choice]");
  if (!btn || !activeSessionId) {
    return;
  }

  const choice = btn.dataset.choice;
  const responseTimeMs = deadlineMs ? Math.max(0, deadlineMs - Date.now()) : null;

  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: activeSessionId,
      participantId,
      choice,
      responseTimeMs
    })
  });

  if (!res.ok) {
    joinStatus.textContent = "Kunde inte skicka svaret.";
    return;
  }

  submittedEl.hidden = false;
  choicesEl.hidden = true;
});

function startPolling() {
  if (pollHandle) {
    clearInterval(pollHandle);
  }
  syncState();
  pollHandle = setInterval(syncState, POLL_MS);
}

async function syncState() {
  if (!activeSessionId) {
    return;
  }

  const url = `${API_BASE}/state?sessionId=${encodeURIComponent(activeSessionId)}&participantId=${encodeURIComponent(participantId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    joinStatus.textContent = "Session hittades inte.";
    return;
  }

  const state = await res.json();
  scenarioTitle.textContent = phaseCopy[state.phase] || "Scenario";
  scenarioText.textContent = state.message || "Folj instruktionerna pa skarmen.";

  const interactive = state.phase === "digitalStress" || state.phase === "workloadChaos";
  const submitted = Boolean(state.submitted);
  choicesEl.hidden = !interactive || submitted;
  submittedEl.hidden = !submitted;

  deadlineMs = state.deadlineMs || null;
  updateTimer();
}

function updateTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
  }

  if (!deadlineMs) {
    timerEl.textContent = "--";
    return;
  }

  const tick = () => {
    const left = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
    timerEl.textContent = `${left}s`;
    if (left <= 0) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  };

  tick();
  timerHandle = setInterval(tick, 250);
}

function getOrCreateParticipantId() {
  const key = "presentationParticipantId";
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const created = `p-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, created);
  return created;
}
