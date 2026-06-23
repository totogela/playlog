'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'recommend' | 'comment';
  read: boolean;
  created_at: string;
  entity_id: string | null;
  from_user: { username: string } | null;
  gameTitle?: string;
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

const TYPE_ICON: Record<string, string> = {
  follow:    '👤',
  like:      '❤️',
  recommend: '🎮',
  comment:   '💬',
};

function notifText(n: Notification): string {
  const who = n.from_user?.username ?? 'Alguien';
  if (n.type === 'follow')    return `${who} te empezó a seguir`;
  if (n.type === 'like')      return `${who} le dio like a tu reseña`;
  if (n.type === 'recommend') return `${who} te recomendó ${n.gameTitle ?? 'un juego'}`;
  if (n.type === 'comment')   return `${who} comentó tu reseña`;
  return '';
}

// Returns the URL to navigate to when clicking a notification
function notifHref(n: Notification): string | null {
  if (n.type === 'follow' && n.from_user?.username)
    return `/user/${n.from_user.username}`;
  if (n.type === 'like' && n.entity_id)
    return `/activity?tab=reviews`; // best we can do without rawg_id on ratings
  if (n.type === 'recommend' && n.entity_id)
    return `/game/${n.entity_id}`;
  return null;
}

export default function NotificationBell() {
  const { user }  = useAuth();
  const router    = useRouter();
  const [notifs,  setNotifs]  = useState<Notification[]>([]);
  const [open,    setOpen]    = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    fetchNotifs();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetchNotifs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function fetchNotifs() {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, read, created_at, entity_id, from_user:from_user_id ( username )')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const raw = (data as unknown as Notification[]) ?? [];

    // Resolve game titles for recommend notifications
    const gameIds = raw
      .filter(n => n.type === 'recommend' && n.entity_id)
      .map(n => n.entity_id!);

    if (gameIds.length > 0) {
      const { data: games } = await supabase
        .from('games')
        .select('rawg_id, steam_app_id, name')
        .or(gameIds.map(id => `rawg_id.eq.${id},steam_app_id.eq.${id}`).join(','));

      const gameMap = new Map<string, string>();
      (games ?? []).forEach((g: { rawg_id: number | null; steam_app_id: number; name: string }) => {
        if (g.rawg_id)       gameMap.set(String(g.rawg_id), g.name);
        if (g.steam_app_id)  gameMap.set(String(g.steam_app_id), g.name);
      });

      setNotifs(raw.map(n =>
        n.type === 'recommend' && n.entity_id
          ? { ...n, gameTitle: gameMap.get(n.entity_id) ?? 'un juego' }
          : n
      ));
    } else {
      setNotifs(raw);
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && userId) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }
  }

  async function handleNotifClick(n: Notification) {
    setOpen(false);
    const href = notifHref(n);
    if (href) router.push(href);
  }

  if (!user) return null;

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 text-gray-400 hover:text-white transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-black text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl z-50">
          <div className="border-b border-border px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Notificaciones</p>
          </div>

          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-1">🔔</p>
              <p className="text-xs text-gray-600">Sin notificaciones aún</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
              {notifs.map(n => {
                const href = notifHref(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                      n.read ? 'opacity-60' : 'bg-accent/5'
                    } ${href ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{TYPE_ICON[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 leading-snug">{notifText(n)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    )}
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
