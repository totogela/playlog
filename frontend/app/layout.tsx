import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/layout/Navbar';

const BASE_URL = 'https://playlog-tau.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  'Playlog — Tu Letterboxd de videojuegos',
    template: '%s — Playlog',
  },
  description: 'Registrá, calificá y descubrí tus próximos videojuegos. La comunidad gamer en español.',
  keywords:    ['videojuegos', 'gaming', 'reseñas', 'biblioteca', 'comunidad', 'playlog'],
  alternates:  { canonical: BASE_URL },
  openGraph: {
    siteName:    'Playlog',
    type:        'website',
    locale:      'es_AR',
    url:         BASE_URL,
    title:       'Playlog — Tu Letterboxd de videojuegos',
    description: 'Registrá, calificá y descubrí tus próximos videojuegos.',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Playlog — Tu Letterboxd de videojuegos',
    description: 'Registrá, calificá y descubrí tus próximos videojuegos.',
  },
  robots: {
    index:        true,
    follow:       true,
    googleBot: {
      index:            true,
      follow:           true,
      'max-image-preview': 'large',
      'max-snippet':    -1,
    },
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
