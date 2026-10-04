const { getEpaPool, fairShuffleCheckpoints } = require('../epa-shared');

module.exports = async function (context, req) {
  const { namn } = req.body || {};

  if (!namn || namn.trim().length === 0) {
    return {
      status: 400,
      body: { error: 'Namn är obligatoriskt' }
    };
  }

  try {
    const pool = getEpaPool();

    // Create player
    const playerResult = await pool.query(
      'INSERT INTO epa_player (namn, status) VALUES ($1, $2) RETURNING id, namn, start_tid',
      [namn, 'aktiv']
    );
    const playerId = playerResult.rows[0].id;

    // Get all POIs with coordinates
    const poisResult = await pool.query(
      'SELECT id, lat, lng FROM epa_poi WHERE aktiv = true ORDER BY ordning_fast ASC'
    );
    const pois = poisResult.rows;

    if (pois.length < 10) {
      return {
        status: 400,
        body: { error: 'Inte tillräckligt med POI:er (behövs 10)' }
      };
    }

    // Separate checkpoints (1-9) and goal (10)
    const checkpoints = pois.slice(0, 9);
    const goal = pois[9];

    // Fair shuffle: Use greedy nearest-neighbor with randomization
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

    return {
      status: 200,
      body: {
        playerId,
        namn: playerResult.rows[0].namn,
        startTid: playerResult.rows[0].start_tid
      }
    };
  } catch (err) {
    context.log('Error starting game:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte starta spelet' }
    };
  }
};
