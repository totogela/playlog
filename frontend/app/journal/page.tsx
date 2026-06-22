'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';

interface JournalEntry {
  id: string;
  status: string;
  updated_at: string;
  finished_at: string | null;
  games: {
    id: string;
    name: string;
    steam_app_id: number;
    rawg_id: number | null;
    cover_url: string | null;
  };
  ratings: Array<{ overall: number | null; review_text: string | null }>;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function Stars({ value }: { value: number }) {
  const stars = value / 2;
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid = `jr-${s}-${value}`;
        return (
          <svg key={s} className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={uid} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#e85d04" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="none" stroke={full || half ? '#e85d04' : '#303840'} strokeWidth="1.5" strokeLinejoin="round" />
            {(full || half) && (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={full ? '#e85d04' : `url(#${uid})`} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  playing:   'Jugando',
  completed: 'Terminado',
  abandoned: 'Abandonado',
  on_hold:   'En pausa',
  wishlist:  'Wishlist',
};

export default function JournalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [entries, setEntries]   = useState<JournalEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [month, setMonth]       = useState(now.getMonth());
  const [year, setYear]         = useState(now.getFullYear());

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!user) return;
    async function load() {
      setFetching(true);
      const from = new Date(year, month, 1).toISOString();
      const to   = new Date(year, month + 1, 1).toISOString();
      const { data } = await supabase
        .from('user_games')
        .select('id, status, updated_at, finished_at, games(id, name, steam_app_id, rawg_id, cover_url), ratings(overall, review_text)')
        .eq('user_id', user!.id)
        .gte('updated_at', from)
        .lt('updated_at', to)
        .order('updated_at', { ascending: false });
      setEntries((data ?? []) as unknown as JournalEntry[]);
      setFetching(false);
    }
    load();
  }, [user, loading, router, month, year]);

  return (
    <div style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-black text-white tracking-tight" style={{ fontSize: 28, letterSpacing: -0.5 }}>
          JOURNAL
        </h1>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ background: '#1c2028', border: '1px solid #2c3440', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#ffffff', outline: 'none', cursor: 'pointer' }}>
            {MONTHS.map((m, i) => <option key={i} value={i}>Mes: {m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ background: '#1c2028', border: '1px solid #2c3440', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#ffffff', outline: 'none', cursor: 'pointer' }}>
            {years.map(y => <option key={y} value={y}>Año: {y}</option>)}
          </select>
        </div>
      </div>

      {/* Entries */}
      {fetching ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 10, background: '#1c2028' }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ color: '#6b7280', fontSize: 14 }}>No hay entradas para {MONTHS[month]} {year}.</p>
          <p style={{ color: '#4b5563', fontSize: 12, marginTop: 6 }}>Los juegos que loguees aparecerán aquí.</p>
          <Link href="/search"
            style={{ display: 'inline-block', marginTop: 20, background: '#e85d04', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 8, padding: '9px 20px', textDecoration: 'none' }}>
            Explorar juegos →
          </Link>
        </div>
      ) : (
        <>
          {/* Border top */}
          <div style={{ borderTop: '1px solid #2c3440' }}>
            {entries.map(entry => {
              const date     = new Date(entry.updated_at);
              const day      = date.getDate();
              const mon      = MONTHS_SHORT[date.getMonth()];
              const rating   = entry.ratings?.[0]?.overall;
              const rawgId   = entry.games?.rawg_id;
              const gameHref = rawgId ? `/game/${rawgId}` : '#';

              return (
                <div key={entry.id}
                  className="group flex items-center gap-4 transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: '1px solid #2c3440', padding: '14px 8px' }}>

                  {/* Date block */}
                  <div className="flex-shrink-0 text-center" style={{ width: 44 }}>
                    <p className="font-black" style={{ fontSize: 9, letterSpacing: 2, color: '#e85d04' }}>{mon}</p>
                    <p className="font-black text-white leading-none" style={{ fontSize: 26 }}>{day}</p>
                  </div>

                  {/* Star rating (left of title) */}
                  <div className="flex-shrink-0" style={{ width: 80 }}>
                    {rating ? (
                      <Stars value={rating} />
                    ) : (
                      <span style={{ fontSize: 11, color: '#4b5563' }}>Sin rating</span>
                    )}
                  </div>

                  {/* Cover mini */}
                  <div className="flex-shrink-0 relative overflow-hidden rounded"
                    style={{ width: 28, height: 42, background: '#1c2028' }}>
                    <GameCoverImage
                      steamAppId={entry.games?.steam_app_id}
                      coverUrl={entry.games?.cover_url}
                      name={entry.games?.name ?? ''}
                      className="object-cover"
                    />
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <Link href={gameHref}
                      className="font-bold text-white transition-colors hover:text-orange-400 line-clamp-1"
                      style={{ fontSize: 14 }}>
                      {entry.games?.name ?? 'Juego desconocido'}
                    </Link>
                    {entry.status && (
                      <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        {STATUS_LABELS[entry.status] ?? entry.status}
                      </p>
                    )}
                  </div>

                  {/* Review text snippet */}
                  {entry.ratings?.[0]?.review_text && (
                    <p className="hidden md:block flex-shrink-0 max-w-[200px] line-clamp-2"
                      style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                      &ldquo;{entry.ratings[0].review_text}&rdquo;
                    </p>
                  )}

                  {/* Edit icon */}
                  <Link href={gameHref}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ padding: 8, borderRadius: 8, border: '1px solid #2c3440', color: '#6b7280' }}
                    title="Ver juego">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center" style={{ marginTop: 24, fontSize: 12, color: '#4b5563' }}>
            {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'} en {MONTHS[month]} {year}
          </p>
        </>
      )}
    </div>
  );
}
