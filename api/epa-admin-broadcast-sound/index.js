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

    // Ensure table exists with all columns
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS epa_game_broadcast (
          id SERIAL PRIMARY KEY,
          game_session_id INTEGER NOT NULL,
          player_id INTEGER REFERENCES epa_player(id) ON DELETE CASCADE,
          player_name VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'text',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } catch (e) {
      // Table might already exist, try to add missing column
      try {
        await pool.query(`ALTER TABLE epa_game_broadcast ADD COLUMN message_type VARCHAR(50) DEFAULT 'text'`);
      } catch (e2) {
        // Column might already exist, that's fine
      }
    }

    // Insert broadcast sound message
    const result = await pool.query(
      `INSERT INTO epa_game_broadcast (game_session_id, player_id, player_name, message, message_type)
       VALUES ($1, NULL, 'Admin', $2, 'sound')
       RETURNING id`,
      [sessionId, soundId]
    );

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
