const sql = require('mssql');

const poolPromises = new Map();

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

function resolveUrfConnectionString() {
  const urfConnStrFromSecret = resolveConnectionString('SQL_CONNECTION_STRING_URF');
  if (urfConnStrFromSecret) return urfConnStrFromSecret;
  return forceDatabaseInConnectionString(resolveConnectionString('SQL_CONNECTION_STRING'), 'urf');
}

function isUrfStateId(id) {
  return typeof id === 'string' && id.startsWith('urf:');
}

function getPool(connectionString = resolveConnectionString()) {
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

async function testConnection(connectionString) {
  try {
    const pool = new sql.ConnectionPool(connectionString);
    await pool.connect();
    await pool.request().query('SELECT 1 AS ok');
    await pool.close();
    return { ok: true, message: 'connected' };
  } catch (err) {
    return {
      ok: false,
      message: err.message,
      code: err.code || null
    };
  }
}

module.exports = async function (context, req) {
  const method = (req.method || '').toUpperCase();

  // Debug endpoint
  if (req.query.debug === 'true') {
    const mainConnStr = resolveConnectionString('SQL_CONNECTION_STRING');
    const urfConnStrFromSecret = resolveConnectionString('SQL_CONNECTION_STRING_URF');
    const urfConnStr = resolveUrfConnectionString();

    const maskConnectionString = (connStr) => 
      connStr ? connStr.replace(/Password=[^;]+/, 'Password=***') : 'NOT SET';

    const mainProbe = await testConnection(mainConnStr);
    const urfProbe = await testConnection(urfConnStr);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        debug: {
          SQL_CONNECTION_STRING: {
            exists: !!process.env.SQL_CONNECTION_STRING,
            masked: maskConnectionString(mainConnStr),
            length: mainConnStr.length,
            probe: mainProbe
          },
          SQL_CONNECTION_STRING_URF: {
            exists: !!urfConnStrFromSecret,
            source: urfConnStrFromSecret ? 'SQL_CONNECTION_STRING_URF' : 'derived-from-SQL_CONNECTION_STRING',
            masked: maskConnectionString(urfConnStr),
            length: urfConnStr.length,
            probe: urfProbe
          }
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
      const connectionString = isUrfStateId(id) ? resolveUrfConnectionString() : resolveConnectionString();
      const pool = await getPool(connectionString);
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
      const connectionString = isUrfStateId(id) ? resolveUrfConnectionString() : resolveConnectionString();
      const pool = await getPool(connectionString);
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
