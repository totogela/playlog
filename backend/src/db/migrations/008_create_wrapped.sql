-- El Wrapped se genera una vez por año y se guarda completo como JSONB.
-- Esto permite mostrar ediciones pasadas sin recalcular.
CREATE TABLE wrapped (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year        SMALLINT NOT NULL,
  -- estructura completa del wrapped
  -- {
  --   "total_hours": 1240,
  --   "most_played": { "game_id": "...", "name": "Elden Ring", "hours": 340 },
  --   "top_genre": "RPG",
  --   "completion_rate": 0.62,
  --   "games_completed": 14,
  --   "games_abandoned": 5,
  --   "player_type": "hardcore",
  --   "quirks": ["jugador nocturno", "abandona juegos largos"],
  --   "top_rated": [...],
  --   "monthly_breakdown": [...]
  -- }
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, year)
);
