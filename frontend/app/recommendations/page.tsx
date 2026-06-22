'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { searchGames, rawgImg, type RawgGame } from '@/lib/rawg';

interface LibraryEntry {
  status: string;
  games: { name: string; genres: string[] | null; steam_app_id: number };
  ratings: Array<{ overall: number | null }>;
}

function RecommendedCard({ game, reason }: { game: RawgGame; reason: string }) {
  const img  = rawgImg(game.background_image);
  const year = game.released ? new Date(game.released).getFullYear() : null;

  return (
    <Link href={`/game/${game.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-border transition-all group-hover:border-accent/60 group-hover:shadow-xl group-hover:shadow-accent/10">
        {img
          ? <Image src={img} alt={game.name} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-4xl">🎮</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {game.metacritic && (
          <span className={`absolute top-3 right-3 rounded px-2 py-1 text-sm font-black ${
            game.metacritic >= 75 ? 'bg-green-600' : game.metacritic >= 50 ? 'bg-yellow-600' : 'bg-red-600'
          }`}>{game.metacritic}</span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-black text-white text-lg leading-tight line-clamp-1">{game.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{[year, game.genres.slice(0,2).map(g=>g.name).join(' · ')].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] bg-accent/20 text-accent border border-accent/30 rounded-full px-2 py-0.5">{reason}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RecommendationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [recs,       setRecs]       = useState<Array<{ game: RawgGame; reason: string }>>([]);
  const [fetching,   setFetching]   = useState(true);
  const [library,    setLibrary]    = useState<LibraryEntry[]>([]);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!user) return;

    async function buildRecommendations() {
      // 1. Traer biblioteca del usuario
      const { data } = await supabase
        .from('user_games')
        .select('status, games(name, genres, steam_app_id), ratings(overall)')
        .eq('user_id', user!.id);

      const entries = (data as unknown as LibraryEntry[]) ?? [];
      setLibrary(entries);

      if (entries.length === 0) {
        setFetching(false);
        return;
      }

      // 2. Calcular géneros favoritos (ponderado por rating)
      const genreScore: Record<string, number> = {};
      for (const e of entries) {
        if (e.status === 'wishlist') continue;
        const rating  = e.ratings?.[0]?.overall ?? 6;
        const weight  = rating / 10;
        for (const g of e.games.genres ?? []) {
          genreScore[g] = (genreScore[g] ?? 0) + weight;
        }
      }

      const topGenres = Object.entries(genreScore)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      // 3. IDs ya en biblioteca (para excluir)
      const ownedIds = new Set(entries.map(e => e.games.steam_app_id));

      // 4. Buscar juegos por cada género top
      const seen   = new Set<number>();
      const result: Array<{ game: RawgGame; reason: string }> = [];

      await Promise.all(topGenres.map(async genre => {
        try {
          const data = await searchGames(genre, 1);
          for (const game of data.results) {
            if (seen.has(game.id) || ownedIds.has(game.id)) continue;
            if (!game.background_image) continue;
            seen.add(game.id);
            result.push({ game, reason: `Por tu interés en ${genre}` });
            if (result.filter(r => r.reason.includes(genre)).length >= 4) break;
          }
        } catch { /* skip */ }
      }));

      // 5. Mezclar y limitar
      result.sort((a, b) => (b.game.metacritic ?? 0) - (a.game.metacritic ?? 0));
      setRecs(result.slice(0, 12));
      setFetching(false);
    }

    buildRecommendations();
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="py-8 space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-surface" />
        <div className="h-4 w-96 animate-pulse rounded bg-surface" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  // Agrupar por razón
  const byReason: Record<string, Array<{ game: RawgGame; reason: string }>> = {};
  for (const r of recs) {
    byReason[r.reason] = [...(byReason[r.reason] ?? []), r];
  }

  return (
    <div className="py-8 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">Recomendaciones</h1>
        <p className="mt-1 text-sm text-gray-500">
          Basadas en los {library.length} juego{library.length !== 1 ? 's' : ''} que tenés registrados
        </p>
      </div>

      {/* Sin biblioteca */}
      {library.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-5xl mb-4">🎮</p>
          <p className="text-lg font-bold text-white">Registrá algunos juegos primero</p>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Las recomendaciones se generan según tus géneros favoritos y ratings. Cuantos más juegos tengas, mejor.
          </p>
          <Link href="/search" className="mt-6 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover transition-colors">
            Buscar juegos
          </Link>
        </div>
      )}

      {/* Recomendaciones agrupadas por género */}
      {Object.entries(byReason).map(([reason, items]) => (
        <section key={reason} className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{reason}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map(({ game }) => (
              <RecommendedCard key={game.id} game={game} reason={reason} />
            ))}
          </div>
        </section>
      ))}

      {/* Géneros del usuario */}
      {library.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Tu perfil de jugador</h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const gs: Record<string, number> = {};
              for (const e of library) {
                for (const g of e.games.genres ?? []) gs[g] = (gs[g] ?? 0) + 1;
              }
              return Object.entries(gs).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name, count]) => (
                <Link
                  key={name}
                  href={`/search?q=${encodeURIComponent(name)}`}
                  className="rounded-full border border-border px-3 py-1 text-sm text-gray-400 hover:border-accent hover:text-accent transition-colors"
                >
                  {name} <span className="text-xs text-gray-600">({count})</span>
                </Link>
              ));
            })()}
          </div>
        </section>
      )}
    </div>
  );
}
