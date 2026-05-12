const sql = require("mssql");

const SESSION_PREFIX = "rto:presentation:session:";
const ANSWER_PREFIX = "rto:presentation:answer:";
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
      answers: [],
      submissionsByPhase: {}
    };
    sessions.set(sessionId, record);
    return { sessionId, adminKey };
  }

  getSession(sessionId) {
    return sessions.get((sessionId || "").toUpperCase()) || null;
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
    return session;
  }

  submit({ sessionId, participantId, choice, responseTimeMs }) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    if (!participantId || !choice) {
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
      choice,
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

  getResults(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const counts = {};
    session.answers.forEach((item) => {
      if (item.phase !== session.phase && session.phase !== "results") {
        return;
      }
      counts[item.choice] = (counts[item.choice] || 0) + 1;
    });

    return {
      phase: session.phase,
      totalAnswers: Object.values(counts).reduce((sum, value) => sum + value, 0),
      counts
    };
  }
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

  async submit({ sessionId, participantId, choice, responseTimeMs }) {
    if (!participantId || !choice) {
      return false;
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const answer = {
      sessionId: session.sessionId,
      participantId: String(participantId),
      phase: session.phase,
      choice: String(choice),
      responseTimeMs: responseTimeMs == null ? null : Number(responseTimeMs),
      timestamp: Date.now()
    };

    const pool = await getPool();
    await upsertAppState(pool, answerStateId(answer), answer);
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

  async getResults(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("prefix", sql.NVarChar(200), `${ANSWER_PREFIX}${session.sessionId}:`)
      .query("SELECT payload FROM app_state WHERE id LIKE @prefix + '%' ");

    const counts = {};
    for (const row of result.recordset) {
      const answer = safeJsonParse(row.payload);
      if (!answer || !answer.choice) {
        continue;
      }
      if (session.phase !== "results" && answer.phase !== session.phase) {
        continue;
      }
      counts[answer.choice] = (counts[answer.choice] || 0) + 1;
    }

    return {
      phase: session.phase,
      totalAnswers: Object.values(counts).reduce((sum, value) => sum + value, 0),
      counts
    };
  }
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

function phaseMessage(phase) {
  if (phase === "digitalStress") {
    return "Du har 60 sekunder. Valj vad du gor forst nar allt kommer samtidigt.";
  }
  if (phase === "workloadChaos") {
    return "Prioritera under tidspress. Du har 90 sekunder pa dig.";
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
