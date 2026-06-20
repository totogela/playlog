CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_id    VARCHAR(20) UNIQUE NOT NULL,
  username    VARCHAR(100) NOT NULL,
  avatar_url  TEXT,
  email       VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_steam_id ON users(steam_id);
