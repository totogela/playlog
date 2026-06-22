import { supabase } from './supabase';
import type { GameStatus } from './supabase';

// Guarda el juego en el catálogo global y devuelve su UUID interno
export async function upsertGame(rawgGame: {
  id: number;
  name: string;
  background_image: string | null;
  genres: Array<{ name: string }>;
  released: string | null;
}) {
  await supabase.from('games').upsert({
    rawg_id:      rawgGame.id,
    steam_app_id: rawgGame.id,
    name:         rawgGame.name,
    cover_url:    rawgGame.background_image,
    genres:       rawgGame.genres.map(g => g.name),
    release_date: rawgGame.released ?? null,
  }, { onConflict: 'rawg_id', ignoreDuplicates: true }); // ignoreDuplicates: no sobreescribir steam_app_id correcto

  const { data, error } = await supabase
    .from('games')
    .select('id')
    .eq('rawg_id', rawgGame.id)
    .single();

  if (error) throw error;
  return data.id as string;
}

// Agrega o actualiza el juego en la biblioteca del usuario
export async function addToLibrary(userId: string, gameId: string, status: GameStatus = 'playing') {
  const { data, error } = await supabase
    .from('user_games')
    .upsert(
      { user_id: userId, game_id: gameId, status },
      { onConflict: 'user_id,game_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

// Guarda o actualiza el rating de un user_game
export async function saveRating(userGameId: string, rating: {
  overall?: number;
  story?: number;
  gameplay?: number;
  difficulty?: number;
  graphics?: number;
  music?: number;
  review_text?: string;
}) {
  // Filtra valores 0 (no calificados) para no guardar nulls innecesarios
  const clean = Object.fromEntries(
    Object.entries(rating).filter(([, v]) => v !== 0 && v !== '')
  );

  const { error } = await supabase
    .from('ratings')
    .upsert({ user_game_id: userGameId, ...clean }, { onConflict: 'user_game_id' });

  if (error) throw error;
}

// Obtiene el estado actual del juego para el usuario (null si no está en su biblioteca)
export async function getUserGame(userId: string, gameDbId: string) {
  const { data: ug, error: ugErr } = await supabase
    .from('user_games')
    .select('id, status, hours_played')
    .eq('user_id', userId)
    .eq('game_id', gameDbId)
    .maybeSingle();

  if (ugErr) { console.error('[getUserGame] user_games error:', ugErr); return null; }
  if (!ug) return null;

  const { data: ratings, error: rErr } = await supabase
    .from('ratings')
    .select('overall, story, gameplay, difficulty, graphics, music, review_text')
    .eq('user_game_id', ug.id);

  if (rErr) console.error('[getUserGame] ratings error:', rErr);

  return { ...ug, ratings: ratings ?? [] };
}

// Crea o actualiza el perfil extendido del usuario en nuestra tabla
export async function upsertUserProfile(authId: string, username: string) {
  const { error } = await supabase.from('users').upsert({
    id:       authId,
    username: username,
  }, { onConflict: 'id' });

  if (error) throw error;
}
