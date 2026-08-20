/**
 * Migrerar app_state-data från SQL Server till PostgreSQL.
 *
 * Syfte:
 * - Bevara befintlig data i huvudappen när /api/state byter till Postgres.
 * - Appar förblir separata, men backend-plattformen blir samma som UtbBokning.
 *
 * Körning (PowerShell i repo-roten):
 *   node migrate-app-state-to-pg.js
 *
 * Miljövariabler:
 * - SQL_CONNECTION_STRING (källa: SQL Server)
 * - RISE_PG_CONNECTION_STRING eller PG_CONNECTION_STRING eller DATABASE_URL (mål: Postgres)
 */

const mssql = require('./api/node_modules/mssql');
const { Pool } = require('./api/node_modules/pg');

function resolveSqlConnectionString() {
  return (
    process.env.SQL_CONNECTION_STRING ||
    process.env.SQLAZURECONNSTR_SQL_CONNECTION_STRING ||
    process.env.SQLCONNSTR_SQL_CONNECTION_STRING ||
    ''
  ).trim();
}

function resolvePgConnectionString() {
  return (
    process.env.RISE_PG_CONNECTION_STRING ||
    process.env.PG_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    process.env.UTBBOKNING_PG_CONNECTION_STRING ||
    ''
  ).trim();
}

async function ensurePgTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.app_state (
      id text PRIMARY KEY,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS app_state_updated_at_idx
    ON public.app_state (updated_at DESC);
  `);
}

function toIsoTimestamp(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

async function main() {
  const sqlConnectionString = resolveSqlConnectionString();
  const pgConnectionString = resolvePgConnectionString();

  if (!sqlConnectionString) {
    throw new Error('Missing SQL_CONNECTION_STRING for source database.');
  }

  if (!pgConnectionString) {
    throw new Error('Missing PostgreSQL connection string for target database.');
  }

  console.log('Ansluter till SQL Server-källa...');
  const sqlPool = await new mssql.ConnectionPool(sqlConnectionString).connect();

  console.log('Ansluter till PostgreSQL-mål...');
  const pgPool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  try {
    await ensurePgTable(pgPool);

    console.log('Läser rader från SQL app_state...');
    const sqlResult = await sqlPool
      .request()
      .query('SELECT id, payload, updated_at FROM app_state ORDER BY updated_at ASC');

    const rows = Array.isArray(sqlResult.recordset) ? sqlResult.recordset : [];
    console.log(`Hittade ${rows.length} rad(er).`);

    if (rows.length === 0) {
      console.log('Ingen data att migrera.');
      return;
    }

    let migrated = 0;
    for (const row of rows) {
      let parsedPayload;
      try {
        parsedPayload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      } catch {
        // Behåll rå payload om JSON är korrupt, för att undvika databortfall.
        parsedPayload = { rawPayload: String(row.payload || '') };
      }

      await pgPool.query(
        `
        INSERT INTO public.app_state (id, payload, updated_at)
        VALUES ($1, $2::jsonb, $3::timestamptz)
        ON CONFLICT (id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        `,
        [row.id, JSON.stringify(parsedPayload), toIsoTimestamp(row.updated_at)]
      );

      migrated += 1;
      if (migrated % 50 === 0 || migrated === rows.length) {
        console.log(`Migrerat ${migrated}/${rows.length}...`);
      }
    }

    console.log(`Klart. ${migrated} rad(er) migrerade till PostgreSQL.`);
  } finally {
    await sqlPool.close().catch(() => {});
    await pgPool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error('Migrering misslyckades:', error.message || error);
  process.exit(1);
});
