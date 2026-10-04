-- Add admin users table to EPA schema
CREATE TABLE IF NOT EXISTS epa_admin (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin (password: EPA_Admin_2026!)
-- Using simple hash for demo - in production use proper bcrypt
INSERT INTO epa_admin (username, password_hash) VALUES
  ('admin', 'EPA_Admin_2026!')
ON CONFLICT (username) DO NOTHING;

-- Verify
SELECT * FROM epa_admin;
