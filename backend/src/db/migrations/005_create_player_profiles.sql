-- Tipos posibles de jugador derivados del comportamiento
CREATE TYPE player_type AS ENUM (
  'chill',
  'competitive',
  'explorer',
  'hardcore',
  'completionist',
  'casual'
);

CREATE TABLE player_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  player_type     player_type DEFAULT 'chill',
  -- stats calculadas guardadas como JSON para evitar columnas por cada métrica
  computed_stats  JSONB DEFAULT '{}',
  -- ejemplo de computed_stats:
  -- {
  --   "total_hours": 1240,
  --   "completion_rate": 0.62,
  --   "avg_difficulty": 7.1,
  --   "top_genres": ["RPG", "Action"],
  --   "avg_session_hours": 2.3
  -- }
  last_computed   TIMESTAMPTZ DEFAULT NOW()
);
