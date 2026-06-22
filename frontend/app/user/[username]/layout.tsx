import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

interface Props {
  params:   Promise<{ username: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await db
      .from('users')
      .select('username, bio, avatar_url')
      .eq('username', username)
      .maybeSingle();

    if (!data) return { title: `@${username}` };

    return {
      title:       `@${data.username}`,
      description: data.bio ?? `Perfil de ${data.username} en Playlog. Mirá su biblioteca y reseñas de videojuegos.`,
      openGraph: {
        title:       `${data.username} en Playlog`,
        description: data.bio ?? `Biblioteca y reseñas de ${data.username}`,
        images:      data.avatar_url ? [{ url: data.avatar_url }] : [],
      },
    };
  } catch {
    return { title: `@${username}` };
  }
}

export default function UserLayout({ children }: Props) {
  return <>{children}</>;
}
