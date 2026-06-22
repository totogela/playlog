'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { upsertGame, addToLibrary, saveRating, getUserGame } from '@/lib/library';
import RatingModal from '@/components/games/RatingModal';
import type { GameStatus } from '@/lib/supabase';
import type { RawgGame } from '@/lib/rawg';

interface Props {
  game: RawgGame & { description_raw?: string };
}

function StarRow({ value }: { value: number }) {
  const stars = value / 2;
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid  = `ga-${s}-${value}`;
        return (
          <svg key={s} className="h-5 w-5" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={uid} x1="0" x2="1" y1="0" y2="0">
                <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="#f97316" />
                <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="transparent" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />
            {(full || half) && (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={full ? '#f97316' : `url(#${uid})`} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

const STATUS_LABELS: Record<GameStatus, string> = {
  playing:   'Jugando',
  completed: 'Terminado',
  abandoned: 'Abandonado',
  on_hold:   'En pausa',
  wishlist:  'Wishlist',
};

interface ListOption { id: string; name: string; has_game: boolean }

export default function GameActions({ game }: Props) {
  const { user } = useAuth();
  const router   = useRouter();
  const [showModal,   setShowModal]   = useState(false);
  const [showLists,   setShowLists]   = useState(false);
  const [userGame,    setUserGame]    = useState<{ id: string; status: GameStatus; hours_played?: number | null; ratings?: Array<{ overall: number; story?: number; gameplay?: number; difficulty?: number; graphics?: number; music?: number; review_text?: string }> } | null>(null);
  const [gameDbId,    setGameDbId]    = useState<string | null>(null);
  const [userLists,   setUserLists]   = useState<ListOption[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    upsertGame(game).then(dbId => {
      setGameDbId(dbId);
      getUserGame(user.id, dbId).then(ug => {
        if (ug) setUserGame(ug as typeof userGame);
      });
    }).catch(() => null);
  }, [user, game]);

  async function openLists() {
    if (!user) { router.push('/login'); return; }
    if (!listsLoaded) {
      const { supabase } = await import('@/lib/supabase');
      const { data: listsData } = await supabase.from('lists').select('id, name').eq('user_id', user.id).order('created_at');
      if (listsData && gameDbId) {
        const { data: lgData } = await supabase.from('list_games').select('list_id').eq('game_id', gameDbId);
        const inLists = new Set((lgData ?? []).map((r: { list_id: string }) => r.list_id));
        setUserLists((listsData as { id: string; name: string }[]).map(l => ({ ...l, has_game: inLists.has(l.id) })));
      } else if (listsData) {
        setUserLists((listsData as { id: string; name: string }[]).map(l => ({ ...l, has_game: false })));
      }
      setListsLoaded(true);
    }
    setShowLists(v => !v);
  }

  async function toggleList(listId: string, hasGame: boolean) {
    if (!gameDbId) return;
    const { supabase } = await import('@/lib/supabase');
    if (hasGame) {
      await supabase.from('list_games').delete().eq('list_id', listId).eq('game_id', gameDbId);
    } else {
      await supabase.from('list_games').insert({ list_id: listId, game_id: gameDbId });
    }
    setUserLists(prev => prev.map(l => l.id === listId ? { ...l, has_game: !hasGame } : l));
  }

  function requireAuth() {
    if (!user) { router.push('/login'); return false; }
    return true;
  }

  async function handleSaveRating(data: {
    status: GameStatus; overall: number; story: number; gameplay: number;
    difficulty: number; graphics: number; music: number; review_text: string; hours: number;
  }) {
    if (!user) return;
    const dbId = gameDbId ?? await upsertGame(game);
    setGameDbId(dbId);
    const ugId = userGame?.id ?? await addToLibrary(user.id, dbId, data.status);
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('user_games').update({
      status:       data.status,
      hours_played: data.hours,
      finished_at:  data.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', ugId);
    await saveRating(ugId, {
      overall: data.overall, story: data.story, gameplay: data.gameplay,
      difficulty: data.difficulty, graphics: data.graphics, music: data.music,
      review_text: data.review_text,
    });
    setUserGame({
      id: ugId,
      status: data.status,
      hours_played: data.hours,
      ratings: [{
        overall: data.overall, story: data.story, gameplay: data.gameplay,
        difficulty: data.difficulty, graphics: data.graphics, music: data.music,
        review_text: data.review_text,
      }],
    });
  }

  const inLibrary  = !!userGame && userGame.status !== 'wishlist';
  const inWishlist = userGame?.status === 'wishlist';
  const userRating = userGame?.ratings?.[0]?.overall;

  return (
    <>
      {/* ── Íconos estilo Letterboxd ── */}
      <div className="flex items-start justify-around py-2">

        {/* Jugado */}
        <button
          onClick={() => requireAuth() && setShowModal(true)}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
            inLibrary
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-gray-700 text-gray-600 group-hover:border-gray-500 group-hover:text-gray-400'
          }`}>
            {/* Eye icon */}
            <svg className="h-5 w-5" fill={inLibrary ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${inLibrary ? 'text-accent' : 'text-gray-600'}`}>
            {inLibrary ? STATUS_LABELS[userGame!.status] : 'Registrar'}
          </span>
        </button>

        {/* Agregar a lista */}
        <div className="relative flex flex-col items-center gap-1.5">
          <button
            onClick={openLists}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
              showLists ? 'border-accent bg-accent/10 text-accent' : 'border-gray-700 text-gray-600 group-hover:border-gray-500 group-hover:text-gray-400'
            }`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Listas</span>
          </button>

          {showLists && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-52 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
              {userLists.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-500">
                  <p>No tenés listas todavía</p>
                  <a href="/lists" className="text-accent hover:underline">Crear lista →</a>
                </div>
              ) : (
                <>
                  {userLists.map(l => (
                    <button
                      key={l.id}
                      onClick={() => toggleList(l.id, l.has_game)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-border transition-colors"
                    >
                      <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                        l.has_game ? 'border-accent bg-accent text-white' : 'border-gray-600'
                      }`}>
                        {l.has_game && <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                      </span>
                      <span className="truncate text-gray-300">{l.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-border">
                    <a href="/lists" className="flex w-full items-center justify-center px-3 py-2 text-xs font-semibold text-accent hover:bg-border transition-colors">
                      + Nueva lista
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={async () => {
            if (!requireAuth()) return;
            if (!gameDbId) return;
            if (inWishlist) {
              // Quitar de wishlist
              const { supabase } = await import('@/lib/supabase');
              await supabase.from('user_games').delete().eq('id', userGame!.id);
              setUserGame(null);
            } else if (!inLibrary) {
              const ugId = await addToLibrary(user!.id, gameDbId, 'wishlist');
              setUserGame({ id: ugId, status: 'wishlist' });
            }
          }}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
            inWishlist
              ? 'border-purple-500 bg-purple-500/10 text-purple-400'
              : 'border-gray-700 text-gray-600 group-hover:border-gray-500 group-hover:text-gray-400'
          }`}>
            <svg className="h-5 w-5" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${inWishlist ? 'text-purple-400' : 'text-gray-600'}`}>
            Wishlist
          </span>
        </button>

      </div>

      {/* ── Estrellas del usuario ── */}
      {userRating ? (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Tu nota</p>
          <StarRow value={userRating} />
          <p className="text-center text-xs text-gray-500">{(userRating / 2).toFixed(1)} ★</p>
        </div>
      ) : inLibrary ? (
        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-center text-gray-600">Sin calificación</p>
        </div>
      ) : null}

      {/* ── Botón editar / registrar ── */}
      <div className="border-t border-border pt-3">
        {inLibrary ? (
          <button
            onClick={() => requireAuth() && setShowModal(true)}
            className="w-full rounded-lg py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors text-center hover:bg-white/5"
          >
            Editar registro...
          </button>
        ) : !inWishlist ? (
          <button
            onClick={() => requireAuth() && setShowModal(true)}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
          >
            + Registrar este juego
          </button>
        ) : (
          <button
            onClick={() => requireAuth() && setShowModal(true)}
            className="w-full rounded-lg border border-border py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors hover:bg-white/5"
          >
            Registrar como jugado...
          </button>
        )}
      </div>

      {showModal && (
        <RatingModal
          gameName={game.name}
          initialStatus={userGame?.status ?? 'playing'}
          initialData={userGame?.ratings?.[0] ? {
            overall:     userGame.ratings[0].overall    ?? 0,
            story:       userGame.ratings[0].story      ?? 0,
            gameplay:    userGame.ratings[0].gameplay   ?? 0,
            difficulty:  userGame.ratings[0].difficulty ?? 0,
            graphics:    userGame.ratings[0].graphics   ?? 0,
            music:       userGame.ratings[0].music      ?? 0,
            review_text: userGame.ratings[0].review_text ?? '',
            hours:       userGame.hours_played ?? 0,
          } : undefined}
          onSave={handleSaveRating}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
