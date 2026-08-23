import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import { parse as parseUrl } from 'url'

const SECRET = process.env.JWT_SECRET ?? 'dev-secret'

/** Map from listId → Set of WebSocket clients */
const rooms = new Map()

export function broadcastToList(listId, message) {
  const clients = rooms.get(listId)
  if (!clients) return
  const payload = JSON.stringify(message)
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(payload)
  }
}

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const { query } = parseUrl(req.url, true)
    const token = query.token
    const listId = query.list

    // Authenticate
    let userId
    try {
      const payload = jwt.verify(token, SECRET)
      userId = payload.sub
    } catch {
      ws.close(4001, 'Unauthorized')
      return
    }

    if (!listId) {
      ws.close(4002, 'No list specified')
      return
    }

    // Join room
    if (!rooms.has(listId)) rooms.set(listId, new Set())
    rooms.get(listId).add(ws)

    ws.on('close', () => {
      const room = rooms.get(listId)
      if (room) {
        room.delete(ws)
        if (room.size === 0) rooms.delete(listId)
      }
    })
  })

  return wss
}
