const { getEpaPool, calculateDistance } = require('../epa-shared');

module.exports = async function (context, req) {
  const { playerId } = req.params;
  const { lat, lng } = req.body || {};

  try {
    const pool = getEpaPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS epa_player_location (
        player_id INTEGER PRIMARY KEY REFERENCES epa_player(id) ON DELETE CASCADE,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        last_seen_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      await pool.query(
        `INSERT INTO epa_player_location (player_id, lat, lng, last_seen_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (player_id)
         DO UPDATE SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, last_seen_at = NOW()`,
        [playerId, Number(lat), Number(lng)]
      );
    }

    // Get active POI for this player
    const result = await pool.query(
      `SELECT pp.poi_id, p.lat, p.lng, p.radie_meter
       FROM epa_player_poi pp
       JOIN epa_poi p ON p.id = pp.poi_id
       WHERE pp.player_id = $1 AND pp.status = 'aktiv'`,
      [playerId]
    );

    if (result.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Ingen aktiv POI' }
      };
    }

    const poi = result.rows[0];
    const distance = calculateDistance(lat, lng, poi.lat, poi.lng);
    const withinRadius = distance <= poi.radie_meter;

    return {
      status: 200,
      body: {
        withinRadius,
        distance: Math.round(distance),
        radieMeter: poi.radie_meter
      }
    };
  } catch (err) {
    context.log('Error verifying position:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte verifiera position' }
    };
  }
};
