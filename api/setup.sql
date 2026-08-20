-- Kör detta i PostgreSQL för att skapa tabellen för /api/state.

CREATE TABLE IF NOT EXISTS public.app_state (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_state_updated_at_idx
  ON public.app_state (updated_at DESC);
