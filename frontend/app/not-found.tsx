import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center text-center px-4">
      <p
        className="font-black leading-none select-none"
        style={{ fontSize: 120, color: '#e85d04', opacity: 0.15 }}
      >
        404
      </p>
      <div style={{ marginTop: -24 }}>
        <h1 className="text-2xl font-black text-white">Página no encontrada</h1>
        <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
          Esta página no existe, fue eliminada o el link está roto.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href="/"
            className="font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#e85d04', borderRadius: 8, padding: '10px 24px', fontSize: 14 }}
          >
            Volver al inicio
          </Link>
          <Link
            href="/search"
            className="font-semibold transition-colors hover:text-white"
            style={{ border: '1px solid #2c3440', borderRadius: 8, padding: '10px 24px', fontSize: 14, color: '#9ca3af' }}
          >
            Buscar juegos
          </Link>
        </div>
      </div>
    </div>
  );
}
