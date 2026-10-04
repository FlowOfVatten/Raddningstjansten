const { getEpaPool, verifyAdminPassword } = require('../epa-shared');

module.exports = async function (context, req) {
  const password = req.query.password;

  // Verify password against database
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();
    
    // Get latest game session
    const sessionResult = await pool.query(
      `SELECT id FROM epa_game_session 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (sessionResult.rows.length === 0) {
      return {
        status: 200,
        body: []
      };
    }

    const sessionId = sessionResult.rows[0].id;

    // Get all players registered for this session
    const result = await pool.query(
      `SELECT p.id, p.namn, p.created_at as registered_at, p.player_status
       FROM epa_player p
       WHERE p.game_session_id = $1
       ORDER BY p.created_at ASC`,
      [sessionId]
    );

    return {
      status: 200,
      body: result.rows
    };
  } catch (err) {
    context.log('Error fetching ready players:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta spelare' }
    };
  }
};
