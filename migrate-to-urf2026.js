/**
 * Migration script: copies all rows from app_state in 'urf' to 'urf2026'
 * Same server, same login.
 *
 * Usage:
 *   1. cd to this folder in PowerShell
 *   2. node migrate-to-urf2026.js
 */

const sql = require('./api/node_modules/mssql');

const SERVER   = 'tcp:raddningstjansten-db.database.windows.net,1433';
const USER     = 'raddningsadmin';
const PASSWORD = 'Raddn2026!';

const SOURCE_DB = 'urf';
const TARGET_DB = 'urf2026';

function makeConfig(database) {
  return {
    server: 'raddningstjansten-db.database.windows.net',
    port: 1433,
    database,
    user: USER,
    password: PASSWORD,
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    connectionTimeout: 30000,
    requestTimeout: 60000,
  };
}

async function ensureTable(pool) {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'app_state'
    )
    CREATE TABLE app_state (
      id          NVARCHAR(200) NOT NULL PRIMARY KEY,
      payload     NVARCHAR(MAX) NOT NULL,
      updated_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );
  `);
}

async function main() {
  console.log(`\nAnsluter till källdatabas: ${SOURCE_DB}...`);
  const srcPool = await new sql.ConnectionPool(makeConfig(SOURCE_DB)).connect();

  console.log(`Ansluter till måldatabas:  ${TARGET_DB}...`);
  const dstPool = await new sql.ConnectionPool(makeConfig(TARGET_DB)).connect();

  console.log('Säkerställer att app_state-tabell finns i måldatabasen...');
  await ensureTable(dstPool);

  console.log(`\nHämtar alla rader från ${SOURCE_DB}.app_state...`);
  const result = await srcPool.request().query(
    'SELECT id, payload, updated_at FROM app_state ORDER BY updated_at'
  );
  const rows = result.recordset;
  console.log(`Hittade ${rows.length} rad(er).\n`);

  if (rows.length === 0) {
    console.log('Ingenting att migrera. Klart.');
    await srcPool.close();
    await dstPool.close();
    return;
  }

  let success = 0;
  let skipped = 0;

  for (const row of rows) {
    const req = dstPool.request();
    req.input('id',         sql.NVarChar(200),  row.id);
    req.input('payload',    sql.NVarChar(sql.MAX), row.payload);
    req.input('updated_at', sql.DateTime2,      row.updated_at);

    await req.query(`
      MERGE app_state AS target
      USING (SELECT @id AS id, @payload AS payload, @updated_at AS updated_at) AS source
        ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET payload = source.payload, updated_at = source.updated_at
      WHEN NOT MATCHED THEN
        INSERT (id, payload, updated_at) VALUES (source.id, source.payload, source.updated_at);
    `);

    console.log(`  ✓ ${row.id}`);
    success++;
  }

  await srcPool.close();
  await dstPool.close();

  console.log(`\nKlart! ${success} rad(er) kopierade till ${TARGET_DB}.`);
  console.log('Du kan nu byta SQL_CONNECTION_STRING_URF i Azure SWA Application Settings till att peka på urf2026.');
}

main().catch(err => {
  console.error('\nFel under migrering:', err.message || err);
  process.exit(1);
});
