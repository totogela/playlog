import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://playlog-tau.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,               lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/search`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/activity`, lastModified: now, changeFrequency: 'hourly',  priority: 0.7 },
  ];

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Public user profile pages
    const { data: users } = await db
      .from('users')
      .select('username, created_at')
      .limit(500);

    const userRoutes: MetadataRoute.Sitemap = (users ?? []).map((u: { username: string; created_at: string }) => ({
      url:             `${BASE}/user/${u.username}`,
      lastModified:    new Date(u.created_at),
      changeFrequency: 'weekly' as const,
      priority:        0.6,
    }));

    // Top games from DB (pages already cached/generated)
    const { data: games } = await db
      .from('games')
      .select('rawg_id, steam_app_id, name')
      .not('rawg_id', 'is', null)
      .limit(1000);

    const gameRoutes: MetadataRoute.Sitemap = (games ?? []).map((g: { rawg_id: number | null; steam_app_id: number }) => ({
      url:             `${BASE}/game/${g.rawg_id ?? g.steam_app_id}`,
      lastModified:    now,
      changeFrequency: 'monthly' as const,
      priority:        0.5,
    }));

    return [...staticRoutes, ...userRoutes, ...gameRoutes];
  } catch {
    return staticRoutes;
  }
}
