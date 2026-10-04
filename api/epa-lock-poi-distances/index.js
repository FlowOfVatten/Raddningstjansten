const { getEpaPool, buildDistanceMatrix } = require('../epa-shared');

module.exports = async function (context, req) {
  try {
    const pool = getEpaPool();

    // Get the current game session
    let sessionResult = await pool.query(
      `SELECT id FROM epa_game_session 
       WHERE status IN ('idle', 'ready') 
       ORDER BY created_at DESC LIMIT 1`
    );

    let sessionId;
    if (sessionResult.rows.length === 0) {
      // Create new session
      const newSession = await pool.query(
        `INSERT INTO epa_game_session (status) VALUES ('idle') RETURNING id`
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
    }

    // Get all active POIs
    const poisResult = await pool.query(
      'SELECT id, lat, lng FROM epa_poi WHERE aktiv = true ORDER BY ordning_fast ASC'
    );

    const pois = poisResult.rows.map(poi => ({
      id: poi.id,
      lat: Number(poi.lat),
      lng: Number(poi.lng)
    }));

    if (pois.length === 0) {
      return {
        status: 400,
        body: { error: 'Inga aktiva POI:er' }
      };
    }

    context.log(`Building distance matrix for ${pois.length} POIs...`);

    // Build the distance matrix using road routing (returns array with fallback flags)
    const distanceEntries = await buildDistanceMatrix(pois);

    context.log(`Distance matrix calculated: ${distanceEntries.length} connections`);

    // Clear old distance cache for this session
    await pool.query(
      'DELETE FROM epa_distance_cache WHERE game_session_id = $1',
      [sessionId]
    );

    // Store all distance entries in database
    for (const entry of distanceEntries) {
      await pool.query(
        `INSERT INTO epa_distance_cache (game_session_id, from_poi_id, to_poi_id, distance_meters, is_fallback)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, entry.fromId, entry.toId, entry.distanceMeters, entry.isFallback]
      );
    }

    // Calculate statistics for admin feedback
    const fallbackCount = distanceEntries.filter(e => e.isFallback).length;
    const roadDistances = distanceEntries.filter(e => !e.isFallback).map(e => e.distanceMeters);
    const avgDistance = roadDistances.length > 0 
      ? Math.round(roadDistances.reduce((a, b) => a + b, 0) / roadDistances.length) 
      : 0;
    const maxDistance = Math.max(...roadDistances, 0);
    const minDistance = Math.min(...roadDistances, Infinity);

    const warningMessage = fallbackCount > 0 
      ? ` (Varning: ${fallbackCount} anslutningar använd fågelväg)` 
      : '';

    return {
      status: 200,
      body: {
        success: true,
        message: `Distanser inlåsta för ${pois.length} POI:er${warningMessage}`,
        stats: {
          sessionId,
          poiCount: pois.length,
          totalConnections: distanceEntries.length,
          roadConnections: roadDistances.length,
          fallbackConnections: fallbackCount,
          avgDistance: `${avgDistance} m`,
          minDistance: `${minDistance === Infinity ? 0 : minDistance} m`,
          maxDistance: `${maxDistance} m`
        }
      }
    };
  } catch (err) {
    context.log('Error locking POI distances:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte låsa in distanser: ' + err.message }
    };
  }
};
