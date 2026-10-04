const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password, playerId } = req.body || {};

  if (password !== process.env.ADMIN_PASSWORD) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();
    await pool.query('DELETE FROM epa_player_poi WHERE player_id = $1', [playerId]);
    await pool.query('DELETE FROM epa_player WHERE id = $1', [playerId]);

    return {
      status: 200,
      body: { success: true }
    };
  } catch (err) {
    context.log('Error resetting player:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte nollställa speller' }
    };
  }
};
