const { getEpaPool, fairShuffleCheckpoints } = require('../epa-shared');

module.exports = async function (context, req) {
  const { playerId } = req.params;

  if (!playerId) {
    return {
      status: 400,
      body: { error: 'PlayerId är obligatoriskt' }
    };
  }

  try {
    const pool = getEpaPool();

    // Verify player exists
    const playerCheckResult = await pool.query(
      'SELECT id FROM epa_player WHERE id = $1',
      [playerId]
    );

    if (playerCheckResult.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Spelare inte found' }
      };
    }

    // First, delete any existing POI entries for this player (cleanup)
    await pool.query('DELETE FROM epa_player_poi WHERE player_id = $1', [playerId]);

    // Get all active POIs with coordinates. The last POI in the ordered list is treated as the
    // Final POI / goal, regardless of total count. This lets admins configure any number of POIs.
    const poisResult = await pool.query(
      'SELECT id, lat, lng FROM epa_poi WHERE aktiv = true ORDER BY ordning_fast ASC'
    );
    const pois = poisResult.rows;

    if (pois.length === 0) {
      return {
        status: 400,
        body: { error: 'Det måste finnas minst 1 POI för att starta spelet' }
      };
    }

    const goal = pois[pois.length - 1];
    const checkpoints = pois.slice(0, -1);

    // Fair shuffle: Use greedy nearest-neighbor with randomization for all checkpoints.
    const fairShuffledCheckpoints = fairShuffleCheckpoints(checkpoints);
    const sequence = [...fairShuffledCheckpoints.map(p => p.id), goal.id];

    // Create PlayerPoi entries
    for (let i = 0; i < sequence.length; i++) {
      const status = i === 0 ? 'aktiv' : 'låst';
      await pool.query(
        'INSERT INTO epa_player_poi (player_id, poi_id, sekvens, status) VALUES ($1, $2, $3, $4)',
        [playerId, sequence[i], i + 1, status]
      );
    }

    // Update player status
    await pool.query(
      `UPDATE epa_player SET status = 'aktiv', player_status = 'started' WHERE id = $1`,
      [playerId]
    );

    // Return first POI
    const firstPoiId = sequence[0];
    const firstPoiResult = await pool.query(
      'SELECT id, namn, lat, lng, radie_meter FROM epa_poi WHERE id = $1',
      [firstPoiId]
    );

    if (firstPoiResult.rows.length === 0) {
      return {
        status: 500,
        body: { error: 'Kunde inte hitta första POI' }
      };
    }

    return {
      status: 200,
      body: {
        playerId,
        message: 'Spelet startat!',
        activePoi: firstPoiResult.rows[0]
      }
    };
  } catch (err) {
    context.log('Error starting player game:', err.message);
    context.log('Error details:', err);
    return {
      status: 500,
      body: { error: 'Kunde inte starta spelarspelet: ' + err.message }
    };
  }
};
