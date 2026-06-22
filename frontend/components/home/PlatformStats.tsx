'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Stats { games: number; reviews: number; users: number; }

export default function PlatformStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('user_games').select('id', { count: 'exact', head: true }),
      supabase.from('ratings').select('id', { count: 'exact', head: true }).not('review_text', 'is', null).not('review_text', 'eq', ''),
      supabase.from('users').select('id', { count: 'exact', head: true }),
    ]).then(([ug, r, u]) => {
      setStats({ games: ug.count ?? 0, reviews: r.count ?? 0, users: u.count ?? 0 });
    });
  }, []);

  if (!stats) return null;

  const items = [
    { label: 'juegos registrados', value: stats.games },
    { label: 'reseñas escritas',   value: stats.reviews },
    { label: 'jugadores',          value: stats.users },
  ];

  return (
    <div className="flex items-center justify-center gap-8 py-3 border-y border-border/50 text-center">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-lg font-black text-white">{value.toLocaleString('es')}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">{label}</p>
        </div>
      ))}
    </div>
  );
}
