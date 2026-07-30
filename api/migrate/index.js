/**
 * GET /api/migrate
 *
 * One-shot migration: copies all rows from 'urf' -> 'urf2026' using the
 * existing SQL_CONNECTION_STRING_URF (just rewrites Initial Catalog).
 *
 * DELETE THIS FUNCTION AFTER MIGRATION IS CONFIRMED.
 */

const sql = require('mssql');

function resolveConnectionString(secretName = 'SQL_CONNECTION_STRING') {
  return (
    process.env[secretName] ||
    process.env[`SQLAZURECONNSTR_${secretName}`] ||
    process.env[`SQLCONNSTR_${secretName}`] ||
    ''
  ).trim();
}

function forceDatabaseInConnectionString(connectionString, databaseName) {
  if (!connectionString) return '';
  if (/Initial Catalog\s*=\s*[^;]+/i.test(connectionString)) {
    return connectionString.replace(/Initial Catalog\s*=\s*[^;]+/i, `Initial Catalog=${databaseName}`);
  }
  if (/Database\s*=\s*[^;]+/i.test(connectionString)) {
    return connectionString.replace(/Database\s*=\s*[^;]+/i, `Database=${databaseName}`);
  }
  const suffix = connectionString.endsWith(';') ? '' : ';';
  return `${connectionString}${suffix}Initial Catalog=${databaseName};`;
}

async function ensureTable(pool) {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'app_state'
    )
    CREATE TABLE app_state (
      id          NVARCHAR(200) NOT NULL PRIMARY KEY,
      payload     NVARCHAR(MAX) NOT NULL,
      updated_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );
  `);
}

module.exports = async function (context, req) {
  const log = [];
  const srcConnStr = resolveConnectionString('SQL_CONNECTION_STRING_URF')
    || forceDatabaseInConnectionString(resolveConnectionString('SQL_CONNECTION_STRING'), 'urf');
  const dstConnStr = forceDatabaseInConnectionString(srcConnStr, 'urf2026');

  if (!srcConnStr) {
    return context.res = { status: 500, body: 'Missing SQL_CONNECTION_STRING_URF' };
  }

  let srcPool, dstPool;
  try {
    log.push('Connecting to source (urf)...');
    srcPool = await new sql.ConnectionPool(srcConnStr).connect();

    log.push('Connecting to target (urf2026)...');
    dstPool = await new sql.ConnectionPool(dstConnStr).connect();

    log.push('Ensuring app_state table exists in urf2026...');
    await ensureTable(dstPool);

    log.push('Reading all rows from urf.app_state...');
    const result = await srcPool.request().query(
      'SELECT id, payload, updated_at FROM app_state'
    );
    const rows = result.recordset;
    log.push(`Found ${rows.length} row(s).`);

    let copied = 0;
    for (const row of rows) {
      const req = dstPool.request();
      req.input('id',         sql.NVarChar(200),      row.id);
      req.input('payload',    sql.NVarChar(sql.MAX),  row.payload);
      req.input('updated_at', sql.DateTime2,          row.updated_at);

      await req.query(`
        MERGE app_state AS target
        USING (SELECT @id AS id, @payload AS payload, @updated_at AS updated_at) AS source
          ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET payload = source.payload, updated_at = source.updated_at
        WHEN NOT MATCHED THEN
          INSERT (id, payload, updated_at) VALUES (source.id, source.payload, source.updated_at);
      `);

      log.push(`  Copied: ${row.id}`);
      copied++;
    }

    log.push(`Done! ${copied} row(s) copied to urf2026.`);
    context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { ok: true, log } };

  } catch (err) {
    log.push(`ERROR: ${err.message}`);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json' }, body: { ok: false, log, error: err.message } };
  } finally {
    try { if (srcPool) await srcPool.close(); } catch (_) {}
    try { if (dstPool) await dstPool.close(); } catch (_) {}
  }
};
