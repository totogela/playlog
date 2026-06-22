import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: {
    default:  'Playlog — Tu Letterboxd de videojuegos',
    template: '%s — Playlog',
  },
  description: 'Registrá, calificá y descubrí tus próximos videojuegos. La comunidad gamer en español.',
  keywords:    ['videojuegos', 'gaming', 'reseñas', 'biblioteca', 'comunidad'],
  openGraph: {
    siteName:    'Playlog',
    type:        'website',
    locale:      'es_AR',
    title:       'Playlog — Tu Letterboxd de videojuegos',
    description: 'Registrá, calificá y descubrí tus próximos videojuegos.',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Playlog — Tu Letterboxd de videojuegos',
    description: 'Registrá, calificá y descubrí tus próximos videojuegos.',
  },
  robots: {
    index:  true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-bg text-white">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-6 pt-20">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
