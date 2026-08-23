const crypto = require('crypto');
const { Pool } = require('pg');

const poolByConnectionString = new Map();

function resolvePgConnectionString() {
  return (
    process.env.RADDNINGSTJANSTEN_PG_CONNECTION_STRING ||
    process.env.PG_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    ''
  ).trim();
}

function getPool() {
  const connectionString = resolvePgConnectionString();
  if (!connectionString) {
    throw new Error('Missing PostgreSQL connection string for Familjelistan API.');
  }

  if (!poolByConnectionString.has(connectionString)) {
    poolByConnectionString.set(
      connectionString,
      new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      })
    );
  }

  return poolByConnectionString.get(connectionString);
}

async function ensureAppStateTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id text PRIMARY KEY,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS app_state_updated_at_idx
    ON app_state (updated_at DESC)
  `);
}

function json(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body,
  };
}

async function getState(pool, id) {
  const result = await pool.query(
    'SELECT payload FROM app_state WHERE id = $1',
    [id]
  );
  return result.rows.length ? result.rows[0].payload : null;
}

async function putState(pool, id, payload) {
  await pool.query(
    `
    INSERT INTO app_state (id, payload, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
    [id, JSON.stringify(payload)]
  );
}

async function listStateByPrefix(pool, prefix) {
  const result = await pool.query(
    'SELECT id, payload FROM app_state WHERE id LIKE $1 ORDER BY updated_at DESC',
    [`${prefix}%`]
  );
  return result.rows;
}

function normalizeEmail(input) {
  return String(input || '').trim().toLowerCase();
}

function assertEmail(email) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Ogiltig e-postadress');
  }
}

function assertPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Lösenord måste vara minst 8 tecken');
  }
}

function hashPassword(password, saltHex) {
  return crypto.pbkdf2Sync(password, saltHex, 120000, 64, 'sha512').toString('hex');
}

function signSession(userId) {
  return `${userId}.${crypto.randomBytes(18).toString('hex')}`;
}

function parseBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function userByIdKey(userId) {
  return `fl:user:${userId}`;
}

function userByEmailKey(email) {
  return `fl:user-email:${encodeURIComponent(email)}`;
}

function householdKey(householdId) {
  return `fl:household:${householdId}`;
}

function listKey(listId) {
  return `fl:list:${listId}`;
}

function tripKey(tripId) {
  return `fl:trip:${tripId}`;
}

function nowIso() {
  return new Date().toISOString();
}

function mapUserForClient(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

function defaultStore() {
  return {
    id: 'default-store',
    name: 'Standardbutik',
    chain: 'Okand',
    lat: 0,
    lng: 0,
  };
}

async function requireAuthUser(req, pool) {
  const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!auth || !String(auth).startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = String(auth).slice(7);
  const userId = token.split('.')[0];
  if (!userId) throw new Error('Unauthorized');

  const user = await getState(pool, userByIdKey(userId));
  if (!user || user.token !== token) {
    throw new Error('Unauthorized');
  }

  return user;
}

module.exports = {
  getPool,
  ensureAppStateTable,
  json,
  getState,
  putState,
  listStateByPrefix,
  normalizeEmail,
  assertEmail,
  assertPassword,
  hashPassword,
  signSession,
  parseBody,
  userByIdKey,
  userByEmailKey,
  householdKey,
  listKey,
  tripKey,
  nowIso,
  mapUserForClient,
  defaultStore,
  requireAuthUser,
};
