const sql = require("mssql");

const SESSION_PREFIX = "rto:stress:session:";
const RESULT_PREFIX = "rto:stress:result:";
const PRESENCE_PREFIX = "rto:stress:presence:";
const DEFAULT_DURATION_SEC = 600;

const memorySessions = new Map();
let poolPromise = null;

class MemoryStressStore {
  createSession() {
    const sessionId = `T${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const adminKey = `K${Math.random().toString(36).slice(2, 12)}`;
    memorySessions.set(sessionId, {
      sessionId,
      adminKey,
      phase: "idle",
      deadlineMs: null,
      durationSec: DEFAULT_DURATION_SEC,
      participants: new Set(),
      resultsByParticipant: {}
    });
    return { sessionId, adminKey };
  }

  getSession(sessionId) {
    return memorySessions.get(normalizeSessionId(sessionId)) || null;
  }

  activate({ sessionId, adminKey, phase, durationSec }) {
    const session = this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const nextPhase = String(phase || "idle");
    const nextDuration = sanitizeDurationSec(durationSec, session.durationSec || DEFAULT_DURATION_SEC);
    session.phase = nextPhase;
    session.durationSec = nextDuration;
    session.deadlineMs = nextPhase === "live" ? Date.now() + nextDuration * 1000 : null;
    return session;
  }

  participantState({ sessionId, participantId }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    if (session.phase === "live" && session.deadlineMs && Date.now() >= session.deadlineMs) {
      session.phase = "results";
      session.deadlineMs = null;
    }

    if (participantId) {
      session.participants.add(String(participantId));
    }

    return {
      sessionId: session.sessionId,
      phase: session.phase,
      deadlineMs: session.deadlineMs,
      durationSec: session.durationSec,
      participantCount: session.participants.size,
      submissions: Object.keys(session.resultsByParticipant).length
    };
  }

  submit({ sessionId, participantId, result }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }
    if (!participantId) {
      return false;
    }

    session.resultsByParticipant[String(participantId)] = {
      sessionId: session.sessionId,
      participantId: String(participantId),
      ...sanitizeResult(result),
      timestamp: Date.now()
    };
    return true;
  }

  getResults(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const rows = Object.values(session.resultsByParticipant);
    return aggregateResults(session, rows);
  }
}

class SqlStressStore {
  async createSession() {
    const pool = await getPool();
    const sessionId = `T${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const adminKey = `K${Math.random().toString(36).slice(2, 12)}`;
    const payload = {
      sessionId,
      adminKey,
      phase: "idle",
      deadlineMs: null,
      durationSec: DEFAULT_DURATION_SEC,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await upsertAppState(pool, sessionStateId(sessionId), payload);
    return { sessionId, adminKey };
  }

  async getSession(sessionId) {
    const id = sessionStateId(sessionId);
    if (!id) {
      return null;
    }
    const pool = await getPool();
    return readAppState(pool, id);
  }

  async activate({ sessionId, adminKey, phase, durationSec }) {
    const session = await this.getSession(sessionId);
    if (!session || session.adminKey !== adminKey) {
      return null;
    }

    const nextPhase = String(phase || "idle");
    const nextDuration = sanitizeDurationSec(durationSec, session.durationSec || DEFAULT_DURATION_SEC);
    const updated = {
      ...session,
      phase: nextPhase,
      durationSec: nextDuration,
      deadlineMs: nextPhase === "live" ? Date.now() + nextDuration * 1000 : null,
      updatedAt: Date.now()
    };

    const pool = await getPool();
    await upsertAppState(pool, sessionStateId(updated.sessionId), updated);
    return updated;
  }

  async participantState({ sessionId, participantId }) {
    let session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const pool = await getPool();

    if (session.phase === "live" && session.deadlineMs && Date.now() >= Number(session.deadlineMs)) {
      session = {
        ...session,
        phase: "results",
        deadlineMs: null,
        updatedAt: Date.now()
      };
      await upsertAppState(pool, sessionStateId(session.sessionId), session);
    }

    if (participantId) {
      await upsertAppState(pool, presenceStateId({ sessionId: session.sessionId, participantId }), {
        sessionId: session.sessionId,
        participantId: String(participantId),
        seenAt: Date.now()
      });
    }

    const presencePrefix = `${PRESENCE_PREFIX}${session.sessionId}:`;
    const presenceResult = await pool.request()
      .input("prefix", sql.NVarChar(200), presencePrefix)
      .query("SELECT COUNT(1) AS total FROM app_state WHERE id LIKE @prefix + '%' ");

    const resultPrefix = `${RESULT_PREFIX}${session.sessionId}:`;
    const resultCount = await pool.request()
      .input("prefix", sql.NVarChar(200), resultPrefix)
      .query("SELECT COUNT(1) AS total FROM app_state WHERE id LIKE @prefix + '%' ");

    return {
      sessionId: session.sessionId,
      phase: session.phase,
      deadlineMs: session.deadlineMs,
      durationSec: sanitizeDurationSec(session.durationSec, DEFAULT_DURATION_SEC),
      participantCount: Number((presenceResult.recordset[0] || {}).total || 0),
      submissions: Number((resultCount.recordset[0] || {}).total || 0)
    };
  }

  async submit({ sessionId, participantId, result }) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    if (!participantId) {
      return false;
    }

    const payload = {
      sessionId: session.sessionId,
      participantId: String(participantId),
      ...sanitizeResult(result),
      timestamp: Date.now()
    };

    const pool = await getPool();
    await upsertAppState(pool, resultStateId(payload), payload);
    return true;
  }

  async getResults(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("prefix", sql.NVarChar(200), `${RESULT_PREFIX}${session.sessionId}:`)
      .query("SELECT payload FROM app_state WHERE id LIKE @prefix + '%' ");

    const rows = result.recordset
      .map((row) => safeJsonParse(row.payload))
      .filter(Boolean);

    return aggregateResults(session, rows);
  }
}

function aggregateResults(session, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const leaderboard = safeRows
    .map((row) => ({
      participantId: String(row.participantId || "unknown"),
      stressScore: toNum(row.stressScore),
      throughput: toNum(row.throughput),
      errorRate: toNum(row.errorRate),
      missedDeadlines: toNum(row.missedDeadlines)
    }))
    .sort((a, b) => a.stressScore - b.stressScore)
    .slice(0, 20);

  const stressValues = safeRows.map((row) => toNum(row.stressScore)).sort((a, b) => a - b);
  const medianStress = stressValues.length
    ? stressValues[Math.floor(stressValues.length / 2)]
    : 0;

  const avgStress = stressValues.length
    ? round1(stressValues.reduce((sum, n) => sum + n, 0) / stressValues.length)
    : 0;

  return {
    sessionId: session.sessionId,
    phase: session.phase,
    participantCount: safeRows.length,
    medianStress: round1(medianStress),
    avgStress,
    leaderboard
  };
}

function sanitizeResult(input) {
  const src = input && typeof input === "object" ? input : {};
  return {
    stressScore: toNum(src.stressScore),
    throughput: toNum(src.throughput),
    errorRate: toNum(src.errorRate),
    missedDeadlines: toNum(src.missedDeadlines),
    rtVarianceNorm: toNum(src.rtVarianceNorm),
    nasaTlX: toNum(src.nasaTlX),
    score: toNum(src.score)
  };
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
    const cs = resolveConnectionString();
    if (!cs) {
      throw new Error("Missing SQL connection string. Set SQL_CONNECTION_STRING.");
    }
    poolPromise = sql.connect(cs);
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

function normalizeSessionId(sessionId) {
  const value = String(sessionId || "").trim().toUpperCase();
  return value || "";
}

function sessionStateId(sessionId) {
  const sid = normalizeSessionId(sessionId);
  return sid ? `${SESSION_PREFIX}${sid}` : "";
}

function resultStateId({ sessionId, participantId }) {
  return `${RESULT_PREFIX}${normalizeSessionId(sessionId)}:${String(participantId || "")}`;
}

function presenceStateId({ sessionId, participantId }) {
  return `${PRESENCE_PREFIX}${normalizeSessionId(sessionId)}:${String(participantId || "")}`;
}

function sanitizeDurationSec(value, fallback) {
  const num = Number(value);
  const base = Number.isFinite(num) && num > 0 ? num : Number(fallback || DEFAULT_DURATION_SEC);
  return Math.max(60, Math.min(1200, Math.round(base)));
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

module.exports = {
  createStressStore() {
    if (resolveConnectionString()) {
      return new SqlStressStore();
    }
    return new MemoryStressStore();
  }
};
