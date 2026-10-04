// Get current game session status
// Clients poll this to know when game starts
module.exports = async function (context, req) {
  try {
    const { getEpaPool } = require('../epa-shared');
    const pool = getEpaPool();
    
    // Get latest game session
    const result = await pool.query(
      `SELECT id, status, started_at 
       FROM epa_game_session 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return {
        status: 200,
        body: { status: 'idle', sessionId: null }
      };
    }

    return {
      status: 200,
      body: {
        status: result.rows[0].status,
        sessionId: result.rows[0].id,
        startedAt: result.rows[0].started_at
      }
    };
  } catch (err) {
    context.log('Error getting game status:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta spelstatus' }
    };
  }
};
