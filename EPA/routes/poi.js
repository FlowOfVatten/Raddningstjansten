const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/poi - Get all POIs (for map)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, namn, lat, lng, radie_meter FROM epa_poi WHERE aktiv = true ORDER BY ordning_fast ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching POIs:', err);
    res.status(500).json({ error: 'Kunde inte hämta POI:er' });
  }
});

// GET /api/poi/:poiId/question - Get question for a POI
router.get('/:poiId/question', async (req, res) => {
  const { poiId } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, text, alternativ, ratt_index FROM epa_question WHERE poi_id = $1',
      [poiId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingen fråga för denna POI' });
    }

    const question = result.rows[0];
    
    res.json({
      id: question.id,
      text: question.text,
      alternativ: question.alternativ // Don't expose ratt_index to client
    });
  } catch (err) {
    console.error('Error fetching question:', err);
    res.status(500).json({ error: 'Kunde inte hämta fråga' });
  }
});

module.exports = router;
