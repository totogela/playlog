'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { rawgImg } from '@/lib/rawg';

const KEY = 'c21c574004494d23aea3749834c91632';

interface SimilarGame {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  metacritic: number | null;
}

interface Props {
  gameId: number;
  genreSlugs: string[];
}

export default function GameSimilar({ gameId, genreSlugs }: Props) {
  const [games,   setGames]   = useState<SimilarGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Try suggested endpoint first
      try {
        const res  = await fetch(`https://api.rawg.io/api/games/${gameId}/suggested?key=${KEY}&page_size=10`);
        const data = await res.json();
        if (data.results?.length > 0) {
          setGames(data.results.filter((g: SimilarGame) => g.background_image).slice(0, 9));
          setLoading(false);
          return;
        }
      } catch { /* fall through */ }

      // Fallback: search by genre
      if (genreSlugs.length > 0) {
        try {
          const genres = genreSlugs.slice(0, 2).join(',');
          const res    = await fetch(
            `https://api.rawg.io/api/games?key=${KEY}&genres=${genres}&ordering=-metacritic&page_size=12&exclude_additions=true`
          );
          const data = await res.json();
          const results = (data.results ?? [])
            .filter((g: SimilarGame) => g.background_image && g.id !== gameId)
            .slice(0, 9);
          setGames(results);
        } catch { /* nothing */ }
      }
      setLoading(false);
    }
    load();
  }, [gameId, genreSlugs]);

  if (loading) return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">Juegos similares</p>
        <div className="flex-1 border-t border-border" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[76px] animate-pulse">
            <div className="aspect-[3/4] rounded-lg bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );

  if (games.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">Juegos similares</p>
        <div className="flex-1 border-t border-border" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {games.map(g => {
          const img  = rawgImg(g.background_image);
          const year = g.released ? new Date(g.released).getFullYear() : null;
          return (
            <Link
              key={g.id}
              href={`/game/${g.id}`}
              className="group flex-shrink-0 w-[76px]"
              title={g.name}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border/60 group-hover:border-accent/60 transition-all group-hover:shadow-lg group-hover:shadow-accent/10">
                {img
                  ? <Image src={img} alt={g.name} fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  : <div className="flex h-full items-center justify-center bg-surface text-xl">🎮</div>
                }
                {g.metacritic && (
                  <span className={`absolute bottom-1 right-1 rounded px-1 py-0.5 text-[8px] font-black text-white ${
                    g.metacritic >= 75 ? 'bg-green-700/90' : g.metacritic >= 50 ? 'bg-yellow-700/90' : 'bg-red-700/90'
                  }`}>{g.metacritic}</span>
                )}
              </div>
              <p className="mt-1 text-[10px] leading-tight text-gray-500 group-hover:text-gray-300 transition-colors line-clamp-2">{g.name}</p>
              {year && <p className="text-[9px] text-gray-700">{year}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
