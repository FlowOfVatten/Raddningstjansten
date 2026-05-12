const API_BASE = "/api/presentation";
const POLL_MS = 700;
const WORKDAY_MINUTES = 480;
const TOP_SLOTS = 10;

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
const budgetStrip = document.getElementById("budgetStrip");
const budgetUsedEl = document.getElementById("budgetUsed");
const budgetRemainingEl = document.getElementById("budgetRemaining");
const wellbeingValueEl = document.getElementById("wellbeingValue");
const chaosCardEl = document.getElementById("chaosCard");
const chaosTitleEl = document.getElementById("chaosTitle");
const chaosTextEl = document.getElementById("chaosText");
const chaosOptionA = document.getElementById("chaosOptionA");
const chaosOptionB = document.getElementById("chaosOptionB");
const inlineResults = document.getElementById("inlineResults");
const inlineResultsSummary = document.getElementById("inlineResultsSummary");
const myDelivery = document.getElementById("myDelivery");
const myWellbeing = document.getElementById("myWellbeing");
const myOverload = document.getElementById("myOverload");
const groupDelivery = document.getElementById("groupDelivery");
const groupWellbeing = document.getElementById("groupWellbeing");
const groupOverload = document.getElementById("groupOverload");

const participantId = getOrCreateParticipantId();
let activeSessionId = "";
let pollHandle = null;
let timerHandle = null;
let unlockCheckHandle = null;
let deadlineMs = null;
let currentPhase = "idle";
let initializedPhase = "";
let phaseStartedAt = 0;
let currentPriorities = Array(TOP_SLOTS).fill(null);
let availableTasks = [];
let takenByOthers = new Set();
let taskUnlockTimes = new Map();
let tempLocks = new Map();
let firedInterrupts = new Set();
let pendingChaosCard = null;
let chaosDecisions = [];
let chaosPenaltyMinutes = 0;
let chaosWellbeingDelta = 0;
let hasLoadedInlineResults = false;

const TASKS = [
  { id: "urgent_incident", label: "Kritisk incident", lockedMs: 0, minutes: 80, wellbeing: false },
  { id: "customer_call", label: "Samtal med chefen", lockedMs: 0, minutes: 45, wellbeing: false },
  { id: "email_backlog", label: "Email backlog", lockedMs: 8000, minutes: 50, wellbeing: false },
  { id: "meeting_prep", label: "Moteforberedelse", lockedMs: 0, minutes: 55, wellbeing: false },
  { id: "sprint_planning", label: "Sprint planning", lockedMs: 15000, minutes: 60, wellbeing: false },
  { id: "code_review", label: "Code review", lockedMs: 0, minutes: 40, wellbeing: false },
  { id: "documentation", label: "Dokumentation", lockedMs: 25000, minutes: 45, wellbeing: false },
  { id: "team_sync", label: "Team sync", lockedMs: 0, minutes: 35, wellbeing: false },
  { id: "dev_task", label: "Utvecklingsuppgift", lockedMs: 12000, minutes: 85, wellbeing: false },
  { id: "support_ticket", label: "Support ticket", lockedMs: 5000, minutes: 50, wellbeing: false },
  { id: "coffee_break", label: "Kaffe och benstrackare", lockedMs: 0, minutes: 10, wellbeing: true },
  { id: "breathing_reset", label: "2-min andningspaus", lockedMs: 0, minutes: 5, wellbeing: true },
  { id: "screen_free_lunch", label: "Kort lunch utan skarm", lockedMs: 0, minutes: 20, wellbeing: true }
];

const phaseCopy = {
  idle: "Vantar pa aktivering",
  digitalStress: "Digital Stress - Prioritera topp 10 inom en 8h arbetsdag",
  workloadChaos: "Chaos - resurser, avbrott och beslut under tidspress",
  results: "Resultatlage"
};

const CHAOS_INTERRUPTS = [
  {
    id: "family-call",
    atSec: 16,
    title: "Familjemedlem ringer",
    text: "Du ar mitt i en kritisk uppgift. Hur svarar du?",
    options: [
      { key: "answer", label: "Svara", penaltyMinutes: 10, wellbeingDelta: 1 },
      { key: "ignore", label: "Svara inte", penaltyMinutes: 0, wellbeingDelta: -1 }
    ]
  },
  {
    id: "colleague-chat",
    atSec: 35,
    title: "Kollega kliver in i rummet",
    text: "Kollegan vill smaprata om ett sidoprojekt.",
    options: [
      { key: "social", label: "Var social", penaltyMinutes: 15, wellbeingDelta: 1 },
      { key: "busy", label: "Sak att du ar upptagen", penaltyMinutes: 0, wellbeingDelta: -1 }
    ]
  }
];

