const { Pool } = require("pg");

function resolvePgConnectionString() {
  return (
    process.env.UTBBOKNING_PG_CONNECTION_STRING ||
    process.env.RISE_PG_CONNECTION_STRING ||
    process.env.PG_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
}

const pgConnectionString = resolvePgConnectionString();

const pool = new Pool({
  connectionString: pgConnectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

let schemaReady = false;

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
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

function collectDemandByDate(payload) {
  const usageMap = new Map();
  const agenda = Array.isArray(payload?.agenda) ? payload.agenda : [];
  const fallbackDate = payload?.startDate || "";

  agenda.forEach((item) => {
    const dateKey = getAgendaDate(item, fallbackDate);
    if (!dateKey) {
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

      const stockKey = normalizeName(name);
      const combined = `${dateKey}::${stockKey}`;
      usageMap.set(combined, (usageMap.get(combined) || 0) + quantity);
    });
  });

  return usageMap;
}

async function ensureSchema(client) {
  if (schemaReady) {
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS utbbokning_resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      total_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS utbbokning_bookings (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  schemaReady = true;
}

async function ensureSchemaWithTolerance(client, context) {
  try {
    await ensureSchema(client);
    return { ok: true };
  } catch (error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    const permissionDenied = code === "42501" || /permission denied/i.test(message);

    if (permissionDenied) {
      context.log.warn("utbbokning schema ensure skipped due to DB permissions", {
        code,
        message
      });
      return { ok: false, skipped: true, reason: "permission-denied" };
    }

    throw error;
  }
}

async function listResources(client) {
  const result = await client.query(`
    SELECT id, name, category, notes, total_quantity, updated_at
    FROM utbbokning_resources
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
    FROM utbbokning_bookings
    ORDER BY updated_at DESC;
  `);

  return result.rows.map((row) => ({
    id: row.id,
    ...(row.payload || {}),
    updatedAt: row.updated_at
  }));
}

async function validateAvailability(client, booking) {
  const requestedMap = collectDemandByDate(booking);
  if (requestedMap.size === 0) {
    return { ok: true, conflicts: [] };
  }

  const inventoryResult = await client.query(`
    SELECT normalized_name, name, total_quantity
    FROM utbbokning_resources;
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
    `SELECT payload FROM utbbokning_bookings WHERE id <> $1;`,
    [String(booking.id || "")]
  );

  const bookedMap = new Map();
  existingResult.rows.forEach((row) => {
    const payload = row.payload || {};
    const usage = collectDemandByDate(payload);
    usage.forEach((qty, key) => {
      bookedMap.set(key, (bookedMap.get(key) || 0) + qty);
    });
  });

  const conflicts = [];
  requestedMap.forEach((requestedQty, key) => {
    const [date, normalizedName] = key.split("::");
    const inventoryItem = inventory.get(normalizedName);

    if (!inventoryItem || inventoryItem.total <= 0) {
      return;
    }

    const alreadyBooked = bookedMap.get(key) || 0;
    const available = Math.max(0, inventoryItem.total - alreadyBooked);

    if (requestedQty > available) {
      conflicts.push({
        date,
        resource: inventoryItem.name,
        requested: requestedQty,
        alreadyBooked,
        total: inventoryItem.total,
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
      const schemaAttempt = await ensureSchemaWithTolerance(client, context);
      return json(200, {
        ok: probe.ok,
        probe,
        schema: schemaAttempt,
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

    await ensureSchemaWithTolerance(client, context);

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
          INSERT INTO utbbokning_resources (id, name, normalized_name, category, notes, total_quantity, updated_at)
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

      await client.query(`DELETE FROM utbbokning_resources WHERE id = $1;`, [id]);
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
          INSERT INTO utbbokning_bookings (id, payload, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE
          SET payload = EXCLUDED.payload,
              updated_at = NOW();
        `,
        [String(booking.id), JSON.stringify(booking)]
      );

      return json(200, { ok: true, id: booking.id });
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
