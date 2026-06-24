import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buscar videojuegos',
  description: 'Buscá cualquier videojuego, leé reseñas de la comunidad y añadilo a tu biblioteca en Playlog.',
  openGraph: {
    title: 'Buscar videojuegos — Playlog',
    description: 'Explorá más de 800.000 videojuegos. Calificá, reseñá y guardá tus favoritos.',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
