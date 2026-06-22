'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center text-center px-4">
      <p className="text-5xl mb-4">💥</p>
      <h1 className="text-2xl font-black text-white">Algo salió mal</h1>
      <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
        Ocurrió un error inesperado. Podés intentarlo de nuevo.
      </p>
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          onClick={reset}
          className="font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: '#e85d04', borderRadius: 8, padding: '10px 24px', fontSize: 14 }}
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="font-semibold transition-colors hover:text-white"
          style={{ border: '1px solid #2c3440', borderRadius: 8, padding: '10px 24px', fontSize: 14, color: '#9ca3af' }}
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
