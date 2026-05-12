const sql = require("mssql");

const SESSION_PREFIX = "rto:presentation:session:";
const ANSWER_PREFIX = "rto:presentation:answer:";
const CLAIM_PREFIX = "rto:presentation:claim:";

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
      message: "Vantar pa att admin startar scenariot.",
      deadlineMs: null,
      createdAt: Date.now(),
      submissionsByPhase: {},
      answers: [],
      claims: {}
    };
    sessions.set(sessionId, record);
    return { sessionId, adminKey };
  }

  getSession(sessionId) {
    return sessions.get(normalizeSessionId(sessionId)) || null;
  }

  activate({ sessionId, adminKey, phase, durationSec }) {
    const session = this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const ms = Number(durationSec || 0) * 1000;
    session.phase = phase;
    session.deadlineMs = ms > 0 ? Date.now() + ms : null;
    session.message = phaseMessage(phase);
    if (!session.submissionsByPhase[phase]) {
      session.submissionsByPhase[phase] = new Set();
    }
    if (!session.claims[phase]) {
      session.claims[phase] = {};
    }
    return session;
  }

  claim({ sessionId, participantId, claims }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }
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
    if (!participantId || !Array.isArray(ranking) || ranking.length === 0) {
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

    const phase = session.phase;
    const phaseSet = session.submissionsByPhase[phase] || new Set();
    const submitted = phaseSet.has(`${phase}:${participantId}`);

    return {
      phase: session.phase,
      message: session.message,
      deadlineMs: session.deadlineMs,
      submitted
    };
  }

  getConflicts({ sessionId, participantId }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

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
}

function buildAggregateResults({ phase, answers }) {
  const counts = {};
  let deliveryScoreSum = 0;
  let wellbeingScoreSum = 0;
  let overloadMinutesSum = 0;
  let channelAccuracySum = 0;
  let focusEfficiencySum = 0;
  let clarityMatchRateSum = 0;
  let participants = 0;

  (answers || []).forEach((item) => {
    if (!Array.isArray(item.ranking)) {
      return;
    }
    participants += 1;

    item.ranking.forEach((rank, idx) => {
      if (rank.taskId) {
        counts[rank.taskId] = (counts[rank.taskId] || 0) + 1;
        const weight = Math.max(1, 10 - idx);
        deliveryScoreSum += weight * (rank.wellbeing ? 0.5 : 1);
      }
    });

    const s = sanitizeSummary(item.summary);
    wellbeingScoreSum += s.wellbeingScore;
    overloadMinutesSum += s.overloadMinutes;
    channelAccuracySum += s.channelAccuracy;

    const focusEfficiency = s.focusWorkedSec > 0
      ? (s.focusProducedSec / s.focusWorkedSec) * 100
      : 0;
    focusEfficiencySum += focusEfficiency;

    const clarityRate = s.unclearTaskCount > 0
      ? (s.clarityMatchCount / s.unclearTaskCount) * 100
      : 0;
    clarityMatchRateSum += clarityRate;
  });

  return {
    phase,
    totalAnswers: Object.values(counts).reduce((sum, value) => sum + value, 0),
    participants,
    counts,
    metrics: {
      avgDeliveryScore: participants ? round1(deliveryScoreSum / participants) : 0,
      avgWellbeingScore: participants ? round1(wellbeingScoreSum / participants) : 0,
      avgOverloadMinutes: participants ? round1(overloadMinutesSum / participants) : 0,
      avgChannelAccuracy: participants ? round1(channelAccuracySum / participants) : 0,
      avgFocusEfficiency: participants ? round1(focusEfficiencySum / participants) : 0,
      avgClarityMatchRate: participants ? round1(clarityMatchRateSum / participants) : 0
    }
  };
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
  async createSession() {
    const pool = await getPool();
    const sessionId = `S${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const adminKey = `A${Math.random().toString(36).slice(2, 12)}`;
    const record = {
      sessionId,
      adminKey,
      phase: "idle",
      message: "Vantar pa att admin startar scenariot.",
      deadlineMs: null,
      createdAt: Date.now()
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

  async activate({ sessionId, adminKey, phase, durationSec }) {
    const session = await this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const ms = Number(durationSec || 0) * 1000;
    const updated = {
      ...session,
      phase,
      deadlineMs: ms > 0 ? Date.now() + ms : null,
      message: phaseMessage(phase),
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

    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

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
    if (!participantId || !Array.isArray(ranking) || ranking.length === 0) {
      return false;
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

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

  async participantState({ sessionId, participantId }) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const pool = await getPool();
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
      submitted
    };
  }

  async getConflicts({ sessionId, participantId }) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

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
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

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
    clarityMatchCount: toNum(src.clarityMatchCount)
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

function phaseMessage(phase) {
  if (phase === "digitalStress") {
    return "Digital stress: bygg en topp-10 plan som far plats i en 8h arbetsdag.";
  }
  if (phase === "workloadChaos") {
    return "Chaos: avbrott och sociala val kostar tid. Hall balansen mellan leverans och hallbarhet.";
  }
  if (phase === "results") {
    return "Tack. Resultat presenteras nu.";
  }
  return "Vantar pa aktivering.";
}

module.exports = {
  createPresentationStore() {
    if (resolveConnectionString()) {
      return new SqlPresentationStore();
    }
    return new MemoryPresentationStore();
  }
};
