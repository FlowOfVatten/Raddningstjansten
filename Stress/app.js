const API_BASE = "/api/stress";
const POLL_MS = 2000;

const PHASES = [
  { name: "Introduction", startRatio: 0, endRatio: 0.2, taskEvery: 9000, inboxEvery: 13000, interruptEvery: 0 },
  { name: "Load", startRatio: 0.2, endRatio: 0.6, taskEvery: 6000, inboxEvery: 9000, interruptEvery: 14000 },
  { name: "Peak Stress", startRatio: 0.6, endRatio: 0.9, taskEvery: 3600, inboxEvery: 6000, interruptEvery: 9000 },
  { name: "Cooldown", startRatio: 0.9, endRatio: 1, taskEvery: 12000, inboxEvery: 14000, interruptEvery: 22000 }
];

const TASK_TYPES = ["decision", "calculation", "memory", "priority"];
const INTERRUPTS = [
  "Colleague: Can you take this quickly?",
  "Call: The customer needs an immediate answer.",
  "Manager: Reprioritize everything now.",
  "Support: Urgent help needed right away."
];
const INBOX_TEMPLATES = [
  { text: "URGENT: customer waiting", severity: "high", impact: 8, idealAction: "handle" },
  { text: "Can you handle this quickly?", severity: "medium", impact: 4, idealAction: "postpone" },
  { text: "Not important (or?)", severity: "low", impact: 2, idealAction: "ignore" },
  { text: "New rule: precision is prioritized", severity: "high", impact: 7, idealAction: "handle" }
];

const els = {
  root: document.getElementById("appRoot"),
  sessionIdInput: document.getElementById("sessionIdInput"),
  joinButton: document.getElementById("joinButton"),
  joinStatus: document.getElementById("joinStatus"),
  sessionMeta: document.getElementById("sessionMeta"),
  timeLeft: document.getElementById("timeLeft"),
  phaseName: document.getElementById("phaseName"),
  score: document.getElementById("scoreValue"),
  liveStress: document.getElementById("liveStress"),
  taskList: document.getElementById("taskList"),
  workspace: document.getElementById("taskWorkspace"),
  inbox: document.getElementById("inboxList"),
  interruptText: document.getElementById("interruptText"),
  acceptInterrupt: document.getElementById("acceptInterrupt"),
  ignoreInterrupt: document.getElementById("ignoreInterrupt"),
  reactionPrompt: document.getElementById("reactionPrompt"),
  reactionButton: document.getElementById("reactionButton"),
  reactionPanel: document.getElementById("reactionPanel"),
  eventLog: document.getElementById("eventLog"),
  results: document.getElementById("resultsPanel"),
  metrics: document.getElementById("metricsGrid"),
  nasaForm: document.getElementById("nasaForm"),
  feedback: document.getElementById("feedbackBox"),
  leaderboard: document.getElementById("leaderboard")
};

const state = {
  joined: false,
  sessionId: "",
  participantId: getOrCreateParticipantId(),
  pollHandle: null,
  hasSubmitted: false,
  latestBaseMetrics: null,

  active: false,
  startedAt: 0,
  durationMs: 600000,
  deadlineMs: null,
  gameTimer: null,
  taskTimer: null,
  inboxTimer: null,
  interruptTimer: null,
  reactionSchedule: null,
  currentPhase: PHASES[0],
  taskId: 1,
  inboxId: 1,
  score: 0,
  selectedTaskId: null,
  activeTasks: [],
  inboxItems: [],
  currentInterrupt: null,
  reactionActive: false,
  reactionStartedAt: 0,
  metrics: emptyMetrics(),
  dynamicRule: {
    rewardMultiplier: 1,
    penaltyMultiplier: 1
  }
};

function emptyMetrics() {
  return {
    attempts: 0,
    errors: 0,
    completed: 0,
    inboxCorrectDecisions: 0,
    inboxWrongDecisions: 0,
    missedDeadlines: 0,
    ignoredCriticalInbox: 0,
    acceptedInterrupts: 0,
    ignoredInterrupts: 0,
    reactionTimes: [],
    throughputBuckets: [],
    phasePerformance: {}
  };
}

