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
  { href: '/search',          label: 'Juegos'     },
  { href: '/journal',         label: 'Journal'    },
  { href: '/lists',           label: 'Listas'     },
  { href: '/library',         label: 'Biblioteca' },
];

export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [userOpen,    setUserOpen]    = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null);
  const dropRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGamePage = /^\/game\//.test(pathname);

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

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

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
    }
    if (e.key === 'Escape') closeSearch();
  }

  function goToGame(id: number) { router.push(`/game/${id}`); closeSearch(); }

  async function handleSignOut() { await signOut(); setUserOpen(false); router.push('/'); }

  const transparent   = isGamePage && !scrolled;
  const showDropdown  = searchOpen && searchQuery.trim().length > 0;
  const navBg         = transparent ? 'transparent' : 'rgba(20,24,28,0.97)';
  const navBorder     = transparent ? 'transparent' : 'rgba(44,52,64,0.8)';
  const linkColor     = transparent ? 'rgba(255,255,255,0.8)' : '#9ca3af';

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: navBg,
        borderBottom: `1px solid ${navBorder}`,
        backdropFilter: transparent ? 'none' : 'blur(12px)',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
    >
      <div
        className="flex items-center"
        style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 52 }}
      >

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0" style={{ marginRight: 32 }}>
          <span
            className="flex items-center justify-center text-white font-black text-sm"
            style={{ width: 28, height: 28, background: '#e85d04', borderRadius: 6 }}
          >
            P
          </span>
          <span className="font-black text-white tracking-wide" style={{ fontSize: 15 }}>LAYLOG</span>
        </Link>

        {/* Hamburguesa — solo mobile */}
        <button
          className="md:hidden flex items-center justify-center transition-colors hover:text-white"
          style={{ padding: 8, color: linkColor, borderRadius: 6 }}
          onClick={() => setMobileOpen(v => !v)}
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

        {/* Nav links centrados */}
        <div className="hidden md:flex items-center flex-1 justify-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-white"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? '#ffffff' : linkColor,
                  borderRadius: 6,
                  textShadow: transparent ? '0 1px 4px rgba(0,0,0,0.8)' : 'none',
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Derecha */}
        <div className="flex items-center gap-1 flex-shrink-0" style={{ marginLeft: 'auto' }}>

          {/* Búsqueda */}
          <div ref={searchRef} className="relative flex items-center">
            {searchOpen ? (
              <div
                className="flex items-center gap-2"
                style={{
                  background: '#1c2028', border: '1px solid rgba(232,93,4,0.4)',
                  borderRadius: 8, padding: '6px 12px',
                }}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="transition-colors hover:text-white"
                style={{ padding: 8, color: linkColor, borderRadius: 6 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {showDropdown && (
              <div
                className="absolute right-0 top-full overflow-hidden"
                style={{ marginTop: 6, width: 320, background: '#1c2028', border: '1px solid #2c3440', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 60 }}
              >
                {results.length === 0 && !searching ? (
                  <p style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>Sin resultados para &quot;{searchQuery}&quot;</p>
                ) : (
                  <>
                    {results.map(r => {
                      const img  = rawgImg(r.background_image);
                      const year = r.released ? new Date(r.released).getFullYear() : null;
                      return (
                        <button
                          key={r.id}
                          onClick={() => goToGame(r.id)}
                          className="flex w-full items-center gap-3 text-left transition-colors hover:bg-white/5"
                          style={{ padding: '10px 12px' }}
                        >
                          <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 28, height: 40, borderRadius: 4, background: '#303840' }}>
                            {img && <Image src={img} alt={r.name} fill unoptimized className="object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-white" style={{ fontSize: 13 }}>{r.name}</p>
                            <p style={{ fontSize: 11, color: '#6b7280' }}>{r.genres?.[0]?.name ?? ''}{year ? ` · ${year}` : ''}</p>
                          </div>
                          {r.metacritic && (
                            <span
                              className="flex-shrink-0 font-bold text-white"
                              style={{
                                background: r.metacritic >= 80 ? '#1a4731' : r.metacritic >= 60 ? '#3d3008' : '#3d0a0a',
                                color: r.metacritic >= 80 ? '#4ade80' : r.metacritic >= 60 ? '#fbbf24' : '#f87171',
                                padding: '2px 6px', borderRadius: 4, fontSize: 11,
                              }}
                            >
                              {r.metacritic}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { router.push(`/search?q=${encodeURIComponent(searchQuery)}`); closeSearch(); }}
                      className="flex w-full items-center justify-center transition-colors hover:bg-white/5"
                      style={{ borderTop: '1px solid #2c3440', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#e85d04' }}
                    >
                      Ver todos los resultados →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Notificaciones */}
          {user && <NotificationBell />}

          {user ? (
            <>
              {/* Avatar + dropdown */}
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className="flex items-center gap-2 transition-colors hover:bg-white/5"
                  style={{ padding: '5px 8px', borderRadius: 8 }}
                >
                  <div
                    className="flex-shrink-0 overflow-hidden"
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #2c3440', background: 'rgba(232,93,4,0.2)' }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-black" style={{ fontSize: 11, color: '#e85d04' }}>
                        {initial}
                      </div>
                    )}
                  </div>
                  <span className="hidden sm:block font-semibold uppercase tracking-wide" style={{ fontSize: 12, color: linkColor }}>
                    {username}
                  </span>
                  <svg className={`h-3 w-3 transition-transform ${userOpen ? 'rotate-180' : ''}`} style={{ color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userOpen && (
                  <div
                    className="absolute right-0 top-full overflow-hidden"
                    style={{ marginTop: 6, width: 176, background: '#1c2028', border: '1px solid #2c3440', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 60 }}
                  >
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #2c3440' }}>
                      <p className="truncate" style={{ fontSize: 11, color: '#6b7280' }}>{user.email}</p>
                    </div>
                    {[
                      { href: '/profile', label: 'Mi perfil' },
                      { href: '/library', label: 'Biblioteca' },
                      { href: '/steam',   label: 'Importar Steam' },
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} onClick={() => setUserOpen(false)}
                        className="flex w-full items-center transition-colors hover:bg-white/5 hover:text-white"
                        style={{ padding: '10px 16px', fontSize: 13, color: '#d1d5db' }}
                      >
                        {label}
                      </Link>
                    ))}
                    <div style={{ borderTop: '1px solid #2c3440' }} />
                    <button onClick={handleSignOut}
                      className="flex w-full items-center transition-colors hover:bg-white/5 hover:text-white"
                      style={{ padding: '10px 16px', fontSize: 13, color: '#9ca3af' }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>

              {/* + Log */}
              <Link
                href="/search"
                className="hidden sm:flex items-center font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: '#e85d04', borderRadius: 8, padding: '7px 16px', fontSize: 12, marginLeft: 4 }}
              >
                + Log
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="font-medium transition-colors hover:text-white" style={{ fontSize: 13, color: linkColor }}>
                Entrar
              </Link>
              <Link
                href="/login"
                className="font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: '#e85d04', borderRadius: 8, padding: '7px 16px', fontSize: 12 }}
              >
                + Log
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{ backgroundColor: 'rgba(20,24,28,0.98)', borderColor: 'rgba(44,52,64,0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div style={{ padding: '8px 0 16px' }}>
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center transition-colors hover:text-white hover:bg-white/5"
                  style={{
                    padding: '12px 24px',
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#ffffff' : '#9ca3af',
                  }}
                >
                  {label}
                </Link>
              );
            })}
            <div style={{ borderTop: '1px solid #2c3440', margin: '8px 0' }} />
            {user ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 transition-colors hover:bg-white/5"
                  style={{ padding: '12px 24px', fontSize: 15, color: '#d1d5db' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover border border-border" />
                    : <div className="h-7 w-7 rounded-full flex items-center justify-center font-black text-xs border border-border" style={{ background: 'rgba(232,93,4,0.2)', color: '#e85d04' }}>{initial}</div>
                  }
                  Mi perfil
                </Link>
                <Link href="/steam" onClick={() => setMobileOpen(false)}
                  className="flex items-center transition-colors hover:bg-white/5"
                  style={{ padding: '12px 24px', fontSize: 15, color: '#d1d5db' }}>
                  Importar Steam
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="flex w-full items-center transition-colors hover:bg-white/5"
                  style={{ padding: '12px 24px', fontSize: 15, color: '#9ca3af' }}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div style={{ padding: '8px 24px' }} className="flex gap-2">
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center font-semibold transition-colors hover:text-white"
                  style={{ border: '1px solid #2c3440', borderRadius: 8, padding: '10px 0', fontSize: 14, color: '#9ca3af' }}>
                  Entrar
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#e85d04', borderRadius: 8, padding: '10px 0', fontSize: 14 }}>
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
