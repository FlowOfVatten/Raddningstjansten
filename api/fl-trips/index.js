const {
  getPool,
  ensureAppStateTable,
  json,
  getState,
  putState,
  tripKey,
  nowIso,
  requireAuthUser,
} = require('../familjelistan-shared');

module.exports = async function (_context, req) {
  const tripId = String((req.params && req.params.tripId) || '');

  try {
    const pool = getPool();
    await ensureAppStateTable(pool);
    await requireAuthUser(req, pool);

    if (!tripId) return json(400, { error: 'Trip id kravs' });

    const trip = await getState(pool, tripKey(tripId));
    if (!trip) return json(404, { error: 'Runda finns inte' });

    trip.endedAt = nowIso();
    await putState(pool, tripKey(tripId), trip);

    return json(200, trip);
  } catch (err) {
    const message = err && err.message ? err.message : 'Internt serverfel';
    if (message === 'Unauthorized') return json(401, { error: 'Unauthorized' });
    return json(500, { error: message });
  }
};
