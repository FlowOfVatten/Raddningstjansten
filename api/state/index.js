const sql = require('mssql');

const poolPromises = new Map();

function resolveConnectionString() {
  return (
    process.env.SQL_CONNECTION_STRING ||
    process.env.SQLAZURECONNSTR_SQL_CONNECTION_STRING ||
    process.env.SQLCONNSTR_SQL_CONNECTION_STRING ||
    ''
  ).trim();
}

function getPool() {
  const connectionString = resolveConnectionString();
  console.log('[URF-API] Attempting SQL connection. String length:', connectionString.length);
  console.log('[URF-API] SQL_CONNECTION_STRING exists:', !!process.env.SQL_CONNECTION_STRING);

  if (!connectionString) {
    throw new Error('Missing SQL connection string. Set SQL_CONNECTION_STRING in Static Web App application settings.');
  }

  if (!poolPromises.has(connectionString)) {
    const promise = new sql.ConnectionPool(connectionString)
      .connect()
      .catch(err => {
        console.error('[URF-API] SQL Connection Error:', err.message);
        poolPromises.delete(connectionString);
        throw err;
      });
    poolPromises.set(connectionString, promise);
  }

  return poolPromises.get(connectionString);
}

module.exports = async function (context, req) {
  const method = (req.method || '').toUpperCase();

  // Debug endpoint
  if (req.query.debug === 'true') {
    const connStr = resolveConnectionString();
    const masked = connStr ? connStr.replace(/Password=[^;]+/, 'Password=***') : 'NOT SET';

    let probe;
    try {
      const probePool = await getPool();
      await probePool.request().query('SELECT 1 AS ok');
      probe = { ok: true, message: 'connected' };
    } catch (probeError) {
      probe = {
        ok: false,
        message: probeError.message,
        code: probeError.code || null,
        number: probeError.number || null,
        state: probeError.state || null,
        class: probeError.class || null,
        serverName: probeError.serverName || null,
        procName: probeError.procName || null,
        lineNumber: probeError.lineNumber || null,
        originalMessage: probeError.originalError && probeError.originalError.message ? probeError.originalError.message : null
      };
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        debug: {
          SQL_CONNECTION_STRING: !!process.env.SQL_CONNECTION_STRING,
          maskedConnectionString: masked,
          connectionStringLength: connStr.length,
          probe
        }
      }
    };
  }

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
