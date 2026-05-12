const API_BASE = "/api/presentation";
const POLL_MS = 700;
const WORKDAY_MINUTES = 480;
const TOP_SLOTS = 10;
const TASK_WAVE_SIZE = 6;
const TASK_WAVE_SECONDS = 10;

const sessionInput = document.getElementById("sessionId");
const joinBtn = document.getElementById("joinBtn");
const joinStatus = document.getElementById("joinStatus");
const scenarioCard = document.getElementById("scenarioCard");
const scenarioTitle = document.getElementById("scenarioTitle");
const scenarioText = document.getElementById("scenarioText");
const briefingDeck = document.getElementById("briefingDeck");
const briefingMeta = document.getElementById("briefingMeta");
const briefingHeadline = document.getElementById("briefingHeadline");
const briefingBody = document.getElementById("briefingBody");
const briefingPrev = document.getElementById("briefingPrev");
const briefingNext = document.getElementById("briefingNext");
const briefingReady = document.getElementById("briefingReady");
const timerEl = document.getElementById("timer");
const taskList = document.getElementById("taskList");
const priorityBoard = document.getElementById("priorityBoard");
const taskPool = document.getElementById("tasks");
const taskPoolPanel = document.getElementById("taskPoolPanel");
const channelInbox = document.getElementById("channelInbox");
const focusTarget = document.getElementById("focusTarget");
const focusBarFill = document.getElementById("focusBarFill");
const focusStats = document.getElementById("focusStats");
const wellbeingActions = document.getElementById("wellbeingActions");
const wellbeingStats = document.getElementById("wellbeingStats");
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
const endOverlayEl = document.getElementById("endOverlay");
const endOverlayClose = document.getElementById("endOverlayClose");
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
let audioContext = null;
let activeSessionId = "";
let pollHandle = null;
let timerHandle = null;
let unlockCheckHandle = null;
let focusHandle = null;
let deadlineMs = null;
let currentPhase = "idle";
let initializedPhase = "";
let hasAutoSubmitted = false;
let phaseStartedAt = 0;
let currentPriorities = Array(TOP_SLOTS).fill(null);
let availableTasks = [];
let taskWaveOrder = [];
let taskWaveIndex = 0;
let lastWaveTick = -1;
let currentWaveTaskIds = [];
let takenByOthers = new Set();
let lastTakenSignature = "";
let taskUnlockTimes = new Map();
let claimMetaByTask = new Map();
let qualityChoiceByTaskId = new Map();
let firedInterrupts = new Set();
let pendingChaosCard = null;
let chaosDecisions = [];
let chaosPenaltyMinutes = 0;
let chaosWellbeingDelta = 0;
let hasLoadedInlineResults = false;
let activeAlerts = [];
let alertSchedule = [];
let alertCounter = 0;
let focusWorkedSec = 0;
let focusProducedSec = 0;
let focusPenaltySec = 0;
let interruptionCount = 0;
let wellbeingBreakCount = 0;
let wellbeingBreakMinutes = 0;
let localBriefingSlide = 0;
let hasMarkedReady = false;
const wellbeingCooldownById = new Map();
const channelStats = {
  handled: 0,
  correct: 0,
  deferred: 0,
  missed: 0,
  falseFires: 0
};

const TASKS = createTaskCatalog();

const phaseCopy = {
  idle: "Waiting for activation",
  briefing: "Pre-game briefing",
  digitalStress: "Digital Stress - Prioritize top 10 for an 8-hour workday",
  workloadChaos: "Chaos - channel spam, interruptions, and reactive work",
  results: "Results mode"
};

const BRIEFING_SLIDES = [
  {
    title: "Welcome to the simulation",
    body: "You are operating a shared service day where incidents, requests, and planned work compete for attention."
  },
  {
    title: "Goal",
    body: "Build a top-10 priority list that creates value without burning through the full workday budget."
  },
  {
    title: "Digital Stress phase",
    body: "For 60 seconds, rank work items quickly. Critical work will keep arriving in waves and force trade-offs."
  },
  {
    title: "Workload Chaos phase",
    body: "Interruptions, channel noise, and resource conflicts will challenge your ranking. Adapt continuously."
  },
  {
    title: "What to optimize",
    body: "Balance delivery, wellbeing breaks, and focus quality. Fast but fragile choices can hurt total outcome."
  },
  {
    title: "How results are used",
    body: "After the session, your latest submission is compared to group averages for reflection and discussion."
  }
];

