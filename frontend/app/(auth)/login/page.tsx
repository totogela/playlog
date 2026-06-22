'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { upsertUserProfile } from '@/lib/library';

export default function LoginPage() {
  const router = useRouter();
  const [mode,     setMode]     = useState<'login' | 'register'>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await upsertUserProfile(data.user.id, username || email.split('@')[0]);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (mode === 'register') {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-black">
            PLAY<span className="text-accent">LOG</span>
          </Link>
          <p className="mt-2 text-gray-400">
            {mode === 'login' ? 'Iniciá sesión en tu cuenta' : 'Creá tu cuenta gratis'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-400">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="tu_nombre_gamer"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-accent"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vos@ejemplo.com"
              required
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-400">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-accent"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>

          {mode === 'login' && (
            <p className="text-center text-sm text-gray-500">
              <Link href="/forgot-password" className="text-accent hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          )}

          <p className="text-center text-sm text-gray-500">
            {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-accent hover:underline"
            >
              {mode === 'login' ? 'Registrate' : 'Iniciá sesión'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
