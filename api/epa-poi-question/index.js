const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { poiId } = req.params;

  try {
    const pool = getEpaPool();
    const result = await pool.query(
      'SELECT id, text, alternativ, ratt_index FROM epa_question WHERE poi_id = $1',
      [poiId]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Ingen fråga för denna POI' }
      };
    }

    const question = result.rows[0];

    return {
      status: 200,
      body: {
        id: question.id,
        text: question.text,
        alternativ: question.alternativ
      }
    };
  } catch (err) {
    context.log('Error fetching question:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta fråga' }
    };
  }
};
