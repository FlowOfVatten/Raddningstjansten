const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware: Check admin password
const adminAuth = (req, res, next) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Felaktigt lösenord' });
  }
  next();
};

// POST /api/admin/poi - Add a new POI
router.post('/poi', adminAuth, async (req, res) => {
  const { namn, lat, lng, radieMeter, ordningFast } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO epa_poi (namn, lat, lng, radie_meter, ordning_fast) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [namn, lat, lng, radieMeter || 40, ordningFast || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding POI:', err);
    res.status(500).json({ error: 'Kunde inte lägga till POI' });
  }
});

// POST /api/admin/poi/:poiId/question - Add or update question for POI
router.post('/poi/:poiId/question', adminAuth, async (req, res) => {
  const { poiId } = req.params;
  const { text, alternativ, rattIndex, ledtrad } = req.body;

  try {
    // Check if question exists
    const existing = await pool.query(
      'SELECT id FROM epa_question WHERE poi_id = $1',
      [poiId]
    );

    if (existing.rows.length > 0) {
      // Update
      const result = await pool.query(
        'UPDATE epa_question SET text = $1, alternativ = $2, ratt_index = $3, ledtrad = $4 WHERE poi_id = $5 RETURNING *',
        [text, JSON.stringify(alternativ), rattIndex, ledtrad || null, poiId]
      );
      res.json(result.rows[0]);
    } else {
      // Insert
      const result = await pool.query(
        'INSERT INTO epa_question (poi_id, text, alternativ, ratt_index, ledtrad) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [poiId, text, JSON.stringify(alternativ), rattIndex, ledtrad || null]
      );
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error adding question:', err);
    res.status(500).json({ error: 'Kunde inte lägga till fråga' });
  }
});

// DELETE /api/admin/poi/:poiId - Delete a POI
router.delete('/poi/:poiId', adminAuth, async (req, res) => {
  const { poiId } = req.params;

  try {
    await pool.query('DELETE FROM epa_poi WHERE id = $1', [poiId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting POI:', err);
    res.status(500).json({ error: 'Kunde inte ta bort POI' });
  }
});

// GET /api/admin/players - Get all players and their progress
router.get('/players', async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Felaktigt lösenord' });
  }

  try {
    const result = await pool.query(
      `SELECT p.id, p.namn, p.start_tid, p.mal_tid, p.status,
              COUNT(CASE WHEN pp.status = 'klar' THEN 1 END) as klar_count
       FROM epa_player p
       LEFT JOIN epa_player_poi pp ON pp.player_id = p.id
       GROUP BY p.id
       ORDER BY p.start_tid DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Kunde inte hämta spelare' });
  }
});

// POST /api/admin/reset-player - Reset a single player's game
router.post('/reset-player', adminAuth, async (req, res) => {
  const { playerId } = req.body;

  try {
    await pool.query('DELETE FROM epa_player_poi WHERE player_id = $1', [playerId]);
    await pool.query('DELETE FROM epa_player WHERE id = $1', [playerId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error resetting player:', err);
    res.status(500).json({ error: 'Kunde inte nollställa speller' });
  }
});

// POST /api/admin/reset-all - Reset all games
router.post('/reset-all', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM epa_player_poi');
    await pool.query('DELETE FROM epa_player');
    res.json({ success: true });
  } catch (err) {
    console.error('Error resetting all:', err);
    res.status(500).json({ error: 'Kunde inte nollställa alla spel' });
  }
});

module.exports = router;