const CHAOS_INTERRUPTS = [
  {
    id: "family-call",
    atSec: 16,
    title: "Phone call from manager",
    text: "Your operations manager calls during your highest-priority task. How do you respond?",
    options: [
      { key: "answer", label: "Answer immediately", penaltyMinutes: 10, wellbeingDelta: 1 },
      { key: "ignore", label: "Ignore and continue", penaltyMinutes: 0, wellbeingDelta: -1 }
    ]
  },
  {
    id: "colleague-dropin",
    atSec: 35,
    title: "Unplanned colleague interruption",
    text: "A colleague appears and asks for help on a side problem.",
    options: [
      { key: "help", label: "Help the colleague", penaltyMinutes: 15, wellbeingDelta: 1 },
      { key: "decline", label: "Decline and continue", penaltyMinutes: 0, wellbeingDelta: -1 }
    ]
  }
];

const CHANNEL_ALERT_TEMPLATES = [
  { issueKey: "major-incident", title: "Customer outage reported", preferredChannel: "urgent", important: true, falseFire: false },
  { issueKey: "major-incident", title: "Customer outage reported", preferredChannel: "urgent", important: true, falseFire: false },
  { issueKey: "problem-case", title: "Problem ticket receives new diagnostics", preferredChannel: "teams", important: false, falseFire: false },
  { issueKey: "monitoring-noise", title: "Auto alert: high CPU in test environment", preferredChannel: "mail", important: false, falseFire: true },
  { issueKey: "vip-status", title: "VIP stakeholder asks for immediate status", preferredChannel: "mail", important: true, falseFire: false },
  { issueKey: "meeting-noise", title: "Meeting time changed twice", preferredChannel: "teams", important: false, falseFire: true },
  { issueKey: "security-flag", title: "Potential security deviation detected", preferredChannel: "urgent", important: true, falseFire: false },
  { issueKey: "security-flag", title: "Potential security deviation detected", preferredChannel: "urgent", important: true, falseFire: false },
  { issueKey: "maintenance-note", title: "Weekend maintenance plan needs update", preferredChannel: "teams", important: false, falseFire: false },
  { issueKey: "customer-risk", title: "Escalated customer dissatisfaction case", preferredChannel: "mail", important: true, falseFire: false }
];

const WELLBEING_OPTIONS = [
  { id: "micro-break", label: "2-minute breathing reset", minutes: 2, wellbeingDelta: 1, cooldownSec: 12 },
  { id: "water-break", label: "Water and short stretch", minutes: 4, wellbeingDelta: 1, cooldownSec: 16 },
  { id: "desk-break", label: "Coffee and walk", minutes: 8, wellbeingDelta: 2, cooldownSec: 24 }
];

buildPriorityBoard(TOP_SLOTS);
hideChaosOverlay();
renderChannelInbox();
renderFocusPanel();
renderWellbeingActions();

joinBtn.addEventListener("click", () => {
  const sessionId = sessionInput.value.trim().toUpperCase();
  if (!sessionId) {
    joinStatus.textContent = "Enter a session ID.";
    return;
  }
  ensureAudioContext();
  activeSessionId = sessionId;
  joinStatus.textContent = "Connected. Waiting for scenario...";
  scenarioCard.hidden = false;
  startPolling();
});

if (briefingPrev) {
  briefingPrev.addEventListener("click", () => {
    localBriefingSlide = Math.max(0, localBriefingSlide - 1);
    renderBriefingControlsState();
  });
}

if (briefingNext) {
  briefingNext.addEventListener("click", () => {
    const briefingTotal = BRIEFING_SLIDES.length || 6;
    localBriefingSlide = Math.min(briefingTotal - 1, localBriefingSlide + 1);
    renderBriefingControlsState();
  });
}

if (briefingReady) {
  briefingReady.addEventListener("click", markBriefingReady);
}

if (submitBtn) {
  submitBtn.hidden = true;
}

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

priorityBoard.addEventListener("click", (e) => {
  const chip = e.target.closest(".quality-chip");
  if (!chip) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  toggleTaskQuality(chip.dataset.taskId);
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

channelInbox.addEventListener("click", (e) => {
  const handleBtn = e.target.closest("[data-action='handle']");
  if (handleBtn) {
    handleAlert(handleBtn.dataset.alertId);
    return;
  }
  const deferBtn = e.target.closest("[data-action='defer']");
  if (deferBtn) {
    deferAlert(deferBtn.dataset.alertId);
  }
});

wellbeingActions.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-break-id]");
  if (!btn) {
    return;
  }
  takeWellbeingBreak(btn.dataset.breakId);
});

