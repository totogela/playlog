'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { rawgImg } from '@/lib/rawg';
import type { GameStatus } from '@/lib/supabase';

interface Entry {
  status: GameStatus;
  hours_played: number | null;
  updated_at: string;
  games: { steam_app_id: number; name: string; cover_url: string | null; genres: string[] | null };
  ratings: Array<{ overall: number | null; review_text: string | null }>;
}

const YEAR = new Date().getFullYear();

function StatCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 text-center ${accent ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface'}`}>
      <div className={`text-4xl font-black ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-600">{sub}</div>}
    </div>
  );
}

export default function WrappedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [entries,  setEntries]  = useState<Entry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!user) return;

    async function load() {
      const { data: u } = await supabase.from('users').select('username').eq('id', user!.id).maybeSingle();
      setUsername(u?.username ?? user!.email?.split('@')[0] ?? 'Jugador');

      const { data } = await supabase
        .from('user_games')
        .select('status, hours_played, updated_at, games(steam_app_id, name, cover_url, genres), ratings(overall, review_text)')
        .eq('user_id', user!.id)
        .gte('updated_at', `${YEAR}-01-01`)
        .order('updated_at', { ascending: false });

      setEntries((data as unknown as Entry[]) ?? []);
      setFetching(false);
    }
    load();
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-pulse">🎮</div>
          <p className="text-gray-500">Calculando tu año gaming...</p>
        </div>
      </div>
    );
  }

  // ── Cálculos ──
  const total     = entries.length;
  const completed = entries.filter(e => e.status === 'completed');
  const totalHours = entries.reduce((s, e) => s + (e.hours_played ?? 0), 0);
  const withRating = entries.filter(e => e.ratings?.[0]?.overall);
  const avgRating  = withRating.length
    ? (withRating.reduce((s, e) => s + (e.ratings[0].overall ?? 0), 0) / withRating.length / 2)
    : null;
  const reviews = entries.filter(e => e.ratings?.[0]?.review_text);

  // Top juego (mayor rating)
  const topGame = withRating.sort((a,b) => (b.ratings[0].overall ?? 0) - (a.ratings[0].overall ?? 0))[0];

  // Géneros favoritos
  const genreMap: Record<string, number> = {};
  for (const e of entries) for (const g of e.games.genres ?? []) genreMap[g] = (genreMap[g] ?? 0) + 1;
  const topGenres = Object.entries(genreMap).sort((a,b) => b[1]-a[1]).slice(0, 5);

  // Mes más activo
  const monthMap: Record<string, number> = {};
  for (const e of entries) {
    const m = new Date(e.updated_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    monthMap[m] = (monthMap[m] ?? 0) + 1;
  }
  const topMonth = Object.entries(monthMap).sort((a,b) => b[1]-a[1])[0];

  // Histograma mensual
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(YEAR, i, 1);
    const key = d.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase();
    const count = entries.filter(e => new Date(e.updated_at).getMonth() === i).length;
    return { key, count };
  });
  const maxMonth = Math.max(...months.map(m => m.count), 1);

  if (total === 0) {
    return (
      <div className="py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black">Playlog Wrapped {YEAR}</h1>
          <p className="mt-1 text-sm text-gray-500">Tu resumen anual de gaming</p>
        </div>
        <div className="rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-lg font-bold text-white">Todavía no registraste juegos en {YEAR}</p>
          <p className="mt-2 text-sm text-gray-500">Empezá a registrar juegos para ver tu resumen al final del año</p>
          <Link href="/search" className="mt-6 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-hover transition-colors">
            Buscar juegos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-12">

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-border bg-surface px-8 py-12 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="relative">
          <p className="text-sm font-bold uppercase tracking-widest text-accent mb-2">Playlog Wrapped</p>
          <h1 className="text-5xl font-black text-white">{YEAR}</h1>
          <p className="mt-3 text-xl text-gray-300">
            {username}, este fue tu año gaming
          </p>
          <p className="mt-2 text-gray-500 text-sm">
            {total} juego{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''} · {totalHours}h jugadas · {completed.length} terminado{completed.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats principales */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">En números</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Juegos registrados" value={total} accent />
          <StatCard label="Completados" value={completed.length} />
          <StatCard label="Horas jugadas" value={`${totalHours}h`} />
          <StatCard label="Reseñas escritas" value={reviews.length} />
          {avgRating && <StatCard label="Rating promedio" value={`${avgRating.toFixed(1)}★`} />}
        </div>
      </section>

      {/* Top juego del año */}
      {topGame && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Tu juego del año</h2>
          <Link href={`/game/${topGame.games.steam_app_id}`} className="group flex gap-6 rounded-2xl border border-border bg-surface p-6 transition-all hover:border-accent/50">
            {rawgImg(topGame.games.cover_url) && (
              <div className="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-xl">
                <Image src={rawgImg(topGame.games.cover_url)!} alt={topGame.games.name} fill unoptimized className="object-cover" />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <p className="text-xs text-accent font-bold uppercase tracking-widest mb-1">🏆 Mejor rated</p>
              <h3 className="text-2xl font-black text-white group-hover:text-accent transition-colors">{topGame.games.name}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const v = (topGame.ratings[0].overall ?? 0) / 2;
                  return (
                    <svg key={i} className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={v >= i + 1 ? '#f97316' : v >= i + 0.5 ? 'url(#half)' : 'none'}
                        stroke={v >= i + 0.5 ? '#f97316' : '#374151'} strokeWidth="1.5" />
                    </svg>
                  );
                })}
                <span className="text-sm text-gray-400 ml-1">{((topGame.ratings[0].overall ?? 0) / 2).toFixed(1)} / 5</span>
              </div>
              {topGame.ratings[0].review_text && (
                <p className="mt-3 text-sm text-gray-400 italic line-clamp-2">"{topGame.ratings[0].review_text}"</p>
              )}
            </div>
          </Link>
        </section>
      )}

      {/* Actividad mensual */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Actividad por mes</h2>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-end gap-2 h-32">
            {months.map(({ key, count }) => (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${count ? Math.max(8, Math.round((count / maxMonth) * 112)) : 0}px`,
                    background: count > 0 ? '#f97316' : 'transparent',
                    opacity: count > 0 ? (0.4 + 0.6 * (count / maxMonth)) : 0.1,
                  }}
                />
                <span className="text-[9px] text-gray-600">{key.slice(0,3)}</span>
              </div>
            ))}
          </div>
          {topMonth && (
            <p className="mt-4 text-center text-sm text-gray-500">
              Tu mes más activo: <span className="text-white font-semibold">{topMonth[0]}</span> con {topMonth[1]} juego{topMonth[1] !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </section>

      {/* Géneros favoritos */}
      {topGenres.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Géneros más jugados</h2>
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
            {topGenres.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-4">
                <span className="text-2xl font-black text-gray-700 w-6">#{i + 1}</span>
                <span className="w-28 text-sm font-semibold text-gray-200">{name}</span>
                <div className="flex-1 h-3 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-700"
                    style={{ width: `${Math.round((count / topGenres[0][1]) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-12 text-right">{count} juego{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Juegos completados */}
      {completed.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Completados en {YEAR}</h2>
          <div className="flex gap-3 flex-wrap">
            {completed.slice(0, 10).map(e => {
              const img = rawgImg(e.games.cover_url);
              return (
                <Link key={e.games.steam_app_id} href={`/game/${e.games.steam_app_id}`} className="group">
                  <div className="relative w-16 h-24 overflow-hidden rounded-lg border border-border group-hover:border-accent transition-colors">
                    {img
                      ? <Image src={img} alt={e.games.name} fill unoptimized className="object-cover" />
                      : <div className="flex h-full items-center justify-center bg-surface text-xl">🎮</div>
                    }
                    <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-green-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pb-1">
                      <span className="text-xs text-green-400">✓</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA compartir */}
      <div className="text-center pb-4">
        <p className="text-sm text-gray-600">Volvé a fin de año para tu resumen completo de {YEAR} 🎮</p>
      </div>

    </div>
  );
}
