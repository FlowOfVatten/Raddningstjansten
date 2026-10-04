const { getEpaPool, verifyAdminPassword } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password, sessionId } = req.body || {};

  // Verify admin password
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();
    
    // Update game session to started
    await pool.query(
      `UPDATE epa_game_session 
       SET status = 'started', started_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [sessionId]
    );

    // Update all ready players to started
    await pool.query(
      `UPDATE epa_player 
       SET player_status = 'started' 
       WHERE game_session_id = $1 AND player_status = 'ready'`,
      [sessionId]
    );

    return {
      status: 200,
      body: { 
        success: true, 
        message: 'Spelet startat!' 
      }
    };
  } catch (err) {
    context.log('Error starting game:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte starta spel' }
    };
  }
};
