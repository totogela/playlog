'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { searchGamesFiltered, rawgImg, type RawgGame } from '@/lib/rawg';
import SearchBar from '@/components/games/SearchBar';

const GENRES = [
  { slug: 'action',       label: 'Acción'      },
  { slug: 'rpg',          label: 'RPG'         },
  { slug: 'strategy',     label: 'Estrategia'  },
  { slug: 'shooter',      label: 'Shooter'     },
  { slug: 'adventure',    label: 'Aventura'    },
  { slug: 'puzzle',       label: 'Puzzle'      },
  { slug: 'sports',       label: 'Deportes'    },
  { slug: 'racing',       label: 'Carreras'    },
  { slug: 'simulation',   label: 'Simulación'  },
  { slug: 'platformer',   label: 'Plataformas' },
  { slug: 'fighting',     label: 'Pelea'       },
  { slug: 'indie',        label: 'Indie'       },
];

const PLATFORMS = [
  { id: '1', label: 'PC'          },
  { id: '2', label: 'PlayStation' },
  { id: '3', label: 'Xbox'        },
  { id: '7', label: 'Nintendo'    },
  { id: '4', label: 'Mobile'      },
];

const DECADES = [
  { value: '2020', label: '2020s' },
  { value: '2010', label: '2010s' },
  { value: '2000', label: '2000s' },
  { value: '1990', label: '90s'   },
];

const ORDERINGS = [
  { value: '',             label: 'Relevancia'   },
  { value: '-metacritic',  label: 'Metacritic'   },
  { value: '-rating',      label: 'Rating'       },
  { value: '-released',    label: 'Más recientes'},
  { value: '-added',       label: 'Popularidad'  },
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
        active
          ? 'bg-accent text-white'
          : 'border border-border text-gray-400 hover:border-gray-500 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function GameRow({ game }: { game: RawgGame }) {
  const year   = game.released ? new Date(game.released).getFullYear() : null;
  const genres = game.genres.slice(0, 2).map(g => g.name).join(', ');
  const img    = rawgImg(game.background_image);
  return (
    <Link
      href={`/game/${game.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border/60 bg-surface/60 p-3 transition-all hover:border-accent/40 hover:bg-surface"
    >
      <div className="relative h-[60px] w-[100px] flex-shrink-0 overflow-hidden rounded-lg bg-border">
        {img
          ? <Image src={img} alt={game.name} fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-xl">🎮</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white group-hover:text-accent transition-colors line-clamp-1">{game.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{[year, genres].filter(Boolean).join(' · ')}</p>
      </div>
      {game.metacritic && (
        <span className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-sm font-black ${
          game.metacritic >= 75 ? 'bg-green-900/60 text-green-400' :
          game.metacritic >= 50 ? 'bg-yellow-900/60 text-yellow-400' :
          'bg-red-900/60 text-red-400'
        }`}>{game.metacritic}</span>
      )}
    </Link>
  );
}

