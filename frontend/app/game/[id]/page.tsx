import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getGame, rawgImg } from '@/lib/rawg';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GameActions from './GameActions';
import GameReviews from './GameReviews';
import GameScreenshots from './GameScreenshots';
import GameSimilar from './GameSimilar';
import RecommendButton from './RecommendButton';
import GameCoverImage from '@/components/games/GameCoverImage';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const game = await getGame(Number(id));
    const img  = rawgImg(game.background_image);
    const desc = game.description_raw?.replace(/<[^>]+>/g, '').slice(0, 160).trim();
    return {
      title:       game.name,
      description: desc || `Reseñas, calificaciones y más sobre ${game.name} en Playlog.`,
      openGraph: {
        title:       `${game.name} — Playlog`,
        description: desc || `Reseñas de ${game.name}`,
        images:      img ? [{ url: img, width: 1280, height: 720 }] : [],
        type:        'website',
      },
      twitter: {
        card:  'summary_large_image',
        title: `${game.name} — Playlog`,
      },
    };
  } catch {
    return { title: 'Juego' };
  }
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;

  let game = null;
  try { game = await getGame(Number(id)); } catch { notFound(); }
  if (!game) notFound();

  const img      = rawgImg(game.background_image);
  const year     = game.released ? new Date(game.released).getFullYear() : null;

  const steamStore = game.stores?.find((s: { store: { slug: string }; url: string }) => s.store.slug === 'steam');
  let steamAppId   = steamStore?.url ? parseInt(steamStore.url.match(/\/app\/(\d+)/)?.[1] ?? '0') || undefined : undefined;
  if (!steamAppId) {
    try {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await db.from('games').select('steam_app_id').or(`rawg_id.eq.${id},steam_app_id.eq.${id}`).maybeSingle();
      if (data?.steam_app_id && data.steam_app_id !== Number(id)) steamAppId = data.steam_app_id;
    } catch { /* sin cover */ }
  }

  const desc      = game.description_raw?.trim() ?? '';
  const developer = game.developers?.[0]?.name ?? null;
  const publisher = game.publishers?.[0]?.name ?? null;
  const stores    = game.stores ?? [];

  return (
    <div className="-mx-6 min-h-screen">

      {/* ══ HERO ══ */}
      <div className="relative -mt-20 h-[420px] overflow-hidden">
        {img && (
          <>
            <Image src={img} alt={game.name} fill unoptimized priority className="object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-transparent to-bg" />
          </>
        )}
      </div>

      {/* ══ BODY ══ */}
      <div className="relative px-6 pb-24 -mt-56">
        {/* Grid: [col-left] [col-center] [col-right] */}
        <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr_220px] gap-x-8 gap-y-6">

          {/* ───── COL LEFT ───── */}
          <div className="flex flex-col gap-3">

            {/* Portada */}
            <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-2xl shadow-black/80 border border-white/10">
              <GameCoverImage
                steamAppId={steamAppId}
                coverUrl={game.background_image}
                name={game.name}
                className="object-cover"
              />
            </div>

            {/* Botones acción */}
            <div className="bg-surface/90 border border-border/60 rounded-lg p-3 space-y-3">
              <GameActions game={game} />
              <RecommendButton gameId={Number(id)} gameName={game.name} />
            </div>

            {/* Dónde jugar */}
            {stores.length > 0 && (
              <div className="bg-surface/60 border border-border/40 rounded-lg p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Dónde jugar</p>
                <div className="space-y-1.5">
                  {stores.slice(0, 5).map((s: { store: { id: number; name: string }; url: string }) => (
                    <a key={s.store.id} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-accent transition-colors group">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-accent flex-shrink-0" />
                      {s.store.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ───── COL CENTER ───── */}
          <div className="pt-2 lg:pt-28 space-y-7">

            {/* Título */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-black leading-none tracking-tight text-white">
                {game.name}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {year && <span className="text-gray-400 font-semibold text-base">{year}</span>}
                {game.genres?.length > 0 && (
                  <>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-400 text-sm">
                      {game.genres.slice(0, 2).map((g: { id: number; name: string }) => g.name).join(' / ')}
                    </span>
                  </>
                )}
              </div>
              {/* Tags de género clickeables */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {game.genres?.map((g: { id: number; name: string; slug: string }) => (
                  <Link key={g.id} href={`/search?genre=${g.slug}`}
                    className="rounded-full border border-border/50 px-2.5 py-0.5 text-[10px] text-gray-500 hover:border-accent/60 hover:text-accent transition-colors">
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Descripción */}
            {desc && (
              <div>
                <p className="text-sm leading-relaxed text-gray-300 line-clamp-5">{desc}</p>
              </div>
            )}

            {/* Cast & Crew */}
            {(developer || publisher) && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3">Cast & Crew</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {developer && (
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/40">
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Desarrollador</p>
                      <p className="text-xs font-bold text-gray-200 line-clamp-1">{developer}</p>
                    </div>
                  )}
                  {publisher && publisher !== developer && (
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/40">
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Distribuidor</p>
                      <p className="text-xs font-bold text-gray-200 line-clamp-1">{publisher}</p>
                    </div>
                  )}
                  {game.playtime > 0 && (
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/40">
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Duración</p>
                      <p className="text-xs font-bold text-gray-200">~{game.playtime}h</p>
                    </div>
                  )}
                  {game.metacritic && (
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/40">
                      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Metacritic</p>
                      <p className={`text-sm font-black ${game.metacritic >= 75 ? 'text-green-400' : game.metacritic >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {game.metacritic}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Screenshots */}
            {game.short_screenshots?.length > 1 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3">Screenshots</p>
                <GameScreenshots screenshots={game.short_screenshots.slice(1, 5)} />
              </div>
            )}

            {/* Reseñas */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-4">Reseñas populares</p>
              <GameReviews rawgId={Number(id)} />
            </div>

          </div>

          {/* ───── COL RIGHT ───── */}
          <div className="pt-2 lg:pt-28 space-y-5">

            {/* Rating summary */}
            {game.rating > 0 && (
              <div className="bg-surface/80 border border-border/60 rounded-lg p-4 text-center">
                <p className="text-3xl font-black text-white">{game.rating.toFixed(1)}<span className="text-lg text-gray-500">/5</span></p>
                <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-0.5">Rating RAWG</p>
              </div>
            )}

            {/* Plataformas */}
            {(game.platforms ?? []).length > 0 && (
              <div className="bg-surface/60 border border-border/40 rounded-lg p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2.5">Plataformas</p>
                <div className="flex flex-wrap gap-1.5">
                  {(game.platforms ?? []).slice(0, 8).map((p: { platform: { id: number; name: string } }) => (
                    <span key={p.platform.id} className="rounded-md bg-bg/60 border border-border/40 px-2 py-0.5 text-[10px] text-gray-400">
                      {p.platform.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Juegos similares */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3">Juegos similares</p>
              <GameSimilar gameId={Number(id)} genreSlugs={(game.genres ?? []).map((g: { slug: string }) => g.slug)} />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