function getOrCreateParticipantId() {
  const key = "stress-participant-id";
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const id = `P${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
  localStorage.setItem(key, id);
  return id;
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffleArray(values) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randInt(0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function logEvent(text) {
  const li = document.createElement("li");
  li.textContent = `[${new Date().toLocaleTimeString("sv-SE")}] ${text}`;
  els.eventLog.prepend(li);
  while (els.eventLog.children.length > 25) {
    els.eventLog.removeChild(els.eventLog.lastChild);
  }
}

function updateHUD() {
  els.score.textContent = String(state.score);
  const live = calcLiveStress();
  els.liveStress.textContent = String(live);
  els.root.classList.toggle("stress-high", live > 70);
  els.root.classList.toggle("peak-stress-phase", state.currentPhase.name === "Peak Stress");
}

function calcLiveStress() {
  const loadFactor = Math.min(100, state.activeTasks.length * 18 + state.inboxItems.length * 8);
  const missedFactor = state.metrics.missedDeadlines * 7;
  const errorFactor = state.metrics.errors * 4;
  return Math.min(100, Math.round(loadFactor + missedFactor + errorFactor));
}

function getProgressRatio() {
  if (!state.startedAt || !state.durationMs) {
    return 0;
  }
  const elapsed = Date.now() - state.startedAt;
  return Math.min(1, elapsed / state.durationMs);
}

function getPhaseByRatio(ratio) {
  return PHASES.find((phase) => ratio >= phase.startRatio && ratio < phase.endRatio) || PHASES[PHASES.length - 1];
}

function applyDynamicRules(phase) {
  if (phase.name === "Peak Stress") {
    state.dynamicRule.rewardMultiplier = 0.9;
    state.dynamicRule.penaltyMultiplier = 1.4;
  } else if (phase.name === "Load") {
    state.dynamicRule.rewardMultiplier = 1;
    state.dynamicRule.penaltyMultiplier = 1.2;
  } else {
    state.dynamicRule.rewardMultiplier = 1.1;
    state.dynamicRule.penaltyMultiplier = 1;
  }
}

function phaseTick() {
  const ratio = getProgressRatio();
  const nextPhase = getPhaseByRatio(ratio);
  if (nextPhase.name !== state.currentPhase.name) {
    state.currentPhase = nextPhase;
    applyDynamicRules(nextPhase);
    els.phaseName.textContent = nextPhase.name;
    logEvent(`Phase change: ${nextPhase.name}. Rules updated.`);
    restartSpawnTimers();
  }
}

function makeTask() {
  const type = pick(TASK_TYPES);
  const difficulty = randInt(1, 3);
  const deadline = randInt(12, 26) - difficulty;
  const task = {
    id: state.taskId++,
    type,
    difficulty,
    deadline,
    reward: 10 + difficulty * 4,
    penalty: -5 - difficulty * 2,
    createdAt: Date.now(),
    dueAt: Date.now() + deadline * 1000,
    prompt: "",
    correctAnswer: "",
    options: []
  };

  if (type === "calculation") {
    const a = randInt(2, 12 + difficulty * 3);
    const b = randInt(2, 9 + difficulty * 3);
    task.prompt = `Calculate: ${a} x ${b}`;
    task.correctAnswer = String(a * b);
  }

  if (type === "decision") {
    task.prompt = "Quick decision: What should be handled first?";
    task.options = shuffleArray(["Critical incident", "Routine case", "Internal question"]);
    task.correctAnswer = "Critical incident";
  }

  if (type === "memory") {
    const seq = [randInt(10, 99), randInt(10, 99), randInt(10, 99)];
    task.prompt = `Memorize this series for 5 sec: ${seq.join("-")}. Enter the last number.`;
    task.correctAnswer = String(seq[2]);
  }

  if (type === "priority") {
    task.prompt = "Prioritization: Which task should be first?";
    task.options = shuffleArray(["Deadline in 3 min", "High pressure without deadline", "Waiting for internal review"]);
    task.correctAnswer = "Deadline in 3 min";
  }

  state.activeTasks.push(task);
  renderTasks();
  logEvent(`New task #${task.id} (${task.type}) deadline ${task.deadline}s.`);
}

