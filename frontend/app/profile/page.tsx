'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { GameStatus } from '@/lib/supabase';
import { rawgImg } from '@/lib/rawg';
import GameCoverImage from '@/components/games/GameCoverImage';
import AvatarCropper from '@/components/profile/AvatarCropper';
import UserListModal from '@/components/social/UserListModal';

const RAWG_KEY = 'c21c574004494d23aea3749834c91632';

interface FaveGame { id: string; rawg_id: number | null; steam_app_id: number; name: string; cover_url: string | null }

function FavoritePicker({ onSelect, onClose }: { onSelect: (g: FaveGame) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Array<{ id: number; name: string; background_image: string | null }>>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback((query: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=8&search_precise=true`);
      const json = await res.json();
      setResults(json.results ?? []);
    }, 300);
  }, []);

  async function pick(r: { id: number; name: string; background_image: string | null }) {
    // Intentar obtener el Steam appid real desde el detalle de RAWG
    let steamAppId: number = r.id; // fallback: rawg id (se sobreescribe si hay match en Steam)
    try {
      const detail = await fetch(`https://api.rawg.io/api/games/${r.id}?key=${RAWG_KEY}`);
      if (detail.ok) {
        const d = await detail.json();
        const steamStore = (d.stores ?? []).find((s: { store: { slug: string }; url: string }) => s.store?.slug === 'steam');
        if (steamStore?.url) {
          const match = steamStore.url.match(/\/app\/(\d+)/);
          if (match) steamAppId = parseInt(match[1], 10);
        }
      }
    } catch { /* usa fallback */ }

    // Si el juego ya existe en DB (por import de Steam), no sobreescribir su steam_app_id correcto
    const { data: existing } = await supabase.from('games').select('id, rawg_id, steam_app_id, name, cover_url').eq('rawg_id', r.id).maybeSingle();
    if (existing) {
      onSelect(existing as FaveGame);
      return;
    }

    await supabase.from('games').upsert({ rawg_id: r.id, steam_app_id: steamAppId, name: r.name, cover_url: r.background_image }, { onConflict: 'rawg_id' });
    const { data: g } = await supabase.from('games').select('id, rawg_id, steam_app_id, name, cover_url').eq('rawg_id', r.id).maybeSingle();
    if (g) onSelect(g as FaveGame);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); search(e.target.value); }}
            placeholder="Buscar juego favorito..." className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none" />
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">×</button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && q.length > 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Sin resultados</p>
          )}
          {results.length === 0 && q.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-600">Escribí el nombre de un juego</p>
          )}
          {results.map(r => (
            <button key={r.id} onClick={() => pick(r)}
              className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-border transition-colors text-left">
              <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded">
                {r.background_image
                  ? <Image src={rawgImg(r.background_image) ?? r.background_image} alt={r.name} fill unoptimized className="object-cover" />
                  : <div className="h-full w-full bg-border" />}
              </div>
              <span className="text-sm text-white">{r.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface GameEntry {
  id: string;
  status: GameStatus;
  hours_played: number | null;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  games: {
    steam_app_id: number;
    rawg_id: number | null;
    name: string;
    cover_url: string | null;
    genres: string[] | null;
    release_date: string | null;
  };
  ratings: Array<{ overall: number | null; review_text: string | null }>;
}

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'xs' }) {
  const stars = value / 2;
  const sz = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => {
        const full = stars >= s;
        const half = !full && stars >= s - 0.5;
        const uid = `pst-${s}-${value}`;
        return (
          <svg key={s} className={sz} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={uid} x1="0" x2="1" y1="0" y2="0">
                <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="#4ade80" />
                <stop offset={half ? '50%' : full ? '100%' : '0%'} stopColor="transparent" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />
            {(full || half) && (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={full ? '#4ade80' : `url(#${uid})`} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

function Cover({ entry, showStars = false }: { entry: GameEntry; showStars?: boolean }) {
  const rating = entry.ratings?.[0]?.overall;
  return (
    <div className="flex flex-col items-center gap-1">
      <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="group block">
        <div className="relative w-[110px] h-[165px] overflow-hidden rounded border border-border transition-all group-hover:border-accent group-hover:shadow-lg group-hover:shadow-accent/10">
          <GameCoverImage
            steamAppId={entry.games.steam_app_id}
            coverUrl={entry.games.cover_url}
            name={entry.games.name}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>
      {showStars && rating && <Stars value={rating} size="xs" />}
    </div>
  );
}

type Tab = 'profile' | 'activity' | 'games' | 'diary' | 'reviews' | 'wishlist' | 'lists';

function EditProfileModal({
  userId, username, bio, avatarUrl, onSave, onClose,
}: {
  userId: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  onSave: (u: string, b: string, avatar: string | null) => void;
  onClose: () => void;
}) {
  const [u, setU]             = useState(username);
  const [b, setB]             = useState(bio);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Mostrar el cropper con la imagen original
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    // Resetear el input para poder elegir la misma imagen de nuevo
    e.target.value = '';
  }

  async function handleCroppedBlob(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    setError('');
    try {
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(userId, blob, { upsert: true, contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(userId);
      setPreview(data.publicUrl + '?t=' + Date.now());
    } catch {
      setError('No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!u.trim()) { setError('El username no puede estar vacío'); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(u.trim())) {
      setError('Solo letras, números y _ (3-20 caracteres)');
      return;
    }
    setSaving(true);
    setError('');
    onSave(u.trim(), b.trim(), preview);
  }

  const initial = username[0]?.toUpperCase() ?? '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-bold text-white">Editar perfil</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border">
                {preview
                  ? <img src={preview} alt="avatar" className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center bg-accent/20 text-2xl font-black text-accent">{initial}</div>
                }
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : 'Cambiar foto'}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="block text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                >
                  Quitar foto
                </button>
              )}
              <p className="text-[10px] text-gray-600">JPG, PNG o WebP · máx 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5">Username</label>
            <input
              value={u}
              onChange={e => setU(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent"
              placeholder="username"
              maxLength={20}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5">Bio</label>
            <textarea
              value={b}
              onChange={e => setB(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent resize-none"
              placeholder="Contá algo sobre vos..."
            />
            <p className="text-[10px] text-gray-600 mt-0.5 text-right">{b.length}/200</p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || uploading}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onCrop={handleCroppedBlob}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [entries,       setEntries]       = useState<GameEntry[]>([]);
  const [username,      setUsername]      = useState('');
  const [bio,           setBio]           = useState('');
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null);
  const [joinedAt,      setJoinedAt]      = useState<string | null>(null);
  const [fetching,      setFetching]      = useState(true);
  const [tab,           setTab]           = useState<Tab>('profile');
  const [favorites,     setFavorites]     = useState<(FaveGame | null)[]>([null, null, null, null]);
  const [pickerSlot,    setPickerSlot]    = useState<number | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [modal,          setModal]          = useState<'followers' | 'following' | null>(null);
  const [modalUsers,     setModalUsers]     = useState<Array<{ id: string; username: string; avatar_url: string | null; bio: string | null }>>([]);
  const [modalLoading,   setModalLoading]   = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!user) return;
    async function load() {
      const { data: userRow } = await supabase
        .from('users').select('username, created_at, favorite_games, bio, avatar_url').eq('id', user!.id).maybeSingle();
      setUsername(userRow?.username ?? user!.email?.split('@')[0] ?? 'Usuario');
      setJoinedAt(userRow?.created_at ?? null);
      setBio(userRow?.bio ?? '');
      setAvatarUrl(userRow?.avatar_url ?? null);

      // Cargar juegos favoritos
      const faveIds: string[] = userRow?.favorite_games ?? [];
      if (faveIds.length > 0) {
        const { data: faveGames } = await supabase
          .from('games').select('id, rawg_id, steam_app_id, name, cover_url').in('id', faveIds);
        if (faveGames) {
          const ordered = faveIds.map(id => (faveGames as FaveGame[]).find(g => g.id === id) ?? null);
          setFavorites([...ordered, ...Array(4).fill(null)].slice(0, 4));
        }
      }

      const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user!.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user!.id),
      ]);
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);

      const { data: ugs } = await supabase
        .from('user_games')
        .select('id, status, hours_played, updated_at, started_at, finished_at, games ( steam_app_id, rawg_id, name, cover_url, genres, release_date )')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });

      if (!ugs) { setFetching(false); return; }

      const ugIds = ugs.map((u: { id: string }) => u.id);
      const { data: ratingsData } = ugIds.length
        ? await supabase.from('ratings').select('user_game_id, overall, review_text').in('user_game_id', ugIds)
        : { data: [] };

      const ratingsMap = new Map((ratingsData ?? []).map((r: { user_game_id: string; overall: number | null; review_text: string | null }) => [r.user_game_id, r]));
      const merged = ugs.map((ug: { id: string }) => ({
        ...ug,
        ratings: ratingsMap.has(ug.id) ? [ratingsMap.get(ug.id)!] : [],
      }));

      setEntries(merged as unknown as GameEntry[]);
      setFetching(false);
    }
    load();
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="py-12 animate-pulse space-y-6">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-surface" />
          <div className="space-y-2">
            <div className="h-6 w-36 rounded bg-surface" />
            <div className="h-4 w-24 rounded bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  async function openModal(type: 'followers' | 'following') {
    if (!user) return;
    setModal(type);
    setModalLoading(true);
    setModalUsers([]);
    const col    = type === 'followers' ? 'follower_id'  : 'following_id';
    const filter = type === 'followers' ? 'following_id' : 'follower_id';
    const { data: follows } = await supabase.from('follows').select(col).eq(filter, user.id).limit(50);
    const ids = (follows ?? []).map((f: Record<string, string>) => f[col]);
    if (ids.length === 0) { setModalLoading(false); return; }
    const { data: users } = await supabase.from('users').select('id, username, avatar_url, bio').in('id', ids);
    setModalUsers(users ?? []);
    setModalLoading(false);
  }

  async function saveFavorite(slot: number, game: FaveGame) {
    const newFaves = [...favorites];
    newFaves[slot] = game;
    setFavorites(newFaves);
    setPickerSlot(null);
    const ids = newFaves.filter(Boolean).map(g => g!.id);
    await supabase.from('users').update({ favorite_games: ids }).eq('id', user!.id);
  }

  async function saveProfile(newUsername: string, newBio: string, newAvatar: string | null) {
    await supabase.from('users').update({ username: newUsername, bio: newBio, avatar_url: newAvatar }).eq('id', user!.id);
    setUsername(newUsername);
    setBio(newBio);
    setAvatarUrl(newAvatar);
    setEditingProfile(false);
  }

  async function removeFavorite(slot: number) {
    const newFaves = [...favorites];
    newFaves[slot] = null;
    // Compactar: mover nulls al final
    const compacted = [...newFaves.filter(Boolean), ...Array(4).fill(null)].slice(0, 4) as (FaveGame | null)[];
    setFavorites(compacted);
    const ids = compacted.filter(Boolean).map(g => g!.id);
    await supabase.from('users').update({ favorite_games: ids }).eq('id', user!.id);
  }

  const total      = entries.length;
  const thisYear   = entries.filter(e => new Date(e.updated_at).getFullYear() === new Date().getFullYear()).length;
  const completed  = entries.filter(e => e.status === 'completed').length;
  const totalHours = Math.round(entries.reduce((sum, e) => sum + (e.hours_played ?? 0), 0));
  const withRating = entries.filter(e => e.ratings?.[0]?.overall);
  const reviewCount = entries.filter(e => e.ratings?.[0]?.review_text).length;

  const histogram: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) histogram[i] = 0;
  for (const e of withRating) { const v = e.ratings[0].overall!; histogram[v] = (histogram[v] ?? 0) + 1; }
  const maxBar = Math.max(...Object.values(histogram), 1);

  const recentReviews   = entries.filter(e => e.ratings?.[0]?.review_text && e.ratings[0].overall);
  const wishlistEntries = entries.filter(e => e.status === 'wishlist').slice(0, 4);
  const diary = entries.filter(e => e.status === 'completed' || e.status === 'playing').slice(0, 8);

  const initial = username[0]?.toUpperCase() ?? '?';

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'profile',  label: 'Perfil'    },
    { id: 'activity', label: 'Actividad' },
    { id: 'games',    label: 'Juegos',   count: total },
    { id: 'diary',    label: 'Diario'    },
    { id: 'reviews',  label: 'Reseñas',  count: reviewCount || undefined },
    { id: 'wishlist', label: 'Wishlist', count: entries.filter(e => e.status === 'wishlist').length || undefined },
    { id: 'lists',    label: 'Listas'   },
  ];

  const wishlistCount = entries.filter(e => e.status === 'wishlist').length;
  const recentActivity = entries.filter(e => e.status !== 'wishlist').slice(0, 4);

  return (
    <>

    {/* ── MOBILE LAYOUT (Letterboxd style) ── */}
    <div className="sm:hidden pb-20">

      {/* Avatar + info centrado */}
      <div className="flex flex-col items-center pt-8 pb-5 px-4">
        <div
          className="h-20 w-20 rounded-full overflow-hidden border-2 border-accent flex-shrink-0 mb-3"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
            : <div className="h-full w-full flex items-center justify-center bg-accent/20 text-3xl font-black text-accent">{initial}</div>
          }
        </div>
        <h1 className="text-xl font-black text-white">{username}</h1>
        {bio && <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">{bio}</p>}
        <button
          onClick={() => setEditingProfile(true)}
          className="mt-3 rounded-lg border border-border px-4 py-1.5 text-xs font-semibold text-gray-300 hover:border-accent hover:text-accent transition-colors"
        >
          Editar perfil
        </button>
      </div>

      {/* FAVORITOS */}
      <div className="px-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Favoritos</p>
        <div className="flex gap-2">
          {favorites.map((fave, i) => (
            <div key={i} className="flex-1 relative aspect-[2/3]">
              {fave ? (
                <button onClick={() => setPickerSlot(i)} className="block w-full h-full">
                  <div className="relative w-full h-full overflow-hidden rounded border border-border">
                    <GameCoverImage
                      steamAppId={fave.steam_app_id}
                      coverUrl={fave.cover_url}
                      name={fave.name}
                      className="object-cover"
                    />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setPickerSlot(i)}
                  className="flex w-full h-full items-center justify-center rounded border border-dashed border-border text-gray-700 hover:border-accent hover:text-accent transition-colors"
                >
                  <span className="text-lg">+</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      {recentActivity.length > 0 && (
        <div className="px-4 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Actividad reciente</p>
          <div className="flex gap-2">
            {recentActivity.map(entry => {
              const rating = entry.ratings?.[0]?.overall;
              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
                  <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="block w-full aspect-[2/3] relative overflow-hidden rounded border border-border hover:border-accent transition-colors">
                    <GameCoverImage
                      steamAppId={entry.games.steam_app_id}
                      coverUrl={entry.games.cover_url}
                      name={entry.games.name}
                      className="object-cover"
                    />
                  </Link>
                  {rating && <Stars value={rating} size="xs" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Link href="#" onClick={() => { setTab('activity'); }} className="flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:text-accent transition-colors border-b border-border/50">
        <span className="text-xs font-semibold">Más actividad</span>
        <span className="text-xs">›</span>
      </Link>

      {/* STATS — iOS-style list rows */}
      <div className="mt-3 border-t border-border/60 divide-y divide-border/60">
        {[
          { label: 'Juegos', value: total, href: null },
          { label: 'Este año', value: thisYear, href: null },
          { label: 'Completados', value: completed, href: null },
          { label: 'Reseñas', value: reviewCount, href: null },
          { label: 'Wishlist', value: wishlistCount, href: null },
          { label: 'Siguiendo', value: followingCount, href: `/user/${username}/following` },
          { label: 'Seguidores', value: followerCount, href: `/user/${username}/followers` },
        ].map(({ label, value, href }) => {
          const inner = (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-300">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{value}</span>
                {href && <span className="text-gray-600 text-base leading-none">›</span>}
              </div>
            </div>
          );
          return href
            ? <Link key={label} href={href} className="block hover:bg-white/5 transition-colors">{inner}</Link>
            : <div key={label}>{inner}</div>;
        })}
      </div>
    </div>

    {/* ── DESKTOP LAYOUT ── */}
    <div className="hidden sm:block py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div className="h-20 w-20 flex-shrink-0 rounded-full overflow-hidden border-2 border-accent/30">
          {avatarUrl
            ? <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
            : <div className="h-full w-full flex items-center justify-center bg-accent/20 text-3xl font-black text-accent">{initial}</div>
          }
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black">{username}</h1>
            <button
              onClick={() => setEditingProfile(true)}
              className="rounded border border-border px-3 py-1 text-xs font-medium text-gray-400 hover:border-accent hover:text-accent transition-colors">
              Editar perfil
            </button>
          </div>
          {bio && <p className="text-sm text-gray-400 mt-1 max-w-md">{bio}</p>}
          {joinedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Jugador desde {new Date(joinedAt).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex gap-8 text-center">
          {[
            { value: total,          label: 'Juegos',     href: null                                },
            { value: thisYear,       label: 'Este año',   href: null                                },
            { value: followingCount, label: 'Siguiendo',  href: `/user/${username}/following`       },
            { value: followerCount,  label: 'Seguidores', href: `/user/${username}/followers`       },
          ].map(({ value, label, href }) => (
            href
              ? <Link key={label} href={href}>
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-accent mt-0.5">{label}</div>
                </Link>
              : <div key={label}>
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-0.5">{label}</div>
                </div>
          ))}
        </div>
      </div>

      {/* Tabs — estilo Letterboxd */}
      <div className="border-b border-border mt-0 mb-8">
        <div className="flex items-end gap-0 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-baseline gap-1 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-200 font-normal'
              }`}>
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[11px] ${tab === t.id ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Perfil */}
      {tab === 'profile' && (
        <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
          <div className="space-y-10">

            {/* Juegos favoritos — selección manual */}
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-4">Videojuegos favoritos</h2>
              <div className="flex gap-4">
                {favorites.map((fave, i) => (
                  <div key={i} className="group relative flex flex-col items-center gap-1.5" style={{ width: 110 }}>
                    {fave ? (
                      <>
                        <div className="relative w-full" style={{ height: 165 }}>
                          <Link href={`/game/${fave.rawg_id ?? fave.steam_app_id}`} className="block h-full">
                            <div className="relative h-full w-full overflow-hidden rounded border border-border transition-all group-hover:border-accent group-hover:shadow-lg group-hover:shadow-accent/10">
                                  <GameCoverImage
                                steamAppId={fave.steam_app_id}
                                coverUrl={fave.cover_url}
                                name={fave.name}
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          </Link>
                          {/* Botón cambiar — hover sobre la portada */}
                          <button
                            onClick={() => setPickerSlot(i)}
                            className="absolute inset-0 flex items-center justify-center rounded bg-black/0 group-hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <span className="text-xs font-semibold text-white">Cambiar</span>
                          </button>
                          {/* Botón eliminar */}
                          <button
                            onClick={() => removeFavorite(i)}
                            className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[10px] text-gray-300 hover:bg-red-900 hover:text-red-200 transition-colors opacity-0 group-hover:opacity-100"
                          >✕</button>
                        </div>
                        <p className="w-full text-center text-[11px] text-gray-400 leading-tight line-clamp-2">{fave.name}</p>
                      </>
                    ) : (
                      <button
                        onClick={() => setPickerSlot(i)}
                        className="flex h-[165px] w-full flex-col items-center justify-center gap-2 rounded border border-dashed border-border text-gray-700 hover:border-accent hover:text-accent transition-colors"
                      >
                        <span className="text-2xl">+</span>
                        <span className="text-[9px] uppercase tracking-widest">Agregar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Actividad reciente */}
            {entries.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Actividad reciente</h2>
                  <Link href="/library" className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 hover:text-accent transition-colors">Todos →</Link>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {entries.slice(0, 4).map(entry => <Cover key={entry.id} entry={entry} showStars />)}
                </div>
              </section>
            )}

            {/* Reseñas recientes */}
            {recentReviews.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Reseñas recientes</h2>
                  <button onClick={() => setTab('reviews')} className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 hover:text-accent transition-colors">Más →</button>
                </div>
                <div className="space-y-5">
                  {recentReviews.slice(0, 3).map(entry => {
                    const r = entry.ratings[0];
                    const year = entry.games.release_date ? new Date(entry.games.release_date).getFullYear() : null;
                    return (
                      <div key={entry.id} className="flex gap-4">
                        <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="flex-shrink-0">
                          <div className="relative w-12 h-[72px] overflow-hidden rounded border border-border hover:border-accent transition-colors">
                            {rawgImg(entry.games.cover_url)
                              ? <Image src={rawgImg(entry.games.cover_url)!} alt={entry.games.name} fill unoptimized className="object-cover" sizes="48px" />
                              : <div className="flex h-full items-center justify-center bg-surface text-sm">🎮</div>}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="font-bold text-white hover:text-accent transition-colors">
                              {entry.games.name}
                            </Link>
                            {year && <span className="text-sm text-gray-500">{year}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {r.overall && <Stars value={r.overall} />}
                            <span className="text-xs text-gray-600">
                              {new Date(entry.updated_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm text-gray-400 leading-relaxed line-clamp-3">{r.review_text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {entries.length === 0 && (
              <div className="rounded-xl border border-dashed border-border py-20 text-center text-gray-600">
                <p className="text-4xl mb-3">🎮</p>
                <p className="font-medium text-gray-400">Todavía no registraste ningún juego</p>
                <p className="mt-1 text-sm">
                  <Link href="/search" className="text-accent hover:underline">Buscá un juego</Link> para empezar tu perfil
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">

            {wishlistEntries.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Wishlist</h3>
                  <span className="text-xs text-gray-600">{entries.filter(e => e.status === 'wishlist').length}</span>
                </div>
                <div className="flex gap-2">
                  {wishlistEntries.map(e => (
                    <Link key={e.id} href={`/game/${e.games.rawg_id ?? e.games.steam_app_id}`}>
                      <div className="relative w-14 h-20 overflow-hidden rounded border border-border hover:border-accent transition-colors">
                        {e.games.cover_url
                          ? <Image src={rawgImg(e.games.cover_url) ?? e.games.cover_url} alt={e.games.name} fill unoptimized className="object-cover" sizes="56px" />
                          : <div className="flex h-full items-center justify-center bg-surface text-sm">🎮</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {diary.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Diario</h3>
                  <span className="text-xs text-gray-600">{total}</span>
                </div>
                <div className="space-y-2">
                  {diary.map(e => {
                    const d = new Date(e.updated_at);
                    return (
                      <div key={e.id} className="flex items-center gap-3">
                        <div className="w-10 text-center flex-shrink-0">
                          <div className="text-[10px] font-bold text-accent">{d.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}</div>
                          <div className="text-sm font-black text-white leading-none">{d.getDate()}</div>
                        </div>
                        <Link href={`/game/${e.games.rawg_id ?? e.games.steam_app_id}`} className="flex-1 text-xs text-gray-400 hover:text-white transition-colors line-clamp-1">
                          {e.games.name}
                        </Link>
                        {e.ratings?.[0]?.overall && (
                          <span className="flex-shrink-0"><Stars value={e.ratings[0].overall} size="xs" /></span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {withRating.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Distribución de notas</h3>
                  <span className="text-xs text-gray-600">{withRating.length}</span>
                </div>
                <div className="flex items-end gap-0.5 h-14">
                  {[1,2,3,4,5,6,7,8,9,10].map(v => (
                    <div key={v} className="flex-1 flex flex-col items-center justify-end">
                      <div className="w-full rounded-sm bg-accent/70"
                        style={{ height: `${Math.round((histogram[v] / maxBar) * 48)}px`, minHeight: histogram[v] ? 2 : 0 }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-gray-600">½★</span>
                  <span className="text-[9px] text-gray-600">★★★★★</span>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {[
                { label: '🎮 Jugando',     value: entries.filter(e => e.status === 'playing').length   },
                { label: '✅ Terminados',  value: completed                                             },
                { label: '⏸️ En pausa',    value: entries.filter(e => e.status === 'on_hold').length   },
                { label: '💀 Abandonados', value: entries.filter(e => e.status === 'abandoned').length },
              ].map(({ label, value }) => value > 0 ? (
                <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
              ) : null)}
            </section>

          </div>
        </div>
      )}

      {/* Tab: Juegos */}
      {tab === 'games' && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
          {entries.map(entry => <Cover key={entry.id} entry={entry} showStars />)}
          {entries.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-600"><p>Sin juegos registrados</p></div>
          )}
        </div>
      )}

      {/* Tab: Actividad */}
      {tab === 'activity' && (
        <div className="max-w-2xl space-y-4">
          {entries.map(entry => {
            const r = entry.ratings?.[0];
            const d = new Date(entry.updated_at);
            const statusLabel: Record<GameStatus, string> = {
              playing: 'Está jugando', completed: 'Terminó', abandoned: 'Abandonó', on_hold: 'Pausó', wishlist: 'Agregó a wishlist'
            };
            return (
              <div key={entry.id} className="flex gap-4 border-b border-border pb-4">
                <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="flex-shrink-0">
                  <div className="relative w-10 h-14 overflow-hidden rounded border border-border hover:border-accent transition-colors">
                    {rawgImg(entry.games.cover_url)
                      ? <Image src={rawgImg(entry.games.cover_url)!} alt={entry.games.name} fill unoptimized className="object-cover" sizes="40px" />
                      : <div className="flex h-full items-center justify-center bg-surface text-xs">🎮</div>}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">{statusLabel[entry.status]}</span>
                    <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="font-semibold text-sm text-white hover:text-accent transition-colors">
                      {entry.games.name}
                    </Link>
                    {r?.overall && <Stars value={r.overall} size="xs" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {entry.hours_played ? ` · ${entry.hours_played}h` : ''}
                  </p>
                  {r?.review_text && (
                    <p className="mt-1 text-sm text-gray-400 line-clamp-2 italic">"{r.review_text}"</p>
                  )}
                </div>
              </div>
            );
          })}
          {entries.length === 0 && <p className="text-gray-600 py-12 text-center">Sin actividad todavía</p>}
        </div>
      )}

      {/* Tab: Diario */}
      {tab === 'diary' && (
        <div className="max-w-2xl">
          {diary.length === 0 ? (
            <p className="py-20 text-center text-gray-600">Sin entradas en el diario todavía</p>
          ) : (
            <div className="divide-y divide-border">
              {diary.map(entry => {
                const d = new Date(entry.updated_at);
                const r = entry.ratings?.[0];
                return (
                  <div key={entry.id} className="flex items-center gap-4 py-3">
                    <div className="w-14 flex-shrink-0 text-right">
                      <div className="text-[10px] font-bold uppercase text-accent">{d.toLocaleDateString('es-AR', { month: 'short' })}</div>
                      <div className="text-xl font-black text-white leading-tight">{d.getDate()}</div>
                    </div>
                    <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="flex-shrink-0">
                      <div className="relative h-14 w-10 overflow-hidden rounded border border-border hover:border-accent transition-colors">
                        {rawgImg(entry.games.cover_url)
                          ? <Image src={rawgImg(entry.games.cover_url)!} alt={entry.games.name} fill unoptimized className="object-cover" sizes="40px" />
                          : <div className="flex h-full items-center justify-center bg-surface text-xs">🎮</div>}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="font-semibold text-white hover:text-accent transition-colors line-clamp-1">
                        {entry.games.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r?.overall && <Stars value={r.overall} size="xs" />}
                        {entry.hours_played ? <span className="text-xs text-gray-600">{entry.hours_played}h</span> : null}
                        <span className="text-xs text-gray-600 capitalize">{entry.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Wishlist */}
      {tab === 'wishlist' && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {entries.filter(e => e.status === 'wishlist').map(entry => <Cover key={entry.id} entry={entry} />)}
          {entries.filter(e => e.status === 'wishlist').length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-600">
              <p>Tu wishlist está vacía</p>
              <p className="text-sm mt-1"><Link href="/search" className="text-accent hover:underline">Explorar juegos →</Link></p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Reseñas */}
      {tab === 'reviews' && (
        <div className="max-w-2xl space-y-6">
          {recentReviews.map(entry => {
            const r = entry.ratings[0];
            const year = entry.games.release_date ? new Date(entry.games.release_date).getFullYear() : null;
            return (
              <div key={entry.id} className="flex gap-4 border-b border-border pb-6">
                <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="flex-shrink-0">
                  <div className="relative w-14 h-20 overflow-hidden rounded border border-border hover:border-accent transition-colors">
                    {rawgImg(entry.games.cover_url)
                      ? <Image src={rawgImg(entry.games.cover_url)!} alt={entry.games.name} fill unoptimized className="object-cover" sizes="56px" />
                      : <div className="flex h-full items-center justify-center bg-surface text-sm">🎮</div>}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link href={`/game/${entry.games.rawg_id ?? entry.games.steam_app_id}`} className="font-bold text-white hover:text-accent transition-colors">{entry.games.name}</Link>
                    {year && <span className="text-sm text-gray-500">{year}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {r.overall && <Stars value={r.overall} />}
                    <span className="text-xs text-gray-600">
                      {new Date(entry.updated_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {entry.hours_played ? <span className="text-xs text-gray-600">{entry.hours_played}h</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-gray-300 leading-relaxed">{r.review_text}</p>
                </div>
              </div>
            );
          })}
          {recentReviews.length === 0 && (
            <div className="py-20 text-center text-gray-600">
              <p>Todavía no escribiste reseñas</p>
              <p className="text-sm mt-1">Calificá un juego y escribí tu opinión</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Listas */}
      {tab === 'lists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Tus listas de videojuegos</p>
            <Link href="/lists" className="rounded-lg bg-accent px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:bg-accent-hover transition-colors">
              + Nueva lista
            </Link>
          </div>
          <Link href="/lists" className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 hover:border-accent/60 transition-colors group">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-white group-hover:text-accent transition-colors">Ver todas mis listas</p>
              <p className="text-xs text-gray-500">Creá y gestioná tus listas de juegos</p>
            </div>
            <span className="ml-auto text-gray-500 group-hover:text-accent transition-colors">→</span>
          </Link>
        </div>
      )}

    </div>

    {pickerSlot !== null && (
      <FavoritePicker
        onSelect={g => saveFavorite(pickerSlot, g)}
        onClose={() => setPickerSlot(null)}
      />
    )}
    {editingProfile && (
      <EditProfileModal
        userId={user!.id}
        username={username}
        bio={bio}
        avatarUrl={avatarUrl}
        onSave={saveProfile}
        onClose={() => setEditingProfile(false)}
      />
    )}

    {modal && (
      <UserListModal
        title={modal === 'followers' ? 'Seguidores' : 'Siguiendo'}
        users={modalUsers}
        loading={modalLoading}
        emptyText={modal === 'followers' ? 'Nadie te sigue aún' : 'No seguís a nadie aún'}
        onClose={() => setModal(null)}
      />
    )}
    </>
  );
}