function GameGrid({ game }: { game: RawgGame }) {
  const year = game.released ? new Date(game.released).getFullYear() : null;
  const img  = rawgImg(game.background_image);
  return (
    <Link href={`/game/${game.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border/40 bg-surface transition-all group-hover:border-accent/50 group-hover:shadow-lg group-hover:shadow-black/60 group-hover:-translate-y-0.5">
        {img
          ? <Image src={img} alt={game.name} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-3xl">🎮</div>
        }
        {game.metacritic && (
          <span className={`absolute bottom-1.5 right-1.5 rounded px-1.5 py-0.5 text-[10px] font-black leading-none ${
            game.metacritic >= 75 ? 'bg-green-700/90 text-white' : game.metacritic >= 50 ? 'bg-yellow-700/90 text-white' : 'bg-red-700/90 text-white'
          }`}>{game.metacritic}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <p className="mt-1.5 text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors line-clamp-2 leading-snug">{game.name}</p>
      {year && <p className="text-[10px] text-gray-600 mt-0.5">{year}</p>}
    </Link>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const q         = searchParams.get('q')        ?? '';
  const genreP    = searchParams.get('genre')    ?? '';
  const decadeP   = searchParams.get('decade')   ?? '';
  const orderP    = searchParams.get('order')    ?? '';
  const platformP = searchParams.get('platform') ?? '';
  const viewP     = searchParams.get('view')     ?? 'grid';

  const [results, setResults] = useState<RawgGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const fetchRef = useRef(0);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`/search?${params}`);
  }

  function toggleFilter(key: string, value: string, current: string) {
    setParam(key, current === value ? '' : value);
  }

  const fetchResults = useCallback(async (query: string, pg: number, genre: string, decade: string, order: string, platform: string) => {
    setLoading(true);
    const id = ++fetchRef.current;
    try {
      const data = await searchGamesFiltered(query, pg, {
        genre:    genre    || undefined,
        decade:   decade   || undefined,
        ordering: order    || undefined,
        platform: platform || undefined,
      });
      if (id !== fetchRef.current) return;
      setResults(data.results);
      setTotal(data.count);
    } catch {
      if (id !== fetchRef.current) return;
      setResults([]);
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchResults(q, 1, genreP, decadeP, orderP, platformP);
  }, [q, genreP, decadeP, orderP, platformP, fetchResults]);

  const hasFilters = !!(genreP || decadeP || orderP || platformP);

  return (
    <div className="py-8 space-y-6">

      {/* Search bar */}
      <div className="max-w-2xl">
        <SearchBar initialValue={q} autoFocus={!q} />
      </div>

      {/* Sin query: grid de géneros */}
      {!q && !hasFilters && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Explorar por género</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {GENRES.map(({ slug, label }) => (
              <button
                key={slug}
                onClick={() => setParam('genre', slug)}
                className="rounded-lg border border-border/60 bg-surface/40 py-4 text-sm font-medium text-gray-400 transition-all hover:border-accent/60 hover:bg-surface hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Con query o filtros */}
      {(q || hasFilters) && (
        <div className="space-y-5">

          {/* Barra de filtros */}
          <div className="space-y-2 rounded-xl border border-border/40 bg-surface/40 p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-16 flex-shrink-0">Género</span>
              {GENRES.map(g => (
                <Chip key={g.slug} label={g.label} active={genreP === g.slug}
                  onClick={() => toggleFilter('genre', g.slug, genreP)} />
              ))}
            </div>

            <div className="border-t border-border/30 pt-2 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-16 flex-shrink-0">Plataforma</span>
              {PLATFORMS.map(p => (
                <Chip key={p.id} label={p.label} active={platformP === p.id}
                  onClick={() => toggleFilter('platform', p.id, platformP)} />
              ))}
            </div>

            <div className="border-t border-border/30 pt-2 flex flex-wrap gap-4 items-center">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-16 flex-shrink-0">Época</span>
                {DECADES.map(d => (
                  <Chip key={d.value} label={d.label} active={decadeP === d.value}
                    onClick={() => toggleFilter('decade', d.value, decadeP)} />
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={orderP}
                  onChange={e => setParam('order', e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-accent cursor-pointer"
                >
                  {ORDERINGS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button onClick={() => setParam('view', 'grid')}
                    className={`px-3 py-1.5 text-sm transition-colors ${viewP === 'grid' ? 'bg-accent text-white' : 'text-gray-500 hover:text-white'}`}>
                    ⊞
                  </button>
                  <button onClick={() => setParam('view', 'list')}
                    className={`px-3 py-1.5 text-sm transition-colors ${viewP === 'list' ? 'bg-accent text-white' : 'text-gray-500 hover:text-white'}`}>
                    ≡
                  </button>
                </div>
              </div>
            </div>

            {hasFilters && (
              <div className="border-t border-border/30 pt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-600">Activos:</span>
                {genreP    && <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent">{GENRES.find(g => g.slug === genreP)?.label}</span>}
                {platformP && <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent">{PLATFORMS.find(p => p.id === platformP)?.label}</span>}
                {decadeP   && <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent">{DECADES.find(d => d.value === decadeP)?.label}</span>}
                {orderP    && <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent">{ORDERINGS.find(o => o.value === orderP)?.label}</span>}
                <button onClick={() => router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors ml-1">
                  × Limpiar todo
                </button>
              </div>
            )}
          </div>

          {/* Conteo */}
          <p className="text-sm text-gray-500">
            {loading
              ? <span className="animate-pulse">Buscando...</span>
              : results.length > 0
                ? <><span className="text-white font-semibold">{total.toLocaleString()}</span> resultado{total !== 1 ? 's' : ''}{q && <> para <span className="text-accent">&ldquo;{q}&rdquo;</span></>}</>
                : 'Sin resultados'
            }
          </p>

          {/* Resultados */}
          {loading ? (
            <div className={viewP === 'grid'
              ? 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
              : 'space-y-2'}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={`animate-pulse rounded-xl bg-surface ${viewP === 'grid' ? 'aspect-[3/4]' : 'h-20'}`} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <p className="font-semibold text-gray-300">No se encontraron juegos</p>
              <p className="text-sm text-gray-600 mt-1">Probá con otro término o quitá los filtros</p>
            </div>
          ) : viewP === 'grid' ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {results.map(g => <GameGrid key={g.id} game={g} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(g => <GameRow key={g.id} game={g} />)}
            </div>
          )}

          {/* Paginación */}
          {!loading && results.length > 0 && (
            <div className="flex justify-center items-center gap-3 pt-4">
              <button
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchResults(q, p, genreP, decadeP, orderP, platformP); }}
                disabled={page === 1}
                className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed">
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">Página {page}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); fetchResults(q, p, genreP, decadeP, orderP, platformP); }}
                disabled={results.length < 24}
                className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed">
                Siguiente →
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
