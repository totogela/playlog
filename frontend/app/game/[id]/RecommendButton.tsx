'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Friend { id: string; username: string }

export default function RecommendButton({ gameId, gameName }: { gameId: number; gameName: string }) {
  const { user } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [friends,  setFriends]  = useState<Friend[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState<Set<string>>(new Set());
  const [sending,  setSending]  = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function openModal() {
    if (!user) return;
    setOpen(true);
    if (friends.length > 0) return;
    setLoading(true);
    const { data: follows } = await supabase
      .from('follows').select('following_id').eq('follower_id', user.id);
    if (!follows || follows.length === 0) { setLoading(false); return; }

    const ids = follows.map((f: { following_id: string }) => f.following_id);
    const { data: users } = await supabase.from('users').select('id, username').in('id', ids);
    setFriends((users ?? []) as Friend[]);
    setLoading(false);
  }

  async function recommend(friendId: string) {
    if (!user || sending) return;
    setSending(friendId);
    await supabase.from('notifications').insert({
      user_id:      friendId,
      from_user_id: user.id,
      type:         'recommend',
      entity_id:    gameId.toString(),
    });
    setSent(prev => new Set([...prev, friendId]));
    setSending(null);
  }

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-gray-400 hover:border-accent hover:text-accent transition-all"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Recomendar a un amigo
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl z-50">
          <div className="border-b border-border px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Recomendar</p>
            <p className="text-xs text-gray-600 mt-0.5 truncate">{gameName}</p>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="mx-auto h-4 w-4 animate-spin rounded-full border border-gray-600 border-t-accent" />
            </div>
          ) : friends.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-gray-600">No seguís a nadie todavía.</p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto py-1">
              {friends.map(f => {
                const isSent    = sent.has(f.id);
                const isSending = sending === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => !isSent && recommend(f.id)}
                    disabled={isSent || isSending}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSent ? 'opacity-50 cursor-default' : 'hover:bg-border'
                    }`}
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-black text-accent">
                      {f.username[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-gray-300">{f.username}</span>
                    <span className={`text-[10px] font-semibold ${isSent ? 'text-green-500' : 'text-gray-600'}`}>
                      {isSending ? '...' : isSent ? '✓ Enviado' : 'Enviar'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
