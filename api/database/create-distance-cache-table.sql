-- EPA Distance Cache Table
-- Stores pre-calculated road distances between POIs to avoid repeated Azure Maps calls
-- Each row represents one connection from one POI to another

CREATE TABLE IF NOT EXISTS epa_distance_cache (
  id SERIAL PRIMARY KEY,
  game_session_id INTEGER NOT NULL REFERENCES epa_game_session(id) ON DELETE CASCADE,
  from_poi_id INTEGER NOT NULL REFERENCES epa_poi(id),
  to_poi_id INTEGER NOT NULL REFERENCES epa_poi(id),
  distance_meters INTEGER NOT NULL,
  is_fallback BOOLEAN DEFAULT false,  -- true if this distance used straight-line fallback
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_distance_cache_session ON epa_distance_cache(game_session_id);
CREATE INDEX idx_distance_cache_from_to ON epa_distance_cache(game_session_id, from_poi_id, to_poi_id);
