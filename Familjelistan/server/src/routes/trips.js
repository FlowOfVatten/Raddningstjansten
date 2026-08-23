import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
router.use(requireAuth)

// POST /api/trips/:id/end
router.post('/:id/end', async (req, res) => {
  const { rows } = await query(
    `UPDATE trips SET ended_at = now()
     WHERE id = $1
     RETURNING id, list_id AS "listId", store_id AS "storeId",
               started_at AS "startedAt", ended_at AS "endedAt"`,
    [req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Runda finns inte' })

  // Record pair statistics for learning (simplified: sequential order)
  const { rows: checkoffs } = await query(
    `SELECT item_id, checked_at
     FROM checkoffs
     WHERE trip_id = $1
     ORDER BY checked_at`,
    [req.params.id]
  )

  // Upsert pair_stats for each consecutive pair
  for (let i = 0; i < checkoffs.length - 1; i++) {
    const a = checkoffs[i].item_id
    const b = checkoffs[i + 1].item_id
    await query(
      `INSERT INTO pair_stats (household_id, store_id, item_name_a, item_name_b, count)
       SELECT hm.household_id, t.store_id,
              (SELECT name FROM list_items WHERE id = $1),
              (SELECT name FROM list_items WHERE id = $2),
              1
       FROM trips t
       JOIN lists l ON l.id = t.list_id
       JOIN household_members hm ON hm.household_id = l.household_id
       WHERE t.id = $3
       LIMIT 1
       ON CONFLICT (household_id, store_id, item_name_a, item_name_b)
       DO UPDATE SET count = pair_stats.count + 1`,
      [a, b, req.params.id]
    )
  }

  res.json(rows[0])
})

export default router
