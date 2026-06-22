'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
        const uid  = `cr-${ratingId}-${s}`;
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

export default function CommunityReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('ratings')
      .select(`
        id, overall, review_text, rated_at,
        user_games!inner (
          user_id, hours_played,
          users!inner ( username, avatar_url ),
          games!inner ( steam_app_id, rawg_id, name, cover_url, release_date )
        )
      `)
      .not('review_text', 'is', null)
      .not('review_text', 'eq', '')
      .not('overall', 'is', null)
      .order('rated_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setReviews((data as unknown as Review[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="h-20 w-14 flex-shrink-0 rounded bg-surface" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-24 rounded bg-surface" />
            <div className="h-3 w-full rounded bg-surface" />
            <div className="h-3 w-3/4 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );

  if (reviews.length === 0) return null;

  return (
    <div className="divide-y divide-border/50">
      {reviews.map(r => {
        const img    = rawgImg(r.user_games.games.cover_url);
        const gameId = r.user_games.games.rawg_id ?? r.user_games.games.steam_app_id;
        const year   = r.user_games.games.release_date
          ? new Date(r.user_games.games.release_date).getFullYear()
          : null;
        return (
          <div key={r.id} className="flex gap-3 py-4">
            {/* Avatar */}
            <Link href={`/user/${r.user_games.users.username}`} className="flex-shrink-0 mt-0.5">
              <UserAvatar username={r.user_games.users.username} avatarUrl={r.user_games.users.avatar_url} size="sm" className="hover:ring-2 hover:ring-accent transition-all" />
            </Link>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              {/* "Review by username · stars" */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-500">
                  Reseña de{' '}
                  <Link href={`/user/${r.user_games.users.username}`} className="font-bold text-gray-300 hover:text-accent transition-colors">
                    {r.user_games.users.username}
                  </Link>
                </p>
                <Stars value={r.overall} ratingId={r.id} />
              </div>

              {/* Título del juego */}
              <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                <Link href={`/game/${gameId}`} className="font-black text-sm text-white hover:text-accent transition-colors leading-tight">
                  {r.user_games.games.name}
                </Link>
                {year && <span className="text-[11px] text-gray-600">{year}</span>}
              </div>

              {/* Texto de la reseña */}
              <Link href={`/game/${gameId}#reviews`} className="block mt-1.5 group/rev">
                <p className="text-[11px] leading-relaxed text-gray-400 line-clamp-3 group-hover/rev:text-gray-300 transition-colors">
                  {r.review_text}
                </p>
              </Link>

              {/* Like */}
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
