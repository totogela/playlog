'use client';

import { useState } from 'react';
import CommunityReviews from './CommunityReviews';
import FollowingReviews from './FollowingReviews';

export default function ReviewFeedTabs() {
  const [tab, setTab] = useState<'community' | 'following'>('community');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-black text-white">Últimas reseñas</h2>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {([
            { id: 'community', label: 'Comunidad' },
            { id: 'following', label: 'Amistades' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-accent text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'community' ? <CommunityReviews /> : <FollowingReviews />}
    </div>
  );
}
