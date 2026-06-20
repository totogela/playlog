-- Ratings separados de user_games para mantener los modelos limpios.
-- Un usuario puede actualizar su rating sin tocar la entrada de la biblioteca.
CREATE TABLE ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_game_id  UUID NOT NULL REFERENCES user_games(id) ON DELETE CASCADE,
  -- puntuación general 1-10
  overall       SMALLINT CHECK (overall BETWEEN 1 AND 10),
  -- puntuaciones por categoría (todas opcionales)
  story         SMALLINT CHECK (story BETWEEN 1 AND 10),
  gameplay      SMALLINT CHECK (gameplay BETWEEN 1 AND 10),
  difficulty    SMALLINT CHECK (difficulty BETWEEN 1 AND 10),
  graphics      SMALLINT CHECK (graphics BETWEEN 1 AND 10),
  music         SMALLINT CHECK (music BETWEEN 1 AND 10),
  review_text   TEXT,
  rated_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_game_id)
);

CREATE INDEX idx_ratings_user_game_id ON ratings(user_game_id);
