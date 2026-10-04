const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { playerId } = req.params;
  const { answerIndex } = req.body || {};

  try {
    const pool = getEpaPool();
    const maxForsok = 3;

    // Get active POI and question
    const poiResult = await pool.query(
      `SELECT pp.poi_id, pp.forsok, pp.sekvens
       FROM epa_player_poi pp
       WHERE pp.player_id = $1 AND pp.status = 'aktiv'
       ORDER BY pp.sekvens ASC
       LIMIT 1`,
      [playerId]
    );

    if (poiResult.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Ingen aktiv POI' }
      };
    }

    const { poi_id, forsok, sekvens } = poiResult.rows[0];

    const questionResult = await pool.query(
      'SELECT id, ratt_index, ledtrad FROM epa_question WHERE poi_id = $1',
      [poi_id]
    );

    if (questionResult.rows.length === 0) {
      return {
        status: 404,
        body: { error: 'Ingen fråga för denna POI' }
      };
    }

    const question = questionResult.rows[0];
    const isCorrect = answerIndex === question.ratt_index;

    if (isCorrect) {
      const playerRow = await pool.query(
        'SELECT id, namn, game_session_id FROM epa_player WHERE id = $1',
        [playerId]
      );

      if (playerRow.rows.length === 0) {
        return { status: 404, body: { error: 'Spelare hittades inte' } };
      }

      const player = playerRow.rows[0];

      const nextPoiResult = await pool.query(
        `SELECT poi_id FROM epa_player_poi 
         WHERE player_id = $1 AND sekvens = $2
         ORDER BY sekvens ASC
         LIMIT 1`,
        [playerId, sekvens + 1]
      );

      await pool.query(
        `UPDATE epa_player_poi 
         SET status = 'klar', klar_tid = NOW(), forsok = $1
         WHERE player_id = $2 AND status = 'aktiv' AND sekvens = $3`,
        [forsok + 1, playerId, sekvens]
      );

      await pool.query(
        `UPDATE epa_player_poi
         SET status = 'låst'
         WHERE player_id = $1 AND status = 'aktiv' AND sekvens != $2`,
        [playerId, sekvens]
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

      await pool.query(`
        CREATE TABLE IF NOT EXISTS epa_game_broadcast (
          id SERIAL PRIMARY KEY,
          game_session_id INTEGER NOT NULL,
          player_id INTEGER REFERENCES epa_player(id) ON DELETE CASCADE,
          player_name VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      const completedCountResult = await pool.query(
        `SELECT COUNT(*)::int AS completed_count
         FROM epa_player_poi
         WHERE player_id = $1 AND status = 'klar'`,
        [playerId]
      );

      const completedCount = completedCountResult.rows[0]?.completed_count || 0;
      const message = `${player.namn} klarade POI ${completedCount}!`;

      await pool.query(
        `INSERT INTO epa_game_broadcast (game_session_id, player_id, player_name, message)
         VALUES ($1, $2, $3, $4)`,
        [player.game_session_id, player.id, player.namn, message]
      );

      return {
        status: 200,
        body: {
          correct: true,
          message: 'Rätt svar!'
        }
      };
    } else {
      // Increment attempt
      const newForsok = forsok + 1;

      if (newForsok >= maxForsok) {
        // Max attempts reached, show hint
        await pool.query(
          'UPDATE epa_player_poi SET forsok = $1 WHERE player_id = $2 AND status = $3',
          [newForsok, playerId, 'aktiv']
        );

        return {
          status: 200,
          body: {
            correct: false,
            message: 'Fel svar, försök igen',
            hint: question.ledtrad || 'Försök igen',
            attemptsLeft: 0
          }
        };
      } else {
        await pool.query(
          'UPDATE epa_player_poi SET forsok = $1 WHERE player_id = $2 AND status = $3',
          [newForsok, playerId, 'aktiv']
        );

        return {
          status: 200,
          body: {
            correct: false,
            message: 'Fel svar, försök igen',
            attemptsLeft: maxForsok - newForsok
          }
        };
      }
    }
  } catch (err) {
    context.log('Error submitting answer:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte behandla svar' }
    };
  }
};
