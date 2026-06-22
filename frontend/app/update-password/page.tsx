'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash after the password reset link is clicked
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/'), 2500);
    }
    setLoading(false);
  }

  if (!ready) return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="text-center space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm" style={{ color: '#6b7280' }}>Verificando sesión...</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-black">
            PLAY<span style={{ color: '#e85d04' }}>LOG</span>
          </Link>
          <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
            Nueva contraseña
          </p>
        </div>

        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: '#1c2028', border: '1px solid #2c3440' }}
        >
          {success ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-3xl">✅</p>
              <p className="font-bold text-white">Contraseña actualizada</p>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                Redirigiendo al inicio...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: '#6b7280' }}>
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#14181c', border: '1px solid #2c3440', borderRadius: 8, padding: '10px 12px' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(232,93,4,0.5)')}
                  onBlur={e => (e.target.style.borderColor = '#2c3440')}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: '#6b7280' }}>
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#14181c', border: '1px solid #2c3440', borderRadius: 8, padding: '10px 12px' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(232,93,4,0.5)')}
                  onBlur={e => (e.target.style.borderColor = '#2c3440')}
                />
              </div>

              {error && (
                <p
                  className="rounded-lg text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 12px', color: '#f87171' }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: '#e85d04', borderRadius: 8, padding: '10px 0', fontSize: 14 }}
              >
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