buildPriorityBoard(TOP_SLOTS);

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
    moveTaskToSlot(taskId, Number(slot.dataset.rank) - 1);
  }
});

taskPool.addEventListener("dragstart", (e) => {
  const task = e.target.closest(".task-item");
  if (!task || task.classList.contains("locked") || task.classList.contains("taken")) {
    return;
  }
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", task.dataset.taskId);
  task.classList.add("dragging");
});

taskPool.addEventListener("dragend", (e) => {
  const task = e.target.closest(".task-item");
  if (task) {
    task.classList.remove("dragging");
  }
});

chaosOptionA.addEventListener("click", () => decideChaosOption(0));
chaosOptionB.addEventListener("click", () => decideChaosOption(1));

function buildPriorityBoard(size) {
  priorityBoard.innerHTML = "";
  for (let i = 1; i <= size; i += 1) {
    const row = document.createElement("div");
    row.className = `rank-row rank-${i}`;
    row.innerHTML = `<span class="rank-label">${i}</span><div class="task-slot" data-rank="${i}"></div>`;
    priorityBoard.appendChild(row);
  }
}

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
  scenarioText.textContent = state.message || "Folj instruktionerna pa skarmen.";

  const interactive = currentPhase === "digitalStress" || currentPhase === "workloadChaos";
  const submitted = Boolean(state.submitted);

  taskList.hidden = !interactive;
  budgetStrip.hidden = !interactive;
  submitBtn.hidden = !interactive || submitted;
  conflictsEl.hidden = currentPhase !== "workloadChaos";
  submittedEl.hidden = !submitted;

  if (interactive && initializedPhase !== currentPhase) {
    initializePhase();
  }

  if (!interactive) {
    stopUnlockCheck();
    hideChaosCard();
  }

  if (currentPhase === "results") {
    taskList.hidden = true;
    budgetStrip.hidden = true;
    submitBtn.hidden = true;
    await showInlineResults();
  } else {
    inlineResults.hidden = true;
    hasLoadedInlineResults = false;
  }

  deadlineMs = state.deadlineMs || null;
  updateTimer();
  renderBudget();

  if (interactive && !submitted && currentPhase === "workloadChaos") {
    runChaosInterrupts();
    await syncClaims();
    await checkForConflicts();
  }
}

function initializePhase() {
  initializedPhase = currentPhase;
  phaseStartedAt = Date.now();
  currentPriorities = Array(TOP_SLOTS).fill(null);
  availableTasks = TASKS.slice();
  takenByOthers = new Set();
  taskUnlockTimes.clear();
  tempLocks.clear();
  firedInterrupts = new Set();
  pendingChaosCard = null;
  chaosDecisions = [];
  chaosPenaltyMinutes = 0;
  chaosWellbeingDelta = 0;
  hasLoadedInlineResults = false;

  availableTasks.forEach((task) => {
    taskUnlockTimes.set(task.id, phaseStartedAt + (task.lockedMs || 0));
  });

  renderSlots();
  renderTasks();
  renderBudget();
  hideChaosCard();
  startUnlockCheck();
}

async function showInlineResults() {
  if (hasLoadedInlineResults || !activeSessionId) {
    return;
  }

  const myUrl = `${API_BASE}/myresult?sessionId=${encodeURIComponent(activeSessionId)}&participantId=${encodeURIComponent(participantId)}`;
  const groupUrl = `${API_BASE}/results?sessionId=${encodeURIComponent(activeSessionId)}`;

  const [myRes, groupRes] = await Promise.all([fetch(myUrl), fetch(groupUrl)]);
  if (!groupRes.ok) {
    return;
  }

  const groupData = await groupRes.json();
  const groupMetrics = groupData.metrics || {};

  groupDelivery.textContent = String(groupMetrics.avgDeliveryScore ?? 0);
  groupWellbeing.textContent = String(groupMetrics.avgWellbeingScore ?? 0);
  groupOverload.textContent = `${groupMetrics.avgOverloadMinutes ?? 0} min`;

  if (myRes.ok) {
    const myData = await myRes.json();
    const mySummary = myData.summary || {};
    const myScore = computeDeliveryScore(myData.ranking || []);
    myDelivery.textContent = String(myScore);
    myWellbeing.textContent = String(mySummary.wellbeingScore ?? 0);
    myOverload.textContent = `${mySummary.overloadMinutes ?? 0} min`;
    inlineResultsSummary.textContent = `Din senaste inlamning jamfors med ${groupData.participants || 0} deltagare.`;
  } else {
    myDelivery.textContent = "-";
    myWellbeing.textContent = "-";
    myOverload.textContent = "-";
    inlineResultsSummary.textContent = "Du har ingen inlamning att visa for den har sessionen an.";
  }

  inlineResults.hidden = false;
  hasLoadedInlineResults = true;
}

