import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'dev-secret'

/** Sign a JWT for a user */
export function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  })
}

/** Express middleware – attaches req.userId or returns 401 */
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), SECRET)
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
