CREATE TABLE recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score       NUMERIC(5,4) NOT NULL,  -- 0.0000 a 1.0000
  -- razón legible para el usuario: "Basado en Elden Ring · Dificultad alta"
  reason      VARCHAR(300),
  dismissed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, game_id)
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id, dismissed, score DESC);