chaosOptionA.addEventListener("click", () => decideChaosOption(0));
chaosOptionB.addEventListener("click", () => decideChaosOption(1));
endOverlayClose.addEventListener("click", hideEndOverlay);

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
    "Major incident triage", "Escalation bridge update", "Inbox backlog cleanup", "Operations standup prep", "Weekly capacity planning",
    "Change review for production", "Runbook documentation update", "Cross-team sync", "Lifecycle backlog refinement", "Service desk ticket burst",
    "Critical customer follow-up", "Problem ticket triage", "Environment health report", "Monitoring dashboard anomaly", "Security deviation review",
    "New teammate onboarding support", "Operational data export", "Quality gate check", "Maintenance readiness test", "Regression verification",
    "Release go-live plan", "Risk assessment refresh", "Vendor coordination request", "Incident postmortem draft", "API failure diagnostics",
    "Integration verification", "Priority committee input", "Leadership status pack", "Retrospective action follow-up", "Planning freeze decision",
    "Urgent customer escalation", "Patch validation", "Stakeholder status summary", "Budget impact estimate", "Night shift failure review",
    "SLA follow-up", "Root cause analysis", "Ops alert swarm", "Access request review", "Capacity forecast update",
    "Performance validation", "Workshop prep", "Mentoring support", "Knowledge transfer", "Weekend maintenance checklist"
  ];

  return labels.map((label, idx) => {
    const id = `task_${String(idx + 1).padStart(2, "0")}`;
    const wellbeing = false;
    const minutes = 30 + (idx % 6) * 12;
    const lockedMs = 0;
    const clarity = idx % 3 === 0 ? "unclear" : "clear";
    const doneTarget = clarity === "unclear" ? (idx % 2 === 0 ? "goodEnough" : "perfect") : "goodEnough";
    return {
      id,
      label,
      minutes,
      lockedMs,
      wellbeing,
      clarity,
      doneTarget,
      perfectExtra: wellbeing ? 0 : 15
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
    joinStatus.textContent = "Session not found.";
    return;
  }

  const state = await res.json();
  currentPhase = state.phase || "idle";
  deadlineMs = state.deadlineMs || null;
  const briefingSlide = Number(state.briefingSlide || 0);
  const briefingTotal = Number(state.briefingTotal || BRIEFING_SLIDES.length || 1);

  if (currentPhase === "briefing") {
    renderBriefingSlide(briefingSlide, briefingTotal);
  } else {
    hideBriefingSlide();
    scenarioTitle.textContent = phaseCopy[currentPhase] || "Scenario";
    scenarioText.textContent = state.message || "Follow the on-screen instructions.";
  }

  const interactive = currentPhase === "digitalStress" || currentPhase === "workloadChaos";
  const submitted = Boolean(state.submitted);

  taskList.hidden = !interactive;
  budgetStrip.hidden = !interactive;
  submitBtn.hidden = true;
  if (conflictsEl) {
    conflictsEl.hidden = true;
  }
  submittedEl.hidden = !submitted;

  if (interactive && initializedPhase !== currentPhase) {
    const carryFromDigitalToChaos = initializedPhase === "digitalStress" && currentPhase === "workloadChaos";
    initializePhase({ carryForward: carryFromDigitalToChaos });
  }

  if (currentPhase === "workloadChaos" && !submitted && deadlineMs && Date.now() >= deadlineMs && !hasAutoSubmitted) {
    await finalizeByTimer();
  }

  if (!interactive) {
    stopUnlockCheck();
    stopFocusTicker();
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

  updateTimer();
  renderBudget();

  if (interactive && !submitted && currentPhase === "workloadChaos") {
    runChaosInterrupts();
    await syncClaims();
    await checkForConflicts();
  }

  if (interactive) {
    rotateTaskWaveIfNeeded();
  }
}

function initializePhase({ carryForward = false } = {}) {
  initializedPhase = currentPhase;
  phaseStartedAt = Date.now();
  hasAutoSubmitted = false;

  if (!carryForward) {
    currentPriorities = Array(TOP_SLOTS).fill(null);
    availableTasks = TASKS.slice();
    taskWaveOrder = shuffle(availableTasks.map((task) => task.id));
    taskWaveIndex = 0;
    lastWaveTick = -1;
    currentWaveTaskIds = [];
    takenByOthers = new Set();
    lastTakenSignature = "";
    taskUnlockTimes.clear();
    claimMetaByTask.clear();
    qualityChoiceByTaskId.clear();
    focusWorkedSec = 0;
    focusProducedSec = 0;
    focusPenaltySec = 0;
    interruptionCount = 0;
    channelStats.handled = 0;
    channelStats.correct = 0;
    channelStats.deferred = 0;
    channelStats.missed = 0;
    channelStats.falseFires = 0;
    wellbeingBreakCount = 0;
    wellbeingBreakMinutes = 0;
    wellbeingCooldownById.clear();
    eventFeed.innerHTML = "";
  } else {
    takenByOthers = new Set();
    lastTakenSignature = "";
  }

  firedInterrupts = new Set();
  pendingChaosCard = null;
  chaosDecisions = [];
  chaosPenaltyMinutes = 0;
  chaosWellbeingDelta = 0;
  hasLoadedInlineResults = false;
  activeAlerts = [];
  alertCounter = 0;
  alertSchedule = buildAlertSchedule();

  if (!carryForward) {
    availableTasks.forEach((task) => {
      taskUnlockTimes.set(task.id, phaseStartedAt + (task.lockedMs || 0));
    });
  }

  logEvent(`Phase started: ${phaseCopy[currentPhase]}.`, "phase");
  if (currentPhase === "workloadChaos") {
    logEvent("WORKLOAD CHAOS - your priorities can collapse when resources are claimed by others.", "chaos");
    if (carryForward) {
      logEvent("Auto transition to Chaos: earlier priorities are carried over.", "warn");
    }
    logEvent("Chaos rules: rank plus speed decides who keeps a task.", "phase");
    startFocusTicker();
  } else {
    stopFocusTicker();
  }

  renderChannelInbox();
  renderFocusPanel();
  renderWellbeingActions();
  rotateTaskWaveIfNeeded(true);
  renderSlots();
  renderTasks();
  renderBudget();
  hideChaosOverlay();
  startUnlockCheck();
}

function renderBriefingSlide(slideIndex, totalSlides) {
  if (!briefingDeck) {
    return;
  }

  const total = Math.max(1, Number(totalSlides || BRIEFING_SLIDES.length || 1));
  localBriefingSlide = Number(slideIndex || 0);
  hasMarkedReady = false;
  
  renderBriefingControlsState();
}

function renderBriefingControlsState() {
  if (!briefingDeck) {
    return;
  }

  const total = BRIEFING_SLIDES.length || 6;
  const safeIndex = Math.max(0, Math.min(total - 1, Number(localBriefingSlide || 0)));
  const slide = BRIEFING_SLIDES[safeIndex] || BRIEFING_SLIDES[BRIEFING_SLIDES.length - 1] || {
    title: "Briefing",
    body: "Please wait for the facilitator."
  };

  briefingDeck.hidden = false;
  taskList.hidden = true;
  budgetStrip.hidden = true;
  submitBtn.hidden = true;
  submittedEl.hidden = true;
  inlineResults.hidden = true;

  scenarioTitle.textContent = phaseCopy.briefing;
  scenarioText.textContent = "Follow the briefing on this screen. Navigate through slides and click Ready when you're done.";
  briefingMeta.textContent = `Slide ${safeIndex + 1}/${total}`;
  briefingHeadline.textContent = slide.title;
  briefingBody.textContent = slide.body;
  
  // Show Ready button only on the last slide
  if (briefingReady) {
    briefingReady.hidden = safeIndex !== total - 1 || hasMarkedReady;
  }
  
  // Disable Previous on first slide
  if (briefingPrev) {
    briefingPrev.disabled = safeIndex === 0;
  }
  
  // Disable Next on last slide
  if (briefingNext) {
    briefingNext.disabled = safeIndex === total - 1;
  }
}

async function markBriefingReady() {
  if (!activeSessionId || !participantId) {
    joinStatus.textContent = "Session not initialized.";
    return;
  }

  const res = await fetch(`${API_BASE}/briefingready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: activeSessionId,
      participantId
    })
  });

  if (!res.ok) {
    joinStatus.textContent = "Failed to mark ready.";
    return;
  }

  const data = await res.json();
  hasMarkedReady = true;
  if (briefingReady) {
    briefingReady.hidden = true;
  }
  joinStatus.textContent = `Ready! (${data.readyCount} participants ready)`;
}

function hideBriefingSlide() {
  if (briefingDeck) {
    briefingDeck.hidden = true;
  }
}

function renderWellbeingActions() {
  const now = Date.now();
  wellbeingActions.innerHTML = "";

  WELLBEING_OPTIONS.forEach((option) => {
    const until = Number(wellbeingCooldownById.get(option.id) || 0);
    const leftSec = Math.max(0, Math.ceil((until - now) / 1000));
    const disabled = leftSec > 0;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wellbeing-btn";
    btn.dataset.breakId = option.id;
    btn.disabled = disabled;
    btn.textContent = disabled
      ? `${option.label} (${option.minutes} min) - ready in ${leftSec}s`
      : `${option.label} (${option.minutes} min)`;
    wellbeingActions.appendChild(btn);
  });

  wellbeingStats.textContent = `Breaks taken: ${wellbeingBreakCount} | Time: ${wellbeingBreakMinutes} min`;
}

function takeWellbeingBreak(breakId) {
  const option = WELLBEING_OPTIONS.find((item) => item.id === breakId);
  if (!option) {
    return;
  }

  const now = Date.now();
  const until = Number(wellbeingCooldownById.get(option.id) || 0);
  if (until > now) {
    return;
  }

  wellbeingBreakCount += 1;
  wellbeingBreakMinutes += option.minutes;
  chaosPenaltyMinutes += option.minutes;
  chaosWellbeingDelta += option.wellbeingDelta;
  wellbeingCooldownById.set(option.id, now + option.cooldownSec * 1000);

  if (currentPhase === "workloadChaos") {
    applyFocusInterruption(`Took break: ${option.label}`, 3);
    focusPenaltySec = Math.max(0, focusPenaltySec - 2);
  }

  logEvent(`Wellbeing break: ${option.label}.`, "choice");
  renderWellbeingActions();
  renderBudget();
}

function buildAlertSchedule() {
  const schedule = [];
  let sec = 6;
  CHANNEL_ALERT_TEMPLATES.forEach((template, idx) => {
    const channels = ["mail", "teams", "popup", "urgent"];
    const channel = channels[(idx + 1) % channels.length];
    schedule.push({
      id: `a-${idx + 1}`,
      atSec: sec,
      issueKey: template.issueKey,
      title: template.title,
      important: template.important,
      falseFire: template.falseFire,
      preferredChannel: template.preferredChannel,
      channel,
      injected: false,
      firstSeenAtSec: null
    });
    sec += idx % 2 === 0 ? 5 : 7;
  });
  return schedule;
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

function renderChannelInbox() {
  if (!channelInbox) {
    return;
  }

  if (!activeAlerts.length) {
    channelInbox.innerHTML = "<p class='muted'>No new channel events.</p>";
    return;
  }

  channelInbox.innerHTML = "";
  activeAlerts.forEach((alert) => {
    const card = document.createElement("article");
    card.className = "alert-card";
    card.innerHTML = `
      <div class="alert-row">
        <span class="channel-badge ${alert.channel}">${alert.channel}</span>
        <span>${alert.important ? "High priority" : "Low priority"}</span>
      </div>
      <strong>${alert.title}</strong>
      <div class="alert-actions">
        <button data-action="handle" data-alert-id="${alert.id}" type="button">Handle</button>
        <button data-action="defer" data-alert-id="${alert.id}" type="button" class="secondary">Defer</button>
      </div>
    `;
    channelInbox.appendChild(card);
  });
}

function runChaosInterrupts() {
  const elapsedSec = Math.floor((Date.now() - phaseStartedAt) / 1000);
  renderWellbeingActions();

  CHAOS_INTERRUPTS.forEach((interrupt) => {
    if (elapsedSec >= interrupt.atSec && !firedInterrupts.has(interrupt.id)) {
      firedInterrupts.add(interrupt.id);
      showChaosOverlay(interrupt);
      applyFocusInterruption(`Interruption: ${interrupt.title}`, 10);
      logEvent(`Interruption: ${interrupt.title}.`, "warn");
    }
  });

  alertSchedule.forEach((item) => {
    if (item.injected || elapsedSec < item.atSec) {
      return;
    }
    item.injected = true;
    const alert = {
      ...item,
      id: `alert-${++alertCounter}`,
      firstSeenAtSec: elapsedSec
    };
    activeAlerts.unshift(alert);
    if (activeAlerts.length > 7) {
      const dropped = activeAlerts.pop();
      if (dropped) {
        channelStats.missed += 1;
      }
    }
    renderChannelInbox();
    logEvent(`Channel event via ${item.channel}: ${item.title}.`, "warn");
  });

  const stillActive = [];
  activeAlerts.forEach((alert) => {
    const aliveFor = elapsedSec - Number(alert.firstSeenAtSec || elapsedSec);
    if (aliveFor > 18) {
      channelStats.missed += 1;
      if (alert.important) {
        chaosPenaltyMinutes += 6;
      }
      logEvent(`Missed channel event: ${alert.title}.`, "conflict");
      return;
    }
    stillActive.push(alert);
  });
  activeAlerts = stillActive;
  renderChannelInbox();
}

function handleAlert(alertId) {
  const idx = activeAlerts.findIndex((a) => a.id === alertId);
  if (idx === -1) {
    return;
  }

  const alert = activeAlerts[idx];
  activeAlerts.splice(idx, 1);
  channelStats.handled += 1;
  applyFocusInterruption(`Switched to channel ${alert.channel}`, 8);

  if (alert.falseFire) {
    channelStats.falseFires += 1;
    chaosPenaltyMinutes += 8;
    chaosWellbeingDelta -= 1;
    logEvent(`False alarm handled: ${alert.title}.`, "conflict");
  } else if (alert.channel === alert.preferredChannel) {
    channelStats.correct += 1;
    logEvent(`Correct channel choice: ${alert.title}.`, "choice");
  } else {
    chaosPenaltyMinutes += alert.important ? 7 : 4;
    logEvent(`Wrong channel for ${alert.title}.`, "conflict");
  }

  renderChannelInbox();
  renderBudget();
}

function deferAlert(alertId) {
  const idx = activeAlerts.findIndex((a) => a.id === alertId);
  if (idx === -1) {
    return;
  }

  const alert = activeAlerts[idx];
  activeAlerts.splice(idx, 1);
  channelStats.deferred += 1;
  if (alert.important) {
    chaosPenaltyMinutes += 3;
  }
  logEvent(`Deferred channel event: ${alert.title}.`, "info");
  renderChannelInbox();
  renderBudget();
}

function showChaosOverlay(card) {
  pendingChaosCard = card;
  chaosTitleEl.textContent = card.title;
  chaosTextEl.textContent = card.text;
  chaosOptionA.textContent = card.options[0].label;
  chaosOptionB.textContent = card.options[1].label;
  playChaosCue(card.id);
  chaosOverlayEl.hidden = false;
}

function hideChaosOverlay() {
  pendingChaosCard = null;
  chaosOverlayEl.hidden = true;
}

function showEndOverlay() {
  endOverlayEl.hidden = false;
}

function hideEndOverlay() {
  endOverlayEl.hidden = true;
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

  scenarioText.textContent = `Choice recorded: ${option.label} (${option.penaltyMinutes || 0} min).`;
  logEvent(`Choice: ${option.label}. +${option.penaltyMinutes || 0} min.`, "choice");
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

function startFocusTicker() {
  stopFocusTicker();
  focusHandle = setInterval(() => {
    if (currentPhase !== "workloadChaos") {
      return;
    }

    const focusTask = currentPriorities[0];
    if (!focusTask) {
      renderFocusPanel();
      return;
    }

    focusWorkedSec += 1;
    if (focusPenaltySec > 0) {
      focusPenaltySec -= 1;
    } else {
      focusProducedSec += 1;
    }
    renderFocusPanel();
  }, 1000);
}

function stopFocusTicker() {
  if (focusHandle) {
    clearInterval(focusHandle);
    focusHandle = null;
  }
}

function applyFocusInterruption(reason, penaltySeconds) {
  if (currentPhase !== "workloadChaos") {
    return;
  }
  interruptionCount += 1;
  focusPenaltySec = Math.max(focusPenaltySec, penaltySeconds);
  focusProducedSec = Math.max(0, focusProducedSec - 2);
  logEvent(`Focus drop: ${reason}.`, "conflict");
  renderFocusPanel();
}

function renderFocusPanel() {
  const focusTask = currentPriorities[0];
  focusTarget.textContent = focusTask
    ? `Active focus task: ${focusTask.label}`
    : "No active focus task.";

  const efficiency = focusWorkedSec > 0 ? Math.round((focusProducedSec / focusWorkedSec) * 100) : 0;
  focusBarFill.style.width = `${Math.max(0, Math.min(100, efficiency))}%`;
  focusStats.textContent = `Worked time: ${focusWorkedSec}s | Produced value: ${focusProducedSec}s`;
}

function isTaskLocked(task, now) {
  return false;
}

function lockSecondsLeft(task, now) {
  return 0;
}

function renderTasks() {
  rotateTaskWaveIfNeeded();
  taskPool.innerHTML = "";
  const now = Date.now();
  const waveSet = new Set(currentWaveTaskIds);

  availableTasks.forEach((task) => {
    if (waveSet.size && !waveSet.has(task.id)) {
      return;
    }

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

    const clarityTag = task.clarity === "unclear" ? " | Unclear" : "";
    const minutes = computeTaskMinutes(task);
    taskDiv.textContent = isLocked ? `${task.label} (${lockSecsLeft}s)` : `${task.label} (${minutes}m${clarityTag})`;
    taskDiv.title = isLocked
      ? `Available in ${lockSecsLeft} seconds`
      : isTaken
        ? "This task is already claimed by faster participants at the same/higher rank"
        : task.clarity === "unclear"
          ? "Unclear outcome: choose Good enough or Perfect in the priority slot"
          : "Drag to a rank slot";

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

  if (!qualityChoiceByTaskId.has(task.id)) {
    qualityChoiceByTaskId.set(task.id, "goodEnough");
  }

  if (displaced && !qualityChoiceByTaskId.has(displaced.id)) {
    qualityChoiceByTaskId.set(displaced.id, "goodEnough");
  }

  if (currentPhase === "workloadChaos") {
    applyFocusInterruption("Reprioritization", 6);
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

  if (currentPhase === "workloadChaos") {
    applyFocusInterruption("Removed task from ranking", 5);
  }

  renderSlots();
  renderTasks();
  renderBudget();

  if (currentPhase === "workloadChaos") {
    syncClaims();
  }
}

function toggleTaskQuality(taskId) {
  const task = availableTasks.find((item) => item.id === taskId);
  if (!task || task.clarity !== "unclear") {
    return;
  }

  const current = qualityChoiceByTaskId.get(taskId) || "goodEnough";
  const next = current === "goodEnough" ? "perfect" : "goodEnough";
  qualityChoiceByTaskId.set(taskId, next);

  if (currentPhase === "workloadChaos") {
    applyFocusInterruption("Changed quality level", 4);
  }

  renderSlots();
  renderTasks();
  renderBudget();
}

function renderSlots() {
  priorityBoard.querySelectorAll(".task-slot").forEach((slot, idx) => {
    slot.innerHTML = "";
    slot.classList.remove("filled", "conflict");
    const task = currentPriorities[idx];
    if (!task) {
      return;
    }

    const pill = document.createElement("div");
    pill.className = "slot-task";
    pill.draggable = true;
    pill.dataset.taskId = task.id;

    const label = document.createElement("span");
    label.className = "slot-label";
    const healthTag = task.wellbeing ? " +wellbeing" : "";
    label.textContent = `${task.label} (${computeTaskMinutes(task)}m${healthTag})`;
    pill.appendChild(label);

    if (task.clarity === "unclear") {
      const quality = qualityChoiceByTaskId.get(task.id) || "goodEnough";
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `quality-chip${quality === "perfect" ? " perfect" : ""}`;
      chip.dataset.taskId = task.id;
      chip.textContent = quality === "perfect" ? "Perfect" : "Good enough";
      pill.appendChild(chip);
    }

    slot.appendChild(pill);
    slot.classList.add("filled");
    if (takenByOthers.has(task.id)) {
      slot.classList.add("conflict");
    }
  });
}

function computeTaskMinutes(task) {
  const quality = qualityChoiceByTaskId.get(task.id) || "goodEnough";
  if (quality === "perfect") {
    return Number(task.minutes || 0) + Number(task.perfectExtra || 0);
  }
  return Number(task.minutes || 0);
}

function computeSummary() {
  const selected = currentPriorities.filter(Boolean);
  const plannedMinutes = selected.reduce((sum, task) => sum + computeTaskMinutes(task), 0);
  const wellbeingTaskCount = wellbeingBreakCount;
  const wellbeingScore = wellbeingTaskCount * 2 + chaosWellbeingDelta;
  const totalMinutes = plannedMinutes + chaosPenaltyMinutes;
  const remainingMinutes = WORKDAY_MINUTES - totalMinutes;

  const unclearSelected = selected.filter((task) => task.clarity === "unclear");
  const clarityMatchCount = unclearSelected.filter((task) => {
    const choice = qualityChoiceByTaskId.get(task.id) || "goodEnough";
    return choice === task.doneTarget;
  }).length;

  const channelAccuracy = channelStats.handled > 0
    ? round1((channelStats.correct / channelStats.handled) * 100)
    : 0;

  return {
    plannedMinutes,
    chaosPenaltyMinutes,
    totalMinutes,
    remainingMinutes,
    wellbeingTaskCount,
    wellbeingScore,
    overloadMinutes: Math.max(0, -remainingMinutes),
    chaosDecisions,
    channelHandled: channelStats.handled,
    channelCorrect: channelStats.correct,
    channelDeferred: channelStats.deferred,
    channelMissed: channelStats.missed,
    channelFalseFires: channelStats.falseFires,
    channelAccuracy,
    focusWorkedSec,
    focusProducedSec,
    interruptionCount,
    unclearTaskCount: unclearSelected.length,
    clarityMatchCount
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

  renderFocusPanel();
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
  const signature = Array.from(takenByOthers).sort().join("|");

  let knockedOut = 0;
  const removedLabels = [];
  currentPriorities = currentPriorities.map((task) => {
    if (task && takenByOthers.has(task.id)) {
      knockedOut += 1;
      removedLabels.push(task.label);
      claimMetaByTask.delete(task.id);
      return null;
    }
    return task;
  });

  reconcileClaimMeta();
  if (conflictsEl) {
    conflictsEl.hidden = true;
  }

  if (knockedOut > 0) {
    applyFocusInterruption("Lost prioritized resource", 9);
    const preview = removedLabels.slice(0, 3).join(", ");
    scenarioText.textContent = `Chaos! ${knockedOut} choices were lost to faster participants.`;
    logEvent(`Lost ${knockedOut} tasks: ${preview}${removedLabels.length > 3 ? "..." : ""}`, "conflict");
  } else if (signature !== lastTakenSignature && signature) {
    logEvent("Resource conflicts updated.", "info");
  }
  lastTakenSignature = signature;

  renderSlots();
  renderTasks();
  renderBudget();
}

function rotateTaskWaveIfNeeded(force = false) {
  if (!availableTasks.length || !phaseStartedAt) {
    return;
  }

  const tick = Math.floor((Date.now() - phaseStartedAt) / (TASK_WAVE_SECONDS * 1000));
  if (!force && tick === lastWaveTick) {
    return;
  }

  lastWaveTick = tick;

  if (!taskWaveOrder.length) {
    taskWaveOrder = shuffle(availableTasks.map((task) => task.id));
    taskWaveIndex = 0;
  }

  const picked = [];
  let attempts = 0;
  const maxAttempts = Math.max(taskWaveOrder.length * 2, TASK_WAVE_SIZE);

  while (picked.length < TASK_WAVE_SIZE && attempts < maxAttempts) {
    const idx = (taskWaveIndex + attempts) % taskWaveOrder.length;
    const taskId = taskWaveOrder[idx];
    const isRanked = currentPriorities.some((task) => task && task.id === taskId);
    const isTaken = takenByOthers.has(taskId);
    if (!isRanked && !isTaken && !picked.includes(taskId)) {
      picked.push(taskId);
    }
    attempts += 1;
  }

  currentWaveTaskIds = picked;
  taskWaveIndex = (taskWaveIndex + TASK_WAVE_SIZE) % Math.max(taskWaveOrder.length, 1);

  if (!force) {
    logEvent(`New task inflow: ${currentWaveTaskIds.length} available for ${TASK_WAVE_SECONDS}s.`, "info");
  }
}

function shuffle(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
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
      if (!hasAutoSubmitted && currentPhase === "workloadChaos") {
        finalizeByTimer();
      }
    }
  };

  tick();
  timerHandle = setInterval(tick, 250);
}

async function finalizeByTimer() {
  if (hasAutoSubmitted) {
    return;
  }
  hasAutoSubmitted = true;
  await submitPriorities({ allowPartial: true, fromTimer: true });
}

async function submitPriorities({ allowPartial = false, fromTimer = false } = {}) {
  if (!activeSessionId) {
    return;
  }

  const filled = currentPriorities.filter(Boolean);
  if (!allowPartial && filled.length < TOP_SLOTS) {
    alert(`You must prioritize top ${TOP_SLOTS} tasks before submitting.`);
    return;
  }

  const ranking = currentPriorities
    .map((task, idx) => (task ? {
      rank: idx + 1,
      taskId: task.id,
      taskLabel: task.label,
      minutes: computeTaskMinutes(task),
      wellbeing: Boolean(task.wellbeing),
      clarity: task.clarity,
      quality: qualityChoiceByTaskId.get(task.id) || "goodEnough"
    } : null))
    .filter(Boolean);

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
    joinStatus.textContent = "Could not submit priorities.";
    hasAutoSubmitted = false;
    return;
  }

  submittedEl.hidden = false;
  taskList.hidden = true;
  budgetStrip.hidden = true;
  submitBtn.hidden = true;
  hideChaosOverlay();
  stopUnlockCheck();
  stopFocusTicker();
  if (fromTimer) {
    logEvent("Time is up - priorities were auto-saved.", "phase");
    scenarioText.textContent = "Time is up. Your priorities were auto-saved.";
    showEndOverlay();
  } else {
    logEvent("Priorities submitted.", "phase");
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
    inlineResultsSummary.textContent = `Your latest submission is compared with ${groupData.participants || 0} participants.`;
  } else {
    myDelivery.textContent = "-";
    myWellbeing.textContent = "-";
    myOverload.textContent = "-";
    inlineResultsSummary.textContent = "You do not have a submission for this session yet.";
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

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playChaosCue(cardId) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  if (cardId === "family-call") {
    playPhoneRing(context);
    return;
  }

  if (cardId === "colleague-dropin") {
    playDoorKnock(context);
  }
}

function playPhoneRing(context) {
  const start = context.currentTime + 0.02;
  const burstOffsets = [0, 0.32, 0.9, 1.22];

  burstOffsets.forEach((offset) => {
    playTone(context, start + offset, 0.16, 880, "triangle", 0.035);
    playTone(context, start + offset + 0.17, 0.16, 660, "triangle", 0.03);
  });
}

function playDoorKnock(context) {
  const start = context.currentTime + 0.02;
  [0, 0.18, 0.62].forEach((offset, index) => {
    playKnockHit(context, start + offset, 0.12, 150 - index * 20, 0.05);
  });
}

function playTone(context, startTime, duration, frequency, type, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playKnockHit(context, startTime, duration, baseFrequency, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(baseFrequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 0.6, startTime + duration);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

const params = new URLSearchParams(window.location.search);
const incomingSession = (params.get("session") || "").trim().toUpperCase();
if (incomingSession) {
  sessionInput.value = incomingSession;
  joinBtn.click();
}
