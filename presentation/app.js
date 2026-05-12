const API_BASE = "/api/presentation";
const POLL_MS = 500;

const sessionInput = document.getElementById("sessionId");
const joinBtn = document.getElementById("joinBtn");
const joinStatus = document.getElementById("joinStatus");
const scenarioCard = document.getElementById("scenarioCard");
const scenarioTitle = document.getElementById("scenarioTitle");
const scenarioText = document.getElementById("scenarioText");
const timerEl = document.getElementById("timer");
const taskList = document.getElementById("taskList");
const priorityBoard = document.getElementById("priorityBoard");
const taskPool = document.getElementById("tasks");
const conflictsEl = document.getElementById("conflicts");
const submitBtn = document.getElementById("submitPriorities");
const submittedEl = document.getElementById("submitted");

const participantId = getOrCreateParticipantId();
let activeSessionId = "";
let pollHandle = null;
let timerHandle = null;
let deadlineMs = null;
let currentPhase = "";
let currentPriorities = [];
let availableTasks = [];
let takenByOthers = new Set();
let taskUnlockTimes = new Map();
let unlockCheckHandle = null;

const TASKS = [
  { id: "urgent_incident", label: "🔥 Kritisk incident", lockedMs: 0 },
  { id: "customer_call", label: "☎️ Kundsamtal", lockedMs: 0 },
  { id: "email_backlog", label: "📧 Email backlog", lockedMs: 8000 },
  { id: "meeting_prep", label: "📋 Möteförberedelse", lockedMs: 0 },
  { id: "sprint_planning", label: "🎯 Sprint planning", lockedMs: 15000 },
  { id: "code_review", label: "🔍 Code review", lockedMs: 0 },
  { id: "documentation", label: "📚 Dokumentation", lockedMs: 25000 },
  { id: "team_sync", label: "👥 Team sync", lockedMs: 0 },
  { id: "dev_task", label: "💻 Utvecklingsuppgift", lockedMs: 12000 },
  { id: "support_ticket", label: "🎫 Support ticket", lockedMs: 5000 }
];

const phaseCopy = {
  idle: "Väntar på aktivering",
  digitalStress: "Digital Stress - Prioritera alla 10 uppgifter",
  workloadChaos: "Workload Chaos - Resurserna försvinner!",
  results: "Resultatlage"
};

joinBtn.addEventListener("click", () => {
  const sessionId = sessionInput.value.trim().toUpperCase();
  if (!sessionId) {
    joinStatus.textContent = "Fyll i ett session-ID.";
    return;
  }
  activeSessionId = sessionId;
  joinStatus.textContent = "Ansluten. Väntar på scenario...";
  scenarioCard.hidden = false;
  startPolling();
});

submitBtn.addEventListener("click", submitPriorities);

priorityBoard.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
});

priorityBoard.addEventListener("drop", (e) => {
  e.preventDefault();
  const taskId = e.dataTransfer.getData("text/plain");
  const slot = e.target.closest(".task-slot");
  if (slot) {
    moveTaskToSlot(taskId, slot);
  }
});

taskPool.addEventListener("dragstart", (e) => {
  const task = e.target.closest(".task-item");
  if (task) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.dataset.taskId);
    task.classList.add("dragging");
  }
});

