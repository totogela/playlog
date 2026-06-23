'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { rawgImg } from '@/lib/rawg';
import GameCoverImage from '@/components/games/GameCoverImage';
import LikeButton from '@/components/reviews/LikeButton';

// ── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  status: string;
  hours_played: number | null;
  updated_at: string;
  users: { username: string };
  games: { name: string; steam_app_id: number; rawg_id: number | null; cover_url: string | null };
  rating: number | null;
}

interface ReviewEntry {
  id: string;
  overall: number;
  review_text: string;
  rated_at: string;
  user_games: {
    user_id: string;
    hours_played: number | null;
    users: { username: string };
    games: { steam_app_id: number; rawg_id: number | null; name: string; cover_url: string | null; release_date: string | null };
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  completed: 'terminó',
  playing:   'está jugando',
  on_hold:   'pausó',
  abandoned: 'abandonó',
  wishlist:  'quiere jugar',
};

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

function Stars({ value, ratingId }: { value: number; ratingId: string }) {
  const stars = value / 2;
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid  = `act-${ratingId}-${s}`;
        return (
          <svg key={s} className="h-3.5 w-3.5" viewBox="0 0 24 24">
            {half && <defs><clipPath id={uid}><rect x="0" y="0" width="50%" height="100%" /></clipPath></defs>}
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={full ? '#4ade80' : 'none'} stroke={full ? 'none' : '#374151'} strokeWidth="1.5" strokeLinejoin="round" />
            {half && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#4ade80" clipPath={`url(#${uid})`} />}
            {half && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />}
          </svg>
        );
      })}
    </span>
  );
}

