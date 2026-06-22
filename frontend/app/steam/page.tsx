'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';

interface SteamEntry {
  steamAppId: number;
  steamName: string;
  hoursPlayed: number;
  rawg: {
    id: number;
    name: string;
    background_image: string | null;
    released: string | null;
    metacritic: number | null;
    genres: Array<{ id: number; name: string }>;
  };
}

function smartStatus(hours: number): 'playing' | 'completed' {
  return hours >= 30 ? 'completed' : 'playing';
}

type ImportStatus = 'idle' | 'loading' | 'done' | 'error';

export default function SteamImportPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [steamId,   setSteamId]   = useState('');
  const [games,     setGames]     = useState<SteamEntry[]>([]);
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [inLibrary, setInLibrary] = useState<Set<number>>(new Set());
  const [status,    setStatus]    = useState<ImportStatus>('idle');
  const [error,     setError]     = useState('');
  const [importing, setImporting] = useState(false);
  const [imported,  setImported]  = useState(0);
  const [total,     setTotal]     = useState(0);

  async function fetchLibrary() {
    if (!user) { router.push('/login'); return; }
    setStatus('loading');
    setError('');
    setGames([]);

    try {
      const res  = await fetch(`/api/steam/library?steamId=${steamId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error desconocido'); setStatus('error'); return; }

      setGames(data.games);
      setTotal(data.total);

      const { data: ugData } = await supabase
        .from('user_games')
        .select('game_id, games!inner(rawg_id)')
        .eq('user_id', user!.id);
      const userRawgIds = new Set(
        (ugData ?? []).map((r: { games: { rawg_id: number } }) => r.games?.rawg_id).filter(Boolean)
      );
      setInLibrary(userRawgIds);
      setSelected(new Set(data.games
        .filter((g: SteamEntry) => !userRawgIds.has(g.rawg.id) && g.hoursPlayed > 0)
        .map((g: SteamEntry) => g.rawg.id)));
      setStatus('done');
    } catch {
      setError('No se pudo conectar con Steam. Asegurate de que tu perfil sea público.');
      setStatus('error');
    }
  }

  function toggleAll() {
    const eligible = games.filter(g => !inLibrary.has(g.rawg.id)).map(g => g.rawg.id);
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible));
  }

  function toggle(id: number) {
    if (inLibrary.has(id)) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function importSelected() {
    if (!user || selected.size === 0) return;
    setImporting(true);
    setImported(0);
    const toImport = games.filter(g => selected.has(g.rawg.id));
    let count = 0;
    for (const entry of toImport) {
      try {
        await supabase.from('games').upsert({
          steam_app_id: entry.steamAppId, rawg_id: entry.rawg.id,
          name: entry.rawg.name, cover_url: entry.rawg.background_image,
          genres: entry.rawg.genres.map(g => g.name), release_date: entry.rawg.released ?? null,
        }, { onConflict: 'steam_app_id' });
        const { data: gameRow } = await supabase.from('games').select('id').eq('steam_app_id', entry.steamAppId).single();
        if (!gameRow) continue;
        await supabase.from('user_games').upsert({
          user_id: user.id, game_id: gameRow.id,
          status: entry.hoursPlayed > 0 ? smartStatus(entry.hoursPlayed) : 'playing',
          hours_played: entry.hoursPlayed,
        }, { onConflict: 'user_id,game_id' });
        count++;
        setImported(count);
      } catch { /* skip */ }
    }
    setImporting(false);
    router.push('/library');
  }

  return (
    <div style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 700, margin: '0 auto' }}>

      {/* Header */}
      <div className="text-center" style={{ marginBottom: 40 }}>
        {/* Steam icon */}
        <div className="flex justify-center mb-5">
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 16, background: '#1c2028', border: '1px solid #2c3440' }}>
            <svg style={{ width: 36, height: 36, color: '#e85d04' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.455-.397.957-1.497 1.41-2.455 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.662 0 3.015-1.35 3.015-3.015zm-5.273.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
            </svg>
          </div>
        </div>
        <h1 className="font-black text-white" style={{ fontSize: 28, letterSpacing: -0.5 }}>Steam Integration</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>
          Importá tu biblioteca de Steam con horas jugadas y estado.
        </p>
      </div>

      {/* Connect form */}
      {status === 'idle' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={steamId}
              onChange={e => setSteamId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && steamId.trim() && fetchLibrary()}
              placeholder="Username, URL o Steam ID numérico"
              className="flex-1 text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: '#1c2028', border: '1px solid #2c3440', borderRadius: 10, padding: '11px 16px' }}
            />
            <button
              onClick={fetchLibrary}
              disabled={!steamId.trim()}
              className="font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
              style={{ background: '#e85d04', borderRadius: 10, padding: '11px 22px', fontSize: 14, flexShrink: 0 }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
              </svg>
              Conectar Steam
            </button>
          </div>

          {/* Info box */}
          <div style={{ background: '#1c2028', border: '1px solid #2c3440', borderRadius: 12, padding: '20px 24px' }}>
            <p className="font-semibold text-white" style={{ fontSize: 13, marginBottom: 12 }}>¿Cómo funciona?</p>
            <ul className="space-y-2" style={{ fontSize: 12, color: '#6b7280' }}>
              {[
                'Ingresá tu username de Steam, URL de perfil o Steam ID numérico',
                'Se importan los 150 juegos más jugados con sus horas reales',
                'Elegís cuáles importar antes de confirmar',
                'Juegos con ≥30h se marcan como terminados, el resto como jugando',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: '#e85d04', flexShrink: 0, marginTop: 1 }}>→</span>
                  {t}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 11, color: '#4b5563', marginTop: 14 }}>
              ⚠️ Tu perfil de Steam debe ser público.{' '}
              <Link href="https://steamcommunity.com/my/edit/settings" target="_blank" style={{ color: '#e85d04' }}>
                Configurar privacidad →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', padding: '14px 18px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
          ⚠️ {error}
          <button onClick={() => setStatus('idle')} style={{ marginLeft: 12, color: '#e85d04', fontWeight: 600 }}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div className="text-center" style={{ paddingTop: 48 }}>
          <div className="animate-spin mx-auto mb-4" style={{ width: 32, height: 32, border: '3px solid #2c3440', borderTopColor: '#e85d04', borderRadius: '50%' }} />
          <p style={{ color: '#6b7280', fontSize: 13 }}>Conectando con Steam y buscando juegos...</p>
        </div>
      )}

      {/* Results */}
      {status === 'done' && games.length > 0 && (
        <div className="space-y-4">

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white" style={{ fontSize: 15 }}>Imported Library</p>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {total} juegos en Steam · {games.length} encontrados en RAWG
                {inLibrary.size > 0 && <span style={{ color: '#4b5563' }}> · {inLibrary.size} ya importados</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleAll}
                style={{ border: '1px solid #2c3440', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#9ca3af', background: 'transparent' }}
                className="transition-colors hover:text-white">
                {selected.size === games.filter(g => !inLibrary.has(g.rawg.id)).length ? 'Deseleccionar' : 'Seleccionar todo'}
              </button>
              <button onClick={importSelected} disabled={selected.size === 0 || importing}
                className="font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: '#e85d04', borderRadius: 8, padding: '6px 16px', fontSize: 12 }}>
                {importing ? `${imported}/${selected.size}...` : `Importar ${selected.size}`}
              </button>
            </div>
          </div>

          {/* Game list */}
          <div style={{ border: '1px solid #2c3440', borderRadius: 12, overflow: 'hidden' }}>
            {games.map((entry, idx) => {
              const already = inLibrary.has(entry.rawg.id);
              const sel     = selected.has(entry.rawg.id);
              const autoSt  = smartStatus(entry.hoursPlayed);
              const lastPlayed = entry.hoursPlayed > 0
                ? `${entry.hoursPlayed}h jugadas`
                : 'Sin horas registradas';

              return (
                <button
                  key={entry.rawg.id}
                  onClick={() => toggle(entry.rawg.id)}
                  className="w-full text-left flex items-center gap-4 transition-colors hover:bg-white/[0.03]"
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < games.length - 1 ? '1px solid #1e2530' : 'none',
                    cursor: already ? 'default' : 'pointer',
                    background: sel && !already ? 'rgba(232,93,4,0.04)' : 'transparent',
                  }}>

                  {/* Cover */}
                  <div className="relative flex-shrink-0 overflow-hidden rounded" style={{ width: 32, height: 48, background: '#1c2028' }}>
                    <GameCoverImage steamAppId={entry.steamAppId} coverUrl={entry.rawg.background_image} name={entry.rawg.name} className="object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm line-clamp-1">{entry.rawg.name}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{lastPlayed}</p>
                  </div>

                  {/* Badge */}
                  {already ? (
                    <span className="flex-shrink-0 flex items-center gap-1.5 font-semibold"
                      style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 6, padding: '3px 10px' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      Importado
                    </span>
                  ) : sel ? (
                    <span className="flex-shrink-0 flex items-center gap-1.5 font-semibold"
                      style={{ fontSize: 11, color: '#e85d04', background: 'rgba(232,93,4,0.1)', border: '1px solid rgba(232,93,4,0.3)', borderRadius: 6, padding: '3px 10px' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                      </svg>
                      {autoSt === 'completed' ? 'Terminado' : 'Jugando'}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 font-semibold"
                      style={{ fontSize: 11, color: '#4b5563', border: '1px solid #2c3440', borderRadius: 6, padding: '3px 10px' }}>
                      Omitir
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sticky import button */}
          {selected.size > 0 && (
            <div className="sticky bottom-6 flex justify-center">
              <button onClick={importSelected} disabled={importing}
                className="font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shadow-xl"
                style={{ background: '#e85d04', borderRadius: 12, padding: '13px 32px', fontSize: 14, boxShadow: '0 8px 32px rgba(232,93,4,0.35)' }}>
                {importing
                  ? `Importando ${imported} de ${selected.size}...`
                  : `✓ Importar ${selected.size} juego${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}

      {status === 'done' && games.length === 0 && (
        <div className="text-center" style={{ paddingTop: 60 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>😕</p>
          <p style={{ color: '#6b7280', fontSize: 14 }}>No se encontraron juegos con match en RAWG.</p>
          <button onClick={() => setStatus('idle')} style={{ marginTop: 16, color: '#e85d04', fontSize: 13, fontWeight: 600 }}>
            Intentar con otro ID →
          </button>
        </div>
      )}
    </div>
  );
}
