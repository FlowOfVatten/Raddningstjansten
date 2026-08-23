const crypto = require('crypto');
const {
  getPool,
  ensureAppStateTable,
  json,
  getState,
  putState,
  parseBody,
  householdKey,
  listKey,
  nowIso,
  requireAuthUser,
} = require('../familjelistan-shared');

function toClientList(list) {
  return {
    id: list.id,
    householdId: list.householdId,
    name: list.name,
    storeId: list.storeId || null,
    createdAt: list.createdAt,
    items: Array.isArray(list.items) ? list.items : [],
  };
}

module.exports = async function (_context, req) {
  const method = String(req.method || '').toUpperCase();
  const body = parseBody(req);

  try {
    const pool = getPool();
    await ensureAppStateTable(pool);
    const user = await requireAuthUser(req, pool);
    const household = await getState(pool, householdKey(user.householdId));

    if (!household) {
      return json(403, { error: 'Inget hushall hittades' });
    }

    if (method === 'GET') {
      const lists = [];
      for (const listId of household.lists || []) {
        const list = await getState(pool, listKey(listId));
        if (list) lists.push(toClientList(list));
      }
      lists.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return json(200, lists);
    }

    if (method === 'POST') {
      const name = String(body.name || '').trim();
      if (!name) return json(400, { error: 'Namn kravs' });

      const id = crypto.randomUUID();
      const createdAt = nowIso();
      const list = {
        id,
        householdId: household.id,
        name,
        storeId: null,
        createdAt,
        items: [],
      };

      household.lists = household.lists || [];
      household.lists.unshift(id);
      household.updatedAt = nowIso();

      await putState(pool, listKey(id), list);
      await putState(pool, householdKey(household.id), household);

      return json(201, toClientList(list));
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    const message = err && err.message ? err.message : 'Internt serverfel';
    if (message === 'Unauthorized') return json(401, { error: 'Unauthorized' });
    return json(500, { error: message });
  }
};
