const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// In-memory storage for active positions
const firefighters = new Map();

// TTL for position data (5 minutes)
const POSITION_TTL = 300000;

// Clean up stale positions every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of firefighters.entries()) {
    if (now - data.lastUpdate > POSITION_TTL) {
      firefighters.delete(id);
    }
  }
}, 30000);

// POST: Update firefighter position
app.post('/api/position', (req, res) => {
  const { id, lat, lon, sos } = req.body;

  if (!id || lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  firefighters.set(id, {
    id,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    sos: sos || false,
    lastUpdate: Date.now(),
    accuracy: req.body.accuracy || null
  });

  res.json({ success: true, id });
});

// GET: Get all active positions
app.get('/api/positions', (req, res) => {
  const positions = Array.from(firefighters.values());
  res.json({
    timestamp: Date.now(),
    firefighters: positions,
    count: positions.length
  });
});

// GET: Get single firefighter
app.get('/api/position/:id', (req, res) => {
  const data = firefighters.get(req.params.id);
  if (!data) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(data);
});

// DELETE: Remove firefighter from tracking
app.delete('/api/position/:id', (req, res) => {
  const removed = firefighters.delete(req.params.id);
  res.json({ success: removed });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`SOS API running on http://localhost:${PORT}`);
});
