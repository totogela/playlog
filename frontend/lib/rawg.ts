import { expandQuery } from './search-aliases';

const BASE = 'https://api.rawg.io/api';
const KEY  = process.env.NEXT_PUBLIC_RAWG_API_KEY ?? '';

// RAWG sirve imágenes con /resize/420/-/ que son de baja calidad.
// Removiendo ese segmento se obtiene la imagen original en alta resolución.
export function rawgImg(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/resize\/\d+\/-\//, '/');
}

// Cover portrait de Steam (600×900). Retorna null si no hay steam_app_id válido.
export function steamCover(steamAppId: number | null | undefined): string | null {
  if (!steamAppId) return null;
  return `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`;
}

export interface RawgGame {
  id: number;
  name: string;
  slug: string;
  background_image: string | null;
  released: string | null;
  metacritic: number | null;
  rating: number;
  ratings_count: number;
  added: number;
  playtime: number;
  description_raw?: string;
  genres: Array<{ id: number; name: string; slug: string }>;
  platforms: Array<{ platform: { id: number; name: string } }> | null;
  short_screenshots: Array<{ id: number; image: string }>;
  stores?: Array<{ store: { id: number; name: string; slug: string }; url: string }>;
  developers?: Array<{ id: number; name: string; slug: string }>;
  publishers?: Array<{ id: number; name: string; slug: string }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
}

export interface RawgSearchResult {
  count: number;
  results: RawgGame[];
}

export async function searchGames(query: string, page = 1): Promise<RawgSearchResult> {
  const q       = expandQuery(query);
  const precise = q.toLowerCase() !== query.trim().toLowerCase();
  const url = `${BASE}/games?key=${KEY}&search=${encodeURIComponent(q)}&page=${page}&page_size=40&search_precise=true`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('RAWG search failed');
  const data: RawgSearchResult = await res.json();

  const withCover = data.results.filter(g => g.background_image !== null || g.metacritic !== null);

  if (precise) {
    const qLower  = q.toLowerCase();
    const exact   = withCover.filter(g => g.name.toLowerCase() === qLower);
    const popular = withCover
      .filter(g => g.name.toLowerCase() !== qLower && (g.added ?? 0) >= 30000)
      .sort((a, b) => (b.added ?? 0) - (a.added ?? 0));
    return { count: data.count, results: [...exact, ...popular].slice(0, 20) };
  }

  const sorted = withCover.sort((a, b) => (b.added ?? 0) - (a.added ?? 0));
  return { count: data.count, results: sorted.slice(0, 20) };
}

export interface SearchFilters {
  genre?: string;
  decade?: string; // e.g. "2020", "2010", "2000", "1990"
  ordering?: string; // "-metacritic" | "-added" | "-released" | "-rating"
  platform?: string; // parent platform id: "1"=PC, "2"=PlayStation, "3"=Xbox, "7"=Nintendo, "4"=Mobile
}