function computeDeliveryScore(ranking) {
  return (ranking || []).reduce((sum, rank, idx) => {
    if (!rank || !rank.taskId) {
      return sum;
    }
    const weight = Math.max(1, 10 - idx);
    return sum + weight * (rank.wellbeing ? 0.5 : 1);
  }, 0);
}

function runChaosInterrupts() {
  const elapsedSec = Math.floor((Date.now() - phaseStartedAt) / 1000);
  CHAOS_INTERRUPTS.forEach((interrupt) => {
    if (elapsedSec >= interrupt.atSec && !firedInterrupts.has(interrupt.id)) {
      firedInterrupts.add(interrupt.id);
      showChaosCard(interrupt);
    }
  });
}

function showChaosCard(card) {
  pendingChaosCard = card;
  chaosTitleEl.textContent = card.title;
  chaosTextEl.textContent = card.text;
  chaosOptionA.textContent = card.options[0].label;
  chaosOptionB.textContent = card.options[1].label;
  chaosCardEl.hidden = false;
}

function hideChaosCard() {
  pendingChaosCard = null;
  chaosCardEl.hidden = true;
}

function decideChaosOption(index) {
  if (!pendingChaosCard) {
    return;
  }

  const option = pendingChaosCard.options[index];
  chaosPenaltyMinutes += Number(option.penaltyMinutes || 0);
  chaosWellbeingDelta += Number(option.wellbeingDelta || 0);
  chaosDecisions.push({
    cardId: pendingChaosCard.id,
    choice: option.key,
    penaltyMinutes: Number(option.penaltyMinutes || 0),
    wellbeingDelta: Number(option.wellbeingDelta || 0)
  });

  scenarioText.textContent = `Val registrerat: ${option.label} (${option.penaltyMinutes || 0} min).`;
  hideChaosCard();
  renderBudget();
}

function startUnlockCheck() {
  stopUnlockCheck();
  unlockCheckHandle = setInterval(() => {
    renderTasks();
  }, 250);
}

function stopUnlockCheck() {
  if (unlockCheckHandle) {
    clearInterval(unlockCheckHandle);
    unlockCheckHandle = null;
  }
}

function isTaskLocked(task, now) {
  const baseUnlock = taskUnlockTimes.get(task.id) || 0;
  const tempUnlock = tempLocks.get(task.id) || 0;
  return baseUnlock > now || tempUnlock > now;
}

function lockSecondsLeft(task, now) {
  const baseUnlock = taskUnlockTimes.get(task.id) || 0;
  const tempUnlock = tempLocks.get(task.id) || 0;
  const target = Math.max(baseUnlock, tempUnlock);
  return Math.max(0, Math.ceil((target - now) / 1000));
}

function renderTasks() {
  taskPool.innerHTML = "";
  const now = Date.now();

  availableTasks.forEach((task) => {
    if (currentPriorities.some((p) => p && p.id === task.id)) {
      return;
    }

    const isTaken = takenByOthers.has(task.id);
    const isLocked = isTaskLocked(task, now);
    const lockSecsLeft = lockSecondsLeft(task, now);

    const taskDiv = document.createElement("div");
    taskDiv.className = `task-item${isTaken ? " taken" : ""}${isLocked ? " locked" : ""}${task.wellbeing ? " wellbeing" : ""}`;
    taskDiv.dataset.taskId = task.id;
    taskDiv.draggable = !isTaken && !isLocked;
    taskDiv.textContent = isLocked ? `${task.label} (${lockSecsLeft}s)` : `${task.label} (${task.minutes}m)`;
    taskDiv.title = isLocked
      ? `Tillganglig om ${lockSecsLeft} sekunder`
      : isTaken
        ? "Resurs upptagen av annan deltagare med hogre prioritet"
        : task.wellbeing
          ? "Wellbeing-val: kan minska stress men tar tid"
          : "Dra till en rank-slot";

    taskPool.appendChild(taskDiv);
  });
}

