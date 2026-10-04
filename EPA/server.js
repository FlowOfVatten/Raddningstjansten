const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import routes
const playerRoutes = require('./routes/player');
const poiRoutes = require('./routes/poi');
const adminRoutes = require('./routes/admin');

// Routes
app.use('/api/player', playerRoutes);
app.use('/api/poi', poiRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`EPA Orienteering App listening on port ${PORT}`);
});
