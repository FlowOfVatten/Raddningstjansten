const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const namn = (req.body && req.body.namn ? req.body.namn.trim() : '').trim();

  if (!namn) {
    return {
      status: 400,
      body: { error: 'Namn är obligatoriskt' }
    };
  }

  try {
    const pool = getEpaPool();

    const existingPlayerResult = await pool.query(
      `SELECT id, namn FROM epa_player WHERE LOWER(namn) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
      [namn]
    );

    if (existingPlayerResult.rows.length > 0) {
      const existingPlayer = existingPlayerResult.rows[0];
      return {
        status: 200,
        body: {
          playerId: existingPlayer.id,
          playerName: existingPlayer.namn,
          message: 'Fortsätter existerande spelare',
          existingPlayer: true,
          sessionId: null
        }
      };
    }

    // Get or create active game session
    let sessionResult = await pool.query(
      `SELECT id FROM epa_game_session 
       WHERE status IN ('idle', 'ready') 
       ORDER BY created_at DESC LIMIT 1`
    );

    let sessionId;
    if (sessionResult.rows.length === 0) {
      // Create new session
      const newSession = await pool.query(
        `INSERT INTO epa_game_session (status) VALUES ('idle') RETURNING id`
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
    }

    // Create player as "registered" (not yet started)
    const playerResult = await pool.query(
      `INSERT INTO epa_player (namn, status, game_session_id, player_status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, namn`,
      [namn, 'väntar', sessionId, 'registered']
    );
    const playerId = playerResult.rows[0].id;

    return {
      status: 200,
      body: {
        playerId,
        playerName: playerResult.rows[0].namn,
        message: 'Registrerad! Väntar på att admin startar spelet...',
        sessionId,
        existingPlayer: false
      }
    };
  } catch (err) {
    context.log('Error registering player:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte registrera spelare' }
    };
  }
};
