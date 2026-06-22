'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  ratingId: string;
  reviewOwnerId: string;
  size?: 'sm' | 'md';
}

export default function LikeButton({ ratingId, reviewOwnerId, size = 'sm' }: Props) {
  const isMd = size === 'md';
  const { user } = useAuth();
  const [liked,  setLiked]  = useState(false);
  const [count,  setCount]  = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch like count
    supabase.from('review_likes').select('id', { count: 'exact', head: true }).eq('rating_id', ratingId)
      .then(({ count: c }) => setCount(c ?? 0));

    // Check if current user liked
    if (!user) return;
    supabase.from('review_likes').select('id').eq('rating_id', ratingId).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [ratingId, user]);

  if (!user) return (
    <span className={`flex items-center gap-1.5 text-gray-600 ${isMd ? 'text-xs' : 'text-[10px]'}`}>
      <svg className={isMd ? 'h-4 w-4' : 'h-3 w-3'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {count > 0 ? <span>{count} {isMd ? 'likes' : ''}</span> : isMd ? <span className="text-gray-700">Like</span> : null}
    </span>
  );

  async function toggle() {
    if (!user || loading) return;
    setLoading(true);
    if (liked) {
      await supabase.from('review_likes').delete().eq('rating_id', ratingId).eq('user_id', user.id);
      setLiked(false);
      setCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from('review_likes').insert({ rating_id: ratingId, user_id: user.id });
      setLiked(true);
      setCount(prev => prev + 1);

      // Notify review owner (skip if liking own review)
      if (user.id !== reviewOwnerId) {
        await supabase.from('notifications').insert({
          user_id:      reviewOwnerId,
          from_user_id: user.id,
          type:         'like',
          entity_id:    ratingId,
        });
      }
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 transition-all disabled:opacity-50 ${isMd ? 'text-sm' : 'text-[10px]'} ${
        liked ? 'text-accent' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      <svg
        className={`transition-transform ${isMd ? 'h-4 w-4' : 'h-3 w-3'} ${liked ? 'scale-110' : ''}`}
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {isMd
        ? <span>{count > 0 ? `Like review · ${count} likes` : 'Like review'}</span>
        : count > 0 ? <span>{count}</span> : null
      }
    </button>
  );
}
