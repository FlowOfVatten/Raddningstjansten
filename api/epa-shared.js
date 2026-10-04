const { Pool } = require('pg');
const https = require('https');

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

// Helper: Calculate median of an array
function getMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Helper: Calculate total distance of a route using Haversine
function calculateRouteDistance(route) {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1];
    const to = route[i];
    total += calculateDistance(from.lat, from.lng, to.lat, to.lng);
  }
  return total;
}

// Helper: Fair shuffle using greedy nearest-neighbor with randomization
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

    // Pick one of the 3 closest POIs randomly
    const numToConsider = Math.min(3, distances.length);
    const pool = distances.slice(0, numToConsider);
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    // Remove chosen from remaining and add to result
    const chosenIdx = remaining.indexOf(chosen.poi);
    result.push(remaining.splice(chosenIdx, 1)[0]);
  }

  return result;
}

// Helper: Get road distance from Azure Maps Routing API with fallback to Haversine
async function getRoutingDistance(lat1, lng1, lat2, lng2) {
  try {
    const apiKey = process.env.AZURE_MAPS_KEY || 'lF9BdGlqb1lSVEhON0V3ZlhXZDNGMVJrQTJtRy9BNDQ=';
    const url = `https://atlas.microsoft.com/route/directions/json?subscription-key=${apiKey}&api-version=1.0&query=${lat1},${lng1}:${lat2},${lng2}`;

    return new Promise((resolve) => {
      https.get(url, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.routes && json.routes.length > 0) {
              const distanceMeters = json.routes[0].summary.lengthInMeters;
              resolve({ distance: distanceMeters, isFallback: false });
            } else {
              resolve({ distance: calculateDistance(lat1, lng1, lat2, lng2), isFallback: true });
            }
          } catch (e) {
            resolve({ distance: calculateDistance(lat1, lng1, lat2, lng2), isFallback: true });
          }
        });
      }).on('error', () => {
        resolve({ distance: calculateDistance(lat1, lng1, lat2, lng2), isFallback: true });
      });
    });
  } catch (err) {
    return { distance: calculateDistance(lat1, lng1, lat2, lng2), isFallback: true };
  }
}

// Helper: Build distance matrix for all POI pairs via Azure Maps
async function buildDistanceMatrix(checkpoints) {
  const distanceEntries = [];
  for (let i = 0; i < checkpoints.length; i++) {
    for (let j = 0; j < checkpoints.length; j++) {
      if (i === j) continue;
      const from = checkpoints[i];
      const to = checkpoints[j];
      const { distance, isFallback } = await getRoutingDistance(from.lat, from.lng, to.lat, to.lng);
      distanceEntries.push({
        fromId: from.id,
        toId: to.id,
        distanceMeters: Math.round(distance),
        isFallback
      });
    }
  }
  return distanceEntries;
}

// Helper: Read pre-calculated distance matrix from database cache
async function readDistanceMatrixFromCache(pool, sessionId) {
  const result = await pool.query(
    `SELECT from_poi_id, to_poi_id, distance_meters, is_fallback
     FROM epa_distance_cache
     WHERE game_session_id = $1`,
    [sessionId]
  );

  const matrix = {};
  const fallbackMap = {};
  
  for (const row of result.rows) {
    if (!matrix[row.from_poi_id]) matrix[row.from_poi_id] = {};
    if (!fallbackMap[row.from_poi_id]) fallbackMap[row.from_poi_id] = {};

    matrix[row.from_poi_id][row.to_poi_id] = Number(row.distance_meters);
    fallbackMap[row.from_poi_id][row.to_poi_id] = row.is_fallback;
  }

  return { matrix, fallbackMap };
}

// Helper: Calculate route distance using pre-calculated distance matrix
function calculateRouteDistanceWithMatrix(route, distanceMatrix) {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const fromId = route[i - 1].id;
    const toId = route[i].id;
    if (distanceMatrix[fromId] && distanceMatrix[fromId][toId]) {
      total += distanceMatrix[fromId][toId];
    }
  }
  return total;
}

module.exports = {
  getEpaPool,
  calculateDistance,
  toRad,
  getMedian,
  calculateRouteDistance,
  calculateRouteDistanceWithMatrix,
  fairShuffleCheckpoints,
  getRoutingDistance,
  buildDistanceMatrix,
  readDistanceMatrixFromCache,
  verifyAdminPassword
};

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
