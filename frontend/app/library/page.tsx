'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { GameStatus } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';

interface LibraryEntry {
  id: string;
  status: GameStatus;
  hours_played: number | null;
  updated_at: string;
  games: {
    id: string;
    steam_app_id: number;
    rawg_id: number | null;
    name: string;
    cover_url: string | null;
    genres: string[] | null;
    release_date: string | null;
  };
  ratings: Array<{ overall: number | null; review_text: string | null }>;
}

const STATUS_CONFIG: Record<GameStatus, { label: string }> = {
  playing:   { label: 'Jugando'    },
  completed: { label: 'Terminado'  },
  abandoned: { label: 'Abandonado' },
  on_hold:   { label: 'En pausa'   },
  wishlist:  { label: 'Wishlist'   },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as GameStatus[];

function MiniStars({ value }: { value: number }) {
  const stars = value / 2;
  return (
    <span className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid  = `lib-${s}-${value}`;
        return (
          <svg key={s} className="h-2.5 w-2.5" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={uid} x1="0" x2="1" y1="0" y2="0">
                <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="#e85d04" />
                <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="transparent" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="none" stroke="#303840" strokeWidth="1.5" strokeLinejoin="round" />
            {(full || half) && (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={full ? '#e85d04' : `url(#${uid})`} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [entries,      setEntries]      = useState<LibraryEntry[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [activeFilter, setActiveFilter] = useState<GameStatus | 'all'>('all');
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  async function removeEntry(e: React.MouseEvent, entryId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(entryId);
    await supabase.from('ratings').delete().eq('user_game_id', entryId);
    await supabase.from('user_games').delete().eq('id', entryId);
    setEntries(prev => prev.filter(en => en.id !== entryId));
    setDeletingId(null);
  }

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!user) return;
    async function fetchLibrary() {
      const { data: ugs } = await supabase
        .from('user_games')
        .select('id, status, hours_played, updated_at, games ( id, steam_app_id, rawg_id, name, cover_url, genres, release_date )')
        .eq('user_id', user!.id)
        .order('hours_played', { ascending: false });

      if (!ugs) { setFetching(false); return; }

      const ugIds = ugs.map((u: { id: string }) => u.id);
      const { data: ratingsData } = ugIds.length
        ? await supabase.from('ratings').select('user_game_id, overall, review_text').in('user_game_id', ugIds)
        : { data: [] };

      const ratingsMap = new Map((ratingsData ?? []).map((r: { user_game_id: string; overall: number | null; review_text: string | null }) => [r.user_game_id, r]));
      const merged = ugs.map((ug: { id: string }) => ({
        ...ug,
        ratings: ratingsMap.has(ug.id) ? [ratingsMap.get(ug.id)!] : [],
      }));

      setEntries(merged as unknown as LibraryEntry[]);
      setFetching(false);
    }
    fetchLibrary();
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="py-10">
        <div className="mb-8 h-8 w-40 animate-pulse rounded-lg bg-surface" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-surface" />)}
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const filtered = activeFilter === 'all' ? entries : entries.filter(e => e.status === activeFilter);
  const counts   = ALL_STATUSES.reduce((acc, s) => ({ ...acc, [s]: entries.filter(e => e.status === s).length }), {} as Record<GameStatus, number>);

  return (
    <div className="py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black">Mi Biblioteca</h1>
        <span className="text-sm text-gray-500">{entries.length} juegos</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            activeFilter === 'all' ? 'bg-accent text-white' : 'border border-border text-gray-400 hover:text-white hover:border-gray-500'
          }`}
        >
          Todos · {entries.length}
        </button>
        {ALL_STATUSES.filter(s => counts[s] > 0).map(s => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === s ? 'bg-accent text-white' : 'border border-border text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {STATUS_CONFIG[s].label} · {counts[s]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-5xl mb-4">🎮</p>
          <p className="font-semibold text-gray-300">Sin juegos en esta categoría</p>
          <Link href="/search" className="mt-2 inline-block text-sm text-accent hover:underline">Explorar juegos →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
          {filtered.map(entry => {
            const rating = entry.ratings?.[0]?.overall;
            const gameId = entry.games.rawg_id ?? entry.games.steam_app_id;

            return (
              <div key={entry.id} className="group relative">
                <Link href={`/game/${gameId}`} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border/40 transition-all group-hover:border-accent/60 group-hover:shadow-lg group-hover:shadow-black/60 group-hover:-translate-y-0.5">
                    <GameCoverImage
                      steamAppId={entry.games.steam_app_id}
                      coverUrl={entry.games.cover_url}
                      name={entry.games.name}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                    <button
                      onClick={(e) => removeEntry(e, entry.id)}
                      disabled={deletingId === entry.id}
                      className="absolute top-1 left-1 h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[10px] text-gray-300 hover:bg-red-900/90 hover:text-red-200 transition-all opacity-0 group-hover:opacity-100 flex z-10"
                    >
                      {deletingId === entry.id ? '…' : '×'}
                    </button>
                    {rating && (
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MiniStars value={rating} />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="mt-1 flex justify-center min-h-[13px]">
                  {rating && <MiniStars value={rating} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
