const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { playerId } = req.params;
  const since = Number(req.query?.since || 0);

  try {
    const pool = getEpaPool();

    const playerResult = await pool.query(
      'SELECT game_session_id, created_at FROM epa_player WHERE id = $1',
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      return { status: 404, body: { error: 'Spelare hittades inte' } };
    }

    const gameSessionId = playerResult.rows[0].game_session_id;
    const playerCreatedAt = playerResult.rows[0].created_at;

    // Only return broadcasts created after the player joined; prevents old session noise from replaying
    // Try to query with message_type, fallback to simple query if column doesn't exist
    let result;
    try {
      result = await pool.query(
        `SELECT id, player_name, message, 
                COALESCE(message_type, 'text') as message_type, 
                created_at
         FROM epa_game_broadcast
         WHERE game_session_id = $1 AND id > $2 AND created_at >= $3
         ORDER BY id ASC
         LIMIT 100`,
        [gameSessionId, since, playerCreatedAt]
      );
    } catch (columnError) {
      // Fallback: query without message_type column
      context.log('Falling back to query without message_type column');
      result = await pool.query(
        `SELECT id, player_name, message, created_at
         FROM epa_game_broadcast
         WHERE game_session_id = $1 AND id > $2 AND created_at >= $3
         ORDER BY id ASC
         LIMIT 100`,
        [gameSessionId, since, playerCreatedAt]
      );
    }

    return {
      status: 200,
      body: {
        messages: result.rows.map(row => ({
          id: row.id,
          playerName: row.player_name,
          message: row.message,
          type: row.message_type || 'text',
          createdAt: row.created_at
        }))
      }
    };
  } catch (err) {
    context.log('Error fetching player events:', err.message);
    context.log('Stack:', err.stack);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta meddelanden: ' + err.message }
    };
  }
};
