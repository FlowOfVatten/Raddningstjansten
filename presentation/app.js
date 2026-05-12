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
const taskPoolPanel = document.getElementById("taskPoolPanel");
const conflictsEl = document.getElementById("conflicts");
const submitBtn = document.getElementById("submitPriorities");
const submittedEl = document.getElementById("submitted");
const budgetStrip = document.getElementById("budgetStrip");
const budgetUsedEl = document.getElementById("budgetUsed");
const budgetRemainingEl = document.getElementById("budgetRemaining");
const wellbeingValueEl = document.getElementById("wellbeingValue");
const chaosOverlayEl = document.getElementById("chaosOverlay");
const chaosTitleEl = document.getElementById("chaosTitle");
const chaosTextEl = document.getElementById("chaosText");
const chaosOptionA = document.getElementById("chaosOptionA");
const chaosOptionB = document.getElementById("chaosOptionB");
const eventFeed = document.getElementById("eventFeed");
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
let claimMetaByTask = new Map();
let firedInterrupts = new Set();
let pendingChaosCard = null;
let chaosDecisions = [];
let chaosPenaltyMinutes = 0;
let chaosWellbeingDelta = 0;
let hasLoadedInlineResults = false;

const TASKS = createTaskCatalog();

const phaseCopy = {
  idle: "Vantar pa aktivering",
  digitalStress: "Digital Stress - Prioritera topp 10 inom en 8h arbetsdag",
  workloadChaos: "Chaos - resurskamp i realtid",
  results: "Resultatlage"
};

const CHAOS_INTERRUPTS = [
  {
    id: "family-call",
    atSec: 16,
    title: "Telefonen ringer",
    text: "En familjemedlem ringer mitt i din hogsta prioritet. Hur agerar du?",
    options: [
      { key: "answer", label: "Svara direkt", penaltyMinutes: 10, wellbeingDelta: 1 },
      { key: "ignore", label: "Ignorera samtalet", penaltyMinutes: 0, wellbeingDelta: -1 }
    ]
  },
  {
    id: "colleague-dropin",
    atSec: 35,
    title: "Kollega glider in",
    text: "En kollega dyker upp och vill prata igenom ett sidoproblem.",
    options: [
      { key: "help", label: "Hjalp kollegan", penaltyMinutes: 15, wellbeingDelta: 1 },
      { key: "decline", label: "Avvisa och fortsatt", penaltyMinutes: 0, wellbeingDelta: -1 }
    ]
  }
];

buildPriorityBoard(TOP_SLOTS);
hideChaosOverlay();

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

priorityBoard.addEventListener("dragstart", (e) => {
  const slotTask = e.target.closest(".slot-task");
  if (!slotTask) {
    return;
  }
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", slotTask.dataset.taskId);
  slotTask.classList.add("dragging");
});

