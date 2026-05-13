const sql = require("mssql");

const SESSION_PREFIX = "rto:presentation:session:";
const ANSWER_PREFIX = "rto:presentation:answer:";
const CLAIM_PREFIX = "rto:presentation:claim:";
const PRESENCE_PREFIX = "rto:presentation:presence:";
const DEFAULT_STRESS_DURATION_SEC = 120;
const DEFAULT_CHAOS_DURATION_SEC = 180;
const DEFAULT_TASK_WAVE_SECONDS = 20;
const DEFAULT_BRIEFING_SLIDES = 6;

const sessions = new Map();
let poolPromise = null;

class MemoryPresentationStore {
  createSession() {
    const sessionId = `S${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const adminKey = `A${Math.random().toString(36).slice(2, 12)}`;
    const record = {
      sessionId,
      adminKey,
      phase: "idle",
      message: "Waiting for admin to start the scenario.",
      deadlineMs: null,
      createdAt: Date.now(),
      stressDurationSec: DEFAULT_STRESS_DURATION_SEC,
      chaosDurationSec: DEFAULT_CHAOS_DURATION_SEC,
      taskWaveSeconds: DEFAULT_TASK_WAVE_SECONDS,
      briefingSlide: 0,
      briefingTotal: DEFAULT_BRIEFING_SLIDES,
      submissionsByPhase: {},
      answers: [],
      claims: {},
      participants: new Set(),
      readyParticipants: new Set(),
      currentRound: 1,
      roundResults: []
    };
    sessions.set(sessionId, record);
    return { sessionId, adminKey };
  }

  getSession(sessionId) {
    return sessions.get(normalizeSessionId(sessionId)) || null;
  }

  activate({ sessionId, adminKey, phase, durationSec, chaosDurationSec, taskWaveSeconds }) {
    const session = this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const normalizedPhase = String(phase || "idle");
    const stressDuration = sanitizeDurationSec(durationSec, Number(session.stressDurationSec || DEFAULT_STRESS_DURATION_SEC));
    const chaosDuration = sanitizeDurationSec(chaosDurationSec, Number(session.chaosDurationSec || DEFAULT_CHAOS_DURATION_SEC));
    const waveSeconds = sanitizeTaskWaveSeconds(taskWaveSeconds, Number(session.taskWaveSeconds || DEFAULT_TASK_WAVE_SECONDS));
    const rawDurationSec = Number(durationSec || 0);
    const effectiveDurationSec = normalizedPhase === "digitalStress"
      ? stressDuration
      : (Number.isFinite(rawDurationSec) && rawDurationSec > 0 ? Math.round(rawDurationSec) : 0);

    session.phase = normalizedPhase;
    session.deadlineMs = effectiveDurationSec > 0 ? Date.now() + effectiveDurationSec * 1000 : null;
    session.message = phaseMessage(normalizedPhase);
    session.stressDurationSec = stressDuration;
    session.chaosDurationSec = chaosDuration;
    session.taskWaveSeconds = waveSeconds;
    if (!session.submissionsByPhase[normalizedPhase]) {
      session.submissionsByPhase[normalizedPhase] = new Set();
    }
    if (!session.claims[normalizedPhase]) {
      session.claims[normalizedPhase] = {};
    }
    return session;
  }

  updateBriefing({ sessionId, adminKey, command, totalSlides }) {
    const session = this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const maxSlides = Math.max(1, Number(totalSlides || session.briefingTotal || DEFAULT_BRIEFING_SLIDES));
    session.briefingTotal = maxSlides;
    const normalized = String(command || "").toLowerCase();

    if (normalized === "start") {
      session.phase = "briefing";
      session.deadlineMs = null;
      session.briefingSlide = 0;
      session.readyParticipants.clear();
      session.message = phaseMessage("briefing", { slide: 1, total: maxSlides });
      return session;
    }

    if (normalized === "next") {
      session.phase = "briefing";
      session.deadlineMs = null;
      session.briefingSlide = Math.min(maxSlides - 1, Number(session.briefingSlide || 0) + 1);
      session.message = phaseMessage("briefing", { slide: session.briefingSlide + 1, total: maxSlides });
      return session;
    }

    if (normalized === "prev") {
      session.phase = "briefing";
      session.deadlineMs = null;
      session.briefingSlide = Math.max(0, Number(session.briefingSlide || 0) - 1);
      session.message = phaseMessage("briefing", { slide: session.briefingSlide + 1, total: maxSlides });
      return session;
    }

    if (normalized === "end") {
      session.phase = "idle";
      session.deadlineMs = null;
      session.readyParticipants.clear();
      session.message = "Briefing complete. Start the game when everyone is ready.";
      return session;
    }

    return session;
  }

  markParticipantReady({ sessionId, participantId }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    if (participantId) {
      session.participants.add(String(participantId));
      session.readyParticipants.add(String(participantId));
    }

    return { readyCount: session.readyParticipants.size };
  }

  claim({ sessionId, participantId, claims }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }
    applyAutoPhaseTransitionMemory(session);
    if (!participantId || !Array.isArray(claims)) {
      return false;
    }

    const phase = session.phase;
    if (!session.claims[phase]) {
      session.claims[phase] = {};
    }

    session.claims[phase][participantId] = {
      claims,
      timestamp: Date.now()
    };
    return true;
  }

  submit({ sessionId, participantId, ranking, summary, responseTimeMs }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }
    applyAutoPhaseTransitionMemory(session);
    if (!participantId || !Array.isArray(ranking)) {
      return false;
    }

    const phase = session.phase;
    if (!session.submissionsByPhase[phase]) {
      session.submissionsByPhase[phase] = new Set();
    }

    const phaseSet = session.submissionsByPhase[phase];
    const key = `${phase}:${participantId}`;
    if (phaseSet.has(key)) {
      return true;
    }

    phaseSet.add(key);
    session.answers.push({
      participantId,
      phase,
      ranking,
      summary: sanitizeSummary(summary),
      responseTimeMs,
      timestamp: Date.now()
    });
    return true;
  }

  participantState({ sessionId, participantId }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    applyAutoPhaseTransitionMemory(session);

    if (participantId) {
      session.participants.add(String(participantId));
    }

    const phase = session.phase;
    const phaseSet = session.submissionsByPhase[phase] || new Set();
    const submitted = Boolean(participantId) && phaseSet.has(`${phase}:${participantId}`);
    const participantReady = Boolean(participantId) && session.readyParticipants.has(String(participantId));

    return {
      phase: session.phase,
      message: session.message,
      deadlineMs: session.deadlineMs,
      submitted,
      participantCount: session.participants.size,
      readyCount: session.readyParticipants.size,
      participantReady,
      stressDurationSec: sanitizeDurationSec(session.stressDurationSec, DEFAULT_STRESS_DURATION_SEC),
      chaosDurationSec: sanitizeDurationSec(session.chaosDurationSec, DEFAULT_CHAOS_DURATION_SEC),
      taskWaveSeconds: sanitizeTaskWaveSeconds(session.taskWaveSeconds, DEFAULT_TASK_WAVE_SECONDS),
      briefingSlide: Number(session.briefingSlide || 0),
      briefingTotal: Number(session.briefingTotal || DEFAULT_BRIEFING_SLIDES),
      roundResults: session.roundResults || [],
      currentRound: session.currentRound || 1
    };
  }

  getConflicts({ sessionId, participantId }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    applyAutoPhaseTransitionMemory(session);

    const phase = session.phase;
    const claimMap = session.claims[phase] || {};
    const myEntry = claimMap[participantId] || { claims: [] };
    const ownerByTask = resolveTaskOwners(claimMap);

    const takenByOthers = myEntry.claims
      .filter((claim) => claim.taskId && ownerByTask[claim.taskId] && ownerByTask[claim.taskId] !== participantId)
      .map((claim) => claim.taskId);

    return {
      takenByOthers,
      conflictCount: takenByOthers.length
    };
  }

  getResults(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    applyAutoPhaseTransitionMemory(session);

    const latestAnswers = latestAnswersByParticipant(session.answers);
    return buildAggregateResults({
      phase: session.phase,
      answers: latestAnswers
    });
  }

  getParticipantResult({ sessionId, participantId }) {
    const session = this.getSession(sessionId);
    if (!session || !participantId) {
      return null;
    }

    const latest = pickLatestAnswerForParticipant(session.answers, String(participantId));
    if (!latest) {
      return null;
    }

    return {
      participantId: String(participantId),
      phase: latest.phase,
      ranking: Array.isArray(latest.ranking) ? latest.ranking : [],
      summary: sanitizeSummary(latest.summary)
    };
  }

  startNewRound({ sessionId, adminKey }) {
    const session = this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const currentRoundResult = {
      round: session.currentRound,
      answers: session.answers.slice(),
      completedAt: Date.now(),
      stressDurationSec: session.stressDurationSec,
      chaosDurationSec: session.chaosDurationSec,
      taskWaveSeconds: session.taskWaveSeconds
    };

    session.roundResults.push(currentRoundResult);
    session.currentRound += 1;
    session.phase = "idle";
    session.message = "Ready for the next round. Waiting for admin to start.";
    session.deadlineMs = null;
    session.submissionsByPhase = {};
    session.answers = [];
    session.claims = {};
    session.readyParticipants.clear();

    return session;
  }
}

function buildAggregateResults({ phase, answers }) {
  const counts = {};
  const taskLabels = {};
  const rank1Counts = {};
  const top3Counts = {};
  const avgRankTotals = {};
  const avgRankCounts = {};
  let deliveryScoreSum = 0;
  let wellbeingScoreSum = 0;
  let overloadMinutesSum = 0;
  let channelAccuracySum = 0;
  let focusEfficiencySum = 0;
  let clarityMatchRateSum = 0;
  let businessAlignmentScoreSum = 0;
  let completedTaskCountSum = 0;
  let completedBusinessValueSum = 0;
  let holdCountSum = 0;
  let holdMinutesSum = 0;
  let interruptionSum = 0;
  let breakCountSum = 0;
  let breakMinutesSum = 0;
  let participants = 0;
  const distributions = {
    overloaded: 0,
    tight: 0,
    inControl: 0,
    channelStrong: 0,
    channelMixed: 0,
    channelWeak: 0,
    focusStable: 0,
    focusFragmented: 0,
    focusCollapsed: 0,
    clarityStrong: 0,
    clarityMixed: 0,
    clarityWeak: 0
  };
  const profiles = {
    perfectionists: 0,
    recoveryUsers: 0,
    reactiveWorkers: 0,
    overloadRisk: 0
  };

  (answers || []).forEach((item) => {
    if (!Array.isArray(item.ranking)) {
      return;
    }
    participants += 1;

    item.ranking.forEach((rank, idx) => {
      if (rank.taskId) {
        counts[rank.taskId] = (counts[rank.taskId] || 0) + 1;
        taskLabels[rank.taskId] = rank.taskLabel || taskLabels[rank.taskId] || rank.taskId;
        avgRankTotals[rank.taskId] = (avgRankTotals[rank.taskId] || 0) + Number(rank.rank || idx + 1);
        avgRankCounts[rank.taskId] = (avgRankCounts[rank.taskId] || 0) + 1;
        if (idx === 0) {
          rank1Counts[rank.taskId] = (rank1Counts[rank.taskId] || 0) + 1;
        }
        if (idx < 3) {
          top3Counts[rank.taskId] = (top3Counts[rank.taskId] || 0) + 1;
        }
      }
    });

    const s = sanitizeSummary(item.summary);
    if (s.deliveryScore > 0) {
      deliveryScoreSum += s.deliveryScore;
    } else {
      const fallbackDelivery = (item.ranking || []).reduce((sum, rank, idx) => {
        if (!rank || !rank.taskId) {
          return sum;
        }
        const weight = Math.max(1, 10 - idx);
        return sum + weight * (rank.wellbeing ? 0.5 : 1);
      }, 0);
      deliveryScoreSum += fallbackDelivery;
    }

    wellbeingScoreSum += s.wellbeingScore;
    overloadMinutesSum += s.overloadMinutes;
    channelAccuracySum += s.channelAccuracy;
    businessAlignmentScoreSum += s.businessAlignmentScore;
    completedTaskCountSum += s.completedTaskCount;
    completedBusinessValueSum += s.completedBusinessValue;
    holdCountSum += s.holdCount;
    holdMinutesSum += s.holdMinutes;
    interruptionSum += s.interruptionCount;
    breakCountSum += s.wellbeingTaskCount;
    breakMinutesSum += s.wellbeingBreakMinutes;

    const focusEfficiency = s.focusWorkedSec > 0
      ? (s.focusProducedSec / s.focusWorkedSec) * 100
      : 0;
    focusEfficiencySum += focusEfficiency;

    const clarityRate = s.unclearTaskCount > 0
      ? (s.clarityMatchCount / s.unclearTaskCount) * 100
      : 0;
    clarityMatchRateSum += clarityRate;

    if (s.overloadMinutes > 0) {
      distributions.overloaded += 1;
      profiles.overloadRisk += 1;
    } else if (s.remainingMinutes < 90) {
      distributions.tight += 1;
    } else {
      distributions.inControl += 1;
    }

    if (s.channelAccuracy >= 70) {
      distributions.channelStrong += 1;
    } else if (s.channelAccuracy >= 40) {
      distributions.channelMixed += 1;
    } else {
      distributions.channelWeak += 1;
    }

    if (focusEfficiency >= 70) {
      distributions.focusStable += 1;
    } else if (focusEfficiency >= 40) {
      distributions.focusFragmented += 1;
    } else {
      distributions.focusCollapsed += 1;
    }

    if (clarityRate >= 70) {
      distributions.clarityStrong += 1;
    } else if (clarityRate >= 40) {
      distributions.clarityMixed += 1;
    } else {
      distributions.clarityWeak += 1;
    }

    const perfectCount = (item.ranking || []).filter((rank) => rank.quality === "perfect").length;
    if (perfectCount >= 3) {
      profiles.perfectionists += 1;
    }
    if (s.wellbeingTaskCount >= 2) {
      profiles.recoveryUsers += 1;
    }
    if (s.interruptionCount >= 4 || s.channelFalseFires >= 2 || s.channelMissed >= 2) {
      profiles.reactiveWorkers += 1;
    }
  });

  const topRanked = topEntries(rank1Counts, taskLabels, 5);
  const topThree = topEntries(top3Counts, taskLabels, 5);
  const consensus = Object.keys(avgRankTotals)
    .map((taskId) => ({
      taskId,
      label: taskLabels[taskId] || taskId,
      avgRank: round1(avgRankTotals[taskId] / Math.max(1, avgRankCounts[taskId])),
      mentions: avgRankCounts[taskId]
    }))
    .sort((a, b) => a.avgRank - b.avgRank || b.mentions - a.mentions)
    .slice(0, 5);

  return {
    phase,
    totalAnswers: Object.values(counts).reduce((sum, value) => sum + value, 0),
    participants,
    counts,
    taskLabels,
    metrics: {
      avgDeliveryScore: participants ? round1(deliveryScoreSum / participants) : 0,
      avgWellbeingScore: participants ? round1(wellbeingScoreSum / participants) : 0,
      avgOverloadMinutes: participants ? round1(overloadMinutesSum / participants) : 0,
      avgChannelAccuracy: participants ? round1(channelAccuracySum / participants) : 0,
      avgFocusEfficiency: participants ? round1(focusEfficiencySum / participants) : 0,
      avgClarityMatchRate: participants ? round1(clarityMatchRateSum / participants) : 0,
      avgBusinessAlignmentScore: participants ? round1(businessAlignmentScoreSum / participants) : 0,
      avgCompletedTaskCount: participants ? round1(completedTaskCountSum / participants) : 0,
      avgCompletedBusinessValue: participants ? round1(completedBusinessValueSum / participants) : 0,
      avgHoldCount: participants ? round1(holdCountSum / participants) : 0,
      avgHoldMinutes: participants ? round1(holdMinutesSum / participants) : 0,
      avgInterruptions: participants ? round1(interruptionSum / participants) : 0,
      avgBreakCount: participants ? round1(breakCountSum / participants) : 0,
      avgBreakMinutes: participants ? round1(breakMinutesSum / participants) : 0
    },
    highlights: {
      topRanked,
      topThree,
      consensus
    },
    distributions,
    profiles
  };
}

function topEntries(countMap, labels, limit) {
  return Object.entries(countMap)
    .map(([taskId, count]) => ({
      taskId,
      label: labels[taskId] || taskId,
      count
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function latestAnswersByParticipant(rows) {
  const byParticipant = new Map();
  (rows || []).forEach((entry) => {
    if (!entry || !entry.participantId) {
      return;
    }

    const pid = String(entry.participantId);
    const current = byParticipant.get(pid);
    if (!current || Number(entry.timestamp || 0) > Number(current.timestamp || 0)) {
      byParticipant.set(pid, entry);
    }
  });
  return Array.from(byParticipant.values());
}

function pickLatestAnswerForParticipant(rows, participantId) {
  const pid = String(participantId || "");
  if (!pid) {
    return null;
  }

  let best = null;
  (rows || []).forEach((entry) => {
    if (!entry || String(entry.participantId || "") !== pid) {
      return;
    }
    if (!best || Number(entry.timestamp || 0) > Number(best.timestamp || 0)) {
      best = entry;
    }
  });
  return best;
}

class SqlPresentationStore {
  async ensureAutoPhase(session) {
    if (!session) {
      return session;
    }

    const transitioned = buildAutoTransitionedSession(session);
    if (!transitioned) {
      return session;
    }

    const pool = await getPool();
    await upsertAppState(pool, sessionStateId(session.sessionId), transitioned);
    return transitioned;
  }

  async createSession() {
    const pool = await getPool();
    const sessionId = `S${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const adminKey = `A${Math.random().toString(36).slice(2, 12)}`;
    const record = {
      sessionId,
      adminKey,
      phase: "idle",
      message: "Waiting for admin to start the scenario.",
      deadlineMs: null,
      createdAt: Date.now(),
      stressDurationSec: DEFAULT_STRESS_DURATION_SEC,
      chaosDurationSec: DEFAULT_CHAOS_DURATION_SEC,
      taskWaveSeconds: DEFAULT_TASK_WAVE_SECONDS,
      briefingSlide: 0,
      briefingTotal: DEFAULT_BRIEFING_SLIDES
    };

    await upsertAppState(pool, sessionStateId(sessionId), record);
    return { sessionId, adminKey };
  }

  async getSession(sessionId) {
    const normalized = normalizeSessionId(sessionId);
    if (!normalized) {
      return null;
    }
    const pool = await getPool();
    return readAppState(pool, sessionStateId(normalized));
  }

  async activate({ sessionId, adminKey, phase, durationSec, chaosDurationSec, taskWaveSeconds }) {
    const session = await this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const normalizedPhase = String(phase || "idle");
    const stressDuration = sanitizeDurationSec(durationSec, Number(session.stressDurationSec || DEFAULT_STRESS_DURATION_SEC));
    const chaosDuration = sanitizeDurationSec(chaosDurationSec, Number(session.chaosDurationSec || DEFAULT_CHAOS_DURATION_SEC));
    const waveSeconds = sanitizeTaskWaveSeconds(taskWaveSeconds, Number(session.taskWaveSeconds || DEFAULT_TASK_WAVE_SECONDS));
    const rawDurationSec = Number(durationSec || 0);
    const effectiveDurationSec = normalizedPhase === "digitalStress"
      ? stressDuration
      : (Number.isFinite(rawDurationSec) && rawDurationSec > 0 ? Math.round(rawDurationSec) : 0);

    const updated = {
      ...session,
      phase: normalizedPhase,
      deadlineMs: effectiveDurationSec > 0 ? Date.now() + effectiveDurationSec * 1000 : null,
      message: phaseMessage(normalizedPhase),
      stressDurationSec: stressDuration,
      chaosDurationSec: chaosDuration,
      taskWaveSeconds: waveSeconds,
      updatedAt: Date.now()
    };

    const pool = await getPool();
    await upsertAppState(pool, sessionStateId(updated.sessionId), updated);
    return updated;
  }

  async updateBriefing({ sessionId, adminKey, command, totalSlides }) {
    const session = await this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const maxSlides = Math.max(1, Number(totalSlides || session.briefingTotal || DEFAULT_BRIEFING_SLIDES));
    const normalized = String(command || "").toLowerCase();
    let nextPhase = session.phase;
    let nextSlide = Number(session.briefingSlide || 0);
    let nextMessage = session.message;

    if (normalized === "start") {
      nextPhase = "briefing";
      nextSlide = 0;
      nextMessage = phaseMessage("briefing", { slide: 1, total: maxSlides });
    } else if (normalized === "next") {
      nextPhase = "briefing";
      nextSlide = Math.min(maxSlides - 1, nextSlide + 1);
      nextMessage = phaseMessage("briefing", { slide: nextSlide + 1, total: maxSlides });
    } else if (normalized === "prev") {
      nextPhase = "briefing";
      nextSlide = Math.max(0, nextSlide - 1);
      nextMessage = phaseMessage("briefing", { slide: nextSlide + 1, total: maxSlides });
    } else if (normalized === "end") {
      nextPhase = "idle";
      nextMessage = "Briefing complete. Start the game when everyone is ready.";
    }

    const updated = {
      ...session,
      phase: nextPhase,
      briefingSlide: nextSlide,
      briefingTotal: maxSlides,
      deadlineMs: null,
      message: nextMessage,
      updatedAt: Date.now()
    };

    const pool = await getPool();
    await upsertAppState(pool, sessionStateId(updated.sessionId), updated);
    return updated;
  }

  async claim({ sessionId, participantId, claims }) {
    if (!participantId || !Array.isArray(claims)) {
      return false;
    }

    let session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    session = await this.ensureAutoPhase(session);

    const payload = {
      sessionId: session.sessionId,
      phase: session.phase,
      participantId: String(participantId),
      claims,
      timestamp: Date.now()
    };

    const pool = await getPool();
    await upsertAppState(pool, claimStateId(payload), payload);
    return true;
  }

  async submit({ sessionId, participantId, ranking, summary, responseTimeMs }) {
    if (!participantId || !Array.isArray(ranking)) {
      return false;
    }

    let session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    session = await this.ensureAutoPhase(session);

    const payload = {
      sessionId: session.sessionId,
      phase: session.phase,
      participantId: String(participantId),
      ranking,
      summary: sanitizeSummary(summary),
      responseTimeMs: responseTimeMs == null ? null : Number(responseTimeMs),
      timestamp: Date.now()
    };

    const pool = await getPool();
    await upsertAppState(pool, answerStateId(payload), payload);
    return true;
  }

  async markParticipantReady({ sessionId, participantId }) {
    let session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    if (!participantId) {
      return null;
    }

    const pool = await getPool();
    const readyStateId = `${PRESENCE_PREFIX}${session.sessionId}:ready:${String(participantId)}`;
    await upsertAppState(pool, readyStateId, {
      sessionId: session.sessionId,
      participantId: String(participantId),
      readyAt: Date.now()
    });

    // Get current ready count
    const readyPrefix = `${PRESENCE_PREFIX}${session.sessionId}:ready:`;
    const readyResult = await pool.request()
      .input("readyPrefix", sql.NVarChar(200), readyPrefix)
      .query("SELECT COUNT(1) AS total FROM app_state WHERE id LIKE @readyPrefix + '%' ");
    const readyCount = Number((readyResult.recordset[0] || {}).total || 0);

    return { readyCount };
  }

  async participantState({ sessionId, participantId }) {
    let session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    session = await this.ensureAutoPhase(session);

    const pool = await getPool();

    if (participantId) {
      await upsertAppState(pool, presenceStateId({ sessionId: session.sessionId, participantId }), {
        sessionId: session.sessionId,
        participantId: String(participantId),
        seenAt: Date.now()
      });
    }

    const presenceResult = await pool.request()
      .input("presencePrefix", sql.NVarChar(200), `${PRESENCE_PREFIX}${session.sessionId}:`)
      .query("SELECT COUNT(1) AS total FROM app_state WHERE id LIKE @presencePrefix + '%' ");
    const participantCount = Number((presenceResult.recordset[0] || {}).total || 0);

    // Count ready participants - they're stored with a "ready:" prefix
    const readyPrefix = `${PRESENCE_PREFIX}${session.sessionId}:ready:`;
    const readyResult = await pool.request()
      .input("readyPrefix", sql.NVarChar(200), readyPrefix)
      .query("SELECT COUNT(1) AS total FROM app_state WHERE id LIKE @readyPrefix + '%' ");
    const readyCount = Number((readyResult.recordset[0] || {}).total || 0);

    const id = answerStateId({
      sessionId: session.sessionId,
      phase: session.phase,
      participantId: String(participantId || "")
    });
    const submitted = Boolean(participantId) && Boolean(await readAppState(pool, id));

    return {
      phase: session.phase,
      message: session.message,
      deadlineMs: session.deadlineMs,
      submitted,
      participantCount,
      readyCount,
      stressDurationSec: sanitizeDurationSec(session.stressDurationSec, DEFAULT_STRESS_DURATION_SEC),
      chaosDurationSec: sanitizeDurationSec(session.chaosDurationSec, DEFAULT_CHAOS_DURATION_SEC),
      taskWaveSeconds: sanitizeTaskWaveSeconds(session.taskWaveSeconds, DEFAULT_TASK_WAVE_SECONDS),
      briefingSlide: Number(session.briefingSlide || 0),
      briefingSlide: Number(session.briefingSlide || 0),
      briefingTotal: Number(session.briefingTotal || DEFAULT_BRIEFING_SLIDES),
      roundResults: session.roundResults || [],
      currentRound: session.currentRound || 1
    };
  }

  async getConflicts({ sessionId, participantId }) {
    let session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    session = await this.ensureAutoPhase(session);

    const pool = await getPool();

    const claimsResult = await pool.request()
      .input("claimPrefix", sql.NVarChar(200), `${CLAIM_PREFIX}${session.sessionId}:${session.phase}:`)
      .query("SELECT payload FROM app_state WHERE id LIKE @claimPrefix + '%' ");

    const claimMap = {};
    for (const row of claimsResult.recordset) {
      const payload = safeJsonParse(row.payload);
      if (!payload || !Array.isArray(payload.claims) || !payload.participantId) {
        continue;
      }
      claimMap[payload.participantId] = {
        claims: payload.claims,
        timestamp: Number(payload.timestamp || Date.now())
      };
    }

    const myEntry = claimMap[participantId] || { claims: [] };
    const ownerByTask = resolveTaskOwners(claimMap);

    const takenByOthers = myEntry.claims
      .filter((claim) => claim.taskId && ownerByTask[claim.taskId] && ownerByTask[claim.taskId] !== participantId)
      .map((claim) => claim.taskId);

    return {
      takenByOthers,
      conflictCount: takenByOthers.length
    };
  }

  async getResults(sessionId) {
    let session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    session = await this.ensureAutoPhase(session);

    const pool = await getPool();
    const result = await pool.request()
      .input("prefix", sql.NVarChar(200), `${ANSWER_PREFIX}${session.sessionId}:`)
      .query("SELECT payload FROM app_state WHERE id LIKE @prefix + '%' ");

    const rows = result.recordset
      .map((row) => safeJsonParse(row.payload))
      .filter(Boolean);

    const latestAnswers = latestAnswersByParticipant(rows);
    return buildAggregateResults({
      phase: session.phase,
      answers: latestAnswers
    });
  }

  async getParticipantResult({ sessionId, participantId }) {
    const session = await this.getSession(sessionId);
    if (!session || !participantId) {
      return null;
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("prefix", sql.NVarChar(200), `${ANSWER_PREFIX}${session.sessionId}:`)
      .query("SELECT payload FROM app_state WHERE id LIKE @prefix + '%' ");

    const rows = result.recordset
      .map((row) => safeJsonParse(row.payload))
      .filter(Boolean);

    const latest = pickLatestAnswerForParticipant(rows, String(participantId));
    if (!latest) {
      return null;
    }

    return {
      participantId: String(participantId),
      phase: latest.phase,
      ranking: Array.isArray(latest.ranking) ? latest.ranking : [],
      summary: sanitizeSummary(latest.summary)
    };
  }

  async startNewRound({ sessionId, adminKey }) {
    let session = await this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const pool = await getPool();
    const answersResult = await pool.request()
      .input("prefix", sql.NVarChar(200), `${ANSWER_PREFIX}${session.sessionId}:`)
      .query("SELECT payload FROM app_state WHERE id LIKE @prefix + '%' ");

    const roundResults = session.roundResults || [];
    const currentRoundResult = {
      round: session.currentRound,
      answers: answersResult.recordset.map((row) => safeJsonParse(row.payload)).filter(Boolean),
      completedAt: Date.now(),
      stressDurationSec: session.stressDurationSec,
      chaosDurationSec: session.chaosDurationSec,
      taskWaveSeconds: session.taskWaveSeconds
    };

    roundResults.push(currentRoundResult);

    const updated = {
      ...session,
      roundResults,
      currentRound: session.currentRound + 1,
      phase: "idle",
      message: "Ready for the next round. Waiting for admin to start.",
      deadlineMs: null,
      submissionsByPhase: {},
      answers: [],
      claims: {},
      updatedAt: Date.now()
    };

    const stateId = sessionStateId(updated.sessionId);
    await upsertAppState(pool, stateId, updated);
    return updated;
  }
}

function resolveTaskOwners(claimMap) {
  const ownerByTask = {};

  Object.entries(claimMap).forEach(([pid, entry]) => {
    const claims = Array.isArray(entry.claims) ? entry.claims : [];
    claims.forEach((claim) => {
      const taskId = claim.taskId;
      if (!taskId) {
        return;
      }

      const contender = {
        pid,
        claimRank: Number(claim.rank || 999),
        claimTs: Number(claim.claimedAt || entry.timestamp || Date.now())
      };

      const currentOwnerPid = ownerByTask[taskId];
      if (!currentOwnerPid) {
        ownerByTask[taskId] = pid;
        return;
      }

      const current = {
        pid: currentOwnerPid,
        claimRank: findClaimRank(claimMap[currentOwnerPid], taskId),
        claimTs: findClaimTs(claimMap[currentOwnerPid], taskId)
      };

      if (isContenderStronger(contender, current)) {
        ownerByTask[taskId] = pid;
      }
    });
  });

  return ownerByTask;
}

function isContenderStronger(a, b) {
  if (a.claimRank !== b.claimRank) {
    return a.claimRank < b.claimRank;
  }
  return a.claimTs < b.claimTs;
}

function findClaimTs(entry, taskId) {
  if (!entry || !Array.isArray(entry.claims)) {
    return Number((entry || {}).timestamp || Date.now());
  }
  const claim = entry.claims.find((item) => item.taskId === taskId);
  return Number((claim && claim.claimedAt) || entry.timestamp || Date.now());
}

function findClaimRank(entry, taskId) {
  if (!entry || !Array.isArray(entry.claims)) {
    return 999;
  }
  const claim = entry.claims.find((item) => item.taskId === taskId);
  return claim ? Number(claim.rank || 999) : 999;
}

function sanitizeSummary(input) {
  const src = input && typeof input === "object" ? input : {};
  return {
    plannedMinutes: toNum(src.plannedMinutes),
    chaosPenaltyMinutes: toNum(src.chaosPenaltyMinutes),
    totalMinutes: toNum(src.totalMinutes),
    remainingMinutes: toNum(src.remainingMinutes),
    wellbeingTaskCount: toNum(src.wellbeingTaskCount),
    wellbeingBreakMinutes: toNum(src.wellbeingBreakMinutes),
    wellbeingScore: toNum(src.wellbeingScore),
    overloadMinutes: toNum(src.overloadMinutes),
    channelHandled: toNum(src.channelHandled),
    channelCorrect: toNum(src.channelCorrect),
    channelDeferred: toNum(src.channelDeferred),
    channelMissed: toNum(src.channelMissed),
    channelFalseFires: toNum(src.channelFalseFires),
    channelAccuracy: toNum(src.channelAccuracy),
    focusWorkedSec: toNum(src.focusWorkedSec),
    focusProducedSec: toNum(src.focusProducedSec),
    interruptionCount: toNum(src.interruptionCount),
    unclearTaskCount: toNum(src.unclearTaskCount),
    clarityMatchCount: toNum(src.clarityMatchCount),
    completedTaskCount: toNum(src.completedTaskCount),
    completedBusinessValue: toNum(src.completedBusinessValue),
    businessAlignmentScore: toNum(src.businessAlignmentScore),
    deliveryScore: toNum(src.deliveryScore),
    workdayConsumedMinutes: toNum(src.workdayConsumedMinutes),
    holdCount: toNum(src.holdCount),
    holdMinutes: toNum(src.holdMinutes)
  };
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function resolveConnectionString() {
  return (
    process.env.SQL_CONNECTION_STRING ||
    process.env.SQLAZURECONNSTR_SQL_CONNECTION_STRING ||
    process.env.SQLCONNSTR_SQL_CONNECTION_STRING ||
    ""
  ).trim();
}

function getPool() {
  if (!poolPromise) {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
      throw new Error("Missing SQL connection string. Set SQL_CONNECTION_STRING in Static Web App settings.");
    }
    poolPromise = sql.connect(connectionString);
  }
  return poolPromise;
}

async function readAppState(pool, id) {
  const result = await pool.request()
    .input("id", sql.NVarChar(200), id)
    .query("SELECT payload FROM app_state WHERE id = @id");

  if (!result.recordset.length) {
    return null;
  }

  return safeJsonParse(result.recordset[0].payload);
}

async function upsertAppState(pool, id, payload) {
  await pool.request()
    .input("id", sql.NVarChar(200), id)
    .input("payload", sql.NVarChar(sql.MAX), JSON.stringify(payload))
    .input("updated_at", sql.DateTime2, new Date())
    .query(`
      MERGE app_state AS target
      USING (VALUES (@id, @payload, @updated_at)) AS source (id, payload, updated_at)
      ON target.id = source.id
      WHEN MATCHED THEN UPDATE SET payload = source.payload, updated_at = source.updated_at
      WHEN NOT MATCHED THEN INSERT (id, payload, updated_at) VALUES (source.id, source.payload, source.updated_at);
    `);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function normalizeSessionId(sessionId) {
  return String(sessionId || "").trim().toUpperCase();
}

function sessionStateId(sessionId) {
  return `${SESSION_PREFIX}${normalizeSessionId(sessionId)}`;
}

function answerStateId({ sessionId, phase, participantId }) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const normalizedPhase = String(phase || "idle");
  const normalizedParticipantId = String(participantId || "");
  return `${ANSWER_PREFIX}${normalizedSessionId}:${normalizedPhase}:${normalizedParticipantId}`;
}

function claimStateId({ sessionId, phase, participantId }) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const normalizedPhase = String(phase || "idle");
  const normalizedParticipantId = String(participantId || "");
  return `${CLAIM_PREFIX}${normalizedSessionId}:${normalizedPhase}:${normalizedParticipantId}`;
}

function presenceStateId({ sessionId, participantId }) {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const normalizedParticipantId = String(participantId || "");
  return `${PRESENCE_PREFIX}${normalizedSessionId}:${normalizedParticipantId}`;
}

function phaseMessage(phase) {
  const opts = arguments[1] || {};
  if (phase === "digitalStress") {
    return "Digital stress: build a top-10 plan that fits in an 8-hour workday.";
  }
  if (phase === "workloadChaos") {
    return "Chaos: interruptions and social choices cost time. Balance delivery with sustainability.";
  }
  if (phase === "briefing") {
    const slide = Number(opts.slide || 1);
    const total = Number(opts.total || DEFAULT_BRIEFING_SLIDES);
    return `Briefing in progress: slide ${slide}/${total}.`;
  }
  if (phase === "results") {
    return "Thanks. Results are now being presented.";
  }
  return "Waiting for activation.";
}

function buildAutoTransitionedSession(session) {
  if (!session || session.phase !== "digitalStress") {
    return null;
  }
  if (!session.deadlineMs || Date.now() < Number(session.deadlineMs)) {
    return null;
  }

  const chaosDuration = sanitizeDurationSec(session.chaosDurationSec, DEFAULT_CHAOS_DURATION_SEC);

  return {
    ...session,
    phase: "workloadChaos",
    deadlineMs: Date.now() + chaosDuration * 1000,
    message: phaseMessage("workloadChaos"),
    updatedAt: Date.now()
  };
}

function applyAutoPhaseTransitionMemory(session) {
  const updated = buildAutoTransitionedSession(session);
  if (updated) {
    Object.assign(session, updated);
  }
}

function sanitizeDurationSec(value, fallback) {
  const num = Number(value);
  const base = Number.isFinite(num) && num > 0 ? num : Number(fallback || DEFAULT_STRESS_DURATION_SEC);
  return Math.max(10, Math.min(3600, Math.round(base)));
}

function sanitizeTaskWaveSeconds(value, fallback) {
  const num = Number(value);
  const base = Number.isFinite(num) && num > 0 ? num : Number(fallback || DEFAULT_TASK_WAVE_SECONDS);
  return Math.max(5, Math.min(120, Math.round(base)));
}

module.exports = {
  createPresentationStore() {
    if (resolveConnectionString()) {
      return new SqlPresentationStore();
    }
    return new MemoryPresentationStore();
  }
};
