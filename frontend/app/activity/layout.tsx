import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Actividad de la comunidad',
  description: 'Mirá qué están jugando los usuarios de Playlog. Actividad en tiempo real de la comunidad gamer.',
  openGraph: {
    title: 'Actividad de la comunidad — Playlog',
    description: 'Descubrí qué juegos están terminando, reseñando y jugando otros usuarios.',
  },
};

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
