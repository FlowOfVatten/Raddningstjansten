const { Pool } = require('pg');

const poolByConnectionString = new Map();
const DEFAULT_PG_CONNECTION_STRING = 'postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects?sslmode=no-verify';

function resolvePgConnectionString() {
  return (
    process.env.RADDNINGSTJANSTEN_PG_CONNECTION_STRING ||
    process.env.STATE_PG_CONNECTION_STRING ||
    process.env.UTBBOKNING_PG_CONNECTION_STRING ||
    process.env.UTBBOKNING_DATABASE_URL ||
    process.env.RISE_PG_CONNECTION_STRING ||
    process.env.PG_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    DEFAULT_PG_CONNECTION_STRING
  ).trim();
}

function forceDatabaseInPgConnectionString(connectionString, databaseName) {
  if (!connectionString) return '';

  try {
    const parsed = new URL(connectionString);
    parsed.pathname = `/${databaseName}`;
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

function resolveUrfPgConnectionString() {
  const explicit = (process.env.URF_PG_CONNECTION_STRING || '').trim();
  if (explicit) return explicit;
  return forceDatabaseInPgConnectionString(resolvePgConnectionString(), 'urf');
}

function isUrfStateId(id) {
  return typeof id === 'string' && id.startsWith('urf:');
}

function countTotalCollected(foodCoupons) {
  if (!foodCoupons || typeof foodCoupons !== 'object') return 0;
  let total = 0;
  ['friday', 'saturday'].forEach((day) => {
    if (!Array.isArray(foodCoupons[day])) return;
    foodCoupons[day].forEach((row) => {
      total += (row.lunchCollected || 0) + (row.dinnerCollected || 0);
    });
  });
  return total;
}

function maskConnectionString(value) {
  return String(value || '')
    .replace(/(password\s*=\s*)[^;]+/gi, '$1***')
    .replace(/(pwd\s*=\s*)[^;]+/gi, '$1***')
    .replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2');
}

function getPool(connectionString) {
  const normalized = String(connectionString || '').trim();
  if (!normalized) {
    throw new Error('Missing PostgreSQL connection string.');
  }

  if (!poolByConnectionString.has(normalized)) {
    poolByConnectionString.set(
      normalized,
      new Pool({
        connectionString: normalized,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
      })
    );
  }

  return poolByConnectionString.get(normalized);
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

async function testConnection(connectionString) {
  if (!connectionString) {
    return { ok: false, message: 'Connection string is empty.' };
  }

  const client = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 5000,
    max: 1
  });

  try {
    const result = await client.query('SELECT NOW() AS now_utc');
    return { ok: true, message: 'connected', nowUtc: result.rows?.[0]?.now_utc || null };
  } catch (err) {
    return { ok: false, message: err.message, code: err.code || null };
  } finally {
    await client.end().catch(() => {});
  }
}

function json(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body
  };
}

