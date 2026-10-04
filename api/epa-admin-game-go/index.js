const { getEpaPool, verifyAdminPassword, getMedian, calculateRouteDistanceWithMatrix, buildBalancedPlayerRoute, readDistanceMatrixFromCache } = require('../epa-shared');

module.exports = async function (context, req) {
  const { password, sessionId } = req.body || {};

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
    
    // Get all players for this session
    const playersResult = await pool.query(
      `SELECT id FROM epa_player WHERE game_session_id = $1 AND player_status = 'ready'`,
      [sessionId]
    );

    const playerIds = playersResult.rows.map(r => r.id);

    if (playerIds.length === 0) {
      return {
        status: 200,
        body: { 
          success: true, 
          message: 'Spelet startat! (Inga spelare kvar)' 
        }
      };
    }

    // Read cached distance matrix
    const { matrix: distanceMatrix, fallbackMap } = await readDistanceMatrixFromCache(pool, sessionId);

    // Get all POIs for reference
    const poisResult = await pool.query(
      'SELECT id, lat, lng FROM epa_poi WHERE aktiv = true ORDER BY ordning_fast ASC'
    );
    const pois = poisResult.rows.map(poi => ({
      id: poi.id,
      lat: Number(poi.lat),
      lng: Number(poi.lng)
    }));

    // Calculate distances for all current player routes
    const playerRouteLengths = [];
    for (const playerId of playerIds) {
      const poiResult = await pool.query(
        `SELECT pp.sekvens, p.id, p.lat, p.lng
         FROM epa_player_poi pp
         JOIN epa_poi p ON p.id = pp.poi_id
         WHERE pp.player_id = $1
         ORDER BY pp.sekvens ASC`,
        [playerId]
      );

      const route = poiResult.rows.map(r => ({
        id: r.id,
        lat: Number(r.lat),
        lng: Number(r.lng)
      }));

      if (route.length > 0) {
        const routeLength = calculateRouteDistanceWithMatrix(route, distanceMatrix);
        playerRouteLengths.push({ playerId, route, routeLength, hasFallback: false });

        // Check if this route has any fallback distances
        for (let i = 1; i < route.length; i++) {
          const fromId = route[i - 1].id;
          const toId = route[i].id;
          if (fallbackMap[fromId]?.[toId]) {
            playerRouteLengths[playerRouteLengths.length - 1].hasFallback = true;
            break;
          }
        }
      }
    }

    // Calculate median of all route lengths
    const routeLengths = playerRouteLengths.map(r => r.routeLength);
    const median = getMedian(routeLengths);
    const threshold = median * 1.2;

    // Rebuild routes that are too long
    let rebuiltCount = 0;
    for (const playerRoute of playerRouteLengths) {
      if (playerRoute.routeLength > threshold) {
        context.log(`Player ${playerRoute.playerId} route too long: ${playerRoute.routeLength}m > ${threshold}m, rebuilding...`);
        
        // Get checkpoints for this player (all except last/goal)
        const checkpointIds = playerRoute.route.slice(0, -1);
        const goal = playerRoute.route[playerRoute.route.length - 1];

        // Find checkpoint data
        const checkpointData = checkpointIds.map(cp => 
          pois.find(p => p.id === cp.id)
        ).filter(Boolean);

        // Rebuild the route
        const newRoute = buildBalancedPlayerRoute(
          checkpointData,
          goal,
          [],
          distanceMatrix
        );

        // Save new route to database
        await pool.query(
          `DELETE FROM epa_player_poi WHERE player_id = $1`,
          [playerRoute.playerId]
        );

        for (let i = 0; i < newRoute.length; i++) {
          const status = i === 0 ? 'aktiv' : 'låst';
          await pool.query(
            `INSERT INTO epa_player_poi (player_id, poi_id, sekvens, status) VALUES ($1, $2, $3, $4)`,
            [playerRoute.playerId, newRoute[i].id, i + 1, status]
          );
        }

        rebuiltCount++;
      }
    }

    // Update game session to started
    await pool.query(
      `UPDATE epa_game_session 
       SET status = 'started', started_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [sessionId]
    );

    // Update all ready players to started
    await pool.query(
      `UPDATE epa_player 
       SET player_status = 'started' 
       WHERE game_session_id = $1 AND player_status = 'ready'`,
      [sessionId]
    );

    const message = rebuiltCount > 0 
      ? `Spelet startat! ${rebuiltCount} rundor byggdes om för att vara rättvisa.`
      : `Spelet startat! Alla rundor är rättvisa.`;

    return {
      status: 200,
      body: { 
        success: true, 
        message,
        stats: {
          totalPlayers: playerIds.length,
          rebuiltRoutes: rebuiltCount,
          medianDistance: Math.round(median),
          thresholdDistance: Math.round(threshold)
        }
      }
    };
  } catch (err) {
    context.log('Error starting game:', err.message);
    context.log('Error details:', err);
    return {
      status: 500,
      body: { error: 'Kunde inte starta spel: ' + err.message }
    };
  }
};
