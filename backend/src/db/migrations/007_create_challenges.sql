CREATE TYPE challenge_status AS ENUM ('active', 'completed', 'failed', 'abandoned');

CREATE TABLE challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  badge_icon  VARCHAR(100),
  -- criterios de completado como JSON flexible
  -- ej: { "type": "complete_games", "count": 2, "within_days": 30 }
  criteria    JSONB NOT NULL DEFAULT '{}',
  start_date  DATE,
  end_date    DATE,
  is_global   BOOLEAN DEFAULT TRUE,  -- FALSE = reto personal del usuario
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id  UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  status        challenge_status DEFAULT 'active',
  -- progreso actual, mismo formato que criteria
  progress      JSONB DEFAULT '{}',
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,

  UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id, status);
