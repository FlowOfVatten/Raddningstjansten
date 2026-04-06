const { app } = require('@azure/functions');
const sql = require('mssql');

// Connection string från Azure App Settings: SQL_CONNECTION_STRING
const getPool = (() => {
  let pool = null;
  return async () => {
    if (!pool) {
      pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
    }
    return pool;
  };
})();

// GET /api/state?id=<stateId>
app.http('getState', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'state',
  handler: async (request) => {
    const id = request.query.get('id');
    if (!id) {
      return { status: 400, body: JSON.stringify({ error: 'id parameter required' }) };
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
          body: JSON.stringify([])
        };
      }

      const row = result.recordset[0];
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ payload: JSON.parse(row.payload), updated_at: row.updated_at }])
      };
    } catch (err) {
      console.error('getState error', err);
      return { status: 500, body: JSON.stringify({ error: err.message }) };
    }
  }
});

// PUT /api/state  body: { id, payload, updated_at }
app.http('putState', {
  methods: ['POST', 'PUT'],
  authLevel: 'anonymous',
  route: 'state',
  handler: async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    // Stöd både single object och array (matchar Supabase-formatet appen använder)
    const row = Array.isArray(body) ? body[0] : body;
    const { id, payload, updated_at } = row || {};

    if (!id || !payload) {
      return { status: 400, body: JSON.stringify({ error: 'id and payload required' }) };
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

      return { status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      console.error('putState error', err);
      return { status: 500, body: JSON.stringify({ error: err.message }) };
    }
  }
});
