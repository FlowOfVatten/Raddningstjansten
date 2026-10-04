const { Pool } = require('pg');

const poolByConnectionString = new Map();

function resolveEpaPgConnectionString() {
  return (
    process.env.EPA_PG_CONNECTION_STRING ||
    process.env.RISE_PG_CONNECTION_STRING ||
    process.env.RADDNINGSTJANSTEN_PG_CONNECTION_STRING ||
    process.env.PG_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    'postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects?sslmode=no-verify'
  ).trim();
}

function getEpaPool() {
  const connectionString = resolveEpaPgConnectionString();
  
  if (!connectionString) {
    throw new Error('Missing EPA_PG_CONNECTION_STRING environment variable');
  }

  if (!poolByConnectionString.has(connectionString)) {
    poolByConnectionString.set(
      connectionString,
      new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
      })
    );
  }

  return poolByConnectionString.get(connectionString);
}

// Helper: Calculate distance between two points (meters)
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

// Helper: Fair shuffle using greedy nearest-neighbor with randomization
function getMedian(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function calculateRouteDistance(route) {
  if (!Array.isArray(route) || route.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < route.length; i++) {
    total += calculateDistance(
      route[i - 1].lat,
      route[i - 1].lng,
      route[i].lat,
      route[i].lng
    );
  }

  return total;
}

function selectPreferredStartId(checkpoints, usedStartIds = []) {
  if (!Array.isArray(checkpoints) || checkpoints.length === 0) return null;

  const available = checkpoints.filter((poi) => !usedStartIds.includes(poi.id));
  const choices = available.length > 0 ? available : checkpoints;
  const start = choices[Math.floor(Math.random() * choices.length)];
  return start ? start.id : null;
}

function fairShuffleCheckpoints(checkpoints, preferredStartId = null, distanceMatrix = null) {
  if (checkpoints.length === 0) return [];
  if (checkpoints.length === 1) return checkpoints;

  const result = [];
  const remaining = [...checkpoints];

  let start;
  if (preferredStartId) {
    const preferredIndex = remaining.findIndex((poi) => poi.id === preferredStartId);
    if (preferredIndex >= 0) {
      start = remaining.splice(preferredIndex, 1)[0];
    }
  }

  if (!start) {
    const startIdx = Math.floor(Math.random() * remaining.length);
    start = remaining.splice(startIdx, 1)[0];
  }

  result.push(start);

  while (remaining.length > 0) {
    const current = result[result.length - 1];

    let distances;
    if (distanceMatrix && distanceMatrix[current.id]) {
      distances = remaining.map((poi) => ({
        poi,
        distance: distanceMatrix[current.id][poi.id] || calculateDistance(
          current.lat,
          current.lng,
          poi.lat,
          poi.lng
        )
      }));
    } else {
      distances = remaining.map((poi) => ({
        poi,
        distance: calculateDistance(current.lat, current.lng, poi.lat, poi.lng)
      }));
    }

    distances.sort((a, b) => a.distance - b.distance);

    const numToConsider = Math.min(3, distances.length);
    const pool = distances.slice(0, numToConsider);
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const chosenIdx = remaining.indexOf(chosen.poi);
    result.push(remaining.splice(chosenIdx, 1)[0]);
  }

  return result;
}

function buildBalancedPlayerRoute(checkpoints, goal, existingRoutes = [], distanceMatrix = null) {
  if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
    return goal ? [goal] : [];
  }

  const existingRouteLengths = existingRoutes
    .map((route) => distanceMatrix ? calculateRouteDistanceWithMatrix(route, distanceMatrix) : calculateRouteDistance(route))
    .filter((value) => Number.isFinite(value) && value > 0);

  const usedStartIds = existingRoutes
    .map((route) => route[0]?.id)
    .filter(Boolean);

  const preferredStartId = selectPreferredStartId(checkpoints, usedStartIds);
  const threshold = existingRouteLengths.length > 0 ? getMedian(existingRouteLengths) * 1.2 : null;

  let bestRoute = null;
  let bestLength = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 40; attempt++) {
    const candidateCheckpoints = fairShuffleCheckpoints(checkpoints, preferredStartId, distanceMatrix);
    const candidateRoute = [...candidateCheckpoints, goal];
    const routeLength = distanceMatrix ? calculateRouteDistanceWithMatrix(candidateRoute, distanceMatrix) : calculateRouteDistance(candidateRoute);

    if (!threshold || routeLength <= threshold) {
      return candidateRoute;
    }

    if (routeLength < bestLength) {
      bestLength = routeLength;
      bestRoute = candidateRoute;
    }
  }

  return bestRoute || [...fairShuffleCheckpoints(checkpoints, preferredStartId, distanceMatrix), goal];
}

const https = require('https');

// Azure Maps subscription key for routing
const AZURE_MAPS_KEY = process.env.AZURE_MAPS_KEY || 'DDyXGJo90rmsvZWRBl8gjVei030IlU4hcBqSgcOJ2n3xiTT1cgnWJQQJ99CDACi5YpzT8CmNAAAgAZMP34PQ';