export async function searchGamesFiltered(
  query: string,
  page = 1,
  filters: SearchFilters = {}
): Promise<RawgSearchResult> {
  const params = new URLSearchParams({
    key:       KEY,
    page:      String(page),
    page_size: '24',
  });

  if (query.trim()) {
    params.set('search', expandQuery(query));
    params.set('search_precise', 'true');
  }
  if (filters.genre)    params.set('genres', filters.genre.toLowerCase());
  if (filters.platform) params.set('parent_platforms', filters.platform);
  if (filters.decade) {
    const start = `${filters.decade}-01-01`;
    const end   = `${Number(filters.decade) + 9}-12-31`;
    params.set('dates', `${start},${end}`);
  }
  // Default ordering: by relevance when searching, by added when browsing
  const ordering = filters.ordering ?? (query.trim() ? undefined : '-added');
  if (ordering) params.set('ordering', ordering);

  const url = `${BASE}/games?${params}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('RAWG search failed');
  const data: RawgSearchResult = await res.json();
  return { count: data.count, results: data.results.filter(g => g.background_image) };
}

// Para autocomplete: trae más resultados y ordena por `added` (métrica real de popularidad en RAWG)
export async function autocompleteGames(query: string): Promise<RawgGame[]> {
  const q       = expandQuery(query);
  const precise = q !== query.trim().toLowerCase(); // si hubo expansión de alias, usar precise
  const url = `${BASE}/games?key=${KEY}&search=${encodeURIComponent(q)}&page_size=40${precise ? '&search_precise=true' : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const data: RawgSearchResult = await res.json();

  const withCover = data.results.filter(g => g.background_image !== null);

  if (precise) {
    // Alias expandido: match exacto primero, luego solo juegos populares (added > 50k)
    const qLower  = q.toLowerCase();
    const exact   = withCover.filter(g => g.name.toLowerCase() === qLower);
    const popular = withCover
      .filter(g => g.name.toLowerCase() !== qLower && (g.added ?? 0) >= 50000)
      .sort((a, b) => (b.added ?? 0) - (a.added ?? 0));
    return [...exact, ...popular].slice(0, 6);
  }

  return withCover.sort((a, b) => (b.added ?? 0) - (a.added ?? 0)).slice(0, 6);
}

export async function getGame(id: number): Promise<RawgGame & { description_raw: string }> {
  const res = await fetch(`${BASE}/games/${id}?key=${KEY}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error('RAWG game fetch failed');
  return res.json();
}

export async function getPopularGames(): Promise<RawgSearchResult> {
  const url = `${BASE}/games?key=${KEY}&ordering=-added&page_size=12&metacritic=80,100`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error('RAWG popular games failed');
  return res.json();
}

// Igual que getPopularGames pero enriquece con steamAppId para covers portrait reales
export async function getPopularGamesEnriched(): Promise<Array<RawgGame & { steamAppId?: number }>> {
  const url = `${BASE}/games?key=${KEY}&ordering=-added&page_size=8&metacritic=80,100`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error('RAWG popular games failed');
  const data: RawgSearchResult = await res.json();

  // Fetch solo los primeros 8 juegos en paralelo para Steam IDs (cached 24h)
  const enriched = await Promise.allSettled(
    data.results.slice(0, 8).map(async (game) => {
      try {
        const detail = await fetch(`${BASE}/games/${game.id}?key=${KEY}`, { next: { revalidate: 86400 } });
        if (!detail.ok) return { ...game, steamAppId: undefined };
        const d = await detail.json();
        const steamStore = (d.stores ?? []).find(
          (s: { store: { slug: string }; url: string }) => s.store?.slug === 'steam'
        );
        const match = steamStore?.url?.match(/\/app\/(\d+)/);
        return { ...game, steamAppId: match ? parseInt(match[1], 10) : undefined };
      } catch {
        return { ...game, steamAppId: undefined };
      }
    })
  );

  return enriched.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...data.results[i], steamAppId: undefined }
  );
}

export async function getTopRatedGames(): Promise<RawgSearchResult> {
  const url = `${BASE}/games?key=${KEY}&ordering=-metacritic&page_size=8&metacritic=90,100`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error('RAWG top rated failed');
  return res.json();
}

export async function getRecentGames(): Promise<RawgSearchResult> {
  const year = new Date().getFullYear();
  const url  = `${BASE}/games?key=${KEY}&ordering=-added&dates=${year - 1}-01-01,${year}-12-31&page_size=8&metacritic=70,100`;
  const res  = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) throw new Error('RAWG recent games failed');
  return res.json();
}

export async function getGamesByGenre(genre: string, size = 8): Promise<RawgSearchResult> {
  const url = `${BASE}/games?key=${KEY}&genres=${genre.toLowerCase()}&ordering=-added&page_size=${size}&metacritic=75,100`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error('RAWG genre games failed');
  return res.json();
}

// Joyas ocultas: bien valoradas pero menos conocidas
export async function getHiddenGems(): Promise<RawgSearchResult> {
  const url = `${BASE}/games?key=${KEY}&ordering=-rating&page_size=12&metacritic=80,90&ratings_count=500,5000`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error('RAWG hidden gems failed');
  return res.json();
}
