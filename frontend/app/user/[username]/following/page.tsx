'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import FollowButton from '@/components/social/FollowButton';

interface UserEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function FollowingPage() {
  const { username } = useParams<{ username: string }>();
  const [users,   setUsers]   = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from('users').select('id').eq('username', username).maybeSingle();
      if (!profile) { setLoading(false); return; }

      const { data: follows } = await supabase
        .from('follows').select('following_id').eq('follower_id', profile.id).limit(100);
      const ids = (follows ?? []).map((f: { following_id: string }) => f.following_id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data: userList } = await supabase
        .from('users').select('id, username, avatar_url, bio').in('id', ids);
      setUsers((userList ?? []) as UserEntry[]);
      setLoading(false);
    }
    load();
  }, [username]);

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 24, paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href={`/user/${username}`} style={{ color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← {username}
        </Link>
        <span style={{ color: '#2c3440' }}>/</span>
        <h1 style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Siguiendo
        </h1>
      </div>

      <UserList users={users} loading={loading} emptyText={`${username} no sigue a nadie aún`} />
    </div>
  );
}

function UserList({ users, loading, emptyText }: { users: UserEntry[]; loading: boolean; emptyText: string }) {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#1c2028', borderRadius: 14, border: '1px solid #2c3440' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2c3440', flexShrink: 0 }} className="animate-pulse" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 13, width: '35%', background: '#2c3440', borderRadius: 6 }} className="animate-pulse" />
            <div style={{ height: 11, width: '55%', background: '#2c3440', borderRadius: 6 }} className="animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  if (users.length === 0) return (
    <div style={{ textAlign: 'center', paddingTop: 64 }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>👾</p>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{emptyText}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {users.map(u => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1c2028', borderRadius: 14, border: '1px solid #2c3440' }}>
          <Link href={`/user/${u.username}`} style={{ flexShrink: 0 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: '2px solid #2c3440', background: 'rgba(232,93,4,0.15)' }}>
              {u.avatar_url
                ? <img src={u.avatar_url} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#e85d04' }}>{u.username[0]?.toUpperCase()}</div>
              }
            </div>
          </Link>
          <Link href={`/user/${u.username}`} style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>{u.username}</p>
            {u.bio && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio}</p>}
          </Link>
          <div style={{ flexShrink: 0 }}>
            <FollowButton targetUserId={u.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
