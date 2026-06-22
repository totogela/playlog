'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { rawgImg, type RawgGame } from '@/lib/rawg';

interface Props {
  game: RawgGame;
  userRating?: number;
  priority?: boolean;
}

export default function GameCard({ game, userRating, priority = false }: Props) {
  const genres = game.genres.slice(0, 2).map(g => g.name).join(' · ');
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      href={`/game/${game.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all duration-200 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
    >
      {/* Cover */}
      <div className="relative aspect-video w-full overflow-hidden bg-border">
        {/* Shimmer mientras carga */}
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-border via-surface to-border" />
        )}

        {game.background_image ? (
          <Image
            src={rawgImg(game.background_image)!}
            alt={game.name}
            fill
            unoptimized
            priority={priority}
            onLoad={() => setLoaded(true)}
            className={`object-cover transition-all duration-300 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600">
            <span className="text-4xl">🎮</span>
          </div>
        )}

        {/* Metacritic badge */}
        {game.metacritic && (
          <div className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-xs font-bold ${
            game.metacritic >= 75 ? 'bg-green-600' :
            game.metacritic >= 50 ? 'bg-yellow-600' : 'bg-red-600'
          }`}>
            {game.metacritic}
          </div>
        )}

        {/* User rating overlay */}
        {userRating && (
          <div className="absolute bottom-2 left-2 rounded bg-accent px-2 py-0.5 text-xs font-bold text-white">
            Tu nota: {userRating}/10
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-white transition-colors group-hover:text-accent">
          {game.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{genres || 'Sin género'}</span>
          {game.released && (
            <span className="text-xs text-gray-600">
              {new Date(game.released).getFullYear()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