function renderTasks() {
  els.taskList.innerHTML = "";
  state.activeTasks
    .sort((a, b) => a.dueAt - b.dueAt)
    .forEach((task) => {
      const li = document.createElement("li");
      const timeLeftSec = Math.max(0, Math.ceil((task.dueAt - Date.now()) / 1000));
      const urgency = timeLeftSec < 8 ? "high" : timeLeftSec < 14 ? "medium" : "low";
      li.className = urgency;
      li.innerHTML = `
        <strong>#${task.id} ${task.type}</strong><br>
        Deadline: ${timeLeftSec}s | Difficulty: ${task.difficulty} | Score: +${task.reward}/${task.penalty}
      `;
      li.addEventListener("click", () => {
        state.selectedTaskId = task.id;
        renderWorkspace();
      });
      els.taskList.appendChild(li);
    });
}

function renderWorkspace() {
  const task = state.activeTasks.find((t) => t.id === state.selectedTaskId);
  if (!task) {
    els.workspace.innerHTML = "<p>Select a task to answer.</p>";
    return;
  }

  const form = document.createElement("form");
  form.className = "task-form";
  form.innerHTML = `<p><strong>Task #${task.id}</strong>: ${task.prompt}</p>`;

  let inputEl;
  if (task.options.length > 0) {
    inputEl = document.createElement("select");
    task.options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      inputEl.appendChild(option);
    });
  } else {
    inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.required = true;
    inputEl.autocomplete = "off";
    if (task.type === "memory") {
      setTimeout(() => {
        if (state.selectedTaskId === task.id) {
          form.querySelector("p").textContent = `Task #${task.id}: Enter the last number in the series.`;
        }
      }, 5000);
    }
  }

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit answer";
  form.appendChild(inputEl);
  form.appendChild(submit);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = (inputEl.value || "").trim();
    evaluateTask(task.id, value);
  });

  els.workspace.innerHTML = "";
  els.workspace.appendChild(form);
}

function evaluateTask(taskId, answer) {
  const idx = state.activeTasks.findIndex((t) => t.id === taskId);
  if (idx < 0) {
    return;
  }
  const task = state.activeTasks[idx];
  state.metrics.attempts += 1;

  if (answer.toLowerCase() === task.correctAnswer.toLowerCase()) {
    const reward = Math.round(task.reward * state.dynamicRule.rewardMultiplier);
    state.score += reward;
    state.metrics.completed += 1;
    registerPhasePerformance(true);
    logEvent(`Task #${task.id} completed (+${reward}).`);
  } else {
    const penalty = Math.round(Math.abs(task.penalty) * state.dynamicRule.penaltyMultiplier);
    state.score -= penalty;
    state.metrics.errors += 1;
    registerPhasePerformance(false);
    logEvent(`Task #${task.id} incorrect (-${penalty}).`);
  }

  state.activeTasks.splice(idx, 1);
  state.selectedTaskId = null;
  renderTasks();
  renderWorkspace();
  updateHUD();
}

function registerPhasePerformance(success) {
  const key = state.currentPhase.name;
  if (!state.metrics.phasePerformance[key]) {
    state.metrics.phasePerformance[key] = { ok: 0, fail: 0 };
  }
  if (success) {
    state.metrics.phasePerformance[key].ok += 1;
  } else {
    state.metrics.phasePerformance[key].fail += 1;
  }
}

function makeInboxMessage() {
  const template = pick(INBOX_TEMPLATES);
  const item = {
    id: state.inboxId++,
    text: template.text,
    severity: template.severity,
    impact: template.impact,
    idealAction: template.idealAction,
    createdAt: Date.now(),
    resolved: false
  };
  state.inboxItems.unshift(item);
  renderInbox();
}

function renderInbox() {
  els.inbox.innerHTML = "";
  state.inboxItems.filter((item) => !item.resolved).slice(0, 9).forEach((item) => {
    const li = document.createElement("li");
    li.className = item.severity;
    li.innerHTML = `<strong>${item.text}</strong><br>Impact: ${item.impact}`;
    const actions = document.createElement("div");
    actions.className = "row";

    [
      ["Handle", "handle"],
      ["Postpone", "postpone"],
      ["Ignore", "ignore"]
    ].forEach(([label, action]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        resolveInboxDecision(item.id, action);
      });
      actions.appendChild(button);
    });

    li.appendChild(actions);
    els.inbox.appendChild(li);
  });
}

