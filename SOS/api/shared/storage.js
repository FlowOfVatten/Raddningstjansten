// Shared in-memory storage for all functions
// This persists for the lifetime of the app instance

const firefighters = new Map();
const POSITION_TTL = 300000; // 5 minutes

// Clean up stale positions every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of firefighters.entries()) {
    if (now - data.lastUpdate > POSITION_TTL) {
      firefighters.delete(id);
    }
  }
}, 30000);

module.exports = {
  firefighters,
  POSITION_TTL
};
