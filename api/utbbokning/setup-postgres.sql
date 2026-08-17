-- UtbBokning: separat PostgreSQL-schema/tabeller
-- Kor med ett konto som har CREATE-rattigheter i databasen.

CREATE TABLE IF NOT EXISTS public.utbbokning_resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  total_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.utbbokning_bookings (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exempel: ge app-anvandaren CRUD-rattigheter (justera rollnamn efter er miljo)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.utbbokning_resources TO azure_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.utbbokning_bookings TO azure_app;