function resolveInboxDecision(itemId, action) {
  const item = state.inboxItems.find((entry) => entry.id === itemId);
  if (!item || item.resolved) {
    return;
  }

  item.resolved = true;

  const delta = scoreInboxDecision(item, action);
  if (delta >= 0) {
    state.score += Math.round(delta * state.dynamicRule.rewardMultiplier);
  } else {
    state.score += Math.round(delta * state.dynamicRule.penaltyMultiplier);
  }

  const outcome = delta >= 0 ? `+${Math.round(Math.abs(delta))}` : `-${Math.round(Math.abs(delta))}`;
  logEvent(`Inbox #${item.id}: ${action} (${outcome}).`);
  renderInbox();
  updateHUD();
}

function scoreInboxDecision(item, action) {
  const ideal = item.idealAction;
  if (action === ideal) {
    state.metrics.inboxCorrectDecisions += 1;
    if (action === "handle") {
      return item.impact + 2;
    }
    if (action === "postpone") {
      return Math.max(2, Math.round(item.impact * 0.75));
    }
    return Math.max(2, Math.round(item.impact * 0.6));
  }

  state.metrics.inboxWrongDecisions += 1;

  if (ideal === "handle" && action === "ignore") {
    return -(item.impact + 4);
  }
  if (ideal === "handle" && action === "postpone") {
    return -Math.max(3, item.impact - 1);
  }
  if (ideal === "ignore" && action === "handle") {
    return -Math.max(2, Math.round(item.impact * 1.5));
  }
  if (ideal === "ignore" && action === "postpone") {
    return -2;
  }
  if (ideal === "postpone" && action === "handle") {
    return -Math.max(2, Math.round(item.impact * 0.75));
  }
  if (ideal === "postpone" && action === "ignore") {
    return -Math.max(3, Math.round(item.impact * 1.25));
  }

  return -Math.max(2, item.impact);
}

function maybeSpawnInterrupt() {
  if (state.currentInterrupt) {
    return;
  }
  state.currentInterrupt = {
    text: pick(INTERRUPTS),
    createdAt: Date.now()
  };
  els.interruptText.textContent = state.currentInterrupt.text;
  els.acceptInterrupt.disabled = false;
  els.ignoreInterrupt.disabled = false;
  logEvent("Interrupt received.");
}

function resolveInterrupt(accepted) {
  if (!state.currentInterrupt) {
    return;
  }
  if (accepted) {
    state.metrics.acceptedInterrupts += 1;
    state.score -= Math.round(3 * state.dynamicRule.penaltyMultiplier);
    logEvent("Interrupt accepted (time cost).");
  } else {
    state.metrics.ignoredInterrupts += 1;
    state.score -= Math.round(5 * state.dynamicRule.penaltyMultiplier);
    logEvent("Interrupt ignored (social penalty).");
  }
  state.currentInterrupt = null;
  els.interruptText.textContent = "No interrupts right now.";
  els.acceptInterrupt.disabled = true;
  els.ignoreInterrupt.disabled = true;
  updateHUD();
}

function scheduleReaction() {
  clearTimeout(state.reactionSchedule);
  setReactionAlert(false);
  const delay = randInt(5000, 15000);
  state.reactionSchedule = setTimeout(() => {
    if (!state.active) {
      return;
    }
    state.reactionActive = true;
    state.reactionStartedAt = Date.now();
    setReactionAlert(true);
    els.reactionPrompt.textContent = "SIGNAL! Click immediately!";
    els.reactionButton.disabled = false;
    logEvent("Reaction test started.");
  }, delay);
}

function captureReaction() {
  if (!state.reactionActive) {
    return;
  }
  const rt = Date.now() - state.reactionStartedAt;
  state.metrics.reactionTimes.push(rt);
  state.reactionActive = false;
  setReactionAlert(false);
  els.reactionButton.disabled = true;
  els.reactionPrompt.textContent = `Recorded: ${rt} ms`;
  const reward = rt < 600 ? 6 : rt < 1100 ? 3 : 0;
  if (reward === 0) {
    state.metrics.errors += 1;
  }
  state.score += reward;
  updateHUD();
  scheduleReaction();
}

