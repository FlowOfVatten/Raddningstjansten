const crypto = require("crypto");
const sql = require("mssql");

let poolPromise = null;
const USER_ID_PREFIX = "rto:16woh:user:";
const LEGACY_USER_ID_PREFIX = "woh:user:";

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

function json(status, body) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body,
  };
}

function normalizeUsername(input) {
  return String(input || "").trim().toLowerCase();
}

function assertUsername(username) {
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new Error("Användarnamn måste vara 3-40 tecken: a-z, 0-9, punkt, underscore eller bindestreck.");
  }
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Lösenord måste vara minst 6 tecken.");
  }
}

function normalizeSecurityAnswer(answer) {
  return String(answer || "").trim().toLowerCase();
}

function assertSecurityQuestion(question) {
  const q = String(question || "").trim();
  if (q.length < 5 || q.length > 200) {
    throw new Error("Säkerhetsfråga måste vara 5-200 tecken.");
  }
  return q;
}

function assertSecurityAnswer(answer) {
  const a = String(answer || "").trim();
  if (a.length < 2 || a.length > 200) {
    throw new Error("Svar på säkerhetsfråga måste vara 2-200 tecken.");
  }
  return a;
}

function asNumber(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${fieldName} måste vara ett positivt tal.`);
  }
  return n;
}

function asDateISO(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error(`${fieldName} måste vara i format YYYY-MM-DD.`);
  }
  return String(value);
}

function assertBreakfastKey(value) {
  const breakfastKey = String(value || "").trim();
  const allowed = new Set([
    "frukost-omelett",
    "frukost-kvarg",
    "frukost-gröt",
    "frukost-agg-kalkon",
    "frukost-yoghurt",
  ]);

  if (!allowed.has(breakfastKey)) {
    throw new Error("Välj ett giltigt frukostalternativ.");
  }

  return breakfastKey;
}

function hashPassword(password, saltHex) {
  return crypto.pbkdf2Sync(password, saltHex, 120000, 64, "sha512").toString("hex");
}

function newToken() {
  return crypto.randomBytes(24).toString("hex");
}

function userKey(username) {
  return `${USER_ID_PREFIX}${username}`;
}

function legacyUserKey(username) {
  return `${LEGACY_USER_ID_PREFIX}${username}`;
}

async function loadUser(pool, username) {
  const keys = [userKey(username), legacyUserKey(username)];

  for (const key of keys) {
    const result = await pool
      .request()
      .input("id", sql.NVarChar(200), key)
      .query("SELECT payload FROM app_state WHERE id = @id");

    if (!result.recordset.length) {
      continue;
    }

    try {
      return JSON.parse(result.recordset[0].payload);
    } catch (_err) {
      return null;
    }
  }

  return null;
}

async function saveUser(pool, username, payload) {
  await pool
    .request()
    .input("id", sql.NVarChar(200), userKey(username))
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

function sanitizeUser(user) {
  return {
    username: user.username,
    profile: user.profile || null,
    checkins: Array.isArray(user.checkins)
      ? [...user.checkins].sort((a, b) => (a.weekIndex || 0) - (b.weekIndex || 0))
      : [],
  };
}

function verifyToken(user, token) {
  if (!token || user.token !== token) {
    throw new Error("Ogiltig session. Logga in igen.");
  }
}

function calcWeekIndex(startDateIso, checkinDateIso) {
  const start = new Date(`${startDateIso}T00:00:00`);
  const check = new Date(`${checkinDateIso}T00:00:00`);
  const diff = Math.floor((check - start) / 86400000);
  if (diff < 0) {
    throw new Error("Uppföljningsdatum kan inte vara före startdatum.");
  }
  return Math.floor(diff / 7);
}

module.exports = async function (context, req) {
  const method = (req.method || "").toUpperCase();
  const data = method === "GET" ? req.query || {} : (req.body || {});
  const action = String(data.action || "").toLowerCase();

  if (!["get", "post"].includes(method.toLowerCase())) {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const pool = await getPool();

    if (action === "register") {
      const username = normalizeUsername(data.username);
      const password = String(data.password || "");
      const securityQuestion = assertSecurityQuestion(data.securityQuestion);
      const securityAnswer = assertSecurityAnswer(data.securityAnswer);
      assertUsername(username);
      assertPassword(password);

      const heightCm = asNumber(data.heightCm, "Längd");
      const startWeightKg = asNumber(data.startWeightKg, "Startvikt");
      const startWaistCm = asNumber(data.startWaistCm, "Midjemått");
      const startDate = asDateISO(data.startDate, "Startdatum");
      const breakfastKey = assertBreakfastKey(data.breakfastKey);

  const trainingMode = data.trainingMode === "hemma" ? "hemma" : "gym";

  const existing = await loadUser(pool, username);
      if (existing) {
        return json(409, { error: "Användarnamn finns redan." });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const token = newToken();
      const now = new Date().toISOString();
      const profile = { heightCm, startWeightKg, startWaistCm, startDate, breakfastKey, trainingMode };
      const initialCheckin = {
        weekIndex: 0,
        date: startDate,
        weightKg: startWeightKg,
        waistCm: startWaistCm,
        note: "Startvärden",
        createdAt: now,
      };

      const user = {
        username,
        passwordPlain: password,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
        securityQuestion,
        securityAnswerHash: hashPassword(normalizeSecurityAnswer(securityAnswer), salt),
        token,
        profile,
        checkins: [initialCheckin],
        createdAt: now,
        updatedAt: now,
      };

      await saveUser(pool, username, user);
      return json(200, { ok: true, token, user: sanitizeUser(user) });
    }

    if (action === "login") {
      const username = normalizeUsername(data.username);
      const password = String(data.password || "");
      assertUsername(username);
      assertPassword(password);

      const user = await loadUser(pool, username);
      if (!user) {
        return json(404, { error: "Konto hittades inte." });
      }

      const hashed = hashPassword(password, user.passwordSalt);
      if (hashed !== user.passwordHash) {
        return json(401, { error: "Fel lösenord." });
      }

      user.token = newToken();
      user.updatedAt = new Date().toISOString();
      await saveUser(pool, username, user);
      return json(200, { ok: true, token: user.token, user: sanitizeUser(user) });
    }

    if (action === "getsecurityquestion") {
      const username = normalizeUsername(data.username);
      assertUsername(username);

      const user = await loadUser(pool, username);
      if (!user) {
        return json(404, { error: "Konto hittades inte." });
      }

      if (!user.securityQuestion) {
        return json(400, { error: "Kontot saknar säkerhetsfråga. Skapa nytt konto eller kontakta admin." });
      }

      return json(200, { ok: true, securityQuestion: user.securityQuestion });
    }

    if (action === "recoverpassword") {
      const username = normalizeUsername(data.username);
      const securityAnswer = assertSecurityAnswer(data.securityAnswer);
      assertUsername(username);

      const user = await loadUser(pool, username);
      if (!user) {
        return json(404, { error: "Konto hittades inte." });
      }

      if (!user.securityQuestion || !user.securityAnswerHash) {
        return json(400, { error: "Kontot saknar säkerhetsfråga. Skapa nytt konto eller kontakta admin." });
      }

      const expected = user.securityAnswerHash;
      const actual = hashPassword(normalizeSecurityAnswer(securityAnswer), user.passwordSalt);
      if (actual !== expected) {
        return json(401, { error: "Fel svar på säkerhetsfrågan." });
      }

      if (!user.passwordPlain) {
        return json(400, { error: "Lösenord i klartext saknas för detta konto." });
      }

      return json(200, { ok: true, password: user.passwordPlain });
    }

    if (action === "getsession") {
      const username = normalizeUsername(data.username);
      const token = String(data.token || "");
      assertUsername(username);

      const user = await loadUser(pool, username);
      if (!user) {
        return json(404, { error: "Konto hittades inte." });
      }

      verifyToken(user, token);
      return json(200, { ok: true, user: sanitizeUser(user) });
    }

    if (action === "saveprofile") {
      const username = normalizeUsername(data.username);
      const token = String(data.token || "");
      assertUsername(username);

      const user = await loadUser(pool, username);
      if (!user) {
        return json(404, { error: "Konto hittades inte." });
      }
      verifyToken(user, token);

      user.profile = {
        heightCm: asNumber(data.heightCm, "Längd"),
        startWeightKg: asNumber(data.startWeightKg, "Startvikt"),
        startWaistCm: asNumber(data.startWaistCm, "Midjemått"),
        startDate: asDateISO(data.startDate, "Startdatum"),
        breakfastKey: assertBreakfastKey(data.breakfastKey),
        trainingMode: data.trainingMode === "hemma" ? "hemma" : "gym",
      };
      user.updatedAt = new Date().toISOString();

      await saveUser(pool, username, user);
      return json(200, { ok: true, user: sanitizeUser(user) });
    }

    if (action === "addcheckin") {
      const username = normalizeUsername(data.username);
      const token = String(data.token || "");
      assertUsername(username);

      const user = await loadUser(pool, username);
      if (!user) {
        return json(404, { error: "Konto hittades inte." });
      }
      verifyToken(user, token);

      if (!user.profile || !user.profile.startDate) {
        throw new Error("Spara profil med startdatum först.");
      }

      const checkinDate = asDateISO(data.checkinDate, "Uppföljningsdatum");
      const weekIndex = calcWeekIndex(user.profile.startDate, checkinDate);
      const entry = {
        weekIndex,
        date: checkinDate,
        weightKg: asNumber(data.weightKg, "Vikt"),
        waistCm: asNumber(data.waistCm, "Midjemått"),
        note: String(data.note || "").slice(0, 200),
        createdAt: new Date().toISOString(),
      };

      const list = Array.isArray(user.checkins) ? user.checkins : [];
      const idx = list.findIndex((x) => Number(x.weekIndex) === weekIndex);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...entry };
      } else {
        list.push(entry);
      }

      user.checkins = list;
      user.updatedAt = new Date().toISOString();

      await saveUser(pool, username, user);
      return json(200, { ok: true, user: sanitizeUser(user) });
    }

    if (action === "deletecheckin") {
      const username = normalizeUsername(data.username);
      const token = String(data.token || "");
      assertUsername(username);

      const user = await loadUser(pool, username);
      if (!user) {
        return json(404, { error: "Konto hittades inte." });
      }
      verifyToken(user, token);

      const weekIndex = Number(data.weekIndex);
      if (!Number.isFinite(weekIndex)) {
        return json(400, { error: "Ogiltig vecka." });
      }

      const list = Array.isArray(user.checkins) ? user.checkins : [];
      const idx = list.findIndex((x) => Number(x.weekIndex) === weekIndex);
      if (idx < 0) {
        return json(404, { error: `Ingen uppföljning hittades för vecka ${weekIndex}.` });
      }

      list.splice(idx, 1);
      user.checkins = list;
      user.updatedAt = new Date().toISOString();

      await saveUser(pool, username, user);
      return json(200, { ok: true, user: sanitizeUser(user) });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    context.log.error("woh-account error", err);
    return json(500, { error: err.message || "Serverfel" });
  }
};
