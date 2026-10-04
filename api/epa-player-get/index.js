const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { playerId } = req.params;

  try {
    const pool = getEpaPool();

    const playerResult = await pool.query(
      'SELECT id, namn, start_tid, mal_tid, status FROM epa_player WHERE id = $1',
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Spelare inte funnen' }
      };
    }

    const player = playerResult.rows[0];

    // Get player's POI sequence with status
    const poiResult = await pool.query(
      `SELECT pp.sekvens, pp.poi_id, pp.status, pp.klar_tid, pp.forsok, 
              p.namn, p.lat, p.lng, p.radie_meter
       FROM epa_player_poi pp
       JOIN epa_poi p ON p.id = pp.poi_id
       WHERE pp.player_id = $1
       ORDER BY pp.sekvens ASC`,
      [playerId]
    );

    const pois = poiResult.rows;
    const activePoi = pois.find(p => p.status === 'aktiv');

    return {
      status: 200,
      body: {
        player,
        pois,
        activePoi: activePoi || null
      }
    };
  } catch (err) {
    context.log('Error fetching player:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta spelet' }
    };
  }
};
