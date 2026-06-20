CREATE TYPE game_status AS ENUM ('wishlist', 'playing', 'completed', 'abandoned', 'on_hold');

CREATE TABLE user_games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  hours_played  NUMERIC(8,1) DEFAULT 0,
  status        game_status DEFAULT 'playing',
  -- fecha en que el usuario lo empezó / terminó / abandonó
  started_at    DATE,
  finished_at   DATE,
  imported_from VARCHAR(50) DEFAULT 'steam',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, game_id)
);

CREATE INDEX idx_user_games_user_id ON user_games(user_id);
CREATE INDEX idx_user_games_status ON user_games(user_id, status);
