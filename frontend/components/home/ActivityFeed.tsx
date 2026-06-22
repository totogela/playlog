'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';
import UserAvatar from '@/components/ui/UserAvatar';

interface ActivityEntry {
  id: string;
  status: string;
  hours_played: number | null;
  updated_at: string;
  users: { username: string; avatar_url: string | null };
  games: { id: string; name: string; steam_app_id: number; rawg_id: number | null; cover_url: string | null };
  rating: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'terminó',
  playing:   'está jugando',
  on_hold:   'pausó',
  abandoned: 'abandonó',
  wishlist:  'quiere jugar',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

export default function ActivityFeed() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    supabase
      .from('user_games')
      .select(`
        id, status, hours_played, updated_at,
        users!inner ( username, avatar_url ),
        games!inner ( id, name, steam_app_id, rawg_id, cover_url )
      `)
      .neq('status', 'wishlist')
      .order('updated_at', { ascending: false })
      .limit(8)
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }

        // Fetch rating for each entry
        const ugIds = data.map((r: { id: string }) => r.id);
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('user_game_id, overall')
          .in('user_game_id', ugIds);

        const ratingsMap = new Map((ratingsData ?? []).map((r: { user_game_id: string; overall: number }) => [r.user_game_id, r.overall]));

        setActivity((data as unknown as ActivityEntry[]).map(e => ({
          ...e,
          rating: ratingsMap.get(e.id) ?? null,
        })));
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-12 w-8 flex-shrink-0 rounded bg-surface" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-48 rounded bg-surface" />
            <div className="h-2.5 w-24 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );

  if (activity.length === 0) return null;

  return (
    <div className="divide-y divide-border/50">
      {activity.map(e => {
        const gameId = e.games.rawg_id ?? e.games.steam_app_id;
        return (
          <div key={e.id} className="flex items-center gap-3 py-2.5">
            {/* User avatar */}
            <Link href={`/user/${e.users.username}`} className="flex-shrink-0">
              <UserAvatar username={e.users.username} avatarUrl={e.users.avatar_url} size="sm" className="hover:ring-2 hover:ring-accent transition-all" />
            </Link>

            {/* Mini cover */}
            <Link href={`/game/${gameId}`} className="flex-shrink-0">
              <div className="relative h-12 w-8 overflow-hidden rounded border border-border/60 hover:border-accent/60 transition-colors">
                <GameCoverImage
                  steamAppId={e.games.steam_app_id}
                  coverUrl={e.games.cover_url}
                  name={e.games.name}
                  className="object-cover"
                />
              </div>
            </Link>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                <Link href={`/user/${e.users.username}`} className="font-semibold text-gray-300 hover:text-accent transition-colors">{e.users.username}</Link>
                {' '}
                <span className="text-gray-500">{STATUS_LABEL[e.status] ?? 'registró'}</span>
                {' '}
                <Link href={`/game/${gameId}`} className="font-semibold text-white hover:text-accent transition-colors">
                  {e.games.name}
                </Link>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {e.rating && (
                  <span className="flex gap-0.5 items-center">
                    {[1,2,3,4,5].map(s => {
                      const val  = e.rating! / 2;
                      const full = val >= s;
                      const half = !full && val >= s - 0.5;
                      const uid  = `af-${e.id}-${s}`;
                      return (
                        <svg key={s} className="h-3 w-3" viewBox="0 0 24 24">
                          {half && <defs><clipPath id={uid}><rect x="0" y="0" width="50%" height="100%" /></clipPath></defs>}
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={full ? '#4ade80' : 'none'} stroke={full ? 'none' : '#374151'} strokeWidth="1.5" strokeLinejoin="round" />
                          {half && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#4ade80" clipPath={`url(#${uid})`} />}
                          {half && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />}
                        </svg>
                      );
                    })}
                  </span>
                )}
                {e.hours_played && e.hours_played > 0 && (
                  <span className="text-[10px] text-gray-600">{e.hours_played}h</span>
                )}
                <span className="text-[10px] text-gray-600">{timeAgo(e.updated_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
