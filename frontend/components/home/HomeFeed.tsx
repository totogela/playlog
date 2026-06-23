'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import ActivityFeed from './ActivityFeed';
import FollowingFeed from './FollowingFeed';

export default function HomeFeed() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'following' | 'community'>('following');

  if (!user) {
    return <ActivityFeed />;
  }

  return (
    <div>
      <div className="flex gap-5 border-b border-border mb-4">
        {[
          { id: 'following', label: 'Siguiendo' },
          { id: 'community', label: 'Comunidad' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'following' | 'community')}
            style={{
              paddingBottom: 10,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: tab === t.id ? '2px solid #e85d04' : '2px solid transparent',
              color: tab === t.id ? '#e85d04' : '#6b7280',
              marginBottom: -1,
              background: 'none',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'following' ? <FollowingFeed /> : <ActivityFeed />}
    </div>
  );
}
