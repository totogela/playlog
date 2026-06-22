'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface LastGame {
  name: string;
  rawg_id: number | null;
  steam_app_id: number;
}

export default function PersonalizedGreeting() {
  const { user, loading } = useAuth();
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [lastGame,     setLastGame]     = useState<LastGame | null>(null);

  useEffect(() => {
    if (!user) return;
    // Contar biblioteca y último juego en paralelo
    Promise.all([
      supabase.from('user_games').select('id', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'wishlist'),
      supabase.from('user_games').select('games!inner(name, rawg_id, steam_app_id)').eq('user_id', user.id).neq('status', 'wishlist').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([countRes, lastRes]) => {
      setLibraryCount(countRes.count ?? 0);
      if (lastRes.data) {
        const g = (lastRes.data as { games: LastGame }).games;
        setLastGame(g);
      }
    });
  }, [user]);

  if (loading || !user) return null;

  const username = user.email?.split('@')[0] ?? 'jugador';

  return (
    <div className="border-b border-border pb-6 mb-2">
      <p className="text-gray-400 text-sm">
        Bienvenido de vuelta,{' '}
        <Link href="/profile" className="font-bold text-white hover:text-accent transition-colors">
          {username}
        </Link>
        {libraryCount !== null && libraryCount > 0 && (
          <>
            {'. Tenés '}
            <Link href="/library" className="font-semibold text-gray-200 hover:text-accent transition-colors">
              {libraryCount} {libraryCount === 1 ? 'juego' : 'juegos'}
            </Link>
            {' en tu biblioteca'}
            {lastGame && (
              <>
                {'. Último: '}
                <Link href={`/game/${lastGame.rawg_id ?? lastGame.steam_app_id}`} className="font-semibold text-white hover:text-accent transition-colors">
                  {lastGame.name}
                </Link>
              </>
            )}
          </>
        )}
        {(libraryCount === null || libraryCount === 0) && '. Esto es lo que está pasando en la comunidad...'}
        .
      </p>
    </div>
  );
}
