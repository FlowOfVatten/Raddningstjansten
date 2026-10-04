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
    
    // Reset all game sessions to idle status
    const result = await pool.query(
      `UPDATE epa_game_session SET status = 'idle', updated_at = NOW() WHERE status != 'idle'`
    );

    return {
      status: 200,
      body: { 
        success: true, 
        message: 'Spelet är nollställt till idle',
        rowsUpdated: result.rowCount
      }
    };
  } catch (err) {
    context.log('Error resetting game:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte nollställa spel: ' + err.message }
    };
  }
};
