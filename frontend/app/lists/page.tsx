'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';

interface GameSnippet {
  id: string; name: string; steam_app_id: number; rawg_id: number | null; cover_url: string | null;
}
interface ListRow {
  id: string; name: string; description: string | null; is_public: boolean;
  created_at: string; game_count: number; preview_games: GameSnippet[];
  owner_username: string; owner_id: string; likes: number;
}

/* ── Modal crear lista ─────────────────────────────────────────────── */
function CreateListModal({ onClose, onCreate }: { onClose: () => void; onCreate: (l: ListRow) => void }) {
  const { user } = useAuth();
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function save() {
    if (!name.trim() || !user) return;
    setSaving(true);
    const { data, error } = await supabase.from('lists')
      .insert({ user_id: user.id, name: name.trim(), description: desc.trim() || null, is_public: isPublic })
      .select('id, name, description, is_public, created_at, user_id').single();
    if (!error && data) {
      const { data: u } = await supabase.from('users').select('username').eq('id', user.id).maybeSingle();
      onCreate({ ...data, game_count: 0, preview_games: [], owner_username: u?.username ?? '', owner_id: user.id, likes: 0 });
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl shadow-2xl p-6 space-y-4"
        style={{ background: '#1c2028', border: '1px solid #2c3440' }}>
        <h2 className="text-lg font-black text-white">Nueva lista</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest mb-1 block" style={{ color: '#6b7280' }}>Nombre</label>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="Ej: Mejores RPGs de los 90s"
              className="w-full text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: '#14181c', border: '1px solid #2c3440', borderRadius: 8, padding: '9px 12px' }} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest mb-1 block" style={{ color: '#6b7280' }}>
              Descripción <span className="normal-case font-normal" style={{ color: '#4b5563' }}>(opcional)</span>
            </label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="De qué trata esta lista..." rows={2}
              className="w-full text-sm text-white placeholder-gray-600 outline-none resize-none"
              style={{ background: '#14181c', border: '1px solid #2c3440', borderRadius: 8, padding: '9px 12px' }} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => setIsPublic(v => !v)}
              className="relative h-5 w-9 rounded-full transition-colors"
              style={{ background: isPublic ? '#e85d04' : '#2c3440' }}>
              <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: isPublic ? 'translateX(16px)' : 'translateX(2px)' }} />
            </div>
            <span className="text-sm" style={{ color: '#d1d5db' }}>{isPublic ? 'Lista pública' : 'Lista privada'}</span>
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 text-sm transition-colors hover:text-white"
            style={{ borderRadius: 8, border: '1px solid #2c3440', padding: '9px 0', color: '#9ca3af' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={!name.trim() || saving}
            className="flex-1 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ borderRadius: 8, background: '#e85d04', padding: '9px 0' }}>
            {saving ? 'Creando...' : 'Crear lista'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Cover stack (portrait 2:3) ──────────────────────────────────── */
function CoverStack({ games }: { games: GameSnippet[] }) {
  const covers = games.slice(0, 5);
  const empties = Math.max(0, 5 - covers.length);
  return (
    <div className="flex overflow-hidden" style={{ borderRadius: 8, height: 120, gap: 2 }}>
      {covers.map(g => (
        <div key={g.id} className="relative flex-1 overflow-hidden" style={{ background: '#1c2028' }}>
          <GameCoverImage steamAppId={g.steam_app_id} coverUrl={g.cover_url} name={g.name} className="object-cover" />
        </div>
      ))}
      {Array.from({ length: empties }).map((_, i) => (
        <div key={`e${i}`} className="flex-1" style={{ background: '#1c2028', opacity: 0.4 + i * 0.1 }} />
      ))}
    </div>
  );
}

/* ── List card ───────────────────────────────────────────────────── */
function ListCard({ list }: { list: ListRow }) {
  return (
    <Link href={`/lists/${list.id}`} className="group block space-y-2.5">
      <div className="overflow-hidden transition-all duration-300 group-hover:opacity-90" style={{ borderRadius: 10 }}>
        <CoverStack games={list.preview_games} />
      </div>
      <div>
        <p className="font-bold text-white text-sm line-clamp-2 leading-snug group-hover:text-orange-400 transition-colors" style={{ fontSize: 13 }}>
          {list.name}
        </p>
        {list.description && (
          <p className="line-clamp-2 leading-relaxed mt-0.5" style={{ fontSize: 11, color: '#6b7280' }}>
            {list.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{list.owner_username}</span>
          <span style={{ color: '#374151' }}>·</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{list.game_count} {list.game_count === 1 ? 'juego' : 'juegos'}</span>
          {list.likes > 0 && (
            <>
              <span style={{ color: '#374151' }}>·</span>
              <span className="flex items-center gap-1" style={{ fontSize: 11, color: '#6b7280' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {list.likes}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Enrich lists ────────────────────────────────────────────────── */
async function enrichLists(
  rows: { id: string; name: string; description: string | null; is_public: boolean; created_at: string; user_id: string }[],
  usernameMap: Map<string, string>
): Promise<ListRow[]> {
  return Promise.all(rows.map(async list => {
    const [{ count }, { data: lgData }] = await Promise.all([
      supabase.from('list_games').select('id', { count: 'exact', head: true }).eq('list_id', list.id),
      supabase.from('list_games')
        .select('game_id, games ( id, name, steam_app_id, rawg_id, cover_url )')
        .eq('list_id', list.id).order('added_at', { ascending: false }).limit(5),
    ]);
    const preview_games = (lgData ?? []).map((r: { games: GameSnippet }) => r.games).filter(Boolean);
    return {
      ...list,
      game_count: count ?? 0,
      preview_games,
      owner_username: usernameMap.get(list.user_id) ?? 'Usuario',
      owner_id: list.user_id,
      likes: 0,
    };
  }));
}

type SortTab = 'popular' | 'recent' | 'mine';

/* ── Página principal ─────────────────────────────────────────────── */
export default function ListsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [communityLists, setCommunityLists] = useState<ListRow[]>([]);
  const [myLists,        setMyLists]        = useState<ListRow[]>([]);
  const [fetching,       setFetching]       = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [activeTab,      setActiveTab]      = useState<SortTab>('popular');

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!user) return;
    async function load() {
      const [{ data: allPublic }, { data: mine }, { data: usersData }] = await Promise.all([
        supabase.from('lists').select('id, name, description, is_public, created_at, user_id')
          .eq('is_public', true).order('created_at', { ascending: false }).limit(30),
        supabase.from('lists').select('id, name, description, is_public, created_at, user_id')
          .eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('users').select('id, username'),
      ]);
      const usernameMap = new Map((usersData ?? []).map((u: { id: string; username: string }) => [u.id, u.username]));
      const [enrichedAll, enrichedMine] = await Promise.all([
        enrichLists(allPublic ?? [], usernameMap),
        enrichLists(mine ?? [], usernameMap),
      ]);
      setCommunityLists(enrichedAll);
      setMyLists(enrichedMine);
      setFetching(false);
    }
    load();
  }, [user, loading, router]);

  function handleCreated(list: ListRow) {
    setMyLists(prev => [list, ...prev]);
    setShowCreate(false);
    router.push(`/lists/${list.id}`);
  }

  const displayedLists = activeTab === 'mine' ? myLists : communityLists;

  const TABS: { id: SortTab; label: string }[] = [
    { id: 'popular', label: 'Populares'     },
    { id: 'recent',  label: 'Recientes'     },
    { id: 'mine',    label: 'Mis listas'    },
  ];

  if (loading || fetching) {
    return (
      <div style={{ paddingTop: 40 }}>
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-52 rounded-lg animate-pulse" style={{ background: '#1c2028' }} />
          <div className="h-9 w-32 rounded-lg animate-pulse" style={{ background: '#1c2028' }} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="space-y-2.5 animate-pulse">
              <div className="h-28 rounded-lg" style={{ background: '#1c2028' }} />
              <div className="h-4 w-3/4 rounded" style={{ background: '#1c2028' }} />
              <div className="h-3 w-1/2 rounded" style={{ background: '#1c2028' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ paddingTop: 40, paddingBottom: 80 }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-black text-white" style={{ fontSize: 26, letterSpacing: -0.5 }}>Community Lists</h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Colecciones curadas por la comunidad de Playlog.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="font-bold text-white transition-opacity hover:opacity-90 flex items-center gap-2"
            style={{ background: '#e85d04', borderRadius: 8, padding: '9px 18px', fontSize: 13, flexShrink: 0 }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Crear lista
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mb-7" style={{ borderBottom: '1px solid #2c3440' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="transition-colors"
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? '#ffffff' : '#6b7280',
                borderBottom: activeTab === t.id ? '2px solid #ffffff' : '2px solid transparent',
                marginBottom: -1,
              }}>
              {t.label}
              {t.id === 'mine' && myLists.length > 0 && (
                <span className="ml-1.5" style={{ fontSize: 11, color: '#4b5563' }}>{myLists.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {displayedLists.length === 0 ? (
          <div className="text-center" style={{ paddingTop: 60, paddingBottom: 60 }}>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              {activeTab === 'mine' ? 'Todavía no creaste ninguna lista.' : 'No hay listas todavía.'}
            </p>
            {activeTab === 'mine' && (
              <button onClick={() => setShowCreate(true)}
                className="font-bold text-white transition-opacity hover:opacity-90"
                style={{ display: 'inline-block', marginTop: 16, background: '#e85d04', borderRadius: 8, padding: '9px 20px', fontSize: 13 }}>
                + Crear tu primera lista
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedLists.map(list => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}

      </div>

      {showCreate && <CreateListModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}
    </>
  );
}
