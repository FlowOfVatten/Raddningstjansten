const { getEpaPool } = require('../epa-shared');

module.exports = async function (context, req) {
  const password = req.query.password;

  if (password !== process.env.ADMIN_PASSWORD) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();
    const result = await pool.query(
      `SELECT p.id, p.namn, p.start_tid, p.mal_tid, p.status,
              COUNT(CASE WHEN pp.status = 'klar' THEN 1 END) as klar_count
       FROM epa_player p
       LEFT JOIN epa_player_poi pp ON pp.player_id = p.id
       GROUP BY p.id
       ORDER BY p.start_tid DESC`
    );

    return {
      status: 200,
      body: result.rows
    };
  } catch (err) {
    context.log('Error fetching players:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte hämta spelare' }
    };
  }
};
