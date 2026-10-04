const { getEpaPool, verifyAdminPassword } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password, sessionId, soundId } = req.body;

  // Validate admin password
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return { status: 403, body: { error: 'Felaktigt lösenord' } };
  }

  if (!sessionId || !soundId) {
    return { status: 400, body: { error: 'sessionId och soundId krävs' } };
  }

  try {
    const pool = getEpaPool();

    // Try to insert with message_type, fallback if column doesn't exist
    let result;
    try {
      result = await pool.query(
        `INSERT INTO epa_game_broadcast (game_session_id, player_id, player_name, message, message_type)
         VALUES ($1, NULL, 'Admin', $2, 'sound')
         RETURNING id`,
        [sessionId, soundId]
      );
    } catch (columnError) {
      // Fallback: insert without message_type column
      context.log('Falling back to insert without message_type column');
      result = await pool.query(
        `INSERT INTO epa_game_broadcast (game_session_id, player_id, player_name, message)
         VALUES ($1, NULL, $3, $2)
         RETURNING id`,
        [sessionId, soundId, 'Admin']
      );
    }

    return {
      status: 200,
      body: {
        success: true,
        broadcastId: result.rows[0].id,
        message: `Ljud ${soundId} brodcastat till alla spelare`
      }
    };
  } catch (err) {
    context.log('Error broadcasting sound:', err.message);
    context.log('Stack:', err.stack);
    return {
      status: 500,
      body: { error: 'Kunde inte broadcastа ljud: ' + err.message }
    };
  }
};
