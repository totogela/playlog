export type GameStatus = 'wishlist' | 'playing' | 'completed' | 'abandoned' | 'on_hold';
export type PlayerType = 'chill' | 'competitive' | 'explorer' | 'hardcore' | 'completionist' | 'casual';
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface User {
  id: string;
  steam_id: string;
  username: string;
  avatar_url: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Game {
  id: string;
  steam_app_id: number;
  name: string;
  cover_url: string | null;
  header_url: string | null;
  genres: string[];
  tags: string[];
  avg_duration_hours: number | null;
  release_date: Date | null;
  developer: string | null;
}

export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  hours_played: number;
  status: GameStatus;
  started_at: Date | null;
  finished_at: Date | null;
  imported_from: string;
  created_at: Date;
  updated_at: Date;
}

export interface Rating {
  id: string;
  user_game_id: string;
  overall: number | null;
  story: number | null;
  gameplay: number | null;
  difficulty: number | null;
  graphics: number | null;
  music: number | null;
  review_text: string | null;
  rated_at: Date;
}

export interface PlayerProfileStats {
  total_hours: number;
  completion_rate: number;
  avg_difficulty: number;
  top_genres: string[];
  avg_session_hours: number;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  player_type: PlayerType;
  computed_stats: PlayerProfileStats;
  last_computed: Date;
}

export interface WrappedData {
  total_hours: number;
  most_played: { game_id: string; name: string; hours: number };
  top_genre: string;
  completion_rate: number;
  games_completed: number;
  games_abandoned: number;
  player_type: PlayerType;
  quirks: string[];
  top_rated: Array<{ game_id: string; name: string; overall: number }>;
  monthly_breakdown: Array<{ month: number; hours: number }>;
}

export interface Wrapped {
  id: string;
  user_id: string;
  year: number;
  data: WrappedData;
  created_at: Date;
}
