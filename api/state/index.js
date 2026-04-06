const sql = require('mssql');

let poolPromise = null;

function resolveConnectionString() {
  return (
    process.env.SQL_CONNECTION_STRING ||
    process.env.SQLAZURECONNSTR_SQL_CONNECTION_STRING ||
    process.env.SQLCONNSTR_SQL_CONNECTION_STRING ||
    ''
  ).trim();
}

function getPool() {
  if (!poolPromise) {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
      throw new Error('Missing SQL connection string. Set SQL_CONNECTION_STRING in Static Web App application settings.');
    }
    poolPromise = sql.connect(connectionString);
  }
  return poolPromise;
}

module.exports = async function (context, req) {
  const method = (req.method || '').toUpperCase();

  if (method === 'GET') {
    const id = req.query.id;
    if (!id) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'id parameter required' }
      };
    }

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('id', sql.NVarChar(200), id)
        .query('SELECT payload, updated_at FROM app_state WHERE id = @id');

      if (!result.recordset.length) {
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: []
        };
      }

      const row = result.recordset[0];
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: [{ payload: JSON.parse(row.payload), updated_at: row.updated_at }]
      };
    } catch (err) {
      context.log.error('state GET error', err);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: err.message }
      };
    }
  }

  if (method === 'PUT' || method === 'POST') {
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
      context.log.error('state PUT/POST error', err);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: err.message }
      };
    }
  }

  return {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
    body: { error: 'Method not allowed' }
  };
};