taskPool.addEventListener("dragend", (e) => {
  const task = e.target.closest(".task-item");
  if (task) {
    task.classList.remove("dragging");
  }
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
  currentPhase = state.phase || "idle";

  scenarioTitle.textContent = phaseCopy[currentPhase] || "Scenario";
  scenarioText.textContent = state.message || "Följ instruktionerna på skärmen.";

  const interactive = currentPhase === "digitalStress" || currentPhase === "workloadChaos";
  const submitted = Boolean(state.submitted);
  
  taskList.hidden = !interactive;
  submitBtn.hidden = !interactive || submitted;
  conflictsEl.hidden = !interactive || currentPhase !== "workloadChaos";
  submittedEl.hidden = !submitted;

  if (interactive && !submitted) {
    availableTasks = TASKS;
    taskUnlockTimes.clear();
    const now = Date.now();
    availableTasks.forEach((task) => {
      taskUnlockTimes.set(task.id, now + (task.lockedMs || 0));
    });
    renderTasks();
    startUnlockCheck();
  }

  deadlineMs = state.deadlineMs || null;
  updateTimer();

  if (interactive && currentPhase === "workloadChaos") {
    checkForConflicts();
  }
}

function renderTasks() {
  taskPool.innerHTML = "";
  const now = Date.now();
  availableTasks.forEach((task) => {
    const isTaken = takenByOthers.has(task.id);
    const inPriorities = currentPriorities.some((p) => p.id === task.id);
    if (inPriorities) {
      return;
    }

    const unlockTime = taskUnlockTimes.get(task.id) || 0;
    const isLocked = unlockTime > now;
    const lockSecsLeft = Math.ceil((unlockTime - now) / 1000);

    const taskDiv = document.createElement("div");
    taskDiv.className = `task-item${isTaken ? " taken" : ""}${isLocked ? " locked" : ""}`;
    taskDiv.dataset.taskId = task.id;
    taskDiv.draggable = !isTaken && !isLocked;
    
    if (isLocked) {
      taskDiv.textContent = `${task.label} (${lockSecsLeft}s)`;
      taskDiv.title = `Tillgänglig om ${lockSecsLeft} sekunder`;
    } else {
      taskDiv.textContent = task.label;
      taskDiv.title = isTaken ? "Tagen av annan deltagare" : "Dra här för att prioritera";
    }
    
    taskPool.appendChild(taskDiv);
  });
}

function moveTaskToSlot(taskId, slot) {
  const task = availableTasks.find((t) => t.id === taskId);
  if (!task) {
    return;
  }

  const rankIndex = Number(slot.dataset.rank) - 1;
  currentPriorities[rankIndex] = task;

  renderSlots();
  renderTasks();
}

function renderSlots() {
  priorityBoard.querySelectorAll(".task-slot").forEach((slot, idx) => {
    slot.innerHTML = "";
    slot.classList.remove("filled", "conflict");

    if (currentPriorities[idx]) {
      const task = currentPriorities[idx];
      slot.textContent = task.label;
      slot.classList.add("filled");

      if (takenByOthers.has(task.id)) {
        slot.classList.add("conflict");
      }
    }
  });
}

async function checkForConflicts() {
  if (!activeSessionId) {
    return;
  }

  const url = `${API_BASE}/conflicts?sessionId=${encodeURIComponent(activeSessionId)}&participantId=${encodeURIComponent(participantId)}`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    takenByOthers = new Set(data.takenByOthers || []);
    renderSlots();
    renderTasks();

    if (takenByOthers.size > 0) {
      conflictsEl.hidden = false;
    }
  }
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

async function submitPriorities() {
  if (!activeSessionId || currentPriorities.length < 5) {
    alert("Prioritera minst 5 uppgifter.");
    return;
  }

  const ranking = currentPriorities.slice(0, 5).map((task, idx) => ({
    rank: idx + 1,
    taskId: task.id,
    taskLabel: task.label
  }));

  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: activeSessionId,
      participantId,
      ranking,
      responseTimeMs: deadlineMs ? Math.max(0, deadlineMs - Date.now()) : null
    })
  });

  if (!res.ok) {
    joinStatus.textContent = "Kunde inte skicka prioritering.";
    return;
  }

  submittedEl.hidden = false;
  taskList.hidden = true;
  submitBtn.hidden = true;
}

function startUnlockCheck() {
  if (unlockCheckHandle) {
    clearInterval(unlockCheckHandle);
  }
  
  unlockCheckHandle = setInterval(() => {
    renderTasks();
  }, 250);
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

const params = new URLSearchParams(window.location.search);
const incomingSession = (params.get("session") || "").trim().toUpperCase();
if (incomingSession) {
  sessionInput.value = incomingSession;
  joinBtn.click();
}
