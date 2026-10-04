const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/player/start - Start a new game
router.post('/start', async (req, res) => {
  const { namn } = req.body;
  
  if (!namn || namn.trim().length === 0) {
    return res.status(400).json({ error: 'Namn är obligatoriskt' });
  }

  try {
    // Create player
    const playerResult = await pool.query(
      'INSERT INTO epa_player (namn, status) VALUES ($1, $2) RETURNING id, namn, start_tid',
      [namn, 'aktiv']
    );
    const playerId = playerResult.rows[0].id;

    // Get all POIs with coordinates
    const poisResult = await pool.query(
      'SELECT id, lat, lng FROM epa_poi WHERE aktiv = true ORDER BY ordning_fast ASC'
    );
    const pois = poisResult.rows;
    
    if (pois.length < 10) {
      return res.status(400).json({ error: 'Inte tillräckligt med POI:er (behövs 10)' });
    }

    // Separate checkpoints (1-9) and goal (10)
    const checkpoints = pois.slice(0, 9);
    const goal = pois[9];
    
    // Fair shuffle: Use greedy nearest-neighbor with randomization
    // This creates a roughly equal path for all players while maintaining randomness
    const fairShuffledCheckpoints = fairShuffleCheckpoints(checkpoints);
    
    const sequence = [...fairShuffledCheckpoints.map(p => p.id), goal.id];

    // Create PlayerPoi entries with randomized sequence
    for (let i = 0; i < sequence.length; i++) {
      const status = i === 0 ? 'aktiv' : 'låst';
      await pool.query(
        'INSERT INTO epa_player_poi (player_id, poi_id, sekvens, status) VALUES ($1, $2, $3, $4)',
        [playerId, sequence[i], i + 1, status]
      );
    }

    res.json({
      playerId,
      namn: playerResult.rows[0].namn,
      startTid: playerResult.rows[0].start_tid
    });
  } catch (err) {
    console.error('Error starting game:', err);
    res.status(500).json({ error: 'Kunde inte starta spelet' });
  }
});

// GET /api/player/:playerId - Get player's current game state
router.get('/:playerId', async (req, res) => {
  const { playerId } = req.params;

  try {
    const playerResult = await pool.query(
      'SELECT id, namn, start_tid, mal_tid, status FROM epa_player WHERE id = $1',
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Spelare inte found' });
    }

    const player = playerResult.rows[0];

    // Get player's POI sequence with status
    const poiResult = await pool.query(
      `SELECT pp.sekvens, pp.poi_id, pp.status, pp.klar_tid, pp.forsok, 
              p.namn, p.lat, p.lng, p.radie_meter
       FROM epa_player_poi pp
       JOIN epa_poi p ON p.id = pp.poi_id
       WHERE pp.player_id = $1
       ORDER BY pp.sekvens ASC`,
      [playerId]
    );

    const pois = poiResult.rows;
    const activePoi = pois.find(p => p.status === 'aktiv');

    res.json({
      player,
      pois,
      activePoi: activePoi || null
    });
  } catch (err) {
    console.error('Error fetching player:', err);
    res.status(500).json({ error: 'Kunde inte hämta spelet' });
  }
});

