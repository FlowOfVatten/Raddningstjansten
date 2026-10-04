const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  try {
    const pool = getEpaPool();
    const result = await pool.query(
      'SELECT id, namn, lat, lng, radie_meter FROM epa_poi WHERE aktiv = true ORDER BY ordning_fast ASC'
    );

    return {
      status: 200,
      body: result.rows
    };
  } catch (err) {
    context.log('Error fetching POIs:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta POI:er' }
    };
  }
};
