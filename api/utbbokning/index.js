const { Pool } = require("pg");

function resolvePgConnectionString() {
  return (
    process.env.UTBBOKNING_PG_CONNECTION_STRING ||
    process.env.UTBBOKNING_DATABASE_URL ||
    process.env.RISE_PG_CONNECTION_STRING ||
    process.env.PG_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    "postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects?sslmode=no-verify"
  ).trim();
}

const pgConnectionString = resolvePgConnectionString();

const pool = new Pool({
  connectionString: pgConnectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(status, body) {
  return {
    status,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

function maskConnectionString(value) {
  return String(value || "")
    .replace(/(password\s*=\s*)[^;]+/gi, "$1***")
    .replace(/(pwd\s*=\s*)[^;]+/gi, "$1***")
    .replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1***$2");
}

async function probeDatabase(client) {
  try {
    const result = await client.query("SELECT NOW() AS now_utc");
    return {
      ok: true,
      nowUtc: result.rows?.[0]?.now_utc || null
    };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || "Unknown database error",
      code: error?.code || null,
      errno: error?.errno || null
    };
  }
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function getAgendaDate(item, fallbackDate) {
  const itemDate = String(item?.date || "").trim();
  if (itemDate) {
    return itemDate;
  }
  return String(fallbackDate || "").trim();
}

function splitMomentTimeValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return ["", ""];
  }

  const parts = raw.split("-");
  if (parts.length < 2) {
    return ["", ""];
  }

  return [String(parts[0] || "").trim(), String(parts[1] || "").trim()];
}

function parseLocalDateTime(dateValue, timeValue) {
  const date = String(dateValue || "").trim();
  const time = String(timeValue || "").trim();
  if (!date || !time) {
    return null;
  }

  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getMomentWindow(payload, item) {
  const dateValue = getAgendaDate(item, payload?.startDate || payload?.endDate || "");
  const [itemStart, itemEnd] = splitMomentTimeValue(item?.time || "");
  const startTime = String(itemStart || payload?.startTime || "00:00").trim();
  const endTime = String(itemEnd || payload?.endTime || "23:59").trim();
  const startAt = parseLocalDateTime(dateValue, startTime);
  const endAt = parseLocalDateTime(dateValue, endTime);

  if (!startAt || !endAt) {
    return null;
  }

  return {
    date: dateValue,
    startAt,
    endAt
  };
}

function rangesOverlap(left, right) {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}

function collectDemandEntries(payload, options = {}) {
  const now = options.now instanceof Date ? options.now : null;
  const entries = [];
  const agenda = Array.isArray(payload?.agenda) ? payload.agenda : [];

  agenda.forEach((item) => {
    const window = getMomentWindow(payload, item);
    if (!window) {
      return;
    }

    if (now && window.endAt <= now) {
      return;
    }

    const details = Array.isArray(item?.locationDetails)
      ? item.locationDetails
      : item?.locationDetail
        ? [{ name: item.locationDetail, quantity: 1 }]
        : [];

    details.forEach((entry) => {
      const name = String(entry?.name || entry?.value || entry || "").trim();
      const quantity = Math.max(0, Number.parseInt(String(entry?.quantity || 1), 10) || 0);
      if (!name || quantity <= 0) {
        return;
      }

      entries.push({
        date: window.date,
        name,
        normalizedName: normalizeName(name),
        quantity,
        startAt: window.startAt,
        endAt: window.endAt
      });
    });
  });

  return entries;
}

async function listResources(client) {
  const result = await client.query(`
    SELECT id, name, category, notes, total_quantity, updated_at
    FROM public.utbbokning_resources
    ORDER BY lower(name) ASC;
  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    notes: row.notes,
    totalQuantity: Number(row.total_quantity) || 0,
    updatedAt: row.updated_at
  }));
}

async function listBookings(client) {
  const result = await client.query(`
    SELECT id, payload, updated_at
    FROM public.utbbokning_bookings
    ORDER BY updated_at DESC;
  `);

  return result.rows.map((row) => ({
    id: row.id,
    ...(row.payload || {}),
    updatedAt: row.updated_at
  }));
}

async function validateAvailability(client, booking) {
  const requestedEntries = collectDemandEntries(booking);
  if (requestedEntries.length === 0) {
    return { ok: true, conflicts: [] };
  }

  const inventoryResult = await client.query(`
    SELECT normalized_name, name, total_quantity
    FROM public.utbbokning_resources;
  `);

  const inventory = new Map(
    inventoryResult.rows.map((row) => [
      row.normalized_name,
      {
        name: row.name,
        total: Number(row.total_quantity) || 0
      }
    ])
  );

  const existingResult = await client.query(
    `SELECT payload FROM public.utbbokning_bookings WHERE id <> $1;`,
    [String(booking.id || "")]
  );

  const now = new Date();
  const existingEntries = [];
  existingResult.rows.forEach((row) => {
    const payload = row.payload || {};
    existingEntries.push(...collectDemandEntries(payload, { now }));
  });

  const conflicts = [];
  const processed = new Set();

  requestedEntries.forEach((requestedEntry) => {
    const slotKey = `${requestedEntry.normalizedName}::${requestedEntry.startAt.toISOString()}::${requestedEntry.endAt.toISOString()}`;
    if (processed.has(slotKey)) {
      return;
    }
    processed.add(slotKey);

    const inventoryItem = inventory.get(requestedEntry.normalizedName);
    const total = inventoryItem ? Number(inventoryItem.total) : 0;
    const resourceName = inventoryItem ? inventoryItem.name : requestedEntry.name;

    const alreadyBooked = existingEntries
      .filter((entry) => entry.normalizedName === requestedEntry.normalizedName && rangesOverlap(entry, requestedEntry))
      .reduce((sum, entry) => sum + entry.quantity, 0);

    const requestedQty = requestedEntries
      .filter((entry) => entry.normalizedName === requestedEntry.normalizedName && rangesOverlap(entry, requestedEntry))
      .reduce((sum, entry) => sum + entry.quantity, 0);

    const available = Math.max(0, total - alreadyBooked);

    if (requestedQty > available) {
      conflicts.push({
        date: requestedEntry.date,
        resource: resourceName,
        requested: requestedQty,
        alreadyBooked,
        total,
        available
      });
    }
  });

  return {
    ok: conflicts.length === 0,
    conflicts
  };
}

module.exports = async function (context, req) {
  const method = String(req.method || "").toUpperCase();
  const entity = String(req.query.entity || req.body?.entity || "").trim().toLowerCase();

  if (method === "OPTIONS") {
    return { status: 204, headers: corsHeaders, body: "" };
  }

  if (method === "GET" && entity === "health") {
    return json(200, {
      ok: true,
      service: "utbbokning",
      dbConfigured: Boolean(pgConnectionString)
    });
  }

  if (!pgConnectionString) {
    return json(500, {
      error: "Missing PostgreSQL connection string. Set UTBBOKNING_PG_CONNECTION_STRING (preferred) or RISE_PG_CONNECTION_STRING / PG_CONNECTION_STRING / DATABASE_URL."
    });
  }

  let client;
  try {
    client = await pool.connect();

    if (method === "GET" && entity === "health-db") {
      const probe = await probeDatabase(client);
      return json(probe.ok ? 200 : 503, {
        ok: probe.ok,
        probe
      });
    }

    if (method === "GET" && entity === "debug") {
      const probe = await probeDatabase(client);
      const existence = await client.query(`SELECT to_regclass('public.utbbokning_resources') AS r, to_regclass('public.utbbokning_bookings') AS b`);
      const tablesExist = Boolean(existence.rows?.[0]?.r && existence.rows?.[0]?.b);
      return json(200, {
        ok: probe.ok,
        probe,
        schema: { ok: tablesExist, tablesExist },
        env: {
          hasRisePgConnectionString: Boolean(process.env.RISE_PG_CONNECTION_STRING),
          hasPgConnectionString: Boolean(process.env.PG_CONNECTION_STRING),
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
        },
        connection: {
          masked: maskConnectionString(pgConnectionString),
          length: pgConnectionString.length
        }
      });
    }

    if (method === "GET" && entity === "resources") {
      const resources = await listResources(client);
      return json(200, resources);
    }

    if (method === "GET" && entity === "bookings") {
      const bookings = await listBookings(client);
      return json(200, bookings);
    }

    if (method === "POST" && entity === "resource") {
      const body = req.body || {};
      const id = String(body.id || `res-${Date.now()}`);
      const name = String(body.name || "").trim();
      const category = String(body.category || "").trim();
      const notes = String(body.notes || "").trim();
      const totalQuantity = Math.max(0, Number.parseInt(String(body.totalQuantity || 0), 10) || 0);

      if (!name) {
        return json(400, { error: "name required" });
      }

      const normalized = normalizeName(name);

      await client.query(
        `
          INSERT INTO public.utbbokning_resources (id, name, normalized_name, category, notes, total_quantity, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name,
              normalized_name = EXCLUDED.normalized_name,
              category = EXCLUDED.category,
              notes = EXCLUDED.notes,
              total_quantity = EXCLUDED.total_quantity,
              updated_at = NOW();
        `,
        [id, name, normalized, category, notes, totalQuantity]
      );

      return json(200, { ok: true, id });
    }

    if (method === "DELETE" && entity === "resource") {
      const id = String(req.query.id || req.body?.id || "").trim();
      if (!id) {
        return json(400, { error: "id required" });
      }

      await client.query(`DELETE FROM public.utbbokning_resources WHERE id = $1;`, [id]);
      return json(200, { ok: true });
    }

    if (method === "POST" && entity === "booking") {
      const booking = req.body?.booking;
      if (!booking || typeof booking !== "object") {
        return json(400, { error: "booking required" });
      }

      if (!booking.id) {
        booking.id = `booking-${Date.now()}`;
      }

      const availability = await validateAvailability(client, booking);
      if (!availability.ok) {
        return json(409, {
          error: "Inventory conflict",
          conflicts: availability.conflicts
        });
      }

      await client.query(
        `
          INSERT INTO public.utbbokning_bookings (id, payload, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE
          SET payload = EXCLUDED.payload,
              updated_at = NOW();
        `,
        [String(booking.id), JSON.stringify(booking)]
      );

      return json(200, { ok: true, id: booking.id });
    }

    if (method === "DELETE" && entity === "booking") {
      const id = String(req.query.id || req.body?.id || "").trim();
      if (!id) {
        return json(400, { error: "id required" });
      }
      await client.query(`DELETE FROM public.utbbokning_bookings WHERE id = $1;`, [id]);
      return json(200, { ok: true });
    }

    if (method === "PATCH" && entity === "booking") {
      const id = String(req.body?.id || "").trim();
      const status = String(req.body?.status || "").trim();
      if (!id || !status) {
        return json(400, { error: "id and status required" });
      }
      await client.query(
        `UPDATE public.utbbokning_bookings
         SET payload = jsonb_set(payload, '{status}', $2::jsonb, true), updated_at = NOW()
         WHERE id = $1;`,
        [id, JSON.stringify(status)]
      );
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown route or entity" });
  } catch (error) {
    context.log.error("utbbokning api error", error);
    if (error && String(error.code || "") === "23505") {
      return json(409, { error: "Resource name already exists" });
    }
    return json(500, { error: error.message || "Server error" });
  } finally {
    if (client) {
      client.release();
    }
  }
};
