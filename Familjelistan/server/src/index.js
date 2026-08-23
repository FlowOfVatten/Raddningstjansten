import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { attachWebSocket } from './ws.js'
import authRouter from './routes/auth.js'
import listsRouter from './routes/lists.js'
import tripsRouter from './routes/trips.js'
import storesRouter from './routes/stores.js'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Routes
app.use('/api/auth', authRouter)
app.use('/api/lists', listsRouter)
app.use('/api/trips', tripsRouter)
app.use('/api/stores', storesRouter)

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internt serverfel' })
})

const server = createServer(app)
attachWebSocket(server)

server.listen(PORT, () => {
  console.log(`Familjelistan server running on http://localhost:${PORT}`)
})
