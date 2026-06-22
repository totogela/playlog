import { NextRequest, NextResponse } from 'next/server';

const STEAM_KEY = process.env.STEAM_API_KEY!;
const RAWG_KEY  = process.env.NEXT_PUBLIC_RAWG_API_KEY!;

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // minutos
  img_icon_url: string;
}

interface RawgMatch {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  metacritic: number | null;
  genres: Array<{ id: number; name: string }>;
}

function clean(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

// Retorna 0-1: porcentaje de palabras de `a` que están en `b`
function wordOverlap(a: string, b: string): number {
  const wa = clean(a).split(/\s+/).filter(w => w.length > 1);
  const wb = new Set(clean(b).split(/\s+/).filter(w => w.length > 1));
  if (wa.length === 0) return 0;
  const matches = wa.filter(w => wb.has(w)).length;
  return matches / wa.length;
}

function nameSimilar(steamName: string, rawgName: string): boolean {
  const ca = clean(steamName), cb = clean(rawgName);
  if (ca === cb) return true;
  // Solo substring si el término es suficientemente largo (≥6 chars)
  if (ca.length >= 6 && cb === ca) return true;
  // Requerir ≥70% de palabras en común
  const overlap = wordOverlap(steamName, rawgName);
  return overlap >= 0.7;
}

async function matchRawg(_steamAppId: number, name: string): Promise<RawgMatch | null> {
  // Solo búsqueda por nombre — el endpoint store_game_id de RAWG usa IDs internos de RAWG,
  // no Steam appids, lo que genera falsos positivos (ej: Steam 400=Portal → RAWG 400=Kitty Powers)
  try {
    const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(name)}&search_precise=true&page_size=10`;
    const res  = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const nameLower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Solo aceptar resultados con cover image y nombre similar
    const withCover = data.results?.filter((g: RawgMatch) => g.background_image) ?? [];
    const exact   = withCover.find((g: RawgMatch) => g.name.toLowerCase().replace(/[^a-z0-9]/g, '') === nameLower);
    const partial = withCover.find((g: RawgMatch) => nameSimilar(g.name, name));
    return exact ?? partial ?? null;
  } catch {
    return null;
  }
}

// Resuelve username, URL de perfil o Steam ID numérico a un Steam ID de 64 bits
async function resolveSteamId(input: string): Promise<string | null> {
  const trimmed = input.trim();

  // Ya es un ID numérico de 17 dígitos
  if (/^\d{17}$/.test(trimmed)) return trimmed;

  // Extraer vanity name de URL: steamcommunity.com/id/username o /profiles/id
  let vanity = trimmed;
  const profileMatch = trimmed.match(/\/profiles\/(\d{17})/);
  if (profileMatch) return profileMatch[1];
  const idMatch = trimmed.match(/\/id\/([^/]+)/);
  if (idMatch) vanity = idMatch[1];

  // Resolver vanity URL via Steam API
  try {
    const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_KEY}&vanityurl=${encodeURIComponent(vanity)}`;
    const res  = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    if (data?.response?.success === 1) return data.response.steamid;
  } catch { /* fall through */ }

  return null;
}

export async function GET(req: NextRequest) {
  const rawInput = req.nextUrl.searchParams.get('steamId');
  if (!rawInput) return NextResponse.json({ error: 'steamId required' }, { status: 400 });

  const steamId = await resolveSteamId(rawInput);
  if (!steamId) return NextResponse.json({ error: 'No se encontró ese perfil de Steam. Verificá el username o URL.' }, { status: 404 });

  // Fetch biblioteca Steam
  const steamUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;
  let steamGames: SteamGame[] = [];

  try {
    const res  = await fetch(steamUrl, { next: { revalidate: 300 } });
    const data = await res.json();
    steamGames = data?.response?.games ?? [];
  } catch {
    return NextResponse.json({ error: 'Error al conectar con Steam. Asegurate de que tu perfil sea público.' }, { status: 502 });
  }

  if (steamGames.length === 0) {
    return NextResponse.json({ error: 'No se encontraron juegos. Verificá que tu biblioteca de Steam sea pública.' }, { status: 404 });
  }

  // Ordenar por tiempo jugado, tomar top 150
  const sorted = steamGames
    .filter(g => g.name)
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 150);

  // Matchear en paralelo con límite de concurrencia
  const BATCH = 10;
  const results: Array<{
    steamAppId: number;
    steamName: string;
    hoursPlayed: number;
    rawg: RawgMatch | null;
  }> = [];

  for (let i = 0; i < sorted.length; i += BATCH) {
    const batch = sorted.slice(i, i + BATCH);
    const matched = await Promise.all(
      batch.map(async g => ({
        steamAppId:  g.appid,
        steamName:   g.name,
        hoursPlayed: Math.round(g.playtime_forever / 60 * 10) / 10,
        rawg:        await matchRawg(g.appid, g.name),
      }))
    );
    results.push(...matched);
  }

  // Solo devolver los que matchearon en RAWG, deduplicando por rawg.id (queda el de más horas)
  const seen = new Map<number, typeof results[0]>();
  for (const r of results) {
    if (!r.rawg) continue;
    const existing = seen.get(r.rawg.id);
    if (!existing || r.hoursPlayed > existing.hoursPlayed) {
      seen.set(r.rawg.id, r);
    }
  }
  const matched = Array.from(seen.values());

  return NextResponse.json({ games: matched, total: steamGames.length });
}
