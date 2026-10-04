const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { poiId } = req.params;
  const { password, text, alternativ, rattIndex, ledtrad } = req.body || {};

  if (password !== process.env.ADMIN_PASSWORD) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();

    // Check if question exists
    const existing = await pool.query(
      'SELECT id FROM epa_question WHERE poi_id = $1',
      [poiId]
    );

    if (existing.rows.length > 0) {
      // Update
      const result = await pool.query(
        'UPDATE epa_question SET text = $1, alternativ = $2, ratt_index = $3, ledtrad = $4 WHERE poi_id = $5 RETURNING *',
        [text, JSON.stringify(alternativ), rattIndex, ledtrad || null, poiId]
      );
      return {
        status: 200,
        body: result.rows[0]
      };
    } else {
      // Insert
      const result = await pool.query(
        'INSERT INTO epa_question (poi_id, text, alternativ, ratt_index, ledtrad) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [poiId, text, JSON.stringify(alternativ), rattIndex, ledtrad || null]
      );
      return {
        status: 200,
        body: result.rows[0]
      };
    }
  } catch (err) {
    context.log('Error adding question:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte lägga till fråga' }
    };
  }
};
