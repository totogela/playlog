CREATE TABLE games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_app_id    INTEGER UNIQUE NOT NULL,
  name            VARCHAR(300) NOT NULL,
  cover_url       TEXT,
  header_url      TEXT,
  -- genres y tags como arrays para facilitar queries de similitud
  genres          TEXT[] DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  avg_duration_hours  NUMERIC(6,1),
  release_date    DATE,
  developer       VARCHAR(200),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_steam_app_id ON games(steam_app_id);
CREATE INDEX idx_games_genres ON games USING GIN(genres);
CREATE INDEX idx_games_tags ON games USING GIN(tags);