function checkDeadlines() {
  const now = Date.now();
  const stillActive = [];
  for (const task of state.activeTasks) {
    if (task.dueAt < now) {
      state.metrics.missedDeadlines += 1;
      state.score -= Math.round(Math.abs(task.penalty) * 1.2 * state.dynamicRule.penaltyMultiplier);
      logEvent(`Missed deadline for task #${task.id}.`);
    } else {
      stillActive.push(task);
    }
  }
  state.activeTasks = stillActive;

  for (const item of state.inboxItems) {
    if (!item.handled && item.severity === "high" && now - item.createdAt > 17000) {
      item.handled = true;
      state.metrics.ignoredCriticalInbox += 1;
      state.score -= 4;
      logEvent(`Critical inbox item ignored: ${item.text}.`);
    }
  }

  renderTasks();
  renderInbox();
}

function registerThroughputSample() {
  state.metrics.throughputBuckets.push({
    t: Date.now() - state.startedAt,
    completed: state.metrics.completed,
    errors: state.metrics.errors
  });
}

function restartSpawnTimers() {
  clearInterval(state.taskTimer);
  clearInterval(state.inboxTimer);
  clearInterval(state.interruptTimer);

  state.taskTimer = setInterval(makeTask, state.currentPhase.taskEvery);
  state.inboxTimer = setInterval(makeInboxMessage, state.currentPhase.inboxEvery);
  if (state.currentPhase.interruptEvery > 0) {
    state.interruptTimer = setInterval(maybeSpawnInterrupt, state.currentPhase.interruptEvery);
  }
}

function startGame(deadlineMs, durationSec) {
  state.active = true;
  state.deadlineMs = Number(deadlineMs || 0) || Date.now() + Number(durationSec || 600) * 1000;
  state.durationMs = Math.max(60000, Number(durationSec || 600) * 1000);
  state.startedAt = state.deadlineMs - state.durationMs;
  state.taskId = 1;
  state.inboxId = 1;
  state.score = 0;
  state.selectedTaskId = null;
  state.activeTasks = [];
  state.inboxItems = [];
  state.currentInterrupt = null;
  state.reactionActive = false;
  setReactionAlert(false);
  state.metrics = emptyMetrics();
  state.latestBaseMetrics = null;
  state.hasSubmitted = false;

  els.results.hidden = true;
  els.nasaForm.reset();
  els.feedback.innerHTML = "";
  els.leaderboard.innerHTML = "";
  els.workspace.innerHTML = "<p>Select a task to answer.</p>";

  state.currentPhase = PHASES[0];
  applyDynamicRules(state.currentPhase);
  els.phaseName.textContent = state.currentPhase.name;
  restartSpawnTimers();
  scheduleReaction();

  makeTask();
  makeInboxMessage();

  clearInterval(state.gameTimer);
  state.gameTimer = setInterval(() => {
    const remaining = state.deadlineMs - Date.now();
    els.timeLeft.textContent = formatTime(remaining);

    phaseTick();
    checkDeadlines();
    registerThroughputSample();
    updateHUD();

    if (remaining <= 0) {
      endGame();
    }
  }, 700);

  els.joinStatus.textContent = "Connected. The game is active.";
  logEvent("Simulation started via admin session.");
  updateHUD();
}

function calculateBaselineMetrics() {
  const attempts = Math.max(1, state.metrics.attempts);
  const errorRate = (state.metrics.errors / attempts) * 100;
  const missed = state.metrics.missedDeadlines;
  const avgRT = state.metrics.reactionTimes.length
    ? state.metrics.reactionTimes.reduce((sum, x) => sum + x, 0) / state.metrics.reactionTimes.length
    : 0;
  const rtVariance = state.metrics.reactionTimes.length
    ? state.metrics.reactionTimes.reduce((sum, x) => sum + Math.pow(x - avgRT, 2), 0) / state.metrics.reactionTimes.length
    : 0;
  const rtVarNorm = Math.min(100, rtVariance / 35);
  const throughput = state.metrics.completed;
  return {
    errorRate,
    missed,
    avgRT,
    rtVarNorm,
    throughput
  };
}

