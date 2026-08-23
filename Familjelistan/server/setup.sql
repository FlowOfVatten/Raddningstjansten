-- Familjelistan – databasschema
-- Kör med: psql -d familjelistan -f setup.sql

-- ── Tillägg ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Användare ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Hushåll ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_members (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

-- ── Butiker ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  chain      TEXT NOT NULL DEFAULT 'Okänd',
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  ica_id     TEXT UNIQUE,
  osm_id     TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_stores (
  household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_id           UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_default         BOOLEAN NOT NULL DEFAULT false,
  is_favorite        BOOLEAN NOT NULL DEFAULT false,
  auto_select_radius INT,           -- metres, NULL = disabled
  PRIMARY KEY (household_id, store_id)
);

-- ── Listor ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  store_id     UUID REFERENCES stores(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS list_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  quantity   TEXT,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'remaining'
               CHECK (status IN ('remaining','checked')),
  item_group TEXT NOT NULL DEFAULT 'other'
               CHECK (item_group IN
                 ('produce','bread','meat','dairy','pantry','frozen','household','other')),
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES users(id)
);

-- Normaliserade varunamn → grupp (lärs av hushållet)
CREATE TABLE IF NOT EXISTS item_aliases (
  normalized_name TEXT NOT NULL,
  household_id    UUID REFERENCES households(id) ON DELETE CASCADE,
  item_group      TEXT NOT NULL DEFAULT 'other',
  PRIMARY KEY (normalized_name, household_id)
);

-- ── Rundor ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES stores(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at   TIMESTAMPTZ
);

-- Varje avbockning i en runda
CREATE TABLE IF NOT EXISTS checkoffs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES list_items(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  position    INT NOT NULL,          -- löpnummer i rundan
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  seconds_since_prev INT             -- tid sedan föregående avbockning
);

-- ── Inlärningsstatistik ───────────────────────────────────────

-- Hur ofta vara B kommer direkt efter vara A i en viss butik
CREATE TABLE IF NOT EXISTS pair_stats (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_name_a  TEXT NOT NULL,
  item_name_b  TEXT NOT NULL,
  count        INT NOT NULL DEFAULT 1,
  PRIMARY KEY (household_id, store_id, item_name_a, item_name_b)
);

-- Typisk position för en vara i en butik (0.0–1.0 normaliserad)
CREATE TABLE IF NOT EXISTS position_stats (
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_name        TEXT NOT NULL,
  avg_position     REAL NOT NULL DEFAULT 0.5,
  trip_count       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (household_id, store_id, item_name)
);

-- ── Erbjudanden (ICA) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  deal_type   TEXT NOT NULL,
  valid_from  DATE NOT NULL,
  valid_to    DATE NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_item_matches (
  offer_id    UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  list_item_id UUID NOT NULL REFERENCES list_items(id) ON DELETE CASCADE,
  score       REAL NOT NULL DEFAULT 1.0,
  PRIMARY KEY (offer_id, list_item_id)
);

-- ── Index ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_list_items_list    ON list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_status  ON list_items(list_id, status);
CREATE INDEX IF NOT EXISTS idx_checkoffs_trip     ON checkoffs(trip_id);
CREATE INDEX IF NOT EXISTS idx_pair_stats_lookup  ON pair_stats(household_id, store_id, item_name_a);
CREATE INDEX IF NOT EXISTS idx_offers_store_valid ON offers(store_id, valid_to);
CREATE INDEX IF NOT EXISTS idx_hm_user           ON household_members(user_id);
