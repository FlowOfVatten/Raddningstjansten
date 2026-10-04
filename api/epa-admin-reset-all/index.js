const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password } = req.body || {};

  if (password !== process.env.ADMIN_PASSWORD) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();
    await pool.query('DELETE FROM epa_player_poi');
    await pool.query('DELETE FROM epa_player');

    return {
      status: 200,
      body: { success: true }
    };
  } catch (err) {
    context.log('Error resetting all:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte nollställa alla spel' }
    };
  }
};
