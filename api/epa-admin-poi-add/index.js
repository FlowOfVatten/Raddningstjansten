const { getEpaPool, verifyAdminPassword } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password, namn, lat, lng, radieMeter, ordningFast } = req.body || {};

  // Verify password against database
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();
    const result = await pool.query(
      'INSERT INTO epa_poi (namn, lat, lng, radie_meter, ordning_fast) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [namn, lat, lng, radieMeter || 40, ordningFast || null]
    );

    return {
      status: 200,
      body: result.rows[0]
    };
  } catch (err) {
    context.log('Error adding POI:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte lägga till POI' }
    };
  }
};