// ── Activity tab ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function ActivityTab() {
  const [items,    setItems]    = useState<ActivityEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const pageRef = useRef(0);

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    const from = page * PAGE_SIZE;
    const { data } = await supabase
      .from('user_games')
      .select(`
        id, status, hours_played, updated_at,
        users!inner ( username ),
        games!inner ( name, steam_app_id, rawg_id, cover_url )
      `)
      .neq('status', 'wishlist')
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (!data) { setLoading(false); setLoadMore(false); return; }

    const ugIds = data.map((r: { id: string }) => r.id);
    const { data: ratingsData } = await supabase
      .from('ratings').select('user_game_id, overall').in('user_game_id', ugIds);
    const ratingsMap = new Map((ratingsData ?? []).map((r: { user_game_id: string; overall: number }) => [r.user_game_id, r.overall]));

    const entries = (data as unknown as ActivityEntry[]).map(e => ({ ...e, rating: ratingsMap.get(e.id) ?? null }));
    setItems(prev => append ? [...prev, ...entries] : entries);
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
    setLoadMore(false);
  }, []);

  useEffect(() => { fetchPage(0, false); }, [fetchPage]);

  function handleMore() {
    pageRef.current += 1;
    setLoadMore(true);
    fetchPage(pageRef.current, true);
  }

  if (loading) return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="h-14 w-10 flex-shrink-0 rounded bg-surface" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-48 rounded bg-surface" />
            <div className="h-2.5 w-24 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );

  if (items.length === 0) return (
    <p className="py-16 text-center text-sm text-gray-600">No hay actividad registrada aún.</p>
  );

  return (
    <div>
      <div className="divide-y divide-border/50">
        {items.map(e => {
          const gameId = e.games.rawg_id ?? e.games.steam_app_id;
          return (
            <div key={e.id} className="flex items-center gap-3 py-3">
              <Link href={`/game/${gameId}`} className="flex-shrink-0">
                <div className="relative h-14 w-10 overflow-hidden rounded border border-border/60 hover:border-accent/60 transition-colors">
                  <GameCoverImage steamAppId={e.games.steam_app_id} coverUrl={e.games.cover_url} name={e.games.name} className="object-cover" />
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <Link href={`/user/${e.users.username}`} className="font-semibold text-gray-300 hover:text-accent transition-colors">{e.users.username}</Link>
                  {' '}<span className="text-gray-500">{STATUS_LABEL[e.status] ?? 'registró'}</span>{' '}
                  <Link href={`/game/${gameId}`} className="font-semibold text-white hover:text-accent transition-colors">{e.games.name}</Link>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {e.rating && <Stars value={e.rating} ratingId={e.id} />}
                  {e.hours_played && e.hours_played > 0 && <span className="text-[10px] text-gray-600">{e.hours_played}h</span>}
                  <span className="text-[10px] text-gray-600">{timeAgo(e.updated_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleMore}
            disabled={loadMore}
            className="rounded-lg border border-border px-6 py-2 text-sm font-semibold text-gray-400 hover:border-gray-500 hover:text-white transition-all disabled:opacity-50"
          >
            {loadMore ? 'Cargando...' : 'Ver más'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reviews tab ───────────────────────────────────────────────────────────────

function ReviewsTab() {
  const [items,    setItems]    = useState<ReviewEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const pageRef = useRef(0);

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    const from = page * PAGE_SIZE;
    const { data } = await supabase
      .from('ratings')
      .select(`
        id, overall, review_text, rated_at,
        user_games!inner (
          user_id, hours_played,
          users!inner ( username ),
          games!inner ( steam_app_id, rawg_id, name, cover_url, release_date )
        )
      `)
      .not('review_text', 'is', null)
      .not('review_text', 'eq', '')
      .not('overall', 'is', null)
      .order('rated_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    setItems(prev => append ? [...prev, ...(data as unknown as ReviewEntry[])] : (data as unknown as ReviewEntry[]) ?? []);
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setLoading(false);
    setLoadMore(false);
  }, []);

  useEffect(() => { fetchPage(0, false); }, [fetchPage]);

  function handleMore() {
    pageRef.current += 1;
    setLoadMore(true);
    fetchPage(pageRef.current, true);
  }

  if (loading) return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-5 animate-pulse">
          <div className="h-20 w-14 flex-shrink-0 rounded bg-surface" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-20 rounded bg-surface" />
            <div className="h-3 w-40 rounded bg-surface" />
            <div className="h-3 w-full rounded bg-surface" />
            <div className="h-3 w-3/4 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );

  if (items.length === 0) return (
    <p className="py-16 text-center text-sm text-gray-600">No hay reseñas escritas aún.</p>
  );

  return (
    <div>
      <div className="divide-y divide-border/50">
        {items.map(r => {
          const img    = rawgImg(r.user_games.games.cover_url);
          const gameId = r.user_games.games.rawg_id ?? r.user_games.games.steam_app_id;
          const year   = r.user_games.games.release_date ? new Date(r.user_games.games.release_date).getFullYear() : null;
          return (
            <div key={r.id} className="flex gap-3 py-5">
              {/* Avatar */}
              <Link href={`/user/${r.user_games.users.username}`} className="flex-shrink-0 mt-0.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-border text-sm font-black text-gray-400 hover:border-accent hover:text-accent transition-all">
                  {r.user_games.users.username[0]?.toUpperCase()}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                {/* "Review by username + stars" */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-gray-500">
                    Reseña de{' '}
                    <Link href={`/user/${r.user_games.users.username}`} className="font-bold text-gray-300 hover:text-accent transition-colors">
                      {r.user_games.users.username}
                    </Link>
                  </p>
                  <Stars value={r.overall} ratingId={r.id} />
                </div>
                {/* Título */}
                <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                  <Link href={`/game/${gameId}`} className="font-black text-base text-white hover:text-accent transition-colors">
                    {r.user_games.games.name}
                  </Link>
                  {year && <span className="text-sm text-gray-600">{year}</span>}
                </div>
                {/* Texto */}
                <Link href={`/game/${gameId}#reviews`} className="block mt-2 group/rev">
                  <p className="text-sm leading-relaxed text-gray-400 group-hover/rev:text-gray-300 transition-colors">
                    {r.review_text}
                  </p>
                </Link>
                <div className="mt-3">
                  <LikeButton ratingId={r.id} reviewOwnerId={r.user_games.user_id} size="md" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleMore}
            disabled={loadMore}
            className="rounded-lg border border-border px-6 py-2 text-sm font-semibold text-gray-400 hover:border-gray-500 hover:text-white transition-all disabled:opacity-50"
          >
            {loadMore ? 'Cargando...' : 'Ver más'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ActivityContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const tab          = searchParams.get('tab') === 'reviews' ? 'reviews' : 'activity';

  function setTab(t: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (t === 'activity') params.delete('tab');
    else params.set('tab', t);
    router.push(`/activity?${params.toString()}`);
  }

  return (
    <div className="py-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white uppercase tracking-wider">Actividad</h1>
        <Link href="/" className="text-xs text-gray-600 hover:text-accent transition-colors">← Inicio</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border">
        {[
          { id: 'activity', label: 'Actividad reciente' },
          { id: 'reviews',  label: 'Reseñas' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'activity' ? <ActivityTab /> : <ReviewsTab />}
    </div>
  );
}

export default function ActivityPage() { return <Suspense><ActivityContent /></Suspense>; }
