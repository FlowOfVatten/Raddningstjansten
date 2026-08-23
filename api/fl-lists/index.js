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
  tripKey,
  nowIso,
  defaultStore,
  requireAuthUser,
} = require('../familjelistan-shared');

function splitTail(tail) {
  return String(tail || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

const GROUP_ORDER = ['produce', 'bread', 'meat', 'dairy', 'pantry', 'frozen', 'household', 'other'];
const GROUP_KEYWORDS = {
  produce: ['tomat', 'gurka', 'sallad', 'isberg', 'ruccola', 'spenat', 'paprika', 'avokado', 'lök', 'gul lök', 'röd lök', 'vitlök', 'morot', 'potatis', 'citron', 'lime', 'äpple', 'banan', 'päron', 'apelsin', 'broccoli', 'blomkål', 'zucc', 'zucchini', 'purjo', 'majs', 'persilja', 'dill'],
  bread: ['bröd', 'limpa', 'fralla', 'toast', 'knäcke', 'knäckebröd', 'tortilla', 'pitabröd', 'hamburgerbröd', 'korvbröd', 'baguette'],
  meat: ['kyckling', 'köttfärs', 'nötfärs', 'färs', 'korv', 'bacon', 'skinka', 'salami', 'kalkon', 'kött', 'lax', 'fisk', 'räkor', 'chark'],
  dairy: ['mjölk', 'grädde', 'creme fraiche', 'crème fraîche', 'yoghurt', 'fil', 'ost', 'smör', 'kvarg', 'halloumi', 'mozzarella', 'fetaost', 'ägg'],
  pantry: ['pasta', 'ris', 'bulgur', 'quinoa', 'mjöl', 'socker', 'salt', 'peppar', 'olja', 'olivolja', 'vinäger', 'krossade tomater', 'bönor', 'linser', 'havregryn', 'kaffe', 'te', 'krydd', 'soja', 'senap', 'ketchup', 'majonnäs'],
  frozen: ['fryst', 'glass', 'ärtor', 'wokmix', 'fiskpinnar', 'pommes'],
  household: ['toapapper', 'hushållspapper', 'diskmedel', 'tvättmedel', 'sköljmedel', 'soppåsar', 'tandkräm', 'tvål', 'schampo', 'balsam', 'blöjor']
};

function classifyItemGroup(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return 'other';

  for (const [group, keywords] of Object.entries(GROUP_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return group;
    }
  }

  return 'other';
}

function getEffectiveGroup(item) {
  if (item && item.group && item.group !== 'other') return item.group;
  return classifyItemGroup(item && item.name);
}

function compareByGroupAndOrder(a, b) {
  const aGroup = getEffectiveGroup(a);
  const bGroup = getEffectiveGroup(b);
  const aGroupIndex = GROUP_ORDER.indexOf(aGroup);
  const bGroupIndex = GROUP_ORDER.indexOf(bGroup);

  if (aGroupIndex !== bGroupIndex) return aGroupIndex - bGroupIndex;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}

function getStoreById(household, storeId) {
  return (household.stores || []).find((store) => store.id === storeId) || null;
}

function sortItemsForStore(items, household, storeId) {
  const listItems = Array.isArray(items) ? items.slice() : [];
  if (!storeId) return listItems.sort(compareByGroupAndOrder);

  const order = household.storeOrders && Array.isArray(household.storeOrders[storeId])
    ? household.storeOrders[storeId]
    : [];
  if (!order.length) return listItems.sort(compareByGroupAndOrder);

  return listItems.sort((a, b) => {
    const aIdx = order.indexOf(String(a.name || '').trim().toLowerCase());
    const bIdx = order.indexOf(String(b.name || '').trim().toLowerCase());
    const aKnown = aIdx >= 0;
    const bKnown = bIdx >= 0;

    if (aKnown && bKnown) return aIdx - bIdx;
    if (aKnown) return -1;
    if (bKnown) return 1;
    return compareByGroupAndOrder(a, b);
  });
}

function toClientList(list, household) {
  const store = list.storeId ? getStoreById(household, list.storeId) : null;
  return {
    id: list.id,
    householdId: list.householdId,
    name: list.name,
    storeId: list.storeId || null,
    store,
    createdAt: list.createdAt,
    items: sortItemsForStore(list.items, household, list.storeId),
  };
}

module.exports = async function (_context, req) {
  const method = String(req.method || '').toUpperCase();
  const body = parseBody(req);
  const parts = splitTail(req.params && req.params.tail);

  try {
    const pool = getPool();
    await ensureAppStateTable(pool);
    const user = await requireAuthUser(req, pool);
    const household = await getState(pool, householdKey(user.householdId));

    if (!household) {
      return json(403, { error: 'Inget hushall hittades' });
    }

    // /api/lists
    if (parts.length === 0 && method === 'GET') {
      const lists = [];
      for (const listId of household.lists || []) {
        const list = await getState(pool, listKey(listId));
        if (list) lists.push(toClientList(list, household));
      }
      lists.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return json(200, lists);
    }

    // /api/lists
    if (parts.length === 0 && method === 'POST') {
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

      return json(201, toClientList(list, household));
    }

    const listId = parts[0];
    const list = await getState(pool, listKey(listId));
    if (!list || list.householdId !== household.id) {
      return json(404, { error: 'Listan finns inte' });
    }

    // /api/lists/:id
    if (parts.length === 1 && method === 'GET') {
      return json(200, toClientList(list, household));
    }

    // /api/lists/:id
    if (parts.length === 1 && method === 'PATCH') {
      const nextName = body.name == null ? null : String(body.name).trim();
      const nextStoreId = body.storeId == null ? null : String(body.storeId).trim();
      const nextStoreName = body.storeName == null ? null : String(body.storeName).trim();

      if (nextName !== null) {
        if (!nextName) return json(400, { error: 'Namn kravs' });
        list.name = nextName;
      }

      if (nextStoreName !== null) {
        household.stores = Array.isArray(household.stores) ? household.stores : [];

        if (!nextStoreName) {
          list.storeId = null;
        } else {
          const normalized = nextStoreName.toLowerCase();
          let store = household.stores.find((entry) => String(entry.name || '').trim().toLowerCase() === normalized) || null;

          if (!store) {
            store = {
              id: crypto.randomUUID(),
              name: nextStoreName,
              chain: nextStoreName,
              lat: 0,
              lng: 0,
            };
            household.stores.push(store);
          }

          list.storeId = store.id;
        }
        household.updatedAt = nowIso();
        await putState(pool, householdKey(household.id), household);
      } else if (nextStoreId !== null) {
        list.storeId = nextStoreId || null;
      }

      list.updatedAt = nowIso();
      await putState(pool, listKey(list.id), list);
      return json(200, toClientList(list, household));
    }

    // /api/lists/:id
    if (parts.length === 1 && method === 'DELETE') {
      household.lists = (household.lists || []).filter((id) => id !== list.id);
      household.updatedAt = nowIso();

      await putState(pool, householdKey(household.id), household);
      await putState(pool, listKey(list.id), {
        ...list,
        deletedAt: nowIso(),
        items: [],
      });

      return json(200, { ok: true, deletedId: list.id });
    }

    // /api/lists/:id/suggestions?q=milk
    if (parts.length === 2 && parts[1] === 'suggestions' && method === 'GET') {
      const q = String((req.query && req.query.q) || '').trim().toLowerCase();
      if (!q) return json(200, []);
      const history = Array.isArray(household.itemHistory) ? household.itemHistory : [];
      const hits = history
        .filter((name) => String(name).toLowerCase().startsWith(q))
        .slice(0, 8);
      return json(200, hits);
    }

    // /api/lists/:id/items
    if (parts.length === 2 && parts[1] === 'items' && method === 'POST') {
      const name = String(body.name || '').trim();
      if (!name) return json(400, { error: 'Varunamn kravs' });

      list.items = Array.isArray(list.items) ? list.items : [];
      const sortOrder = list.items.length + 1;
      const item = {
        id: crypto.randomUUID(),
        listId: list.id,
        name,
        quantity: body.quantity || null,
        note: body.note || null,
        status: 'remaining',
        group: classifyItemGroup(name),
        sortOrder,
        createdBy: user.id,
        createdAt: nowIso(),
      };

      list.items.push(item);
      await putState(pool, listKey(list.id), list);

      household.itemHistory = Array.isArray(household.itemHistory) ? household.itemHistory : [];
      if (!household.itemHistory.includes(name)) {
        household.itemHistory.unshift(name);
        household.itemHistory = household.itemHistory.slice(0, 500);
      }
      household.updatedAt = nowIso();
      await putState(pool, householdKey(household.id), household);

      return json(201, item);
    }

    // /api/lists/:id/items/:itemId
    if (parts.length === 3 && parts[1] === 'items' && method === 'PATCH') {
      const itemId = parts[2];
      list.items = Array.isArray(list.items) ? list.items : [];
      const idx = list.items.findIndex((i) => i.id === itemId);
      if (idx < 0) return json(404, { error: 'Rad finns inte' });

      const current = list.items[idx];
      const next = {
        ...current,
        status: body.status || current.status,
        quantity: body.quantity != null ? body.quantity : current.quantity,
        note: body.note != null ? body.note : current.note,
      };

      if (next.status === 'checked' && current.status !== 'checked') {
        next.checkedAt = nowIso();
        next.checkedBy = user.id;
      }

      list.items[idx] = next;
      await putState(pool, listKey(list.id), list);

      if (next.status === 'checked' && current.status !== 'checked' && list.storeId) {
        household.storeOrders = household.storeOrders || {};
        const storeOrder = Array.isArray(household.storeOrders[list.storeId])
          ? household.storeOrders[list.storeId]
          : [];
        const normalizedName = String(next.name || '').trim().toLowerCase();
        const filtered = storeOrder.filter((name) => name !== normalizedName);
        filtered.push(normalizedName);
        household.storeOrders[list.storeId] = filtered;
        household.updatedAt = nowIso();
        await putState(pool, householdKey(household.id), household);
      }

      return json(200, next);
    }

    // /api/lists/:id/clear-checked
    if (parts.length === 2 && parts[1] === 'clear-checked' && method === 'POST') {
      list.items = (Array.isArray(list.items) ? list.items : []).filter((i) => i.status !== 'checked');
      await putState(pool, listKey(list.id), list);
      return json(200, { ok: true });
    }

    // /api/lists/:id/trips
    if (parts.length === 2 && parts[1] === 'trips' && method === 'POST') {
      const store = defaultStore();
      const tripId = crypto.randomUUID();
      const trip = {
        id: tripId,
        listId: list.id,
        storeId: store.id,
        store,
        startedAt: nowIso(),
        endedAt: null,
      };

      await putState(pool, tripKey(tripId), trip);

      const sortedItems = (Array.isArray(list.items) ? list.items : [])
        .slice()
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      return json(201, {
        ...trip,
        sortedItems,
      });
    }

    return json(404, { error: 'Endpoint finns inte' });
  } catch (err) {
    const message = err && err.message ? err.message : 'Internt serverfel';
    if (message === 'Unauthorized') return json(401, { error: 'Unauthorized' });
    return json(500, { error: message });
  }
};
