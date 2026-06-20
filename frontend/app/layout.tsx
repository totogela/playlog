import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gaming Profile',
  description: 'Tu identidad gamer. Track, rate, y descubrí tu próximo juego.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
