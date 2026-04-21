const { firefighters } = require('../shared/storage');

module.exports = async function (context, req) {
  context.res.headers['Content-Type'] = 'application/json';
  context.res.headers['Access-Control-Allow-Origin'] = '*';

  const id = context.bindingData.id || req.query.id;

  // POST: Update firefighter position
  if (req.method === 'POST') {
    const { lat, lon, sos, accuracy } = req.body || {};

    if (!id || lat === undefined || lon === undefined) {
      context.res.status = 400;
      context.res.body = { error: 'Missing required fields' };
      return;
    }

    firefighters.set(id, {
      id,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      sos: sos || false,
      lastUpdate: Date.now(),
      accuracy: accuracy || null
    });

    context.res.status = 200;
    context.res.body = { success: true, id };
    return;
  }

  // GET: Retrieve single firefighter
  if (req.method === 'GET') {
    const data = firefighters.get(id);
    if (!data) {
      context.res.status = 404;
      context.res.body = { error: 'Not found' };
      return;
    }
    context.res.status = 200;
    context.res.body = data;
    return;
  }

  // DELETE: Remove firefighter
  if (req.method === 'DELETE') {
    const removed = firefighters.delete(id);
    context.res.status = 200;
    context.res.body = { success: removed };
    return;
  }

  context.res.status = 405;
  context.res.body = { error: 'Method not allowed' };
};