priorityBoard.addEventListener("dragend", (e) => {
  const slotTask = e.target.closest(".slot-task");
  if (slotTask) {
    slotTask.classList.remove("dragging");
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

taskPoolPanel.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
});

taskPoolPanel.addEventListener("drop", (e) => {
  e.preventDefault();
  const taskId = e.dataTransfer.getData("text/plain");
  if (taskId) {
    removeTaskFromPriorities(taskId);
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

function createTaskCatalog() {
  const labels = [
    "Kritisk incident", "Chefssamtal", "Email backlog", "Moteforberedelse", "Sprintplanering",
    "Kodgranskning", "Dokumentation", "Team sync", "Utvecklingsuppgift", "Supportticket",
    "Kunduppfoljning", "Bug triage", "Miljorapport", "Dashboard-fel", "Security review",
    "Onboarding-fraga", "Dataexport", "Kvalitetskontroll", "Feature test", "Regressionstest",
    "Release-plan", "Riskanalys", "Anbudsfraga", "Incidentrapport", "API-felanalys",
    "Integrationstest", "Prioriteringsmote", "Ledningsunderlag", "Sprintretro", "Planeringsstopp",
    "Akut kundarende", "Patchvalidering", "Statusrapport", "Budgetunderlag", "Nattjobb-fel",
    "SLA-uppfoljning", "Rotorsaksanalys", "DevOps-larm", "Behorighetsfraga", "Kapacitetsplan",
    "Prestandatest", "Workshopforberedelse", "Kaffe och benstrackare", "2-min andningspaus",
    "Kort lunch utan skarm", "Reflektionspromenad", "Vattenpaus", "Mentorstod", "Kunskapsdelning", "Veckoavslut"
  ];

  const wellbeingNames = new Set([
    "Kaffe och benstrackare", "2-min andningspaus", "Kort lunch utan skarm", "Reflektionspromenad", "Vattenpaus"
  ]);

  return labels.map((label, idx) => {
    const id = `task_${String(idx + 1).padStart(2, "0")}`;
    const minutes = wellbeingNames.has(label) ? 8 + (idx % 3) * 4 : 30 + (idx % 6) * 12;
    const lockedMs = wellbeingNames.has(label) ? 0 : (idx % 4 === 0 ? 12000 : idx % 7 === 0 ? 7000 : 0);
    return {
      id,
      label,
      minutes,
      lockedMs,
      wellbeing: wellbeingNames.has(label)
    };
  });
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
    hideChaosOverlay();
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
  claimMetaByTask.clear();
  firedInterrupts = new Set();
  pendingChaosCard = null;
  chaosDecisions = [];
  chaosPenaltyMinutes = 0;
  chaosWellbeingDelta = 0;
  hasLoadedInlineResults = false;
  eventFeed.innerHTML = "";

  availableTasks.forEach((task) => {
    taskUnlockTimes.set(task.id, phaseStartedAt + (task.lockedMs || 0));
  });

  logEvent(`Fas startad: ${phaseCopy[currentPhase]}.`, "phase");
  if (currentPhase === "workloadChaos") {
    logEvent("Kaosregler: hogst rank vinner. Vid samma rank vinner snabbaste claim.", "phase");
  }

  renderSlots();
  renderTasks();
  renderBudget();
  hideChaosOverlay();
  startUnlockCheck();
}

function logEvent(message, kind = "info") {
  if (!eventFeed) {
    return;
  }

  const seconds = phaseStartedAt ? Math.max(0, Math.floor((Date.now() - phaseStartedAt) / 1000)) : 0;
  const item = document.createElement("li");
  item.className = `event-${kind}`;
  item.textContent = `+${seconds}s ${message}`;
  eventFeed.prepend(item);

  while (eventFeed.children.length > 24) {
    eventFeed.removeChild(eventFeed.lastChild);
  }
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
      showChaosOverlay(interrupt);
      logEvent(`Avbrott: ${interrupt.title}.`, "warn");
    }
  });
}

function showChaosOverlay(card) {
  pendingChaosCard = card;
  chaosTitleEl.textContent = card.title;
  chaosTextEl.textContent = card.text;
  chaosOptionA.textContent = card.options[0].label;
  chaosOptionB.textContent = card.options[1].label;
  chaosOverlayEl.hidden = false;
}

function hideChaosOverlay() {
  pendingChaosCard = null;
  chaosOverlayEl.hidden = true;
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
  logEvent(`Val: ${option.label}. +${option.penaltyMinutes || 0} min.`, "choice");
  hideChaosOverlay();
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
        ? "Denna uppgift ar redan tagen av snabbare deltagare pa samma/hogre rank"
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

  reconcileClaimMeta();
  renderSlots();
  renderTasks();
  renderBudget();

  if (currentPhase === "workloadChaos") {
    syncClaims();
  }
}

function removeTaskFromPriorities(taskId) {
  const existingIndex = currentPriorities.findIndex((p) => p && p.id === taskId);
  if (existingIndex === -1) {
    return;
  }

  currentPriorities[existingIndex] = null;
  claimMetaByTask.delete(taskId);

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
    const pill = document.createElement("div");
    pill.className = "slot-task";
    pill.draggable = true;
    pill.dataset.taskId = task.id;
    pill.textContent = `${task.label} (${task.minutes}m${healthTag})`;
    slot.appendChild(pill);
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

function reconcileClaimMeta(now = Date.now()) {
  const activeTaskIds = new Set();
  currentPriorities.forEach((task, idx) => {
    if (!task) {
      return;
    }

    const rank = idx + 1;
    activeTaskIds.add(task.id);
    const current = claimMetaByTask.get(task.id);
    if (!current || current.rank !== rank) {
      claimMetaByTask.set(task.id, { rank, claimedAt: now });
    }
  });

  Array.from(claimMetaByTask.keys()).forEach((taskId) => {
    if (!activeTaskIds.has(taskId)) {
      claimMetaByTask.delete(taskId);
    }
  });
}

async function syncClaims() {
  reconcileClaimMeta();
  const claims = currentPriorities
    .map((task, idx) => {
      if (!task) {
        return null;
      }
      const meta = claimMetaByTask.get(task.id);
      return {
        rank: idx + 1,
        taskId: task.id,
        claimedAt: Number((meta && meta.claimedAt) || Date.now())
      };
    })
    .filter(Boolean)
    .slice(0, TOP_SLOTS);

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
  const removedLabels = [];
  currentPriorities = currentPriorities.map((task) => {
    if (task && takenByOthers.has(task.id)) {
      knockedOut += 1;
      removedLabels.push(task.label);
      return null;
    }
    return task;
  });

  reconcileClaimMeta();
  conflictsEl.hidden = takenByOthers.size === 0;
  if (knockedOut > 0) {
    const preview = removedLabels.slice(0, 3).join(", ");
    scenarioText.textContent = `Kaos! ${knockedOut} val forlorades till snabbare deltagare.`;
    logEvent(`Forlorade ${knockedOut} uppgifter: ${preview}${removedLabels.length > 3 ? "..." : ""}`, "conflict");
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
    if (left <= 0 && timerHandle) {
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
  hideChaosOverlay();
  stopUnlockCheck();
  logEvent("Prioritering skickad.", "phase");
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