function moveTaskToSlot(taskId, rankIndex) {
  const task = availableTasks.find((t) => t.id === taskId);
  if (!task) {
    return;
  }

  if (isTaskLocked(task, Date.now()) || takenByOthers.has(task.id)) {
    return;
  }

  const existingIndex = currentPriorities.findIndex((p) => p && p.id === task.id);
  if (existingIndex !== -1) {
    currentPriorities[existingIndex] = null;
  }

  const displaced = currentPriorities[rankIndex];
  currentPriorities[rankIndex] = task;
  if (existingIndex !== -1 && displaced) {
    currentPriorities[existingIndex] = displaced;
  }

  renderSlots();
  renderTasks();
  renderBudget();

  if (currentPhase === "workloadChaos") {
    syncClaims();
  }
}

function renderSlots() {
  priorityBoard.querySelectorAll(".task-slot").forEach((slot, idx) => {
    slot.innerHTML = "";
    slot.classList.remove("filled", "conflict");
    const task = currentPriorities[idx];
    if (!task) {
      return;
    }

    const healthTag = task.wellbeing ? " +wellbeing" : "";
    slot.textContent = `${task.label} (${task.minutes}m${healthTag})`;
    slot.classList.add("filled");
    if (takenByOthers.has(task.id)) {
      slot.classList.add("conflict");
    }
  });
}

function computeSummary() {
  const selected = currentPriorities.filter(Boolean);
  const plannedMinutes = selected.reduce((sum, task) => sum + Number(task.minutes || 0), 0);
  const wellbeingTaskCount = selected.filter((task) => task.wellbeing).length;
  const wellbeingScore = wellbeingTaskCount * 2 + chaosWellbeingDelta;
  const totalMinutes = plannedMinutes + chaosPenaltyMinutes;
  const remainingMinutes = WORKDAY_MINUTES - totalMinutes;

  return {
    plannedMinutes,
    chaosPenaltyMinutes,
    totalMinutes,
    remainingMinutes,
    wellbeingTaskCount,
    wellbeingScore,
    overloadMinutes: Math.max(0, -remainingMinutes),
    chaosDecisions
  };
}

function renderBudget() {
  const summary = computeSummary();
  budgetUsedEl.textContent = `${summary.totalMinutes} min`;
  budgetRemainingEl.textContent = `${summary.remainingMinutes} min`;
  wellbeingValueEl.textContent = String(summary.wellbeingScore);

  if (summary.remainingMinutes < 0) {
    budgetRemainingEl.classList.add("over");
  } else {
    budgetRemainingEl.classList.remove("over");
  }
}

async function syncClaims() {
  const claims = currentPriorities
    .map((task, idx) => (task ? { rank: idx + 1, taskId: task.id } : null))
    .filter(Boolean)
    .slice(0, 5);

  await fetch(`${API_BASE}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: activeSessionId,
      participantId,
      claims
    })
  });
}

async function checkForConflicts() {
  const url = `${API_BASE}/conflicts?sessionId=${encodeURIComponent(activeSessionId)}&participantId=${encodeURIComponent(participantId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return;
  }

  const data = await res.json();
  takenByOthers = new Set(data.takenByOthers || []);

  let knockedOut = 0;
  currentPriorities = currentPriorities.map((task) => {
    if (task && takenByOthers.has(task.id)) {
      knockedOut += 1;
      return null;
    }
    return task;
  });

  conflictsEl.hidden = takenByOthers.size === 0;
  if (knockedOut > 0) {
    scenarioText.textContent = `Chaos! ${knockedOut} val gick forlorade till deltagare med hogre rattighet.`;
  }

  renderSlots();
  renderTasks();
  renderBudget();
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
  if (!activeSessionId) {
    return;
  }

  const filled = currentPriorities.filter(Boolean);
  if (filled.length < TOP_SLOTS) {
    alert(`Du maste prioritera topp ${TOP_SLOTS} uppgifter innan du skickar.`);
    return;
  }

  const ranking = currentPriorities.map((task, idx) => ({
    rank: idx + 1,
    taskId: task.id,
    taskLabel: task.label,
    minutes: task.minutes,
    wellbeing: Boolean(task.wellbeing)
  }));

  const summary = computeSummary();

  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: activeSessionId,
      participantId,
      ranking,
      summary,
      responseTimeMs: deadlineMs ? Math.max(0, deadlineMs - Date.now()) : null
    })
  });

  if (!res.ok) {
    joinStatus.textContent = "Kunde inte skicka prioritering.";
    return;
  }

  submittedEl.hidden = false;
  taskList.hidden = true;
  budgetStrip.hidden = true;
  submitBtn.hidden = true;
  hideChaosCard();
  stopUnlockCheck();
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
