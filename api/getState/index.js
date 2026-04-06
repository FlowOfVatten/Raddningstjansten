const sql = require('mssql');

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(process.env.SQL_CONNECTION_STRING);
  }
  return poolPromise;
}

module.exports = async function (context, req) {
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
    context.log.error('getState error', err);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: err.message }
    };
  }
};
