'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import GameCoverImage from '@/components/games/GameCoverImage';

interface GameEntry {
  lg_id: string;
  notes: string | null;
  added_at: string;
  game: {
    id: string;
    name: string;
    steam_app_id: number;
    rawg_id: number | null;
    cover_url: string | null;
  };
}

interface ListDetail {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
  owner_username: string;
}

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [list, setList] = useState<ListDetail | null>(null);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isOwner = user?.id === list?.user_id;

  useEffect(() => {
    async function load() {
      const { data: listData } = await supabase
        .from('lists').select('id, name, description, is_public, created_at, user_id').eq('id', id).maybeSingle();
      if (!listData) { setFetching(false); return; }

      // Buscar username del dueño
      const { data: ownerData } = await supabase.from('users').select('username').eq('id', listData.user_id).maybeSingle();

      setList({ ...listData, owner_username: ownerData?.username ?? 'Usuario' });
      setEditName(listData.name);
      setEditDesc(listData.description ?? '');
      setEditPublic(listData.is_public);

      const { data: lgData } = await supabase
        .from('list_games')
        .select('id, notes, added_at, games ( id, name, steam_app_id, rawg_id, cover_url )')
        .eq('list_id', id)
        .order('added_at', { ascending: false });

      const mapped = (lgData ?? []).map((r: { id: string; notes: string | null; added_at: string; games: GameEntry['game'] }) => ({
        lg_id: r.id,
        notes: r.notes,
        added_at: r.added_at,
        game: r.games,
      }));
      setGames(mapped);
      setFetching(false);
    }
    load();
  }, [id]);

  async function saveEdit() {
    if (!editName.trim() || !list) return;
    setSaving(true);
    await supabase.from('lists').update({
      name: editName.trim(),
      description: editDesc.trim() || null,
      is_public: editPublic,
      updated_at: new Date().toISOString(),
    }).eq('id', list.id);
    setList(prev => prev ? { ...prev, name: editName.trim(), description: editDesc.trim() || null, is_public: editPublic } : prev);
    setEditing(false);
    setSaving(false);
  }

  async function deleteGame(lgId: string) {
    setDeleting(lgId);
    await supabase.from('list_games').delete().eq('id', lgId);
    setGames(prev => prev.filter(g => g.lg_id !== lgId));
    setDeleting(null);
  }

  async function deleteList() {
    if (!list || !confirm(`¿Eliminar la lista "${list.name}"? Esta acción no se puede deshacer.`)) return;
    await supabase.from('lists').delete().eq('id', list.id);
    router.push('/lists');
  }

  if (fetching) {
    return (
      <div className="py-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-surface" />
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded bg-surface" />)}
        </div>
      </div>
    );
  }

  if (!list) {
    return <div className="py-20 text-center text-gray-500">Lista no encontrada</div>;
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/lists" className="text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-accent transition-colors">← Listas</Link>
            {!list.is_public && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 border border-border rounded px-1.5 py-0.5">Privada</span>
            )}
          </div>
          {editing ? (
            <div className="space-y-3 max-w-lg">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full rounded-lg border border-accent bg-surface px-3 py-2 text-lg font-black text-white outline-none"
                autoFocus
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Descripción (opcional)"
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent resize-none"
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div onClick={() => setEditPublic(v => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${editPublic ? 'bg-accent' : 'bg-border'}`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${editPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-300">{editPublic ? 'Lista pública' : 'Lista privada'}</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="rounded-lg border border-border px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button onClick={saveEdit} disabled={saving} className="rounded-lg bg-accent px-4 py-1.5 text-sm font-bold text-white hover:bg-accent-hover transition-colors disabled:opacity-40">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black">{list.name}</h1>
              {list.description && <p className="text-gray-400 text-sm">{list.description}</p>}
              <p className="text-xs text-gray-600">
                Por <span className="text-gray-400">{list.owner_username}</span> · {games.length} {games.length === 1 ? 'juego' : 'juegos'}
              </p>
            </>
          )}
        </div>

        {isOwner && !editing && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-gray-400 hover:border-accent hover:text-accent transition-colors"
            >
              Editar
            </button>
            <button
              onClick={deleteList}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-800 hover:text-red-400 transition-colors"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Banner de covers */}
      {games.length > 0 && (
        <div className="flex gap-1.5 overflow-hidden rounded-xl h-28 -mx-0">
          {games.slice(0, 8).map(entry => (
            <div key={entry.lg_id} className="flex-1 min-w-0 relative overflow-hidden">
              <GameCoverImage
                steamAppId={entry.game.steam_app_id}
                coverUrl={entry.game.cover_url}
                name={entry.game.name}
                className="object-cover scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
            </div>
          ))}
        </div>
      )}

      {/* Grid de juegos */}
      {games.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <p className="text-4xl">📋</p>
          <p className="text-gray-400 font-medium">Esta lista está vacía</p>
          <p className="text-sm text-gray-600">Buscá juegos y agregalos a esta lista desde su página</p>
          <Link href="/search" className="mt-2 inline-block text-sm text-accent hover:underline">Explorar juegos →</Link>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{games.length} {games.length === 1 ? 'juego' : 'juegos'}</p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {games.map(entry => (
              <div key={entry.lg_id} className="group relative">
                <Link href={`/game/${entry.game.rawg_id ?? entry.game.steam_app_id}`} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border/50 transition-all group-hover:border-accent/70 group-hover:shadow-lg group-hover:shadow-black/50">
                    <GameCoverImage
                      steamAppId={entry.game.steam_app_id}
                      coverUrl={entry.game.cover_url}
                      name={entry.game.name}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                    {isOwner && (
                      <button
                        onClick={e => { e.preventDefault(); deleteGame(entry.lg_id); }}
                        disabled={deleting === entry.lg_id}
                        className="absolute top-1 left-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] text-gray-300 hover:bg-red-900 hover:text-red-200 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {deleting === entry.lg_id ? '…' : '✕'}
                      </button>
                    )}
                  </div>
                </Link>
                <p className="mt-1 text-center text-[10px] text-gray-500 line-clamp-1 leading-tight">{entry.game.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
