'use client';

import { useState, useEffect } from 'react';
import { rawgImg, steamCover } from '@/lib/rawg';

interface Props {
  steamAppId?: number | null;
  coverUrl?: string | null;
  name: string;
  className?: string;
}

/**
 * Muestra la portada portrait de Steam si existe (600×900),
 * con fallback al background_image de RAWG.
 */
export default function GameCoverImage({ steamAppId, coverUrl, name, className = 'object-cover' }: Props) {
  const steam = steamCover(steamAppId);
  const rawg  = rawgImg(coverUrl);
  const [src, setSrc] = useState<string | null>(steam ?? rawg);

  // Resetear si cambian las props (navegación entre páginas en Next.js)
  useEffect(() => {
    setSrc(steamCover(steamAppId) ?? rawgImg(coverUrl));
  }, [steamAppId, coverUrl]);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface text-2xl">🎮</div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={`h-full w-full ${className}`}
      onError={() => {
        // Si Steam falla → intentar RAWG
        if (src === steam && rawg) setSrc(rawg);
        else setSrc(null);
      }}
    />
  );
}
