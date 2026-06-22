'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-black">
            PLAY<span style={{ color: '#e85d04' }}>LOG</span>
          </Link>
          <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
            Recuperar contraseña
          </p>
        </div>

        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: '#1c2028', border: '1px solid #2c3440' }}
        >
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-3xl">📧</p>
              <p className="font-bold text-white">Revisá tu email</p>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                Te enviamos un link a <span className="text-white font-semibold">{email}</span> para
                restablecer tu contraseña.
              </p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Si no lo ves, revisá la carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                Ingresá tu email y te enviamos un link para restablecer tu contraseña.
              </p>

              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: '#6b7280' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vos@ejemplo.com"
                  required
                  className="w-full rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                  style={{
                    background: '#14181c', border: '1px solid #2c3440',
                    borderRadius: 8, padding: '10px 12px',
                    transition: 'border-color 0.2s',
                  }}
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
                disabled={loading || !email.trim()}
                className="w-full font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: '#e85d04', borderRadius: 8, padding: '10px 0', fontSize: 14 }}
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>
          )}

          <p className="text-center text-sm" style={{ color: '#6b7280' }}>
            <Link href="/login" className="hover:underline" style={{ color: '#e85d04' }}>
              ← Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
