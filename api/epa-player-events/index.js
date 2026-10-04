const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { playerId } = req.params;
  const since = Number(req.query?.since || 0);

  try {
    const pool = getEpaPool();

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

    const playerResult = await pool.query(
      'SELECT game_session_id FROM epa_player WHERE id = $1',
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      return { status: 404, body: { error: 'Spelare hittades inte' } };
    }

    const gameSessionId = playerResult.rows[0].game_session_id;

    const result = await pool.query(
      `SELECT id, player_name, message, created_at
       FROM epa_game_broadcast
       WHERE game_session_id = $1 AND id > $2
       ORDER BY id ASC`,
      [gameSessionId, since]
    );

    return {
      status: 200,
      body: {
        messages: result.rows.map(row => ({
          id: row.id,
          playerName: row.player_name,
          message: row.message,
          createdAt: row.created_at
        }))
      }
    };
  } catch (err) {
    context.log('Error fetching player events:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta meddelanden' }
    };
  }
};
