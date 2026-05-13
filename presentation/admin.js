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
const newRoundBtn = document.getElementById("newRound");
const adminPhase = document.getElementById("adminPhase");
const adminTimer = document.getElementById("adminTimer");
const joinedCount = document.getElementById("joinedCount");
const readyCount = document.getElementById("readyCount");
const refreshStateBtn = document.getElementById("refreshState");
const lastUpdated = document.getElementById("lastUpdated");
const briefingSlideLabel = document.getElementById("briefingSlideLabel");
const startBriefingBtn = document.getElementById("startBriefing");
const prevBriefingBtn = document.getElementById("prevBriefing");
const nextBriefingBtn = document.getElementById("nextBriefing");
const endBriefingBtn = document.getElementById("endBriefing");
const stressDurationInput = document.getElementById("stressDurationSec");
const chaosDurationInput = document.getElementById("chaosDurationSec");
const taskWaveInput = document.getElementById("taskWaveSeconds");
const timingSummary = document.getElementById("timingSummary");

const DEFAULT_BRIEFING_SLIDES = 6;
const DEFAULT_STRESS_DURATION_SEC = 120;
const DEFAULT_CHAOS_DURATION_SEC = 180;
const DEFAULT_TASK_WAVE_SECONDS = 20;

let adminPollHandle = null;
let timerHandle = null;
let deadlineMs = null;
let lastStateUpdateMs = null;
let lastUpdatedHandle = null;

createSessionBtn.addEventListener("click", createSession);
triggerButtons.forEach((btn) => btn.addEventListener("click", () => activate(btn)));
revealResultsBtn.addEventListener("click", revealResults);
newRoundBtn.addEventListener("click", startNewRound);
refreshStateBtn.addEventListener("click", () => {
  syncAdminState();
});
startBriefingBtn.addEventListener("click", () => updateBriefing("start"));
prevBriefingBtn.addEventListener("click", () => updateBriefing("prev"));
nextBriefingBtn.addEventListener("click", () => updateBriefing("next"));
endBriefingBtn.addEventListener("click", () => updateBriefing("end"));
[stressDurationInput, chaosDurationInput, taskWaveInput].forEach((input) => {
  if (input) {
    input.addEventListener("input", renderTimingSummary);
  }
});
startLastUpdatedTicker();
renderTimingSummary();

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
  const timing = getTimingConfig();
  const durationSec = phase === "digitalStress"
    ? timing.stressDurationSec
    : Number(button.dataset.duration || "0");

  const res = await fetch(`${API_BASE}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionInput.value,
      adminKey: adminKeyInput.value,
      phase,
      durationSec,
      chaosDurationSec: timing.chaosDurationSec,
      taskWaveSeconds: timing.taskWaveSeconds
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

async function startNewRound() {
  if (!sessionInput.value || !adminKeyInput.value) {
    adminStatus.textContent = "Create a session first.";
    return;
  }

  const timing = getTimingConfig();

  const res = await fetch(`${API_BASE}/startNewRound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionInput.value,
      adminKey: adminKeyInput.value,
      stressDurationSec: timing.stressDurationSec,
      chaosDurationSec: timing.chaosDurationSec,
      taskWaveSeconds: timing.taskWaveSeconds
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    adminStatus.textContent = data.error || "Could not start new round.";
    return;
  }

  adminStatus.textContent = "New round started with updated timing settings.";
  await syncAdminState();
}

async function updateBriefing(command) {
  if (!sessionInput.value || !adminKeyInput.value) {
    adminStatus.textContent = "Create a session first.";
    return;
  }

  const res = await fetch(`${API_BASE}/briefing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionInput.value,
      adminKey: adminKeyInput.value,
      command,
      totalSlides: DEFAULT_BRIEFING_SLIDES
    })
  });

  if (!res.ok) {
    adminStatus.textContent = "Could not update briefing.";
    return;
  }

  const data = await res.json();
  if (data.phase === "briefing") {
    adminStatus.textContent = `Briefing running: slide ${Number(data.briefingSlide || 0) + 1}/${Number(data.briefingTotal || DEFAULT_BRIEFING_SLIDES)}.`;
  } else {
    adminStatus.textContent = data.message || "Briefing updated.";
  }
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
  readyCount.textContent = String(state.readyCount || 0);
  syncTimingInputsFromState(state);
  renderBriefingLabel(state);
  lastStateUpdateMs = Date.now();
  renderLastUpdated();
  deadlineMs = state.deadlineMs || null;
  updateAdminTimer();

  const inResults = (state.phase || "idle") === "results";
  triggerButtons.forEach((btn) => {
    if ((btn.dataset.phase || "") === "digitalStress") {
      btn.disabled = inResults;
    }
  });

  if (newRoundBtn) {
    newRoundBtn.disabled = !inResults;
  }
}

function renderBriefingLabel(state) {
  if (!briefingSlideLabel) {
    return;
  }

  if ((state.phase || "") !== "briefing") {
    briefingSlideLabel.textContent = "Not running";
    return;
  }

  const slide = Number(state.briefingSlide || 0) + 1;
  const total = Number(state.briefingTotal || DEFAULT_BRIEFING_SLIDES);
  briefingSlideLabel.textContent = `${slide}/${total}`;
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

function getTimingConfig() {
  return {
    stressDurationSec: parsePositiveInt(stressDurationInput && stressDurationInput.value, DEFAULT_STRESS_DURATION_SEC, 10, 3600),
    chaosDurationSec: parsePositiveInt(chaosDurationInput && chaosDurationInput.value, DEFAULT_CHAOS_DURATION_SEC, 10, 3600),
    taskWaveSeconds: parsePositiveInt(taskWaveInput && taskWaveInput.value, DEFAULT_TASK_WAVE_SECONDS, 5, 120)
  };
}

function syncTimingInputsFromState(state) {
  const stress = Number(state && state.stressDurationSec);
  const chaos = Number(state && state.chaosDurationSec);
  const taskWave = Number(state && state.taskWaveSeconds);

  setInputIfNotFocused(stressDurationInput, stress > 0 ? stress : DEFAULT_STRESS_DURATION_SEC);
  setInputIfNotFocused(chaosDurationInput, chaos > 0 ? chaos : DEFAULT_CHAOS_DURATION_SEC);
  setInputIfNotFocused(taskWaveInput, taskWave > 0 ? taskWave : DEFAULT_TASK_WAVE_SECONDS);
  renderTimingSummary();
}

function setInputIfNotFocused(input, value) {
  if (!input) {
    return;
  }
  if (document.activeElement === input) {
    return;
  }
  input.value = String(value);
}

function parsePositiveInt(raw, fallback, min, max) {
  const parsed = Number.parseInt(String(raw || ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function renderTimingSummary() {
  if (!timingSummary) {
    return;
  }
  const timing = getTimingConfig();
  const totalSec = timing.stressDurationSec + timing.chaosDurationSec;
  timingSummary.textContent = `Total game time: ${Math.round(totalSec / 60)} minutes (${timing.stressDurationSec}s Stress + ${timing.chaosDurationSec}s Chaos). Task boxes rotate every ${timing.taskWaveSeconds} seconds.`;
}

const params = new URLSearchParams(window.location.search);
const incomingSession = (params.get("session") || "").trim().toUpperCase();
if (incomingSession) {
  sessionInput.value = incomingSession;
  startAdminPolling();
}
