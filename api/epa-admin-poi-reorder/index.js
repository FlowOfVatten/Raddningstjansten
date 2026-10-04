const { getEpaPool, verifyAdminPassword } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password, order } = req.body || {};

  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  if (!Array.isArray(order) || order.length === 0) {
    return {
      status: 400,
      body: { error: 'Order krävs för att uppdatera POI-sekvensen' }
    };
  }

  try {
    const pool = getEpaPool();
    const normalizedOrder = order.map(Number);
    const finalPoiId = normalizedOrder[normalizedOrder.length - 1];

    await pool.query(
      `WITH ordered AS (
        SELECT unnest($1::int[]) AS poi_id, unnest($2::int[]) AS seq
      )
      UPDATE epa_poi p
      SET ordning_fast = o.seq
      FROM ordered o
      WHERE p.id = o.poi_id`,
      [normalizedOrder, normalizedOrder.map((_, index) => index + 1)]
    );

    if (finalPoiId) {
      await pool.query(
        'DELETE FROM epa_question WHERE poi_id = $1',
        [finalPoiId]
      );
    }

    return {
      status: 200,
      body: { ok: true, order: normalizedOrder }
    };
  } catch (err) {
    context.log('Error reordering POIs:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte uppdatera POI-ordning' }
    };
  }
};
