-- Add game state table for tracking global game status
CREATE TABLE IF NOT EXISTS epa_game_session (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'idle',  -- idle, ready, started, finished
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add game_session_id and ready status to epa_player
ALTER TABLE epa_player 
ADD COLUMN IF NOT EXISTS game_session_id INTEGER REFERENCES epa_game_session(id),
ADD COLUMN IF NOT EXISTS player_status VARCHAR(50) DEFAULT 'registered';  -- registered, ready, started, finished

-- Insert initial game session
INSERT INTO epa_game_session (status) VALUES ('idle')
ON CONFLICT DO NOTHING;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_game_session_status ON epa_game_session(status);
CREATE INDEX IF NOT EXISTS idx_player_game_session ON epa_player(game_session_id);
CREATE INDEX IF NOT EXISTS idx_player_status ON epa_player(player_status);