module.exports = async function (context, req) {
  const method = String(req.method || '').toUpperCase();

  if (req.query.debug === 'true') {
    const mainConnStr = resolvePgConnectionString();
    const urfConnStrExplicit = (process.env.URF_PG_CONNECTION_STRING || '').trim();
    const urfConnStr = resolveUrfPgConnectionString();
    const debugId = req.query.id || '';
    const routeIsUrf = isUrfStateId(debugId);
    const selectedConnStr = routeIsUrf ? urfConnStr : mainConnStr;

    return json(200, {
      debug: {
        RADDNINGSTJANSTEN_PG_CONNECTION_STRING: {
          exists: !!process.env.RADDNINGSTJANSTEN_PG_CONNECTION_STRING,
          masked: maskConnectionString(mainConnStr),
          length: mainConnStr.length,
          probe: await testConnection(mainConnStr)
        },
        STATE_PG_CONNECTION_STRING: {
          exists: !!process.env.STATE_PG_CONNECTION_STRING,
          note: 'Optional alias for root app /api/state',
          probe: await testConnection((process.env.STATE_PG_CONNECTION_STRING || '').trim())
        },
        LEGACY_RISE_PG_CONNECTION_STRING: {
          exists: !!process.env.RISE_PG_CONNECTION_STRING,
          note: 'Legacy fallback only',
          probe: await testConnection((process.env.RISE_PG_CONNECTION_STRING || '').trim())
        },
        UTBBOKNING_PG_CONNECTION_STRING: {
          exists: !!process.env.UTBBOKNING_PG_CONNECTION_STRING,
          note: 'Shared fallback with UtbBokning',
          probe: await testConnection((process.env.UTBBOKNING_PG_CONNECTION_STRING || '').trim())
        },
        defaultFallback: {
          exists: true,
          source: 'hardcoded-default',
          masked: maskConnectionString(DEFAULT_PG_CONNECTION_STRING),
          probe: await testConnection(DEFAULT_PG_CONNECTION_STRING)
        },
        URF_PG_CONNECTION_STRING: {
          exists: !!urfConnStrExplicit,
          source: urfConnStrExplicit ? 'URF_PG_CONNECTION_STRING' : 'derived-from-main-connection',
          masked: maskConnectionString(urfConnStr),
          length: urfConnStr.length,
          probe: await testConnection(urfConnStr)
        },
        selectedRoute: {
          id: debugId || null,
          route: debugId ? (routeIsUrf ? 'URF_DATABASE' : 'DEFAULT_DATABASE') : null,
          maskedConnectionString: maskConnectionString(selectedConnStr),
          probe: await testConnection(selectedConnStr)
        }
      }
    });
  }

  if (method === 'GET') {
    const id = req.query.id;
    if (!id) {
      return json(400, { error: 'id parameter required' });
    }

    try {
      const connectionString = isUrfStateId(id) ? resolveUrfPgConnectionString() : resolvePgConnectionString();
      const pool = getPool(connectionString);
      await ensureAppStateTable(pool);
      const result = await pool.query(
        'SELECT payload, updated_at FROM app_state WHERE id = $1',
        [id]
      );

      if (!result.rows.length) {
        return json(200, []);
      }

      const row = result.rows[0];
      return json(200, [{ payload: row.payload, updated_at: row.updated_at }]);
    } catch (err) {
      context.log.error('state GET error', err);
      return json(500, { error: err.message });
    }
  }

  if (method === 'PUT' || method === 'POST') {
    const row = Array.isArray(req.body) ? req.body[0] : req.body;
    const { id, payload, updated_at } = row || {};

    if (!id || payload == null) {
      return json(400, { error: 'id and payload required' });
    }

    const timestamp = updated_at || new Date().toISOString();
    const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;

    try {
      const connectionString = isUrfStateId(id) ? resolveUrfPgConnectionString() : resolvePgConnectionString();
      const pool = getPool(connectionString);
      await ensureAppStateTable(pool);

      if (isUrfStateId(id) && payloadObj && payloadObj.foodCoupons) {
        const existingResult = await pool.query(
          'SELECT payload FROM app_state WHERE id = $1',
          [id]
        );

        if (existingResult.rows.length > 0) {
          const existingPayload = existingResult.rows[0].payload || {};
          const existingTotal = countTotalCollected(existingPayload.foodCoupons);
          const newTotal = countTotalCollected(payloadObj.foodCoupons);

          if (newTotal === 0 && existingTotal > 0) {
            context.log.warn(`[URF-API] Blocking wipeout: existing total=${existingTotal}, new total=${newTotal}`);
            return json(409, {
              error: 'Cannot wipe out foodCoupons data',
              details: `Existing total=${existingTotal}, new total=${newTotal}`
            });
          }
        }
      }

      await pool.query(
        `
        INSERT INTO app_state (id, payload, updated_at)
        VALUES ($1, $2::jsonb, $3::timestamptz)
        ON CONFLICT (id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        `,
        [id, JSON.stringify(payloadObj), timestamp]
      );

      return json(200, { ok: true });
    } catch (err) {
      context.log.error('state PUT/POST error', err);
      return json(500, { error: err.message });
    }
  }

  return json(405, { error: 'Method not allowed' });
};
