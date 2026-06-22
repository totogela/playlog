'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { rawgImg } from '@/lib/rawg';

const RAWG_KEY = 'c21c574004494d23aea3749834c91632';

interface RawgGame {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  metacritic: number | null;
  genres: Array<{ name: string }>;
}

interface AddedGame extends RawgGame {
  status: 'completed' | 'playing' | 'wishlist';
}

const STEPS = ['Bienvenida', 'Tus juegos', 'Listo'];

const STATUS_OPTIONS: { value: AddedGame['status']; label: string; color: string }[] = [
  { value: 'completed', label: 'Terminado',    color: '#4ade80' },
  { value: 'playing',   label: 'Jugando',      color: '#e85d04' },
  { value: 'wishlist',  label: 'Lo quiero',    color: '#60a5fa' },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const [step,    setStep]    = useState(0);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<RawgGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [added,   setAdded]   = useState<AddedGame[]>([]);
  const [saving,  setSaving]  = useState(false);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('username').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.username) setUsername(data.username); });
  }, [user]);

  const search = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=8&search_precise=true`
        );
        const json = await res.json();
        setResults((json.results ?? []).filter((g: RawgGame) => g.background_image));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, []);

  function addGame(game: RawgGame) {
    if (added.find(g => g.id === game.id)) return;
    setAdded(prev => [...prev, { ...game, status: 'completed' }]);
    setQuery('');
    setResults([]);
  }

  function removeGame(id: number) {
    setAdded(prev => prev.filter(g => g.id !== id));
  }

  function changeStatus(id: number, status: AddedGame['status']) {
    setAdded(prev => prev.map(g => g.id === id ? { ...g, status } : g));
  }

  async function finish() {
    if (!user) { router.push('/'); return; }
    setSaving(true);
    for (const game of added) {
      // Upsert game record
      const { data: gameRow } = await supabase
        .from('games')
        .upsert({
          rawg_id:      game.id,
          name:         game.name,
          cover_url:    game.background_image,
          release_date: game.released,
        }, { onConflict: 'rawg_id' })
        .select('id')
        .single();

      if (gameRow) {
        await supabase
          .from('user_games')
          .upsert({
            user_id: user.id,
            game_id: gameRow.id,
            status:  game.status,
          }, { onConflict: 'user_id,game_id' });
      }
    }
    setSaving(false);
    setStep(2);
  }

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-all"
                style={{
                  background: i <= step ? '#e85d04' : '#1c2028',
                  border: `1px solid ${i <= step ? '#e85d04' : '#2c3440'}`,
                  color: i <= step ? '#fff' : '#6b7280',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-px w-8" style={{ background: i < step ? '#e85d04' : '#2c3440' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 0: Bienvenida ── */}
        {step === 0 && (
          <div className="text-center space-y-5">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center text-white font-black text-2xl"
              style={{ background: '#e85d04', borderRadius: 16 }}
            >
              P
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">
                Bienvenido{username ? `, ${username}` : ''}
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
                Playlog es tu lugar para registrar, calificar y descubrir videojuegos.
                <br />En 2 minutos tenés tu perfil listo.
              </p>
            </div>
            <div
              className="rounded-xl p-5 text-left space-y-3"
              style={{ background: '#1c2028', border: '1px solid #2c3440' }}
            >
              {[
                ['📝', 'Registrá los juegos que jugaste'],
                ['⭐', 'Calificá y escribí reseñas'],
                ['👥', 'Seguí a otros jugadores'],
                ['🎮', 'Descubrí tu próximo juego'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm" style={{ color: '#d1d5db' }}>{text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: '#e85d04', borderRadius: 8, padding: '12px 0', fontSize: 15 }}
            >
              Empezar →
            </button>
            <button
              onClick={() => router.push('/')}
              className="block w-full text-sm transition-colors hover:text-white"
              style={{ color: '#6b7280' }}
            >
              Saltar por ahora
            </button>
          </div>
        )}

        {/* ── Step 1: Agregar juegos ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white">¿Qué jugaste?</h2>
              <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
                Agregá algunos juegos para que tu perfil no esté vacío.
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); search(e.target.value); }}
                placeholder="Buscar un juego..."
                className="w-full text-sm text-white placeholder-gray-600 outline-none"
                style={{
                  background: '#1c2028', border: '1px solid #2c3440',
                  borderRadius: 10, padding: '11px 14px',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(232,93,4,0.5)')}
                onBlur={e => (e.target.style.borderColor = '#2c3440')}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border border-border border-t-accent" />
              )}

              {/* Dropdown */}
              {results.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 overflow-hidden z-20"
                  style={{ marginTop: 6, background: '#1c2028', border: '1px solid #2c3440', borderRadius: 10, boxShadow: '0 16px 32px rgba(0,0,0,0.5)' }}
                >
                  {results.map(g => {
                    const img  = rawgImg(g.background_image);
                    const year = g.released ? new Date(g.released).getFullYear() : null;
                    const already = added.find(a => a.id === g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => !already && addGame(g)}
                        disabled={!!already}
                        className="flex w-full items-center gap-3 text-left transition-colors hover:bg-white/5 disabled:opacity-40"
                        style={{ padding: '10px 12px' }}
                      >
                        <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 28, height: 40, borderRadius: 4, background: '#14181c' }}>
                          {img && <Image src={img} alt={g.name} fill unoptimized className="object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-white text-sm">{g.name}</p>
                          <p className="text-[11px]" style={{ color: '#6b7280' }}>
                            {g.genres?.[0]?.name ?? ''}{year ? ` · ${year}` : ''}
                          </p>
                        </div>
                        {already ? (
                          <span className="text-[10px] font-bold" style={{ color: '#4ade80' }}>✓</span>
                        ) : (
                          <span className="text-[10px] font-bold" style={{ color: '#e85d04' }}>+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Added games */}
            {added.length > 0 && (
              <div className="space-y-2">
                {added.map(g => {
                  const img = rawgImg(g.background_image);
                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-3"
                      style={{ background: '#1c2028', border: '1px solid #2c3440', borderRadius: 10, padding: '10px 12px' }}
                    >
                      <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 28, height: 40, borderRadius: 4, background: '#14181c' }}>
                        {img && <Image src={img} alt={g.name} fill unoptimized className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-white text-sm">{g.name}</p>
                        {/* Status picker */}
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => changeStatus(g.id, opt.value)}
                              className="text-[10px] font-bold rounded-full transition-all"
                              style={{
                                padding: '2px 8px',
                                background: g.status === opt.value ? opt.color + '22' : 'transparent',
                                border: `1px solid ${g.status === opt.value ? opt.color : '#2c3440'}`,
                                color: g.status === opt.value ? opt.color : '#6b7280',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => removeGame(g.id)}
                        className="flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {added.length === 0 && (
              <div className="text-center py-6" style={{ color: '#4b5563', fontSize: 13 }}>
                Buscá un juego arriba para agregarlo a tu biblioteca.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => router.push('/')}
                className="flex-1 font-semibold transition-colors hover:text-white"
                style={{ border: '1px solid #2c3440', borderRadius: 8, padding: '11px 0', fontSize: 13, color: '#9ca3af' }}
              >
                Saltar
              </button>
              <button
                onClick={finish}
                disabled={saving}
                className="flex-1 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#e85d04', borderRadius: 8, padding: '11px 0', fontSize: 13 }}
              >
                {saving ? 'Guardando...' : added.length > 0 ? `Guardar ${added.length} juego${added.length !== 1 ? 's' : ''}` : 'Continuar →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Listo ── */}
        {step === 2 && (
          <div className="text-center space-y-5">
            <div className="text-5xl">🎮</div>
            <div>
              <h2 className="text-2xl font-black text-white">¡Todo listo!</h2>
              <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
                Tu perfil está configurado.
                {added.length > 0 && ` Guardamos ${added.length} juego${added.length !== 1 ? 's' : ''} en tu biblioteca.`}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/profile')}
                className="font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: '#e85d04', borderRadius: 8, padding: '11px 24px', fontSize: 14 }}
              >
                Ver mi perfil
              </button>
              <button
                onClick={() => router.push('/')}
                className="font-semibold transition-colors hover:text-white"
                style={{ border: '1px solid #2c3440', borderRadius: 8, padding: '11px 24px', fontSize: 14, color: '#9ca3af' }}
              >
                Ir al inicio
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
