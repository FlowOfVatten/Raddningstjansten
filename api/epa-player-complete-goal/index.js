const { getEpaPool } = require('../epa-shared');

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

    const playerRow = await pool.query(
      'SELECT id, namn, game_session_id FROM epa_player WHERE id = $1',
      [playerId]
    );

    if (playerRow.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Spelare hittades inte' }
      };
    }

    const player = playerRow.rows[0];
    const activePoiResult = await pool.query(
      `SELECT poi_id, forsok FROM epa_player_poi
       WHERE player_id = $1 AND status = 'aktiv'`,
      [playerId]
    );

    if (activePoiResult.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Ingen aktiv POI för spelaren' }
      };
    }

    const { poi_id, forsok } = activePoiResult.rows[0];
    const nextPoiResult = await pool.query(
      `SELECT poi_id FROM epa_player_poi
       WHERE player_id = $1 AND sekvens = (
         SELECT sekvens + 1 FROM epa_player_poi WHERE player_id = $1 AND status = 'aktiv'
       )`,
      [playerId]
    );

    await pool.query(
      `UPDATE epa_player_poi
       SET status = 'klar', klar_tid = NOW(), forsok = $1
       WHERE player_id = $2 AND status = 'aktiv'`,
      [forsok + 1, playerId]
    );

    if (nextPoiResult.rows.length > 0) {
      await pool.query(
        `UPDATE epa_player_poi
         SET status = 'aktiv'
         WHERE player_id = $1 AND poi_id = $2`,
        [playerId, nextPoiResult.rows[0].poi_id]
      );
    } else {
      await pool.query(
        'UPDATE epa_player SET status = $1, mal_tid = NOW() WHERE id = $2',
        ['klar', playerId]
      );
    }

    await pool.query(
      `INSERT INTO epa_game_broadcast (game_session_id, player_id, player_name, message)
       VALUES ($1, $2, $3, $4)`,
      [player.game_session_id, player.id, player.namn, `${player.namn} nådde målet!`]
    );

    return {
      status: 200,
      body: {
        ok: true,
        message: 'Målet nått!'
      }
    };
  } catch (err) {
    context.log('Error completing goal:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte avsluta mål' }
    };
  }
};
