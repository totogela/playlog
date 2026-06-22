import Image from 'next/image';
import Link from 'next/link';
import { getPopularGamesEnriched, getTopRatedGames, getRecentGames, getHiddenGems, rawgImg, type RawgGame } from '@/lib/rawg';
import SearchBar from '@/components/games/SearchBar';
import CommunityReviews from '@/components/home/CommunityReviews';
import ActivityFeed from '@/components/home/ActivityFeed';
import GameCoverImage from '@/components/games/GameCoverImage';

/* ─── Portrait cover card — usa Steam 600×900 cuando está disponible ─ */
function GameCover({ game, priority = false }: { game: RawgGame & { steamAppId?: number }; priority?: boolean }) {
  const year = game.released ? new Date(game.released).getFullYear() : null;

  return (
    <Link href={`/game/${game.id}`} className="group flex-shrink-0 block" style={{ width: 140 }}>
      <div className="relative overflow-hidden" style={{ width: 140, height: 210, borderRadius: 8, backgroundColor: '#1c2028' }}>
        <GameCoverImage
          steamAppId={game.steamAppId}
          coverUrl={game.background_image}
          name={game.name}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'rgba(0,0,0,0.3)' }} />
        {game.metacritic && (
          <span className="absolute bottom-2 right-2 text-[11px] font-black text-white leading-none"
            style={{
              background: game.metacritic >= 75 ? '#3d9970' : game.metacritic >= 50 ? '#b8860b' : '#c0392b',
              padding: '3px 5px', borderRadius: 4,
            }}>
            {game.metacritic}
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5" style={{ width: 140 }}>
        <p className="text-xs font-semibold text-white leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
          {game.name}
        </p>
        {year && <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{year}</p>}
      </div>
    </Link>
  );
}