// Helper: Fetch routing distance between two points via Azure Maps
async function getRoutingDistance(lat1, lng1, lat2, lng2) {
  return new Promise((resolve) => {
    try {
      const url = `https://atlas.microsoft.com/route/directions/json?api-version=1.0&query=${lat1},${lng1}:${lat2},${lng2}&subscription-key=${encodeURIComponent(AZURE_MAPS_KEY)}`;

      https.get(url, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.routes && parsed.routes.length > 0) {
              const distanceMeters = parsed.routes[0].summary.lengthInMeters || 0;
              return resolve(distanceMeters);
            }
            // Fallback to straight-line distance if no route found
            resolve(calculateDistance(lat1, lng1, lat2, lng2));
          } catch (e) {
            resolve(calculateDistance(lat1, lng1, lat2, lng2));
          }
        });
      }).on('error', () => {
        // Fallback to straight-line distance on network error
        resolve(calculateDistance(lat1, lng1, lat2, lng2));
      });
    } catch (e) {
      // Fallback to straight-line distance on any error
      resolve(calculateDistance(lat1, lng1, lat2, lng2));
    }
  });
}

// Helper: Build a distance matrix for all checkpoints using road routing
// Returns array of { fromId, toId, distanceMeters, isFallback }
async function buildDistanceMatrix(checkpoints) {
  if (!Array.isArray(checkpoints) || checkpoints.length === 0) return [];\n
  const results = [];

  for (let i = 0; i < checkpoints.length; i++) {
    const from = checkpoints[i];

    for (let j = 0; j < checkpoints.length; j++) {
      const to = checkpoints[j];
      if (i === j) continue;

      const { distance, isFallback } = await getRoutingDistanceWithFallback(
        Number(from.lat),
        Number(from.lng),
        Number(to.lat),
        Number(to.lng)
      );

      results.push({
        fromId: from.id,
        toId: to.id,
        distanceMeters: distance,
        isFallback
      });
    }
  }

  return results;
}\n
// Helper: Fetch routing distance and track if fallback was used
async function getRoutingDistanceWithFallback(lat1, lng1, lat2, lng2) {
  return new Promise((resolve) => {
    try {
      const url = `https://atlas.microsoft.com/route/directions/json?api-version=1.0&query=${lat1},${lng1}:${lat2},${lng2}&subscription-key=${encodeURIComponent(AZURE_MAPS_KEY)}`;\n
      https.get(url, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.routes && parsed.routes.length > 0) {
              const distanceMeters = parsed.routes[0].summary.lengthInMeters || 0;
              return resolve({ distance: distanceMeters, isFallback: false });
            }
            // Fallback to straight-line distance if no route found
            const straightLine = calculateDistance(lat1, lng1, lat2, lng2);
            resolve({ distance: straightLine, isFallback: true });
          } catch (e) {
            const straightLine = calculateDistance(lat1, lng1, lat2, lng2);
            resolve({ distance: straightLine, isFallback: true });
          }
        });
      }).on('error', () => {
        // Fallback to straight-line distance on network error
        const straightLine = calculateDistance(lat1, lng1, lat2, lng2);
        resolve({ distance: straightLine, isFallback: true });
      });
    } catch (e) {
      // Fallback to straight-line distance on any error
      const straightLine = calculateDistance(lat1, lng1, lat2, lng2);
      resolve({ distance: straightLine, isFallback: true });
    }
  });
}

// Helper: Calculate route distance using distance matrix instead of straight-line
function calculateRouteDistanceWithMatrix(route, distanceMatrix) {
  if (!Array.isArray(route) || route.length < 2 || !distanceMatrix) return 0;

  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const fromId = route[i - 1].id;
    const toId = route[i].id;
    const dist = distanceMatrix[fromId]?.[toId] || calculateDistance(
      route[i - 1].lat,
      route[i - 1].lng,
      route[i].lat,
      route[i].lng
    );
    total += dist;
  }
  return total;
}

// Helper: Read distance matrix from database cache
async function readDistanceMatrixFromCache(pool, sessionId) {
  const result = await pool.query(
    `SELECT from_poi_id, to_poi_id, distance_meters, is_fallback
     FROM epa_distance_cache
     WHERE game_session_id = $1
     ORDER BY from_poi_id, to_poi_id`,
    [sessionId]
  );

  const matrix = {};
  const fallbackMap = {};

  for (const row of result.rows) {
    const fromId = row.from_poi_id;
    const toId = row.to_poi_id;

    if (!matrix[fromId]) matrix[fromId] = {};
    if (!fallbackMap[fromId]) fallbackMap[fromId] = {};

    matrix[fromId][toId] = Number(row.distance_meters);
    fallbackMap[fromId][toId] = row.is_fallback;
  }

  return { matrix, fallbackMap };
}

// Helper: Verify admin password against database
async function verifyAdminPassword(password) {
  if (!password) return false;
  
  try {
    const pool = getEpaPool();
    const result = await pool.query(
      'SELECT id FROM epa_admin WHERE password_hash = $1 LIMIT 1',
      [password]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error('Error verifying admin password:', err.message);
    return false;
  }
}

module.exports = {
  getEpaPool,
  calculateDistance,
  toRad,
  getMedian,
  calculateRouteDistance,
  calculateRouteDistanceWithMatrix,
  fairShuffleCheckpoints,
  buildBalancedPlayerRoute,
  getRoutingDistance,
  buildDistanceMatrix,
  readDistanceMatrixFromCache,
  verifyAdminPassword
};
