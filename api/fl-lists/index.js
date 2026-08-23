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
const ITEM_CATALOG = [
  { canonical: 'tomat', group: 'produce', aliases: ['tomat', 'tomater', 'körsbärstomat', 'körsbärstomater', 'plommontomat', 'plommontomater', 'cocktailtomat', 'cocktailtomater', 'bifftomat', 'romatomat'] },
  { canonical: 'gurka', group: 'produce', aliases: ['gurka', 'gurkor', 'slanggurka', 'slanggurkor', 'minigurka', 'mini gurka', 'växthusgurka'] },
  { canonical: 'morot', group: 'produce', aliases: ['morot', 'morötter', 'babymorot', 'babymorötter', 'baby morot', 'baby morötter'] },
  { canonical: 'lök', group: 'produce', aliases: ['lök', 'lökar', 'gul lök', 'gullök', 'röd lök', 'rödlök', 'silverlök', 'bananschalottenlök', 'schalottenlök'] },
  { canonical: 'vitlök', group: 'produce', aliases: ['vitlök', 'vitlöksklyftor'] },
  { canonical: 'paprika', group: 'produce', aliases: ['paprika', 'paprikor', 'röd paprika', 'gul paprika', 'grön paprika'] },
  { canonical: 'sallad', group: 'produce', aliases: ['sallad', 'isberg', 'isbergssallad', 'ruccola', 'rucola', 'spenat', 'babyspenat', 'machesallad', 'romansallad'] },
  { canonical: 'potatis', group: 'produce', aliases: ['potatis', 'potatisar', 'färskpotatis', 'fast potatis', 'mjölig potatis'] },
  { canonical: 'avokado', group: 'produce', aliases: ['avokado', 'avokador'] },
  { canonical: 'citron', group: 'produce', aliases: ['citron', 'citroner'] },
  { canonical: 'lime', group: 'produce', aliases: ['lime', 'limes'] },
  { canonical: 'äpple', group: 'produce', aliases: ['äpple', 'äpplen'] },
  { canonical: 'banan', group: 'produce', aliases: ['banan', 'bananer'] },
  { canonical: 'päron', group: 'produce', aliases: ['päron', 'päronkonferens'] },
  { canonical: 'apelsin', group: 'produce', aliases: ['apelsin', 'apelsiner', 'clementin', 'clementiner', 'mandarin', 'mandariner'] },
  { canonical: 'broccoli', group: 'produce', aliases: ['broccoli', 'broccolibuketter'] },
  { canonical: 'blomkål', group: 'produce', aliases: ['blomkål'] },
  { canonical: 'zucchini', group: 'produce', aliases: ['zucchini', 'zuccini', 'zucc', 'squash'] },
  { canonical: 'purjolök', group: 'produce', aliases: ['purjo', 'purjolök'] },
  { canonical: 'majs', group: 'produce', aliases: ['majs', 'majskolv', 'majskolvar'] },
  { canonical: 'svamp', group: 'produce', aliases: ['svamp', 'champinjon', 'champinjoner', 'portabello', 'kantarell', 'kantareller'] },
  { canonical: 'ingefära', group: 'produce', aliases: ['ingefära', 'ingefara'] },
  { canonical: 'persilja', group: 'produce', aliases: ['persilja'] },
  { canonical: 'dill', group: 'produce', aliases: ['dill'] },
  { canonical: 'koriander', group: 'produce', aliases: ['koriander'] },

  { canonical: 'bröd', group: 'bread', aliases: ['bröd', 'rostbröd', 'toast', 'limpa', 'franska', 'frallor', 'fralla', 'surdegsbröd', 'levain'] },
  { canonical: 'knäckebröd', group: 'bread', aliases: ['knäckebröd', 'knäcke'] },
  { canonical: 'tortilla', group: 'bread', aliases: ['tortilla', 'tortillabröd', 'wraps'] },
  { canonical: 'pitabröd', group: 'bread', aliases: ['pitabröd', 'pita'] },
  { canonical: 'hamburgerbröd', group: 'bread', aliases: ['hamburgerbröd', 'burgerbröd'] },
  { canonical: 'korvbröd', group: 'bread', aliases: ['korvbröd', 'hotdogbröd'] },
  { canonical: 'baguette', group: 'bread', aliases: ['baguette'] },

  { canonical: 'kyckling', group: 'meat', aliases: ['kyckling', 'kycklingfilé', 'kycklingfile', 'grillad kyckling', 'kycklinglårfilé', 'kycklingfärs'] },
  { canonical: 'köttfärs', group: 'meat', aliases: ['köttfärs', 'nötfärs', 'blandfärs', 'färs'] },
  { canonical: 'korv', group: 'meat', aliases: ['korv', 'falukorv', 'grillkorv', 'chorizo', 'isterband'] },
  { canonical: 'bacon', group: 'meat', aliases: ['bacon'] },
  { canonical: 'skinka', group: 'meat', aliases: ['skinka', 'rökt skinka', 'kokt skinka', 'julskinka'] },
  { canonical: 'salami', group: 'meat', aliases: ['salami'] },
  { canonical: 'kalkon', group: 'meat', aliases: ['kalkon', 'kalkonpålägg'] },
  { canonical: 'lax', group: 'meat', aliases: ['lax', 'laxfilé', 'laxfile', 'varmrökt lax', 'kallrökt lax'] },
  { canonical: 'fisk', group: 'meat', aliases: ['fisk', 'torsk', 'sej', 'kolja', 'fiskfilé', 'fiskfile', 'fiskpinnar'] },
  { canonical: 'räkor', group: 'meat', aliases: ['räkor', 'rakaor', 'scampi'] },
  { canonical: 'kött', group: 'meat', aliases: ['kött', 'entrecote', 'ryggbiff', 'fläskkotlett', 'fläskfilé', 'fläskfile'] },

  { canonical: 'mjölk', group: 'dairy', aliases: ['mjölk', 'standardmjölk', 'mellanmjölk', 'lättmjölk', 'havremjölk', 'sojamjölk', 'mandelmjölk'] },
  { canonical: 'grädde', group: 'dairy', aliases: ['grädde', 'vispgrädde', 'matlagningsgrädde', 'gräddfil', 'matgrädde'] },
  { canonical: 'creme fraiche', group: 'dairy', aliases: ['creme fraiche', 'crème fraîche', 'fraiche'] },
  { canonical: 'yoghurt', group: 'dairy', aliases: ['yoghurt', 'yoghurt naturell', 'grekisk yoghurt', 'turkisk yoghurt'] },
  { canonical: 'fil', group: 'dairy', aliases: ['fil', 'filmjölk'] },
  { canonical: 'ost', group: 'dairy', aliases: ['ost', 'hushållsost', 'prästost', 'cheddar', 'herrgård', 'grevé', 'greve', 'parmesan'] },
  { canonical: 'mozzarella', group: 'dairy', aliases: ['mozzarella'] },
  { canonical: 'fetaost', group: 'dairy', aliases: ['fetaost'] },
  { canonical: 'halloumi', group: 'dairy', aliases: ['halloumi'] },
  { canonical: 'smör', group: 'dairy', aliases: ['smör', 'bregott', 'margarin'] },
  { canonical: 'kvarg', group: 'dairy', aliases: ['kvarg'] },
  { canonical: 'ägg', group: 'dairy', aliases: ['ägg', 'ägg 6-pack', 'ägg 10-pack', 'ägg 12-pack', 'ägg 15-pack'] },

  { canonical: 'pasta', group: 'pantry', aliases: ['pasta', 'spaghetti', 'makaroner', 'penne', 'fusilli', 'tagliatelle', 'lasagneplattor'] },
  { canonical: 'ris', group: 'pantry', aliases: ['ris', 'jasminris', 'basmatiris', 'sushiris', 'fullkornsris'] },
  { canonical: 'bulgur', group: 'pantry', aliases: ['bulgur'] },
  { canonical: 'quinoa', group: 'pantry', aliases: ['quinoa'] },
  { canonical: 'mjöl', group: 'pantry', aliases: ['mjöl', 'vetemjöl', 'rågmjöl', 'fullkornsmjöl'] },
  { canonical: 'socker', group: 'pantry', aliases: ['socker', 'strösocker', 'florsocker', 'farinsocker'] },
  { canonical: 'salt', group: 'pantry', aliases: ['salt', 'havssalt'] },
  { canonical: 'peppar', group: 'pantry', aliases: ['peppar', 'svartpeppar', 'vitpeppar'] },
  { canonical: 'olja', group: 'pantry', aliases: ['olja', 'olivolja', 'rapsolja', 'solrosolja'] },
  { canonical: 'vinäger', group: 'pantry', aliases: ['vinäger', 'balsamvinäger', 'vitvinsvinäger'] },
  { canonical: 'krossade tomater', group: 'pantry', aliases: ['krossade tomater', 'passerade tomater', 'tomatpuré', 'tomatpure'] },
  { canonical: 'bönor', group: 'pantry', aliases: ['bönor', 'kidneybönor', 'svarta bönor', 'vita bönor', 'borlottibönor'] },
  { canonical: 'linser', group: 'pantry', aliases: ['linser', 'röda linser', 'gröna linser'] },
  { canonical: 'havregryn', group: 'pantry', aliases: ['havregryn'] },
  { canonical: 'kaffe', group: 'pantry', aliases: ['kaffe'] },
  { canonical: 'te', group: 'pantry', aliases: ['te'] },
  { canonical: 'soja', group: 'pantry', aliases: ['soja', 'japansk soja', 'kinesisk soja'] },
  { canonical: 'senap', group: 'pantry', aliases: ['senap', 'dijonsenap'] },
  { canonical: 'ketchup', group: 'pantry', aliases: ['ketchup'] },
  { canonical: 'majonnäs', group: 'pantry', aliases: ['majonnäs', 'majonnas'] },
  { canonical: 'honung', group: 'pantry', aliases: ['honung'] },
  { canonical: 'jordnötssmör', group: 'pantry', aliases: ['jordnötssmör', 'jordnotssmor'] },

  { canonical: 'glass', group: 'frozen', aliases: ['glass'] },
  { canonical: 'frysta ärtor', group: 'frozen', aliases: ['frysta ärtor', 'ärtor'] },
  { canonical: 'wokmix', group: 'frozen', aliases: ['wokmix', 'fryst wokmix'] },
  { canonical: 'pommes', group: 'frozen', aliases: ['pommes', 'pommes frites'] },
  { canonical: 'frysta bär', group: 'frozen', aliases: ['frysta bär', 'hallon frysta', 'blåbär frysta'] },

  { canonical: 'toapapper', group: 'household', aliases: ['toapapper', 'toa papper', 'toa-rulle'] },
  { canonical: 'hushållspapper', group: 'household', aliases: ['hushållspapper'] },
  { canonical: 'diskmedel', group: 'household', aliases: ['diskmedel'] },
  { canonical: 'tvättmedel', group: 'household', aliases: ['tvättmedel'] },
  { canonical: 'sköljmedel', group: 'household', aliases: ['sköljmedel'] },
  { canonical: 'soppåsar', group: 'household', aliases: ['soppåsar', 'soppasar'] },
  { canonical: 'tandkräm', group: 'household', aliases: ['tandkräm', 'tandkram'] },
  { canonical: 'tvål', group: 'household', aliases: ['tvål', 'tval', 'handtvål'] },
  { canonical: 'schampo', group: 'household', aliases: ['schampo'] },
  { canonical: 'balsam', group: 'household', aliases: ['balsam'] },
  { canonical: 'blöjor', group: 'household', aliases: ['blöjor', 'blojor'] },
];

function normalizeItemName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?()]/g, '')
    .replace(/\s+/g, ' ');
}

function canonicalizeItemName(name) {
  const normalized = normalizeItemName(name);
  if (!normalized) return '';

  for (const item of ITEM_CATALOG) {
    if (item.aliases.some((alias) => normalized.includes(alias))) {
      return item.canonical;
    }
  }

  return normalized;
}

function classifyItemGroup(name) {
  const canonical = canonicalizeItemName(name);
  if (!canonical) return 'other';

  for (const item of ITEM_CATALOG) {
    if (item.canonical === canonical) {
      return item.group;
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
    const aIdx = order.indexOf(canonicalizeItemName(a.name || ''));
    const bIdx = order.indexOf(canonicalizeItemName(b.name || ''));
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
        const canonicalName = canonicalizeItemName(next.name || '');
        const filtered = storeOrder.filter((name) => name !== canonicalName);
        filtered.push(canonicalName);
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