function renderBaseResults(base) {
  const cards = [
    ["Game Score", state.score],
    ["Task throughput", base.throughput],
    ["Error rate", `${base.errorRate.toFixed(1)}%`],
    ["Missed deadlines", base.missed],
    ["Average RT", `${Math.round(base.avgRT)} ms`],
    ["RT variance (norm)", base.rtVarNorm.toFixed(1)],
    ["Inbox decisions", `${state.metrics.inboxCorrectDecisions}/${state.metrics.inboxCorrectDecisions + state.metrics.inboxWrongDecisions}`]
  ];

  els.metrics.innerHTML = cards
    .map(([k, v]) => `<article class="metric"><strong>${k}</strong><p>${v}</p></article>`)
    .join("");
}

function endGame() {
  if (!state.active) {
    return;
  }
  state.active = false;
  clearInterval(state.gameTimer);
  clearInterval(state.taskTimer);
  clearInterval(state.inboxTimer);
  clearInterval(state.interruptTimer);
  clearTimeout(state.reactionSchedule);
  setReactionAlert(false);
  els.reactionButton.disabled = true;
  els.acceptInterrupt.disabled = true;
  els.ignoreInterrupt.disabled = true;
  els.timeLeft.textContent = "00:00";

  const base = calculateBaselineMetrics();
  state.latestBaseMetrics = base;
  renderBaseResults(base);
  els.results.hidden = false;
  els.joinStatus.textContent = "Session ended. Complete NASA-TLX and submit your result.";
  logEvent("Simulation finished. Complete NASA-TLX.");
}

function buildFeedback(stressScore, base, nasaAvg) {
  const lines = [];
  if (base.errorRate > 35) {
    lines.push("You prioritized speed over accuracy in multiple critical moments.");
  }
  if (base.missed > 5) {
    lines.push("You lost control over deadlines under high load.");
  }
  if (state.metrics.ignoredCriticalInbox > 2) {
    lines.push("You ignored important messages when working memory was overloaded.");
  }
  if (state.metrics.inboxWrongDecisions > state.metrics.inboxCorrectDecisions) {
    lines.push("Your inbox prioritization was unstable under pressure.");
  }
  if (lines.length === 0) {
    lines.push("You stayed relatively stable under pressure but showed a clear stress peak in high-load phases.");
  }
  lines.push(`Game Score: ${state.score}.`);
  lines.push(`NASA-TLX average: ${nasaAvg.toFixed(1)} / 100.`);
  lines.push(`Final Stress Score: ${stressScore.toFixed(1)} / 100.`);
  lines.push("The leaderboard uses Final Stress Score, not raw Game Score.");
  return lines;
}

async function submitResultToServer(payload) {
  if (!state.joined || state.hasSubmitted) {
    return;
  }

  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: state.sessionId,
      participantId: state.participantId,
      result: payload
    })
  });

  if (res.ok) {
    state.hasSubmitted = true;
    logEvent("Result sent to server.");
    return;
  }

  const err = await res.json().catch(() => ({}));
  logEvent(`Could not submit result: ${err.error || "unknown error"}.`);
}

async function loadServerLeaderboard() {
  if (!state.sessionId) {
    return;
  }

  const res = await fetch(`${API_BASE}/results?sessionId=${encodeURIComponent(state.sessionId)}`);
  if (!res.ok) {
    return;
  }

  const data = await res.json();
  const rows = (data.leaderboard || []).map((item, idx) => {
    return `${idx + 1}. ${item.participantId.slice(0, 8)} - Final Stress Score ${Math.round(item.stressScore)}`;
  });

  els.leaderboard.innerHTML = `
    <h3>Group feedback (live)</h3>
    <p>Median stress: <strong>${data.medianStress || 0}</strong></p>
    <p>Leaderboard ranking is based on Final Stress Score.</p>
    <p>${rows.join("<br>") || "No results yet."}</p>
  `;
}

