-- EPA Orienteering Game Database Schema
-- Run this in PostgreSQL to set up the EPA tables

-- POI (Points of Interest) Table
CREATE TABLE IF NOT EXISTS epa_poi (
  id SERIAL PRIMARY KEY,
  namn VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  radie_meter INTEGER DEFAULT 40,
  ordning_fast INTEGER,
  aktiv BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question Table
CREATE TABLE IF NOT EXISTS epa_question (
  id SERIAL PRIMARY KEY,
  poi_id INTEGER NOT NULL REFERENCES epa_poi(id) ON DELETE CASCADE,
  text VARCHAR(500) NOT NULL,
  alternativ JSONB NOT NULL, -- Array of answer options
  ratt_index INTEGER NOT NULL, -- Index of correct answer (0-based)
  ledtrad VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Table
CREATE TABLE IF NOT EXISTS epa_player (
  id SERIAL PRIMARY KEY,
  namn VARCHAR(255) NOT NULL,
  start_tid TIMESTAMPTZ DEFAULT NOW(),
  mal_tid TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'aktiv', -- 'aktiv', 'klar', 'avbruten'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player POI Progress Table
CREATE TABLE IF NOT EXISTS epa_player_poi (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES epa_player(id) ON DELETE CASCADE,
  poi_id INTEGER NOT NULL REFERENCES epa_poi(id) ON DELETE CASCADE,
  sekvens INTEGER NOT NULL, -- Order for this player (1-10)
  status VARCHAR(50) DEFAULT 'låst', -- 'låst', 'aktiv', 'klar'
  klar_tid TIMESTAMPTZ,
  forsok INTEGER DEFAULT 0, -- Number of attempts made
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, poi_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_epa_poi_aktiv ON epa_poi(aktiv);
CREATE INDEX IF NOT EXISTS idx_epa_question_poi_id ON epa_question(poi_id);
CREATE INDEX IF NOT EXISTS idx_epa_player_status ON epa_player(status);
CREATE INDEX IF NOT EXISTS idx_epa_player_poi_player_id ON epa_player_poi(player_id);
CREATE INDEX IF NOT EXISTS idx_epa_player_poi_status ON epa_player_poi(status);