// POST /api/player/:playerId/verify-position - Check if player is within POI radius
router.post('/:playerId/verify-position', async (req, res) => {
  const { playerId } = req.params;
  const { lat, lng } = req.body;

  try {
    // Get active POI for this player
    const result = await pool.query(
      `SELECT pp.poi_id, p.lat, p.lng, p.radie_meter
       FROM epa_player_poi pp
       JOIN epa_poi p ON p.id = pp.poi_id
       WHERE pp.player_id = $1 AND pp.status = 'aktiv'`,
      [playerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingen aktiv POI' });
    }

    const poi = result.rows[0];
    const distance = calculateDistance(lat, lng, poi.lat, poi.lng);

    const withinRadius = distance <= poi.radie_meter;

    res.json({
      withinRadius,
      distance: Math.round(distance),
      radieMeter: poi.radie_meter
    });
  } catch (err) {
    console.error('Error verifying position:', err);
    res.status(500).json({ error: 'Kunde inte verifiera position' });
  }
});

// POST /api/player/:playerId/submit-answer - Submit answer to question
router.post('/:playerId/submit-answer', async (req, res) => {
  const { playerId } = req.params;
  const { answerIndex } = req.body;

  try {
    // Get active POI and question
    const poiResult = await pool.query(
      `SELECT pp.poi_id, pp.forsok
       FROM epa_player_poi pp
       WHERE pp.player_id = $1 AND pp.status = 'aktiv'`,
      [playerId]
    );

    if (poiResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ingen aktiv POI' });
    }

    const { poi_id, forsok } = poiResult.rows[0];
    const maxForsok = 3;

    const questionResult = await pool.query(
      'SELECT id, ratt_index, ledtrad FROM epa_question WHERE poi_id = $1',
      [poi_id]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ingen fråga för denna POI' });
    }

    const question = questionResult.rows[0];
    const isCorrect = answerIndex === question.ratt_index;

    if (isCorrect) {
      // Mark POI as clear and unlock next
      const nextPoiResult = await pool.query(
        `SELECT poi_id FROM epa_player_poi 
         WHERE player_id = $1 AND sekvens = (
           SELECT sekvens + 1 FROM epa_player_poi WHERE player_id = $1 AND status = 'aktiv'
         )`,
        [playerId]
      );

      // Mark current as clear
      await pool.query(
        `UPDATE epa_player_poi 
         SET status = 'klar', klar_tid = NOW(), forsok = $1
         WHERE player_id = $2 AND status = 'aktiv'`,
        [forsok + 1, playerId]
      );

      // Unlock next POI if exists
      if (nextPoiResult.rows.length > 0) {
        await pool.query(
          `UPDATE epa_player_poi 
           SET status = 'aktiv'
           WHERE player_id = $1 AND poi_id = $2`,
          [playerId, nextPoiResult.rows[0].poi_id]
        );
      } else {
        // Game completed
        await pool.query(
          'UPDATE epa_player SET status = $1, mal_tid = NOW() WHERE id = $2',
          ['klar', playerId]
        );
      }

      res.json({
        correct: true,
        message: 'Rätt svar!'
      });
    } else {
      // Increment attempt
      const newForsok = forsok + 1;

      if (newForsok >= maxForsok) {
        // Max attempts reached, show hint
        await pool.query(
          'UPDATE epa_player_poi SET forsok = $1 WHERE player_id = $2 AND status = $3',
          [newForsok, playerId, 'aktiv']
        );

        res.json({
          correct: false,
          message: 'Fel svar, försök igen',
          hint: question.ledtrad || 'Försök igen',
          attemptsLeft: 0
        });
      } else {
        await pool.query(
          'UPDATE epa_player_poi SET forsok = $1 WHERE player_id = $2 AND status = $3',
          [newForsok, playerId, 'aktiv']
        );

        res.json({
          correct: false,
          message: 'Fel svar, försök igen',
          attemptsLeft: maxForsok - newForsok
        });
      }
    }
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ error: 'Kunde inte behandla svar' });
  }
});

// Helper function: Fair shuffle using greedy nearest-neighbor with randomization
// Ensures no player has to backtrack and paths are roughly equal length
// while still maintaining randomness so players don't follow the same route
function fairShuffleCheckpoints(checkpoints) {
  if (checkpoints.length === 0) return [];
  if (checkpoints.length === 1) return checkpoints;

  const result = [];
  const remaining = [...checkpoints];
  
  // Start from a random checkpoint
  const startIdx = Math.floor(Math.random() * remaining.length);
  result.push(remaining.splice(startIdx, 1)[0]);

  // Greedy nearest-neighbor with randomization
  while (remaining.length > 0) {
    const current = result[result.length - 1];
    
    // Calculate distances to all remaining checkpoints
    const distances = remaining.map((poi) => ({
      poi,
      distance: calculateDistance(current.lat, current.lng, poi.lat, poi.lng)
    }));

    // Sort by distance
    distances.sort((a, b) => a.distance - b.distance);

    // Pick one of the 3 closest POIs randomly (gives fairness + randomness)
    const numToConsider = Math.min(3, distances.length);
    const pool = distances.slice(0, numToConsider);
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    // Remove chosen from remaining and add to result
    const chosenIdx = remaining.indexOf(chosen.poi);
    result.push(remaining.splice(chosenIdx, 1)[0]);
  }

  return result;
}

// Helper function: Calculate distance between two points (meters)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = router;
