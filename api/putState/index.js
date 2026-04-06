const sql = require('mssql');

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(process.env.SQL_CONNECTION_STRING);
  }
  return poolPromise;
}

module.exports = async function (context, req) {
  const row = Array.isArray(req.body) ? req.body[0] : req.body;
  const { id, payload, updated_at } = row || {};

  if (!id || !payload) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'id and payload required' }
    };
  }

  const timestamp = updated_at || new Date().toISOString();
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar(200), id)
      .input('payload', sql.NVarChar(sql.MAX), payloadStr)
      .input('updated_at', sql.DateTime2, new Date(timestamp))
      .query(`
        MERGE app_state AS target
        USING (VALUES (@id, @payload, @updated_at)) AS source (id, payload, updated_at)
        ON target.id = source.id
        WHEN MATCHED THEN UPDATE SET payload = source.payload, updated_at = source.updated_at
        WHEN NOT MATCHED THEN INSERT (id, payload, updated_at) VALUES (source.id, source.payload, source.updated_at);
      `);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: true }
    };
  } catch (err) {
    context.log.error('putState error', err);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: err.message }
    };
  }
};
