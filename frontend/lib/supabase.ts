import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type GameStatus = 'wishlist' | 'playing' | 'completed' | 'abandoned' | 'on_hold';

export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  hours_played: number;
  status: GameStatus;
  started_at: string | null;
  finished_at: string | null;
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
}
