'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { rawgImg } from '@/lib/rawg';
import NotificationBell from '@/components/notifications/NotificationBell';

const RAWG_KEY = 'c21c574004494d23aea3749834c91632';

interface SearchResult {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  metacritic: number | null;
  genres: Array<{ name: string }>;
}

const NAV_LINKS = [
  { href: '/search',  label: 'Juegos'     },
  { href: '/journal', label: 'Journal'    },
  { href: '/lists',   label: 'Listas'     },
  { href: '/library', label: 'Biblioteca' },
];

/* ── Logo ───────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 flex-shrink-0">
      {/* Play triangle — el ▶ universal del gaming */}
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1.2L13 9L1 16.8V1.2Z" fill="#e85d04" stroke="#e85d04" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.01em', color: '#ffffff', lineHeight: 1 }}>
        play<span style={{ color: '#e85d04' }}>log</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const [userOpen,    setUserOpen]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null);

  const dropRef       = useRef<HTMLDivElement>(null);
  const searchRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounce      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGamePage = /^\/game\//.test(pathname);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setMobileSearch(false); }, [pathname]);

  useEffect(() => {
    if (!isGamePage) { setScrolled(false); return; }
    function onScroll() { setScrolled(window.scrollY > 60); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isGamePage]);

  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('users').select('avatar_url').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
    });
  }, [user]);

  const username = user?.email?.split('@')[0] ?? '';
  const initial  = username[0]?.toUpperCase() ?? '?';

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) closeSearch();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);
  useEffect(() => { if (mobileSearch) mobileInputRef.current?.focus(); }, [mobileSearch]);

  const fetchResults = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=6&search_precise=true`);
        const json = await res.json();
        setResults(json.results ?? []);
      } catch { setResults([]); }
      finally  { setSearching(false); }
    }, 300);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    fetchResults(q);
  }

  function closeSearch() { setSearchOpen(false); setSearchQuery(''); setResults([]); }

  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
      setMobileSearch(false);
      setMobileOpen(false);
    }
    if (e.key === 'Escape') { closeSearch(); setMobileSearch(false); }
  }

  function goToGame(id: number) {
    router.push(`/game/${id}`);
    closeSearch();
    setMobileOpen(false);
    setMobileSearch(false);
  }

  async function handleSignOut() { await signOut(); setUserOpen(false); router.push('/'); }

  const transparent  = isGamePage && !scrolled;
  const showDropdown = searchOpen && searchQuery.trim().length > 0;
  const navBg        = transparent ? 'transparent' : 'rgba(20,24,28,0.97)';
  const navBorder    = transparent ? 'transparent' : 'rgba(44,52,64,0.8)';
  const linkColor    = transparent ? 'rgba(255,255,255,0.75)' : '#9ca3af';

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: navBg,
        borderBottom: `1px solid ${navBorder}`,
        backdropFilter: transparent ? 'none' : 'blur(14px)',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
    >
      {/* ── Barra principal ─────────────────────────────────────────── */}
      <div
        className="flex items-center"
        style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', height: 56 }}
      >

        <Logo />

        {/* Links desktop */}
        <div className="hidden md:flex items-center flex-1 justify-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="group relative transition-colors hover:text-white"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#ffffff' : linkColor,
                  borderRadius: 6,
                }}
              >
                {label}
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full origin-left transition-all duration-200 group-hover:opacity-100 group-hover:scale-x-100"
                  style={{
                    background: '#e85d04',
                    opacity: active ? 1 : 0,
                    transform: active ? 'scaleX(1)' : 'scaleX(0)',
                  }}
                />
              </Link>
            );
          })}
        </div>

        {/* Derecha desktop */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0" style={{ marginLeft: 'auto' }}>
          {/* Búsqueda desktop */}
          <div ref={searchRef} className="relative flex items-center">
            {searchOpen ? (
              <div className="flex items-center gap-2" style={{ background: '#1c2028', border: '1px solid rgba(232,93,4,0.4)', borderRadius: 8, padding: '7px 12px' }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleChange}
                  onKeyDown={handleSearchKey}
                  placeholder="Buscar juego..."
                  className="bg-transparent text-white placeholder-gray-600 outline-none"
                  style={{ width: 200, fontSize: 13 }}
                />
                {searching && <div className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border border-gray-600 border-t-orange-500" />}
              </div>
            ) : (
              <button
                onClick={() => { setSearchOpen(true); setUserOpen(false); }}
                className="transition-colors hover:text-white flex items-center justify-center"
                style={{ width: 40, height: 40, color: linkColor, borderRadius: 8 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {showDropdown && (
              <div className="absolute right-0 top-full overflow-hidden" style={{ marginTop: 6, width: 320, background: '#1c2028', border: '1px solid #2c3440', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 60 }}>
                {results.length === 0 && !searching ? (
                  <p style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>Sin resultados</p>
                ) : (
                  <>
                    {results.map(r => {
                      const img  = rawgImg(r.background_image);
                      const year = r.released ? new Date(r.released).getFullYear() : null;
                      return (
                        <button key={r.id} onClick={() => goToGame(r.id)} className="flex w-full items-center gap-3 text-left transition-colors hover:bg-white/5" style={{ padding: '10px 12px' }}>
                          <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 28, height: 40, borderRadius: 4, background: '#303840' }}>
                            {img && <Image src={img} alt={r.name} fill unoptimized className="object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-white" style={{ fontSize: 13 }}>{r.name}</p>
                            <p style={{ fontSize: 11, color: '#6b7280' }}>{r.genres?.[0]?.name ?? ''}{year ? ` · ${year}` : ''}</p>
                          </div>
                          {r.metacritic && (
                            <span className="flex-shrink-0 font-bold" style={{ background: r.metacritic >= 80 ? '#1a4731' : r.metacritic >= 60 ? '#3d3008' : '#3d0a0a', color: r.metacritic >= 80 ? '#4ade80' : r.metacritic >= 60 ? '#fbbf24' : '#f87171', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                              {r.metacritic}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button onClick={() => { router.push(`/search?q=${encodeURIComponent(searchQuery)}`); closeSearch(); }} className="flex w-full items-center justify-center transition-colors hover:bg-white/5" style={{ borderTop: '1px solid #2c3440', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#e85d04' }}>
                      Ver todos los resultados →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {user && <NotificationBell />}

          {user ? (
            <>
              <div className="relative" ref={dropRef}>
                <button onClick={() => setUserOpen(v => !v)} className="flex items-center gap-2 transition-colors hover:bg-white/5" style={{ padding: '5px 8px', borderRadius: 8 }}>
                  <div className="flex-shrink-0 overflow-hidden" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #2c3440', background: 'rgba(232,93,4,0.2)' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center font-black" style={{ fontSize: 12, color: '#e85d04' }}>{initial}</div>
                    }
                  </div>
                  <span className="hidden sm:block font-semibold uppercase tracking-wide" style={{ fontSize: 12, color: linkColor }}>{username}</span>
                  <svg className={`h-3 w-3 transition-transform ${userOpen ? 'rotate-180' : ''}`} style={{ color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userOpen && (
                  <div className="absolute right-0 top-full overflow-hidden" style={{ marginTop: 6, width: 180, background: '#1c2028', border: '1px solid #2c3440', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 60 }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #2c3440' }}>
                      <p className="truncate" style={{ fontSize: 11, color: '#6b7280' }}>{user.email}</p>
                    </div>
                    {[
                      { href: '/profile', label: 'Mi perfil'     },
                      { href: '/library', label: 'Biblioteca'    },
                      { href: '/steam',   label: 'Importar Steam' },
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} onClick={() => setUserOpen(false)} className="flex w-full items-center transition-colors hover:bg-white/5 hover:text-white" style={{ padding: '10px 16px', fontSize: 13, color: '#d1d5db' }}>
                        {label}
                      </Link>
                    ))}
                    <div style={{ borderTop: '1px solid #2c3440' }} />
                    <button onClick={handleSignOut} className="flex w-full items-center transition-colors hover:bg-white/5 hover:text-white" style={{ padding: '10px 16px', fontSize: 13, color: '#9ca3af' }}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>

              <Link href="/search" className="hidden sm:flex items-center font-bold text-white transition-opacity hover:opacity-90" style={{ background: '#e85d04', borderRadius: 8, padding: '7px 16px', fontSize: 12, marginLeft: 4 }}>
                + Log
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="font-medium transition-colors hover:text-white" style={{ fontSize: 13, color: linkColor }}>Entrar</Link>
              <Link href="/login" className="font-bold text-white transition-opacity hover:opacity-90" style={{ background: '#e85d04', borderRadius: 8, padding: '7px 16px', fontSize: 12 }}>
                Crear cuenta
              </Link>
            </div>
          )}
        </div>

        {/* ── Mobile: derecha de la barra ────────────────────────────── */}
        <div className="flex md:hidden items-center gap-1 ml-auto">
          {/* Búsqueda mobile */}
          <button
            onClick={() => { setMobileSearch(v => !v); setMobileOpen(false); }}
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, color: linkColor, borderRadius: 8 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {user && <NotificationBell />}

          {/* Avatar mobile */}
          {user && (
            <Link href="/profile" className="flex-shrink-0 overflow-hidden" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #2c3440', background: 'rgba(232,93,4,0.2)' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center font-black" style={{ fontSize: 12, color: '#e85d04' }}>{initial}</div>
              }
            </Link>
          )}

          {/* Hamburguesa */}
          <button
            onClick={() => { setMobileOpen(v => !v); setMobileSearch(false); }}
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, color: linkColor, borderRadius: 8 }}
            aria-label="Menú"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile search bar ───────────────────────────────────────── */}
      {mobileSearch && (
        <div className="md:hidden" style={{ background: 'rgba(20,24,28,0.98)', borderTop: '1px solid #2c3440' }}>
          <div style={{ padding: '10px 16px' }}>
            <div className="flex items-center gap-3" style={{ background: '#1c2028', border: '1px solid rgba(232,93,4,0.35)', borderRadius: 10, padding: '10px 14px' }}>
              <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={handleChange}
                onKeyDown={handleSearchKey}
                placeholder="Buscar juego..."
                className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none"
                style={{ fontSize: 15 }}
              />
              {searching && <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border border-gray-600 border-t-orange-500" />}
            </div>
            {/* Resultados mobile */}
            {searchQuery.trim() && results.length > 0 && (
              <div className="mt-2 overflow-hidden" style={{ background: '#1c2028', border: '1px solid #2c3440', borderRadius: 10 }}>
                {results.slice(0, 5).map(r => {
                  const img  = rawgImg(r.background_image);
                  const year = r.released ? new Date(r.released).getFullYear() : null;
                  return (
                    <button key={r.id} onClick={() => goToGame(r.id)} className="flex w-full items-center gap-3 text-left transition-colors hover:bg-white/5" style={{ padding: '12px 14px', minHeight: 56 }}>
                      <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 30, height: 44, borderRadius: 4, background: '#303840' }}>
                        {img && <Image src={img} alt={r.name} fill unoptimized className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white" style={{ fontSize: 14 }}>{r.name}</p>
                        <p style={{ fontSize: 12, color: '#6b7280' }}>{r.genres?.[0]?.name ?? ''}{year ? ` · ${year}` : ''}</p>
                      </div>
                    </button>
                  );
                })}
                <button onClick={() => { router.push(`/search?q=${encodeURIComponent(searchQuery)}`); setMobileSearch(false); setSearchQuery(''); setResults([]); }} className="flex w-full items-center justify-center" style={{ borderTop: '1px solid #2c3440', padding: '12px', fontSize: 13, fontWeight: 600, color: '#e85d04' }}>
                  Ver todos los resultados →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden" style={{ background: 'rgba(20,24,28,0.98)', borderTop: '1px solid #2c3440', backdropFilter: 'blur(14px)' }}>
          <div style={{ padding: '4px 0 20px' }}>
            {/* Nav links */}
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center"
                  style={{
                    minHeight: 52,
                    padding: '0 20px',
                    fontSize: 16,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#ffffff' : '#9ca3af',
                    borderLeft: active ? '3px solid #e85d04' : '3px solid transparent',
                  }}
                >
                  {label}
                </Link>
              );
            })}

            <div style={{ borderTop: '1px solid #2c3440', margin: '8px 0' }} />

            {user ? (
              <>
                <Link href="/search" onClick={() => setMobileOpen(false)} className="flex items-center justify-center font-bold text-white" style={{ minHeight: 48, margin: '4px 20px', background: '#e85d04', borderRadius: 10, fontSize: 15 }}>
                  + Log un juego
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3" style={{ minHeight: 52, padding: '0 20px', fontSize: 15, color: '#d1d5db' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-border flex-shrink-0" />
                    : <div className="h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border border-border flex-shrink-0" style={{ background: 'rgba(232,93,4,0.2)', color: '#e85d04' }}>{initial}</div>
                  }
                  <span>Mi perfil</span>
                </Link>
                <Link href="/steam" onClick={() => setMobileOpen(false)} className="flex items-center" style={{ minHeight: 52, padding: '0 20px', fontSize: 15, color: '#d1d5db' }}>
                  Importar Steam
                </Link>
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="flex w-full items-center" style={{ minHeight: 52, padding: '0 20px', fontSize: 15, color: '#6b7280' }}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div style={{ padding: '8px 20px' }} className="flex gap-3">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 flex items-center justify-center font-semibold" style={{ minHeight: 50, border: '1px solid #2c3440', borderRadius: 10, fontSize: 15, color: '#9ca3af' }}>
                  Entrar
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 flex items-center justify-center font-bold text-white" style={{ minHeight: 50, background: '#e85d04', borderRadius: 10, fontSize: 15 }}>
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
