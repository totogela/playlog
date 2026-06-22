'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { autocompleteGames, rawgImg, type RawgGame } from '@/lib/rawg';

interface Props {
  initialValue?: string;
  autoFocus?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchBar({ initialValue = '', autoFocus = false }: Props) {
  const [query,       setQuery]       = useState(initialValue);
  const [suggestions, setSuggestions] = useState<RawgGame[]>([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const userTyped  = useRef(false); // only show suggestions after user interaction
  const debounced  = useDebounce(query, 300);
  const router     = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Busca sugerencias cuando el usuario escribe (no en mount)
  useEffect(() => {
    if (!userTyped.current) return;
    if (debounced.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    autocompleteGames(debounced)
      .then(results => {
        setSuggestions(results);
        setOpen(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function handleSelect(game: RawgGame) {
    setOpen(false);
    setQuery(game.name);
    router.push(`/game/${game.id}`);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { userTyped.current = true; setQuery(e.target.value); }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Buscar un juego..."
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 pr-12 text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-accent"
        >
          {loading
            ? <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          }
        </button>
      </form>

      {/* Dropdown de sugerencias */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          {suggestions.map(game => (
            <button
              key={game.id}
              type="button"
              onClick={() => handleSelect(game)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-border"
            >
              {/* Miniatura */}
              <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-border">
                {game.background_image ? (
                  <Image
                    src={rawgImg(game.background_image)!}
                    alt={game.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600 text-xs">🎮</div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{game.name}</p>
                <p className="text-xs text-gray-500">
                  {game.genres.slice(0, 2).map(g => g.name).join(' · ')}
                  {game.released && ` · ${new Date(game.released).getFullYear()}`}
                </p>
              </div>

              {/* Metacritic */}
              {game.metacritic && (
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${
                  game.metacritic >= 75 ? 'bg-green-600' :
                  game.metacritic >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                }`}>
                  {game.metacritic}
                </span>
              )}
            </button>
          ))}

          {/* Ver todos */}
          <button
            type="button"
            onClick={handleSubmit as never}
            className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-xs text-gray-500 transition-colors hover:text-accent"
          >
            Ver todos los resultados para "{query}" →
          </button>
        </div>
      )}
    </div>
  );
}
