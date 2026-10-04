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

module.exports = {
  getEpaPool,
  calculateDistance,
  toRad,
  fairShuffleCheckpoints
};
