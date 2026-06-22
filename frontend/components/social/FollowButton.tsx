'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Props {
  targetUserId: string;
  initialFollowing?: boolean;
  onCountChange?: (delta: number) => void;
}

export default function FollowButton({ targetUserId, initialFollowing = false, onCountChange }: Props) {
  const { user } = useAuth();
  const router   = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading,   setLoading]   = useState(false);
  const [checked,   setChecked]   = useState(initialFollowing !== undefined);

  useEffect(() => {
    if (!user || user.id === targetUserId) return;
    supabase.from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        setFollowing(!!data);
        setChecked(true);
      });
  }, [user, targetUserId]);

  if (!user || user.id === targetUserId || !checked) return null;

  async function toggle() {
    if (!user) { router.push('/login'); return; }
    setLoading(true);
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      setFollowing(false);
      onCountChange?.(-1);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
      setFollowing(true);
      onCountChange?.(1);
      // Notify the followed user
      await supabase.from('notifications').insert({
        user_id:      targetUserId,
        from_user_id: user.id,
        type:         'follow',
      });
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
        following
          ? 'border border-border text-gray-400 hover:border-red-800 hover:text-red-400'
          : 'bg-accent text-white hover:bg-accent-hover'
      }`}
    >
      {loading ? '...' : following ? 'Siguiendo' : '+ Seguir'}
    </button>
  );
}
