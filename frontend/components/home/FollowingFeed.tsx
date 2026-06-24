'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';
import UserAvatar from '@/components/ui/UserAvatar';

interface FeedEntry {
  id: string;
  status: string;
  hours_played: number | null;
  updated_at: string;
  users: { username: string; avatar_url: string | null };
  games: { name: string; steam_app_id: number; rawg_id: number | null; cover_url: string | null };
  rating: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'terminó',
  playing:   'está jugando',
  on_hold:   'pausó',
  abandoned: 'abandonó',
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

export default function FollowingFeed() {
  const { user } = useAuth();
  const [feed,    setFeed]    = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [noFollows, setNoFollows] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      // Obtener IDs de usuarios que sigo
      const { data: followsData } = await supabase
        .from('follows').select('following_id').eq('follower_id', user!.id);

      if (!followsData || followsData.length === 0) {
        setNoFollows(true);
        setLoading(false);
        return;
      }

      const followingIds = followsData.map((f: { following_id: string }) => f.following_id);

      const { data } = await supabase
        .from('user_games')
        .select(`
          id, status, hours_played, updated_at,
          users!inner ( username, avatar_url ),
          games!inner ( name, steam_app_id, rawg_id, cover_url ),
          ratings ( overall )
        `)
        .in('user_id', followingIds)
        .neq('status', 'wishlist')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (!data) { setLoading(false); return; }

      setFeed((data as unknown as Array<FeedEntry & { ratings: Array<{ overall: number }> }>).map(e => ({
        ...e,
        rating: e.ratings?.[0]?.overall ?? null,
      })));
      setLoading(false);
    }
    load();
  }, [user]);

  if (!user || loading) return null;

  if (noFollows) return (
    <div className="rounded-xl border border-border bg-surface/50 p-6 text-center space-y-2">
      <p className="text-sm font-semibold text-gray-300">Seguí usuarios para ver su actividad aquí</p>
      <p className="text-xs text-gray-600">Buscá perfiles desde la búsqueda o explorá la comunidad</p>
    </div>
  );

  if (feed.length === 0) return null;

  return (
    <div className="divide-y divide-border/50">
      {feed.map(e => {
        const gameId = e.games.rawg_id ?? e.games.steam_app_id;
        const stars  = e.rating ? Math.round(e.rating / 2) : null;
        return (
          <div key={e.id} className="flex items-center gap-3 py-2.5">
            <Link href={`/user/${e.users.username}`} className="flex-shrink-0">
              <UserAvatar username={e.users.username} avatarUrl={e.users.avatar_url} size="sm" className="hover:ring-2 hover:ring-accent transition-all" />
            </Link>
            <Link href={`/game/${gameId}`} className="flex-shrink-0">
              <div className="relative h-12 w-8 overflow-hidden rounded border border-border/60 hover:border-accent/60 transition-colors">
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
                {stars && (
                  <span className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} className={`h-2.5 w-2.5 ${s <= stars ? 'text-accent' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </span>
                )}
                {e.hours_played && e.hours_played > 0 && <span className="text-[10px] text-gray-600">{e.hours_played}h</span>}
                <span className="text-[10px] text-gray-600">{timeAgo(e.updated_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
