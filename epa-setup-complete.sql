-- EPA Setup Script - Schema + Seed Data
-- Connection: postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects

-- ===== SCHEMA =====

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
  alternativ JSONB NOT NULL,
  ratt_index INTEGER NOT NULL,
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
  status VARCHAR(50) DEFAULT 'aktiv',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player POI Progress Table
CREATE TABLE IF NOT EXISTS epa_player_poi (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES epa_player(id) ON DELETE CASCADE,
  poi_id INTEGER NOT NULL REFERENCES epa_poi(id) ON DELETE CASCADE,
  sekvens INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'låst',
  klar_tid TIMESTAMPTZ,
  forsok INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, poi_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_epa_poi_aktiv ON epa_poi(aktiv);
CREATE INDEX IF NOT EXISTS idx_epa_question_poi_id ON epa_question(poi_id);
CREATE INDEX IF NOT EXISTS idx_epa_player_status ON epa_player(status);
CREATE INDEX IF NOT EXISTS idx_epa_player_poi_player_id ON epa_player_poi(player_id);
CREATE INDEX IF NOT EXISTS idx_epa_player_poi_status ON epa_player_poi(status);

-- ===== SEED DATA =====

-- Clear existing data
DELETE FROM epa_player_poi WHERE player_id IN (SELECT id FROM epa_player);
DELETE FROM epa_player;
DELETE FROM epa_question;
DELETE FROM epa_poi;

-- Insert 10 POIs around Växjö
INSERT INTO epa_poi (namn, lat, lng, radie_meter, ordning_fast, aktiv) VALUES
  ('Växjö Stadsbibliotek', 56.8774, 15.6279, 40, 10, TRUE),
  ('Linnéplatsen', 56.8794, 15.6210, 40, 1, TRUE),
  ('Växjö Domkyrka', 56.8728, 15.6255, 40, 2, TRUE),
  ('Evedal Naturreservat', 56.8654, 15.6145, 50, 3, TRUE),
  ('Växjögården', 56.8876, 15.6354, 40, 4, TRUE),
  ('Telefonplan', 56.8720, 15.6368, 40, 5, TRUE),
  ('Vaxholm Camping', 56.8834, 15.5987, 50, 6, TRUE),
  ('Växjö Centrum', 56.8751, 15.6291, 45, 7, TRUE),
  ('Grasboskogen', 56.8682, 15.5967, 50, 8, TRUE),
  ('Södra Torget', 56.8755, 15.6301, 35, 9, TRUE);

-- Insert questions for each POI
INSERT INTO epa_question (poi_id, text, alternativ, ratt_index, ledtrad) VALUES
  (1, 'I vilket år öppnade Växjö Stadsbibliotek?', '["1998", "2001", "2005", "2010"]'::jsonb, 1, 'Det var på 2000-talet'),
  (2, 'Vilken konst är mest känd på Linnéplatsen?', '["Skulpturer", "Fontäner", "Målningar", "Monument"]'::jsonb, 0, 'Det är tredimensionellt'),
  (3, 'Från vilken århundrade är Växjö Domkyrka?', '["1600-talet", "1700-talet", "1800-talet", "1900-talet"]'::jsonb, 2, 'Det var under industrialiseringen'),
  (4, 'Vilken djurart är vanligast i Evedal?', '["Älg", "Hjort", "Rådjur", "Räv"]'::jsonb, 2, 'Det är ett mindre hjortdjur'),
  (5, 'Vad är Växjögården känd för?', '["Mat", "Historia", "Kultur", "Hantverk"]'::jsonb, 1, 'Det handlar om förfluten tid'),
  (6, 'Hur många bänkar finns på Telefonplan ungefär?', '["5", "10", "15", "20"]'::jsonb, 1, 'Det är ett lågt antal'),
  (7, 'Vad serveras på Vaxholm Camping?', '["Mat", "Kaffe", "Glass", "Öl"]'::jsonb, 2, 'Det är en kall skala'),
  (8, 'Vilken typ av butiker finns i Växjö Centrum?', '["Mat", "Kläder", "Elektronik", "Allt möjligt"]'::jsonb, 3, 'Det är mycket varierande'),
  (9, 'Vilken trädsort dominerar Grasboskogen?', '["Gran", "Tall", "Björk", "Asp"]'::jsonb, 0, 'Det är den största trädsorten'),
  (10, 'Vad är huvudattraktionen på Södra Torget?', '["Fontänen", "Torget själv", "Kyrkan", "Träden"]'::jsonb, 0, 'Det är vattnet som flödar');

-- Verify
SELECT 'EPA Setup Complete!' as status;
SELECT COUNT(*) as poi_count FROM epa_poi;
SELECT COUNT(*) as question_count FROM epa_question;
