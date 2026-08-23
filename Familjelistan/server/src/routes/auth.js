import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { signToken } from '../auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Ogiltigt e-post eller lösenord (minst 8 tecken)' })
  }
  const hash = await bcrypt.hash(password, 12)
  try {
    const { rows } = await query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name AS "displayName"`,
      [email.toLowerCase(), email.split('@')[0], hash]
    )
    const user = rows[0]
    const token = signToken(user.id)
    res.status(201).json({ user, token })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'E-post redan registrerad' })
    throw err
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const { rows } = await query(
    `SELECT id, email, display_name AS "displayName", password_hash
     FROM users WHERE email = $1`,
    [email?.toLowerCase()]
  )
  const user = rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Fel e-post eller lösenord' })
  }
  const { password_hash, ...safeUser } = user
  res.json({ user: safeUser, token: signToken(user.id) })
})

export default router
