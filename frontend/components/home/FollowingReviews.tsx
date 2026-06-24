'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { rawgImg } from '@/lib/rawg';
import LikeButton from '@/components/reviews/LikeButton';
import UserAvatar from '@/components/ui/UserAvatar';

interface Review {
  id: string;
  overall: number;
  review_text: string;
  rated_at: string;
  user_games: {
    user_id: string;
    hours_played: number | null;
    users: { username: string; avatar_url: string | null };
    games: { steam_app_id: number; rawg_id: number | null; name: string; cover_url: string | null; release_date: string | null };
  };
}

function Stars({ value, ratingId }: { value: number; ratingId: string }) {
  const stars = value / 2;
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid  = `fr-${ratingId}-${s}`;
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

export default function FollowingReviews() {
  const { user } = useAuth();
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [noFollows,  setNoFollows]  = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      const { data: followsData } = await supabase
        .from('follows').select('following_id').eq('follower_id', user!.id);

      if (!followsData || followsData.length === 0) {
        setNoFollows(true);
        setLoading(false);
        return;
      }

      const followingIds = followsData.map((f: { following_id: string }) => f.following_id);

      const { data } = await supabase
        .from('ratings')
        .select(`
          id, overall, review_text, rated_at,
          user_games!inner (
            user_id, hours_played,
            users!inner ( username, avatar_url ),
            games!inner ( steam_app_id, rawg_id, name, cover_url, release_date )
          )
        `)
        .in('user_games.user_id', followingIds)
        .not('review_text', 'is', null)
        .not('review_text', 'eq', '')
        .not('overall', 'is', null)
        .order('rated_at', { ascending: false })
        .limit(5);

      setReviews((data as unknown as Review[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  if (!user) return (
    <div className="rounded-xl border border-border bg-surface/50 p-6 text-center">
      <p className="text-sm text-gray-500">Iniciá sesión para ver reseñas de amistades</p>
    </div>
  );

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3 animate-pulse py-4">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-surface" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-28 rounded bg-surface" />
            <div className="h-3 w-full rounded bg-surface" />
            <div className="h-3 w-3/4 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );

  if (noFollows) return (
    <div className="rounded-xl border border-border bg-surface/50 p-6 text-center space-y-2">
      <p className="text-sm font-semibold text-gray-300">Seguí usuarios para ver sus reseñas</p>
      <p className="text-xs text-gray-600">Buscá perfiles en la búsqueda</p>
    </div>
  );

  if (reviews.length === 0) return (
    <div className="py-10 text-center">
      <p className="text-sm text-gray-600">Las personas que seguís no escribieron reseñas aún</p>
    </div>
  );

  return (
    <div className="divide-y divide-border/50">
      {reviews.map(r => {
        const gameId = r.user_games.games.rawg_id ?? r.user_games.games.steam_app_id;
        const year   = r.user_games.games.release_date
          ? new Date(r.user_games.games.release_date).getFullYear()
          : null;
        return (
          <div key={r.id} className="flex gap-3 py-4">
            <Link href={`/user/${r.user_games.users.username}`} className="flex-shrink-0 mt-0.5">
              <UserAvatar username={r.user_games.users.username} avatarUrl={r.user_games.users.avatar_url} size="sm" className="hover:ring-2 hover:ring-accent transition-all" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-500">
                  Reseña de{' '}
                  <Link href={`/user/${r.user_games.users.username}`} className="font-bold text-gray-300 hover:text-accent transition-colors">
                    {r.user_games.users.username}
                  </Link>
                </p>
                <Stars value={r.overall} ratingId={r.id} />
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                <Link href={`/game/${gameId}`} className="font-black text-sm text-white hover:text-accent transition-colors leading-tight">
                  {r.user_games.games.name}
                </Link>
                {year && <span className="text-[11px] text-gray-600">{year}</span>}
              </div>
              <Link href={`/game/${gameId}#reviews`} className="block mt-1.5 group/rev">
                <p className="text-[11px] leading-relaxed text-gray-400 line-clamp-3 group-hover/rev:text-gray-300 transition-colors">
                  {r.review_text}
                </p>
              </Link>
              <div className="mt-2">
                <LikeButton ratingId={r.id} reviewOwnerId={r.user_games.user_id} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
