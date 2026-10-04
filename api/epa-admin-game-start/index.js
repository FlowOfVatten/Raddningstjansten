const { getEpaPool, verifyAdminPassword } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password } = req.body || {};

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
    
    // Get or create active game session
    let sessionResult = await pool.query(
      `SELECT id FROM epa_game_session 
       WHERE status = 'idle' 
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

    // Update game session to ready state
    await pool.query(
      `UPDATE epa_game_session SET status = 'ready', updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    return {
      status: 200,
      body: { 
        success: true, 
        message: 'Spel förberett', 
        sessionId 
      }
    };
  } catch (err) {
    context.log('Error starting game:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte förbereda spel' }
    };
  }
};
