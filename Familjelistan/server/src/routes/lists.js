import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'
import { broadcastToList } from '../ws.js'

const router = Router()
router.use(requireAuth)

/** Get household id for the authed user */
async function getHouseholdId(userId) {
  const { rows } = await query(
    `SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1`,
    [userId]
  )
  return rows[0]?.household_id ?? null
}

// GET /api/lists
router.get('/', async (req, res) => {
  const householdId = await getHouseholdId(req.userId)
  if (!householdId) return res.json([])

  const { rows } = await query(
    `SELECT l.id, l.name, l.household_id AS "householdId", l.store_id AS "storeId", l.created_at AS "createdAt",
            COALESCE(json_agg(
              json_build_object(
                'id', i.id,
                'name', i.name,
                'quantity', i.quantity,
                'note', i.note,
                'status', i.status,
                'group', i.item_group,
                'sortOrder', i.sort_order,
                'createdBy', i.created_by,
                'createdAt', i.created_at
              ) ORDER BY i.sort_order
            ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
     FROM lists l
     LEFT JOIN list_items i ON i.list_id = l.id
     WHERE l.household_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC`,
    [householdId]
  )
  res.json(rows)
})

// POST /api/lists
router.post('/', async (req, res) => {
  const householdId = await getHouseholdId(req.userId)
  if (!householdId) return res.status(403).json({ error: 'Inget hushåll' })

  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Namn krävs' })

  const { rows } = await query(
    `INSERT INTO lists (household_id, name) VALUES ($1, $2)
     RETURNING id, name, household_id AS "householdId", created_at AS "createdAt"`,
    [householdId, name.trim()]
  )
  res.status(201).json({ ...rows[0], items: [] })
})

// GET /api/lists/:id
router.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT l.id, l.name, l.household_id AS "householdId", l.store_id AS "storeId", l.created_at AS "createdAt",
            COALESCE(json_agg(
              json_build_object(
                'id', i.id,
                'name', i.name,
                'quantity', i.quantity,
                'note', i.note,
                'status', i.status,
                'group', i.item_group,
                'sortOrder', i.sort_order,
                'createdBy', i.created_by,
                'createdAt', i.created_at,
                'checkedAt', i.checked_at,
                'checkedBy', i.checked_by
              ) ORDER BY i.sort_order
            ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
     FROM lists l
     LEFT JOIN list_items i ON i.list_id = l.id
     WHERE l.id = $1
     GROUP BY l.id`,
    [req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Listan finns inte' })
  res.json(rows[0])
})

// POST /api/lists/:id/items
router.post('/:id/items', async (req, res) => {
  const { name, quantity, note } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Varunamn krävs' })

  // Determine group from alias table or default to 'other'
  const { rows: aliasRows } = await query(
    `SELECT item_group FROM item_aliases WHERE normalized_name = lower(trim($1)) LIMIT 1`,
    [name]
  )
  const group = aliasRows[0]?.item_group ?? 'other'

  // sort_order: append to end of remaining
  const { rows: orderRows } = await query(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM list_items WHERE list_id = $1`,
    [req.params.id]
  )
  const sortOrder = orderRows[0].next

  const { rows } = await query(
    `INSERT INTO list_items (list_id, name, quantity, note, item_group, sort_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, list_id AS "listId", name, quantity, note, status,
               item_group AS "group", sort_order AS "sortOrder",
               created_by AS "createdBy", created_at AS "createdAt"`,
    [req.params.id, name.trim(), quantity ?? null, note ?? null, group, sortOrder, req.userId]
  )
  const item = rows[0]

  broadcastToList(req.params.id, { type: 'item:upsert', listId: req.params.id, item })
  res.status(201).json(item)
})

// PATCH /api/lists/:id/items/:itemId
router.patch('/:id/items/:itemId', async (req, res) => {
  const { status, quantity, note } = req.body
  const allowed = ['remaining', 'checked']
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: 'Ogiltigt status' })
  }

  const { rows } = await query(
    `UPDATE list_items
     SET status = COALESCE($1, status),
         quantity = COALESCE($2, quantity),
         note = COALESCE($3, note),
         checked_at = CASE WHEN $1 = 'checked' THEN now() ELSE checked_at END,
         checked_by = CASE WHEN $1 = 'checked' THEN $4 ELSE checked_by END
     WHERE id = $5 AND list_id = $6
     RETURNING id, list_id AS "listId", name, quantity, note, status,
               item_group AS "group", sort_order AS "sortOrder",
               created_by AS "createdBy", created_at AS "createdAt",
               checked_at AS "checkedAt", checked_by AS "checkedBy"`,
    [status ?? null, quantity ?? null, note ?? null, req.userId, req.params.itemId, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Rad finns inte' })
  const item = rows[0]

  broadcastToList(req.params.id, { type: 'item:upsert', listId: req.params.id, item })
  res.json(item)
})

// POST /api/lists/:id/clear-checked
router.post('/:id/clear-checked', async (req, res) => {
  await query(
    `DELETE FROM list_items WHERE list_id = $1 AND status = 'checked'`,
    [req.params.id]
  )
  broadcastToList(req.params.id, { type: 'list:clear-checked', listId: req.params.id })
  res.json({ ok: true })
})

// GET /api/lists/:id/suggestions?q=
router.get('/:id/suggestions', async (req, res) => {
  const q = req.query.q?.trim()
  if (!q) return res.json([])

  const householdId = await getHouseholdId(req.userId)
  const { rows } = await query(
    `SELECT DISTINCT name FROM list_items li
     JOIN lists l ON l.id = li.list_id
     WHERE l.household_id = $1
       AND lower(li.name) LIKE lower($2)
     ORDER BY name
     LIMIT 8`,
    [householdId, `${q}%`]
  )
  res.json(rows.map((r) => r.name))
})

// POST /api/lists/:id/trips  – start a shopping trip
router.post('/:id/trips', async (req, res) => {
  const { rows: listRows } = await query(
    `SELECT store_id FROM lists WHERE id = $1`,
    [req.params.id]
  )
  const list = listRows[0]
  if (!list) return res.status(404).json({ error: 'Lista finns inte' })

  const storeId = list.store_id
  if (!storeId) return res.status(400).json({ error: 'Välj en butik för listan först' })

  const { rows: tripRows } = await query(
    `INSERT INTO trips (list_id, store_id, started_at)
     VALUES ($1, $2, now())
     RETURNING id, list_id AS "listId", store_id AS "storeId", started_at AS "startedAt"`,
    [req.params.id, storeId]
  )
  const trip = tripRows[0]

  // Fetch items in trip order (learned order or group fallback)
  const { rows: itemRows } = await query(
    `SELECT i.id, i.name, i.quantity, i.note, i.status,
            i.item_group AS "group", i.sort_order AS "sortOrder",
            i.created_by AS "createdBy", i.created_at AS "createdAt"
     FROM list_items i
     WHERE i.list_id = $1
     ORDER BY i.sort_order`,
    [req.params.id]
  )

  // Fetch store info
  const { rows: storeRows } = await query(
    `SELECT id, name, chain, lat, lng FROM stores WHERE id = $1`,
    [storeId]
  )

  res.status(201).json({
    ...trip,
    store: storeRows[0] ?? null,
    sortedItems: itemRows,
  })
})

export default router
