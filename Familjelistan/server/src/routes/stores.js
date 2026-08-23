import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/stores – household's saved stores
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT s.id, s.name, s.chain, s.lat, s.lng, s.ica_id AS "icaId",
            hs.is_default AS "isDefault", hs.is_favorite AS "isFavorite",
            hs.auto_select_radius AS "autoSelectRadius"
     FROM stores s
     JOIN household_stores hs ON hs.store_id = s.id
     JOIN household_members hm ON hm.household_id = hs.household_id
     WHERE hm.user_id = $1
     ORDER BY hs.is_default DESC, hs.is_favorite DESC, s.name`,
    [req.userId]
  )
  res.json(rows)
})

// GET /api/stores/nearby?lat=&lng=&radius=300
router.get('/nearby', async (req, res) => {
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)
  const radius = Math.min(parseFloat(req.query.radius ?? '300'), 2000)

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'lat och lng krävs' })
  }

  // Use Haversine approximation in SQL (good enough for <2 km)
  const { rows } = await query(
    `SELECT id, name, chain, lat, lng,
            (6371000 * acos(
              cos(radians($1)) * cos(radians(lat)) *
              cos(radians(lng) - radians($2)) +
              sin(radians($1)) * sin(radians(lat))
            )) AS distance_m
     FROM stores
     HAVING (6371000 * acos(
              cos(radians($1)) * cos(radians(lat)) *
              cos(radians(lng) - radians($2)) +
              sin(radians($1)) * sin(radians(lat))
            )) <= $3
     ORDER BY distance_m
     LIMIT 20`,
    [lat, lng, radius]
  )
  res.json(rows)
})

// POST /api/stores – add store to household
router.post('/', async (req, res) => {
  const { name, chain, lat, lng, icaId, osmId, isDefault } = req.body
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, lat, lng krävs' })
  }

  // Get or create store
  let storeId
  if (icaId) {
    const { rows } = await query(
      `INSERT INTO stores (name, chain, lat, lng, ica_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ica_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, chain ?? 'ICA', lat, lng, icaId]
    )
    storeId = rows[0].id
  } else {
    const { rows } = await query(
      `INSERT INTO stores (name, chain, lat, lng, osm_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (osm_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, chain ?? 'Okänd', lat, lng, osmId ?? null]
    )
    storeId = rows[0].id
  }

  // Get household
  const { rows: hmRows } = await query(
    `SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1`,
    [req.userId]
  )
  const householdId = hmRows[0]?.household_id
  if (!householdId) return res.status(403).json({ error: 'Inget hushåll' })

  await query(
    `INSERT INTO household_stores (household_id, store_id, is_default, is_favorite)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (household_id, store_id) DO NOTHING`,
    [householdId, storeId, isDefault ?? false]
  )

  res.status(201).json({ storeId })
})

export default router