/* ─── Featured / cinematic card ──────────────────────────────────── */
function FeaturedCard({ game, index }: { game: RawgGame; index: number }) {
  const img  = rawgImg(game.background_image);
  const year = game.released ? new Date(game.released).getFullYear() : null;
  return (
    <Link href={`/game/${game.id}`} className="group relative block overflow-hidden" style={{ borderRadius: 10, backgroundColor: '#1c2028' }}>
      <div className="relative aspect-video w-full overflow-hidden">
        {img ? (
          <Image src={img} alt={game.name} fill unoptimized priority={index < 4}
            className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🎮</div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
        {game.metacritic && (
          <span className="absolute top-2 right-2 text-[10px] font-black text-white leading-none"
            style={{ background: game.metacritic >= 75 ? '#3d9970' : '#b8860b', padding: '3px 5px', borderRadius: 4 }}>
            {game.metacritic}
          </span>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-bold text-white text-sm leading-tight line-clamp-1 group-hover:text-orange-400 transition-colors">{game.name}</p>
        {(year || game.genres?.length > 0) && (
          <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>
            {[year, game.genres?.slice(0,1).map(g => g.name).join('')].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ─── Section header ─────────────────────────────────────────────── */
function SectionHeader({ title, href, subtitle }: { title: string; href?: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="text-xs font-medium transition-colors hover:text-orange-400" style={{ color: '#6b7280' }}>
          Ver todo →
        </Link>
      )}
    </div>
  );
}

/* ─── Horizontal scroll row ──────────────────────────────────────── */
function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6" style={{ scrollbarWidth: 'none' }}>
      {children}
    </div>
  );
}

const GENRES = [
  { slug: 'action',    label: 'Acción'     },
  { slug: 'rpg',       label: 'RPG'        },
  { slug: 'shooter',   label: 'Shooter'    },
  { slug: 'adventure', label: 'Aventura'   },
  { slug: 'strategy',  label: 'Estrategia' },
  { slug: 'indie',     label: 'Indie'      },
  { slug: 'horror',    label: 'Terror'     },
  { slug: 'puzzle',    label: 'Puzzle'     },
];

/* ─── Página principal ───────────────────────────────────────────── */
export default async function HomePage() {
  const [popular, topRated, recent, gems] = await Promise.allSettled([
    getPopularGamesEnriched(),
    getTopRatedGames(),
    getRecentGames(),
    getHiddenGems(),
  ]);

  const popularGames = popular.status  === 'fulfilled' ? popular.value          : [];
  const topGames     = topRated.status === 'fulfilled' ? topRated.value.results : [];
  const recentGames  = recent.status   === 'fulfilled' ? recent.value.results   : [];
  const gemGames     = gems.status     === 'fulfilled' ? gems.value.results     : [];

  // Popular games tend to be dark AAA titles (GTA V, RDR2, etc.)
  const heroGame = popularGames.find(g => g.background_image) ?? topGames.find(g => g.background_image);
  const heroImg  = heroGame ? rawgImg(heroGame.background_image) : null;

  return (
    <div style={{ backgroundColor: '#14181c', minHeight: '100vh' }}>

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <section
        className="-mx-6 relative overflow-hidden flex items-end"
        style={{ marginTop: -80, height: '60vh', minHeight: 480, maxHeight: 680 }}
      >
        {heroImg && (
          <>
            <Image src={heroImg} alt={heroGame?.name ?? ''} fill unoptimized priority className="object-cover object-center" />
            {/* Multi-layer dark overlay for cinematic feel */}
            <div className="absolute inset-0" style={{ background: 'rgba(20,24,28,0.55)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(20,24,28,0.4) 0%, rgba(20,24,28,0.3) 40%, rgba(20,24,28,0.97) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(20,24,28,0.85) 0%, transparent 25%, transparent 75%, rgba(20,24,28,0.85) 100%)' }} />
          </>
        )}

        <div className="relative w-full px-6 pb-12 text-center" style={{ zIndex: 10 }}>
          <h1 className="font-black text-white leading-tight drop-shadow-lg" style={{ fontSize: 38, marginBottom: 6 }}>
            Registrá los juegos que jugaste.
          </h1>
          <p className="font-semibold" style={{ color: '#cbd5e1', fontSize: 22, marginBottom: 20 }}>
            Guardá los que querés jugar.
          </p>
          <div className="mx-auto" style={{ maxWidth: 480, marginBottom: 16 }}>
            <SearchBar />
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/search"
              className="font-bold text-white transition-all hover:opacity-90"
              style={{ background: '#e85d04', borderRadius: 999, padding: '10px 28px', fontSize: 14 }}>
              Empezar
            </Link>
            <Link href="/search"
              className="font-semibold transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '10px 28px', fontSize: 14, color: '#e2e8f0' }}>
              Explorar juegos
            </Link>
          </div>
        </div>

        {heroGame && (
          <p className="absolute bottom-3 right-5 text-[10px]" style={{ color: '#4b5563', zIndex: 10 }}>
            Imagen: {heroGame.name}
          </p>
        )}
      </section>

      {/* ══ CONTENIDO ══════════════════════════════════════════════ */}
      <div className="px-6" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 1280, margin: '0 auto' }}>

        {/* Trending Now */}
        {popularGames.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <SectionHeader title="Trending Now" href="/search" />
            <HScroll>
              {popularGames.map((game, i) => (
                <GameCover key={game.id} game={game} priority={i < 7} />
              ))}
            </HScroll>
          </section>
        )}

        {/* Actividad + Reseñas */}
        <section style={{ marginBottom: 52 }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <SectionHeader title="Actividad reciente" href="/activity" />
              <ActivityFeed />
            </div>
            <div>
              <SectionHeader title="Últimas reseñas" />
              <CommunityReviews />
            </div>
          </div>
        </section>

        {/* Los mejor puntuados */}
        {topGames.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <SectionHeader title="Los mejor valorados" href="/search?ordering=-metacritic" subtitle="Metacritic ≥ 90" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {topGames.slice(0, 8).map((game, i) => (
                <FeaturedCard key={game.id} game={game} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Lanzamientos recientes */}
        {recentGames.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <SectionHeader title="Lanzamientos recientes" href="/search?ordering=-released" />
            <HScroll>
              {recentGames.map(game => (
                <GameCover key={game.id} game={game} />
              ))}
            </HScroll>
          </section>
        )}

        {/* Hidden Gems */}
        {gemGames.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <SectionHeader title="Joyas ocultas" subtitle="Muy valorados, poco conocidos" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gemGames.slice(0, 8).map((game, i) => (
                <FeaturedCard key={game.id} game={game} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Géneros */}
        <section>
          <SectionHeader title="Explorar por género" />
          <div className="flex flex-wrap gap-2">
            {GENRES.map(({ slug, label }) => (
              <Link key={slug} href={`/search?genre=${slug}`}
                className="font-medium transition-all hover:text-orange-400"
                style={{ border: '1px solid #2c3440', borderRadius: 999, padding: '7px 18px', fontSize: 13, color: '#9ca3af' }}>
                {label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