async function submitNasa(event) {
  event.preventDefault();
  if (!state.latestBaseMetrics) {
    return;
  }

  const data = new FormData(els.nasaForm);
  const nasaValues = ["mental", "temporal", "effort", "frustration", "performance"]
    .map((key) => Number(data.get(key) || 0));
  const nasaAvg = nasaValues.reduce((sum, v) => sum + v, 0) / nasaValues.length;

  const base = state.latestBaseMetrics;
  const stressScore =
    base.errorRate * 0.25 +
    Math.min(100, base.missed * 10) * 0.3 +
    base.rtVarNorm * 0.15 +
    nasaAvg * 0.3;

  const lines = buildFeedback(stressScore, base, nasaAvg);
  els.feedback.innerHTML = `<h3>Individual feedback</h3><p>${lines.join("<br>")}</p>`;

  await submitResultToServer({
    stressScore,
    throughput: base.throughput,
    errorRate: base.errorRate,
    missedDeadlines: base.missed,
    rtVarianceNorm: base.rtVarNorm,
    nasaTlX: nasaAvg,
    score: state.score
  });

  await loadServerLeaderboard();
}

async function joinSession() {
  const sessionId = (els.sessionIdInput.value || "").trim().toUpperCase();
  if (!sessionId) {
    els.joinStatus.textContent = "Enter a session ID.";
    return;
  }

  els.joinButton.disabled = true;
  els.joinStatus.textContent = "Joining...";

  try {
    const res = await fetch(
      `${API_BASE}/state?sessionId=${encodeURIComponent(sessionId)}&participantId=${encodeURIComponent(state.participantId)}`
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      els.joinStatus.textContent = err.error || "Could not join session.";
      return;
    }

    const sessionState = await res.json();
    state.joined = true;
    state.sessionId = sessionId;
    els.sessionMeta.textContent = `Session: ${sessionId} | Participant ID: ${state.participantId}`;
    els.joinStatus.textContent = "Connected to session. Waiting for admin to start the game.";
    logEvent(`Connected to session ${sessionId}.`);

    startPolling();
    await handleSessionState(sessionState);
  } catch (error) {
    els.joinStatus.textContent = "Network error while joining.";
    logEvent(`Join failed: ${error.message}`);
  } finally {
    els.joinButton.disabled = false;
  }
}

function startPolling() {
  if (state.pollHandle) {
    clearInterval(state.pollHandle);
  }

  state.pollHandle = setInterval(async () => {
    if (!state.joined || !state.sessionId) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/state?sessionId=${encodeURIComponent(state.sessionId)}&participantId=${encodeURIComponent(state.participantId)}`
      );
      if (!res.ok) {
        return;
      }
      const sessionState = await res.json();
      await handleSessionState(sessionState);
    } catch (_err) {
      // Keep polling; temporary network issue.
    }
  }, POLL_MS);
}

async function handleSessionState(sessionState) {
  const phase = String(sessionState.phase || "idle");
  const deadlineMs = Number(sessionState.deadlineMs || 0);
  const durationSec = Number(sessionState.durationSec || 600);

  if (phase === "idle") {
    els.joinStatus.textContent = "Connected. Session has been created but not started.";
    els.phaseName.textContent = "Waiting";
    els.timeLeft.textContent = formatTime(durationSec * 1000);
    return;
  }

  if (phase === "live") {
    if (!state.active) {
      startGame(deadlineMs, durationSec);
    }
    return;
  }

  if (phase === "results") {
    if (state.active) {
      endGame();
    }
    els.joinStatus.textContent = "Results mode is active. Complete NASA-TLX if you have not done it yet.";
    await loadServerLeaderboard();
  }
}

function applySessionFromQuery() {
  const query = new URLSearchParams(window.location.search);
  const session = (query.get("session") || "").trim().toUpperCase();
  if (session) {
    els.sessionIdInput.value = session;
  }
}

function setReactionAlert(active) {
  if (!els.reactionPanel) {
    return;
  }
  els.reactionPanel.classList.toggle("reaction-active", Boolean(active));
  els.reactionPanel.classList.toggle(
    "reaction-peak",
    Boolean(active) && state.currentPhase.name === "Peak Stress"
  );
}

els.joinButton.addEventListener("click", joinSession);
els.acceptInterrupt.addEventListener("click", () => resolveInterrupt(true));
els.ignoreInterrupt.addEventListener("click", () => resolveInterrupt(false));
els.reactionButton.addEventListener("click", captureReaction);
els.nasaForm.addEventListener("submit", submitNasa);

applySessionFromQuery();
els.timeLeft.textContent = "--:--";
els.phaseName.textContent = "Waiting";
updateHUD();
