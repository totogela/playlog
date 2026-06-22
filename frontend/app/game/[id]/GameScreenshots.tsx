'use client';

import { useState } from 'react';
import Image from 'next/image';
import { rawgImg } from '@/lib/rawg';

interface Screenshot {
  id: number;
  image: string;
}

export default function GameScreenshots({ screenshots }: { screenshots: Screenshot[] }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {screenshots.map(s => {
          const img = rawgImg(s.image);
          if (!img) return null;
          return (
            <button
              key={s.id}
              onClick={() => setActive(img)}
              className="group relative aspect-video overflow-hidden rounded-lg border border-border hover:border-accent transition-colors"
            >
              <Image src={img} alt="screenshot" fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" />
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
        >
          <div className="relative max-h-[85vh] max-w-5xl w-full aspect-video">
            <Image src={active} alt="screenshot" fill unoptimized className="object-contain" />
          </div>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">✕</button>
        </div>
      )}
    </>
  );
}
